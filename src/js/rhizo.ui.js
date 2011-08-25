/**
  @license
  Copyright 2008 The Rhizosphere Authors. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

// RHIZODEP=rhizo
// UI namespace
namespace("rhizo.ui");


/**
   Converts a value to an human-readable label. If the value is not numeric,
   it is returned untouched. If it is numeric the following logic applies:
     0: is returned untouched,
     0 to 1: only the most significant digit is retained (eg: 0.123 becomes 0.1)
     1 and above: human readable label according to SI units (eg: 100K, 1.2M)
   @param {number} value the value to be converted.
 */
rhizo.ui.toHumanLabel = function(value) {
  if (typeof(value) == 'number' && value != 0) {
    var labels = [ '', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y' ];
    var order = rhizo.util.orderOfMagnitude(value);
    if (order < 0) {
      return value.toFixed(-order);
    } else if (order < 3) {
      return value;
    }
    var si = parseInt(order / 3, 10);
    var label = labels[si] || ''; // the or is for out-of-scale values
    return (value / Math.pow(10, si * 3)).toPrecision(3) + label;
  } else {
    return value;
  }
};


/**
 * Changes the visibility of a list of models in bulk.
 * @param {Array.<rhizo.model.SuperModel>} models The list of models to affect.
 * @param {rhizo.ui.Visibility} visibility The visibility renderings should
 *     fade to.
 */
rhizo.ui.fadeAllRenderingsTo = function(models, visibility) {
  var nodes = [];
  for (var i = 0; i < models.length; i++) {
    nodes.push(models[i].rendering().raw_());
  }
  $(nodes).fadeTo(visibility);
};


/**
 * Extracts the affected model from a triggered user event.
 * @param {Event} ev
 * @param {rhizo.Project} project
 * @return {?rhizo.model.SuperModel} The affected model, or null if the
 *     event was not bound to any model.
 */
rhizo.ui.eventToModel = function(ev, project) {
  return project.model($(ev.currentTarget).data('id'));
};


/**
 * Extracts the associated model from an HTMLElement.
 * @param {HTMLElement} element
 * @param {rhizo.Project} project
 * @return {?rhizo.model.SuperModel} The associated model, or null if the
 *     element is not bound to any model.
 */
rhizo.ui.elementToModel = function(element, project) {
  return project.model($(element).data('id'));
};


/**
 * Defines the visibility states that models can have.
 * @enum {number}
 */
rhizo.ui.Visibility = {
  HIDDEN: 0,  // model filtered, filter is committed.
  GREY: 1,    // model filterer, filter is not committed yet.
  VISIBLE: 2  // model unfiltered, visible.
};


/**
 * Defines all the rendering operations supported by a RenderingPipeline.
 * @enum {string}
 */
rhizo.ui.RenderingOp = {
  // Request to add an artifact (i.e. any UI control or element which is not a
  // SuperModel) to the layout.
  ARTIFACT: 'artifact',

  // Request to move a SuperModel rendering.
  MOVE: 'move',

  // Request to resize a SuperModel rendering.
  RESIZE: 'resize',

  // Request to change the style of a SuperModel rendering.
  STYLE: 'style'
};


/**
 * A RenderingPipeline accumulates operations to be performed on the project
 * renderings, and applies all of the at once when requested.
 *
 * Typically used to accumulate all operations that are part of a layout
 * request.
 *
 * A RenderingPipeline by default keeps backup copies of the renderings
 * it modifies and subsequently restore them.
 * See also rhizo.ui.RenderingBackupManager.
 *
 * @param {rhizo.Project} project The visualization project.
 * @param {*} container The jQuery object pointing to a container where
 *     rendering artifacts will be added (typically the visualization universe).
 * @constructor
 */
rhizo.ui.RenderingPipeline = function(project, container) {
  this.project_ = project;
  this.container_ = container;

  /**
   * Maps model ids to the list of operations to be applied onto them.
   * @type {Object.<*, Array.<*>>}
   * @private
   */
  this.renderingOps_ = {};

  /**
   * The list of artifacts the must be added to the container as part of the
   * pipeline execution.
   *
   * @type {Array.<*>}
   * @private
   */
  this.artifacts_ = [];

  /**
   * jQuery object pointing to the container where all artifacts will be added
   * to.
   * @type {*}
   * @private
   */
  this.artifactLayer_ = $('<div />').
      css({'visibility': 'hidden', 'opacity': 0.0}).
      appendTo(this.container_);

  this.backupEnabled_ = true;
  this.backupManager_ = new rhizo.ui.RenderingBackupManager();
};

/**
 * Clears the pipeline.
 */
rhizo.ui.RenderingPipeline.prototype.cleanup = function() {
  this.artifactLayer_.fadeOut(function() { $(this).remove(); });
  this.artifactLayer_ = $('<div />').
      css({'visibility': 'hidden', 'opacity': 0.0}).
      appendTo(this.container_);

  this.artifacts_ = [];
  this.renderingOps_ = {};
};

/**
 * @return {?rhizo.ui.RenderingBackupManager} The backup manager associated
 *     to the pipeline, if backups are enabled.
 */
rhizo.ui.RenderingPipeline.prototype.backupManager = function() {
  return this.backupEnabled_ ? this.backupManager_ : null;
};

/**
 * Enables or disables backup functionality for the pipeline. Backups are
 * enabled by default.
 *
 * @param {boolean} enabled Whether to enable or disable backups.
 */
rhizo.ui.RenderingPipeline.prototype.setBackupEnabled = function(enabled) {
  if (!enabled) {
    this.backupManager_.clear();
  }
  this.backupEnabled_ = enabled;
};

/**
 * If backups are enabled, backs up the given model.
 * @param {*} modelId The id of the model to backup.
 * @return {boolean} if the model rendering was added to the backups.
 * @private
 */
rhizo.ui.RenderingPipeline.prototype.backup_ = function(modelId) {
  if (this.backupEnabled_) {
    return this.backupManager_.backup(
        modelId, this.project_.model(modelId).rendering());
  }
  return false;
};

/**
 * Returns the list of operations currently queued for a given model.
 * @param {*} modelId The model id.
 * @return {Array.<*>} The list of operations currently queued for the model.
 * @private
 */
rhizo.ui.RenderingPipeline.prototype.getModelOps_ = function(modelId) {
  if (!(modelId in this.renderingOps_)) {
    this.renderingOps_[modelId] = [];
  }
  return this.renderingOps_[modelId];
};

/**
 * Appends a rendering movement request to the current pipeline.
 *
 * @param {*} modelId The id of the model to move.
 * @param {number} top The top coordinate where the top-left corner of the
 *     model rendering should be moved to (with respect to the visualization
 *     universe top-left corner position).
 * @param {number} left The left coordinate where the top-left corner of the
 *     model rendering should be moved to (with respect to the visualization
 *     universe top-left corner position).
 * @param {?string} opt_elevation_key An optional elevation key to change the
 *     rendering elevation.
 * @param {?number} opt_elevation_value An optional elevation value to set
 *     elevation to, for the given elevation_key.
 * @return {rhizo.ui.RenderingPipeline} The pipeline itself, for chaining.
 */
rhizo.ui.RenderingPipeline.prototype.move = function(
    modelId, top, left, opt_elevation_key, opt_elevation_value) {
  var modelOps = this.getModelOps_(modelId);
  var op = {
    op: rhizo.ui.RenderingOp.MOVE,
    top: top,
    left: left
  };
  if (opt_elevation_key !== undefined && opt_elevation_value !== undefined) {
    this.backup_(modelId);
    op.elevation = {key: opt_elevation_key, value: opt_elevation_value};
  }
  modelOps.push(op);
  return this;
};

/**
 * Appends a rendering resize request to the current pipeline.
 * The method assumes that the rendering accepts resizing to the given size,
 * as defined by rhizo.ui.Rendering.prototype.canRescaleTo().
 *
 * @param {*} modelId The id of the model to resize.
 * @param {number} width The width (in pixels) the rendering should be resized
 *     to.
 * @param {number} height The height (in pixels) the rendering should be resized
 *     to.
 * @return {rhizo.ui.RenderingPipeline} The pipeline itself, for chaining.
 */
rhizo.ui.RenderingPipeline.prototype.resize = function(modelId, width, height) {
  this.backup_(modelId);
  this.getModelOps_(modelId).push({
    op: rhizo.ui.RenderingOp.RESIZE,
    width: width,
    height: height
  });
  return this;
};

/**
 * Appends a request to the current pipeline to change a rendering style.
 *
 * @param {*} modelId The id of the model to change.
 * @param {*} styleProps The styles to set, in the form of a plain javascript
 *     object mapping CSS property names to their target values.
 * @return {rhizo.ui.RenderingPipeline} The pipeline itself, for chaining.
 */
rhizo.ui.RenderingPipeline.prototype.style = function(modelId, styleProps) {
  this.backup_(modelId);
  this.getModelOps_(modelId).push({
    op: rhizo.ui.RenderingOp.STYLE,
    styleProps: styleProps
  });
  return this;
};

/**
 * Adds an artifact. An artifact is any HTML element which needs to be added to
 * the visualization viewport when applying the pipeline.
 *
 * Technically, artifacts are immediately added to an invisible pane when this
 * method is called, and then only displayed when the pipeline is applied.
 *
 * This allows the caller to access the true artifact dimensions immediately
 * after this method call.
 *
 * This includes, for instance, reference elements such as headers and
 * connectors, used by layouts.
 *
 * @param {*} artifact The HTML element, or jQuery object pointing to it,
 *     representing the artifact to add.
 * @return {rhizo.ui.RenderingPipeline} The pipeline itself, for chaining.
 */
rhizo.ui.RenderingPipeline.prototype.artifact =  function(artifact) {
  this.artifactLayer_.append(artifact);
  return this;
};

/**
 * Applies the pipeline, executing all the queued operations.
 *
 * @return {*} An object containing 'top', 'left', 'width' and 'height'
 *   properties, representing the area (in pixels) occupied by all the models'
 *   renderings that were part of this pipeline. The top,left coords define
 *   the offset between the top-left corner of the bounding rectangle and
 *   the top-left corner of the visualization universe.
 */
rhizo.ui.RenderingPipeline.prototype.apply = function() {
  this.project_.logger().time('RenderingPipeline::apply');
  var boundingRect = {
      top: Number.POSITIVE_INFINITY,
      left: Number.POSITIVE_INFINITY,
      width: 0,
      height: 0
  };
  for (var modelId in this.renderingOps_) {
    var ops = this.renderingOps_[modelId];
    for (var i = ops.length-1; i >= 0; i--) {
      var rendering = this.project_.model(modelId).rendering();
      switch (ops[i].op) {
        case rhizo.ui.RenderingOp.MOVE:
          rendering.move(ops[i].top, ops[i].left);
          if (ops[i].elevation) {
            rendering.pushElevation(ops[i].elevation.key,
                                    ops[i].elevation.value);
          }
          break;
        case rhizo.ui.RenderingOp.RESIZE:
          rendering.rescaleRendering(ops[i].width, ops[i].height);
          break;
        case rhizo.ui.RenderingOp.STYLE:
          rendering.setNakedCss(ops[i].styleProps);
          break;
        default:
          throw("Unrecognized rendering op: " + ops[i].op);
      }
    }
    this.updateBoundingRectangleCorner_(rendering, boundingRect);
  }
  this.computeBoundingRectangleArea_(boundingRect);
  this.artifactLayer_.fadeIn();
  this.project_.logger().timeEnd('RenderingPipeline::apply');
  return boundingRect;
};

/**
 * Updates the bounding rectangle top-left coordinates including the position
 * of the given rendering.
 *
 * @param {rhizo.ui.Rendering} rendering The rendering under inspection.
 * @param {*} boundingRect
 * @private
 */
rhizo.ui.RenderingPipeline.prototype.updateBoundingRectangleCorner_ = function(
    rendering, boundingRect) {
  var renderingPosition = rendering.position();
  boundingRect.top = Math.min(renderingPosition.top, boundingRect.top);
  boundingRect.left = Math.min(renderingPosition.left, boundingRect.left);

};

/**
 * Updates the width and height of the bounding rectangle from the position
 * and sizes of all the renderings managed by the pipeline.
 *
 * @param {*} boundingRect
 * @private
 */
rhizo.ui.RenderingPipeline.prototype.computeBoundingRectangleArea_ = function(
    boundingRect) {
  for (var modelId in this.renderingOps_) {
    var rendering = this.project_.model(modelId).rendering();
    var renderingDimensions = rendering.getDimensions();
    var renderingPosition = rendering.position();
    boundingRect.width = Math.max(
        boundingRect.width,
        renderingDimensions.width + renderingPosition.left - boundingRect.left);
    boundingRect.height = Math.max(
        boundingRect.height,
        renderingDimensions.height + renderingPosition.top - boundingRect.top);
  }
};


/**
 * A backup manager saves Renderings original attributes and restores them once
 * any applied change is no longer needed.
 *
 * Backup managers are used to revert the changes pushed onto renderings by
 * the execution of RenderingPipelines.
 *
 * Rendering pipelines, used by layout operations, may affect the aspect
 * of Renderings, such as their size or styles (in contrast with only changing
 * their position), which will then be restored once the layout changes.
 *
 * A backup manager can be preserved through multiple consequent executions
 * of a RenderingPipeline. Depending on the condition:
 * - Only the delta of models between the two executions is restored
 *   (removed from backup models) or added to the set (such as when the same
 *   layout is applied twice).
 * - All backup models are restored (see restoreAll()).
 * - when a new RenderingPipeline is created, the set of associated backup
 *   models is initially empty and populated during the pipeline buildup.
 *
 * @constructor
 */
rhizo.ui.RenderingBackupManager = function() {

  /**
   * @type {Object.<string, rhizo.layout.treemap.RenderingBackup>}
   * @private
   */
  this.renderingBackups_ = {};
  this.numBackups_ = 0;
};

/**
 * Clears all the currently stored backups, without restoring them.
 */
rhizo.ui.RenderingBackupManager.prototype.clear = function() {
  this.renderingBackups_ = {};
  this.numBackups_ = 0;
};

/**
 * Adds a new rendering to the backup, if it is not already in there.
 * @param {*} mid The unique id of the model bound to this rendering.
 * @param {rhizo.ui.Rendering} rendering The rendering to backup.
 * @return {boolean} if the rendering was added to the backups.
 */
rhizo.ui.RenderingBackupManager.prototype.backup = function(
    mid, rendering) {
  if (!(mid in this.renderingBackups_)) {
    this.renderingBackups_[mid] =
        new rhizo.ui.RenderingBackup(rendering);
    this.numBackups_++;
    return true;
  }
  return false;
};

/**
 * Removes a rendering from the backup (if present) without restoring it.
 * @param {string} mid The id of the model whose rendering is to remove.
 */
rhizo.ui.RenderingBackupManager.prototype.removeBackup = function(
    mid) {
  if (mid in this.renderingBackups_) {
    delete this.renderingBackups_[mid];
    this.numBackups_--;
  }
};

/**
 * Partially restores the set of currently backed up models by comparing the
 * backups stored so far and all the models the are potentially going to be
 * affected. All the models that are in the former set but not in the latter
 * will be restored.
 *
 * @param {Array.<rhizo.model.SuperModel>} supermodels List of models that will
 *     be (potentially) affected from now on.
 * @param {boolean} styleReset Whether we are still required to restore all
 *     style changes on all backed up models.
 */
rhizo.ui.RenderingBackupManager.prototype.restore = function(
      supermodels, styleReset) {
  if (this.numBackups_ > 0) {
    var survivingModelIds = {};
    for (var i = 0; i < supermodels.length; i++) {
      survivingModelIds[supermodels[i].id] = true;
    }
    var restorableModels = {};
    for (var mid in this.renderingBackups_) {
      if (!(mid in survivingModelIds)) {
        restorableModels[mid] = true;
      }
    }
    this.restoreInternal_(restorableModels, true, true, true);

    if (styleReset) {
      this.restoreInternal_(
          this.renderingBackups_,
          /*sizes=*/ false, /*elevation=*/ false, /*styles=*/ true);
    }
  }
};

/**
 * Restores all the backups.
 */
rhizo.ui.RenderingBackupManager.prototype.restoreAll = function() {
  this.restoreInternal_(this.renderingBackups_, true, true, true);
  this.renderingBackups_ = {};  // just in case.
  this.numBackups_ = 0;
};

/**
 * Restores a specified set of models from their backups.
 * @param {Object.<*, rhizo.ui.RenderingBackup>} modelsMap A map of models to
 *     restore, mapping from the model id to the associated backup.
 * @param {boolean} restoreSizes Whether to restore the size of the rendering.
 * @param {boolean} restoreElevation Whether to restore the rendering elevation
 *     map.
 * @param {boolean} restoreStyles Whether to restore the styles of the
 *     rendering.
 * @private
 */
rhizo.ui.RenderingBackupManager.prototype.restoreInternal_ =
    function(modelsMap, restoreSizes, restoreElevation, restoreStyles) {
  for (var mid in modelsMap) {
    this.renderingBackups_[mid].restore(restoreSizes,
                                        restoreElevation,
                                        restoreStyles);
    if (restoreSizes && restoreElevation && restoreStyles) {
      delete this.renderingBackups_[mid];
      this.numBackups_--;
    }
  }
};


/**
 * A wrapper around a supermodel Rendering to backup relevant attributes that
 * will need to be restored once we clean up a RenderingPipeline.
 *
 * @param {rhizo.ui.Rendering} rendering The rendering to backup.
 * @constructor
 */
rhizo.ui.RenderingBackup = function(rendering) {
  this.rendering_ = rendering;
  this.originalDimensions_ = jQuery.extend({}, rendering.getDimensions());

  // NOTE: background-color is the only style that Rhizosphere layouts and
  // RenderingPipelines actually change, so we take the shortcut here of
  // tracking the initial value of just this style attribute.
  this.originalBackground_ = rendering.nakedCss('background-color');

  this.originalElevation_ = this.rendering_.cloneElevation();
};

/**
 * Restores the model managed by this backup.
 * @param {boolean} restoreSizes Whether to restore the size of the rendering.
 * @param {boolean} restoreElevation Whether to restore the rendering elevation
 *     map.
 * @param {boolean} restoreStyles Whether to restore the styles of the
 *     rendering.
 */
rhizo.ui.RenderingBackup.prototype.restore = function(
    restoreSizes, restoreElevation, restoreStyles) {
  if (restoreStyles) {
    this.rendering_.setNakedCss({backgroundColor: this.originalBackground_},
                                /* revert hint */ true);
  }
  if (restoreSizes) {
    this.rendering_.rescaleRendering(this.originalDimensions_.width,
                                     this.originalDimensions_.height);

  }
  if (restoreElevation) {
    this.rendering_.restoreElevation(this.originalElevation_);
  }
};


/**
 * Manages a max-heap of renderings' named elevations (z-indexes when applied to
 * HTML elements). A rendering can be raised to different elevations, with
 * the highest one being the one that is effectively used.
 *
 * Base elevation is 0, and any elevation request below or equal to that
 * threshold will be ignored.
 * @param {number=} opt_offset An optional offset to apply to all elevations
 *     managed by the class.
 * @constructor
 */
rhizo.ui.Elevation = function(opt_offset) {
  this.elevations_ = {};
  this.elevation_top_ = 0;

  // An offset that will always be added to the returned elevation values.
  this.elevation_offset_ = opt_offset || 0;
};

rhizo.ui.Elevation.prototype.clone = function() {
  var el = new rhizo.ui.Elevation();
  el.elevations_ = $.extend({}, this.elevations_);
  el.elevation_top_ = this.elevation_top_;
  el.elevation_offset_ = this.elevation_offset_;
  return el;
};

/**
 * Adds a named elevation.
 * @param {string} el_key
 * @param {number} el_value
 * @return {boolean} Whether the highest elevation changed because of this
 *     addition.
 */
rhizo.ui.Elevation.prototype.add = function(el_key, el_value) {
  if (el_value <= 0) {
    return false;
  }
  this.elevations_[el_key] = el_value;
  return this.recomputeTop_();
};

/**
 * Removes a named elevation.
 * @param {string} el_key
 * @return {boolean} Whether the highest elevation changed because of this
 *     removal.
 */
rhizo.ui.Elevation.prototype.remove = function(el_key) {
  delete this.elevations_[el_key];
  return this.recomputeTop_();
};

/**
 * @return {number} The highest elevation value.
 */
rhizo.ui.Elevation.prototype.top = function() {
  return this.elevation_top_ + this.elevation_offset_;
};

/**
 * @return {boolean} Whether no named elevations are recorded yet.
 */
rhizo.ui.Elevation.prototype.empty = function() {
  return this.elevation_top_ == 0;
};

/**
 * @private
 * @return {boolean} Whether the highest elevation changed
 */
rhizo.ui.Elevation.prototype.recomputeTop_ = function() {
  var new_top_ = 0;
  for (var key in this.elevations_) {
    new_top_ = Math.max(new_top_, this.elevations_[key]);
  }
  if (new_top_ != this.elevation_top_) {
    this.elevation_top_ = new_top_;
    return true;
  }
  return false;
};

/**
 * A Rendering is a wrapper that enriches plain (naked) model renderings
 * returned from the project renderer with all the additional events,
 * functionality and goodness Rhizosphere requires.
 *
 * Three layers of rendering exist:
 * - A 'naked' rendering is the plain output of the project renderer. This is
 *   where per-project customization occurs.
 * - A 'raw' (or 'shell') rendering is a thin wrapper on the naked rendering,
 *   to simplify isolation and targeting of renderings among the other HTML
 *   elements that exist within a Rhizosphere visualization. Typically it's
 *   just a DIV wrapper around the naked renderer, with a specific CSS class
 *   assigned to it.
 * - A rhizo.ui.Rendering wraps a 'raw' rendering and exposes to the rest of
 *   Rhizosphere all the available operations that can be performed on
 *   renderings.
 *
 * @param {rhizo.model.SuperModel} model The model this rendering will be bound
 *     to.
 * @param {*} rawNode The jQuery object that manages the 'raw' rendering.
 * @param {*} renderer The project renderer.
 * @param {*} renderingHints The project rendering hints.
 * @constructor
 */
rhizo.ui.Rendering = function(model, rawNode, renderer, renderingHints) {
  this.model_ = model;
  this.id = model.id;
  this.raw_node_ = rawNode;

  /**
   * The naked rendering, as returned by the renderer render() call.
   * @type {Element}
   * @private
   */
  this.naked_node_ = rawNode.children().get(0);

  // Bind the model id to each rendering
  this.raw_node_.data('id', model.id);

  this.renderer_ = renderer;
  this.renderingHints_ = renderingHints;

  /**
   * Function to decide whether the rendering can be rescaled to the desired
   * width and height.
   * @type {function(Object, Element, number, number):boolean}
   * @private
   */
  this.rendererSizeChecker_ = null;

  /**
   * Function to rescale the rendering to the desired width and height.
   * @type {function(Object, Element, number, number):boolean}
   * @private
   */
  this.rendererRescaler_ = null;
  this.rendererStyleChanger_ = null;
  this.rendererAttachListener_ = null;
  this.setRendererHelpers_();

  this.expandable_ = false;  // Whether the rendering supports expansion or not.
  this.expanded_ = false;  // whether the rendering is expanded or not

  /**
   * The rendering position, at the time of the last move() call.
   * @type {Object.<string, number>}
   * @private
   */
  this.position_ = {};

  /**
   * Whether the rendering should cache its dimensions.
   * @type {boolean}
   * @private
   */
  this.cacheDimensions_ = false;

  /**
   * Holds a cached copy of the rendering dimensions, to avoid costly lookups
   * on the DOM nodes themselves.
   * @type {Object.<string, number>}
   * @private
   */
  this.cachedDimensions_ = {};

  // A position mark, that can be used to remember a previous position occupied
  // by the rendering.
  this.mark_ = null;

  // whether the rendering is visible or not. Multiple states might exist,
  // as defined in the rhizo.ui.Visibility enum. Renderings are initially
  // hidden, as defined in the rhizo.less stylesheet.
  this.visibility = rhizo.ui.Visibility.HIDDEN;

  /**
   * Keeps track of all z-indexes changes.
   * The offset value should match the base z-index used by Rhizosphere models.
   * @type {rhizo.ui.Elevation}
   * @private
   */
  this.elevation_ = new rhizo.ui.Elevation(50);

  /**
   * The set of rendering modes.
   * @type {Object.<string, boolean>}
   * @private
   */
  this.modes_ = {};
  this.notifyAttach_(true);
};

/**
 * @private
 */
rhizo.ui.Rendering.prototype.setRendererHelpers_ = function() {
  if (typeof(this.renderer_.canRescaleTo) == 'function') {
    this.rendererSizeChecker_ = this.renderer_.canRescaleTo;
  }
  if (typeof(this.renderer_.rescale) == 'function') {
    this.rendererRescaler_ = this.renderer_.rescale;
  }
  if (typeof(this.renderer_.changeStyle) == 'function') {
    this.rendererStyleChanger_ = this.renderer_.changeStyle;
  }
  if (typeof(this.renderer_.onAttach) == 'function') {
    this.rendererAttachListener_ = this.renderer_.onAttach;
  }
};

/**
 * @return {HTMLElement} The root node of the raw rendering, for internal
 *     use only by the rhizo.ui module.
 * @private
 */
rhizo.ui.Rendering.prototype.raw_ = function() {
  return this.raw_node_.get(0);
};


/**
 * Notifies the renderer that the rendering of a particular model has been
 * attached to or removed from the DOM. 
 * 
 * @param {boolean} attached Whether this rendering was attached to or detached
 *     from the DOM.
 * @private
 */
rhizo.ui.Rendering.prototype.notifyAttach_ = function(attached) {
  if (this.rendererAttachListener_) {
    this.rendererAttachListener_(
        this.model_.unwrap(), this.naked_node_, attached);
  }
};


/**
 * Regenerates the naked and raw renderings for the model managed by this
 * rendering.
 * @private
 */
rhizo.ui.Rendering.prototype.reRender_ = function() {
  // Detach the old rendering.
  this.notifyAttach_(false);
  this.raw_node_.children(':not(.rhizo-expand-model)').remove();  
  
  // re-render. rendered expects the naked model.
  // Must wrap in $() in case renderer returns raw strings.
  this.naked_node_ = $(this.renderer_.render(this.model_.unwrap(),
                                             this.expanded_,
                                             this.renderingHints_)).get(0);

  // keep expanded items above the others.
  // Remove any rescaling that might have been applied to the rendering.
  this.raw_node_.toggleClass('rhizo-model-expanded', this.expanded_).css(
      {width: '', height: ''});
  if (this.expanded_) {
    this.pushElevation('__expanded__', 200);
  } else {
    this.popElevation('__expanded__');
  }

  // replace the old rendering
  this.raw_node_.append(this.naked_node_);
  this.notifyAttach_(true);
  this.refreshCachedDimensions_();
};

/**
 * Notifies the rendering that it is about to be destroyed and removed from
 * the DOM. Any cleanup should occur here, before the DOM removal takes place.
 */
rhizo.ui.Rendering.prototype.beforeDestroy = function() {
  this.notifyAttach_(false);
};

/**
 * Destroys all the DOM nodes attached to this rendering.
 */
rhizo.ui.Rendering.prototype.destroy = function() {
  this.beforeDestroy();
  this.raw_node_.remove();
  this.raw_node_ = null;
};

/**
 * Moves the rendering.
 * @param {number} top The target y coordinate of the top-left corner of the
 *     rendering, relative to the universe top-left corner.
 * @param {number} left The target x coordinate of the top-left corner of the
 *     rendering, relative to the universe top-left corner.
 * @param {?boolean} opt_instant Whether the move should be instantaneous
 *   (no animations) or not.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.move = function(top, left, opt_instant) {
  if (this.position_.top == top && this.position_.left == left) {
    // Bypass any DOM manipulation if we are already in the target position.
    return this;
  }
  if (!!opt_instant) {
    this.raw_node_.css({top: top, left: left});
  } else {
    this.raw_node_.move(top, left);
  }
  this.position_ = {top: top, left: left};
  return this;
};

/**
 * Moves the rendering back to last marked position.
 * @param {?boolean} opt_instant Whether the move should be instantaneous
 *   (no animations) or not.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.moveToMark = function(opt_instant) {
  if (this.mark_ !== null) {
    this.move(this.mark_.top, this.mark_.left, opt_instant);
  }
  return this;
};

/**
 * Moves the rendering of a {top, left} delta distance from the last marked
 * position (if no mark exists, the move is relative to the universe top-left
 * corner).
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.moveFromMark = function(top, left, opt_instant) {
  if (this.mark_ != null) {
    this.move(this.mark_.top + top, this.mark_.left + left, opt_instant);
  } else {
    this.move(top, left, opt_instant);
  }
  return this;
};

/**
 * Marks the current model position.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.markPosition = function() {
  this.mark_ = {
    top: parseInt(this.raw_node_.css('top'), 10),
    left: parseInt(this.raw_node_.css('left'), 10)
  };
  return this;
};

/**
 * Discards the current mark, if any.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.unmarkPosition = function() {
  this.mark_ = null;
  return this;
};

/**
 * @return {*} A {top,left} distance from the given {top, left} position and
 *   this rendering mark position. Returns null if no mark exists.
 */
rhizo.ui.Rendering.prototype.distanceFromMark = function(top, left) {
  if (this.mark_ != null) {
    return {left: left - this.mark_.left,
            top: top - this.mark_.top};
  } else {
    return null;
  }
};

/**
 * Updates the current rendering position. This happens automatically if models
 * are always repositioned using move() or one of its derivates.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.refreshPosition = function() {
  this.position_ = {
    top: parseInt(this.raw_node_.css('top'), 10),
    left: parseInt(this.raw_node_.css('left'),10)
  };
  return this;
};

/**
 * @return {*} the {top, left} position of top-left corner of the rendering, with
 * respect to the visualization universe top-left corner.
 */
rhizo.ui.Rendering.prototype.position = function() {
  return this.position_;
};

/**
 * Toggles selection status for this rendering.
 * @param {boolean} selected Whether this rendering should be displayed as
 *     selected or not.
 */
rhizo.ui.Rendering.prototype.setSelected = function(selected) {
  if (selected) {
    this.raw_node_.addClass('ui-selected');
  } else {
    this.raw_node_.removeClass('ui-selected');
  }
};

/**
 * Enables dimension caching for this rendering.
 */
rhizo.ui.Rendering.prototype.startDimensionCaching = function() {
  this.cacheDimensions_ = true;
  this.refreshCachedDimensions_();
};

/**
 * Re-computes this rendering width and height dimensions.
 * @private
 */
rhizo.ui.Rendering.prototype.refreshCachedDimensions_ = function() {
  this.cachedDimensions_ = {
    width: this.raw_().offsetWidth,
    height: this.raw_().offsetHeight
  };
};

/**
 * @return {Object.<string, number>} The (cached?) dimensions of this model
 *     rendering. The returned object has a 'width' and 'height' property
 *     that map to the outer dimensions (incl. border and such) of the
 *     rendering.
 */
rhizo.ui.Rendering.prototype.getDimensions = function() {
  if (this.cacheDimensions_) {
    return this.cachedDimensions_;
  } else {
    return {
      width: this.raw_().offsetWidth,
      height: this.raw_().offsetHeight
    };
  }
};

/**
 * Enables expansion support.
 * @param {*} expander The UI control that will trigger expansions, to be
 *     appended to the raw rendering.
 */
rhizo.ui.Rendering.prototype.startExpandable = function(expander) {
  if (!this.expandableByModel_()) {
    return;
  }
  expander.data("id", this.id);
  this.raw_node_.append(expander);
  this.expandable_ = true;
};

/**
 * @return {boolean} Whether the specific model attached to this rendering
 *     supports expansion.
 * @private
 */
rhizo.ui.Rendering.prototype.expandableByModel_ = function() {
  if (typeof(this.renderer_.expandableByModel) == 'function') {
    return this.renderer_.expandableByModel(this.model_.unwrap(),
                                            this.renderingHints_);
  } else {
    return true;
  }
};

/**
 * Sets the expansion status of this rendering.
 * @param {boolean} expanded
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.setExpanded = function(expanded) {
  if (!this.expandable_ || this.expanded_ == expanded) {
    // already in the expected status, or expansion is not supported.
    return this;
  }
  this.expanded_ = expanded;
  this.reRender_();
  return this;
};

/**
 * Toggles the expansion status for this rendering.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.toggleExpanded = function() {
  this.expanded_ = !this.expanded_;
  this.reRender_();
  return this;
};

/**
 * Updates the rendering after a change that occurred to the underlying model.
 */
rhizo.ui.Rendering.prototype.modelChanged = function() {
  this.reRender_();
};

/**
 * Pushes an elevation request on this rendering. Re-sets the z-index of this
 * rendering if needed.
 * @param {string} elevation_key
 * @param {number} elevation_value
 */
rhizo.ui.Rendering.prototype.pushElevation = function(elevation_key,
                                                      elevation_value) {
  var zIndexChange = this.elevation_.add(elevation_key, elevation_value);
  if (zIndexChange) {
    this.raw_node_.css('z-index', this.elevation_.top());
  }
};

/**
 * Removes a named elevation from this rendering. Re-sets the z-index of this
 * rendering if needed.
 * @param {string} elevation_key
 */
rhizo.ui.Rendering.prototype.popElevation = function(elevation_key) {
  var zIndexChange = this.elevation_.remove(elevation_key);
  if (zIndexChange) {
    this.raw_node_.css(
        'z-index',
        this.elevation_.empty() ? '' : this.elevation_.top());
  }
};

/**
 * Returns a clone of the rendering current elevation map.
 *
 * This method is intended for internal use only by the rendering backup
 * features.
 *
 * @return {rhizo.ui.Elevation} A clone of the rendering current elevation map.
 */
rhizo.ui.Rendering.prototype.cloneElevation = function() {
  return this.elevation_.clone();
};

/**
 * Replaces the rendering current elevation map with another one, adjusting the
 * rendering z-index as a consequence.
 *
 * @param {rhizo.ui.Elevation} elevation The new Rendering elevation map to use.
 */
rhizo.ui.Rendering.prototype.restoreElevation = function(elevation) {
  this.elevation_ = elevation;
  this.raw_node_.css(
      'z-index',
      this.elevation_.empty() ? '' : this.elevation_.top());
};

/**
 * Checks whether the rendering can be resized to the requested dimensions.
 *
 * Resizing can fail, for example if we determine that the requested target
 * dimensions are too small for a proper rendering display.
 *
 * @param {number} width The target width.
 * @param {number} height The target height.
 * @param {?Function} opt_failure_callback callback invoked whenever the
 *   requested rescaling is not possible.
 * @return {boolean} Whether rescaling to the desired dimensions is possible.
 */
rhizo.ui.Rendering.prototype.canRescaleTo = function(width,
                                                     height,
                                                     opt_failure_callback) {
  // The raw_node_ is guaranteed to be marginless and paddingless, with a
  // 1px border (unless someone tampers the .rhizo-model class), so we
  // programmatically know that internal dimensions need to be resized
  // to a smaller extent (exactly 2px less).
  //
  // If internal width/height falls to 0px we bail out.
  if (width <= 2 || height <= 2) {
    if (opt_failure_callback) {
      opt_failure_callback();
    }
    return false;
  }

  if (this.rendererSizeChecker_) {
    // Give the original model renderer a chance to veto rescaling, if a
    // size checker has been defined.
    //
    // Like this method, the size checker too receives outer dimensions.
    var canResize = this.rendererSizeChecker_(this.model_.unwrap(),
                                              this.naked_node_,
                                              width - 2,
                                              height - 2);
    if (!canResize && opt_failure_callback) {
      opt_failure_callback();
    }
    return canResize;
  }
  return true;
};

/**
 * Resizes this rendering. By default, only the raw rendering is resized. If
 * the project renderer includes a rescaler, then the rescaler is asked to
 * resize the naked rendering too.
 *
 * This method assumes that canRescaleTo() has already been invoked and
 * successfully returned.
 *
 * @param {number} width The target width.
 * @param {number} height The target height.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.rescaleRendering = function(width,
                                                         height) {
  if (this.cacheDimensions_ &&
      this.cachedDimensions_.width == width &&
      this.cachedDimensions_.height == height) {
    // No-op, the rendering already has the required dimensions. Skip any
    // DOM manipulation.
    return this;
  }
  this.cachedDimensions_ = {width: width, height: height};
  this.raw_node_.width(width - 2).height(height - 2);
  if (this.rendererRescaler_) {
    // Give the original model renderer a chance to rescale the naked render,
    // if a rescaler has been defined.
    //
    // Like this method, the rescaler too receives outer dimensions.
    this.rendererRescaler_(this.model_.unwrap(), 
                           this.naked_node_, 
                           width - 2,
                           height - 2);
  }
  return this;
};

/**
 * Applies a set of CSS styles to the naked rendering. If the renderer
 * exposes a style changer, the task is delegated to it, otherwise the styles
 * are applied directly on the naked rendering.
 *
 * @param {*} props CSS styles to apply, in the form of a plain javascript
 *     object.
 * @param {?boolean} opt_hintRevert An optional boolean hint to indicate that
 *     the rendering properties are being reverted to their original state,
 *     to cancel the effects of a previous call to this function.
 */
rhizo.ui.Rendering.prototype.setNakedCss = function(props, opt_hintRevert) {
  if (typeof props != 'object') {
    throw 'setNakedCss() expects a map of properties.';
  }
  if (this.rendererStyleChanger_) {
    this.rendererStyleChanger_(this.model_.unwrap(), 
                               this.naked_node_, 
                               props, 
                               opt_hintRevert);
  } else {
    $(this.naked_node_).css(props);
  }
};

/**
 * @param {string} propName The property to extract.
 * @return {*} A CSS style extracted from the naked rendering.
 */
rhizo.ui.Rendering.prototype.nakedCss = function(propName) {
  if (typeof propName != 'string') {
    throw 'nakedCss() expects a string of the property to access.';
  }
  return $(this.naked_node_).css(propName);
};

/**
 * Sets the given mode. Modes are simple tags that can be applied to a
 * rendering and can alter the rendering behavior under certain conditions
 * (for example: to make the rendering behave differently during drag
 * operations).
 *
 * @param {string} mode The mode to apply.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.setMode = function(mode) {
  this.modes_[mode] = true;
  return this;
};

/**
 * Removes the given mode.
 * @param {string} mode The mode to remove.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.removeMode = function(mode) {
  delete this.modes_[mode];
  return this;
};

/**
 * @param {string} mode
 * @return {boolean} Whether the requested mode is on or not.
 */
rhizo.ui.Rendering.prototype.isMode = function(mode) {
  return !!this.modes_[mode];
};


/**
 * A synthetic rendering is a rendering that is not backed by a visualization
 * model but is created programmatically by the visualization framework. It is
 * used, for example, to create visualization artifacts used by specific layouts
 * like trees and treemaps.
 *
 * SyntheticRendering instances expose a subset of the same functionalities
 * exposed by rhizo.ui.Rendering, allowing for basic movement, resizing and
 * manipulation of synthetic renderings.
 *
 * @param {*} raw_node The jQuery object that wraps the 'raw' HTML elements that
 *     form the synthetic rendering contents. The raw HTML elements must
 *     already be attached to the DOM, otherwise dimension calculations for
 *     the rendering will fail.
 * @constructor
 */
rhizo.ui.SyntheticRendering = function(raw_node) {
  /**
   * @private
   * @type {*}
   */
  this.raw_node_ = raw_node;
  this.raw_node_.css('position', 'absolute');

  /**
   * The rendering position, at the time of the last move() call.
   * @type {Object.<string, number>}
   * @private
   */
  this.position_ = {};

  /**
   * Whether the rendering should cache its dimensions.
   * @type {boolean}
   * @private
   */
  this.cacheDimensions_ = true;

  /**
   * Holds a cached copy of the rendering dimensions, to avoid costly lookups
   * on the DOM nodes themselves.
   * @type {Object.<string, number>}
   * @private
   */
  this.cachedDimensions_ = {
    width: this.raw_node_.get(0).offsetWidth,
    height: this.raw_node_.get(0).offsetHeight
  };

  /**
   * Keeps track of all z-indexes changes.
   * Use the raw node current z-index as base offset.
   * @type {rhizo.ui.Elevation}
   * @private
   */
  this.elevation_ = new rhizo.ui.Elevation(
      parseInt(this.raw_node_.css('z-index'), 10));

  /**
   * Function to decide whether the rendering can be rescaled to the desired
   * width and height.
   * @type {function(Object, Element, number, number):boolean}
   * @private
   */
  this.rendererSizeChecker_ = null;

  /**
   * Function to rescale the rendering to the desired width and height.
   * @type {function(Object, Element, number, number):boolean}
   * @private
   */
  this.rendererRescaler_ = null;
};

rhizo.ui.SyntheticRendering.prototype.move = rhizo.ui.Rendering.prototype.move;

rhizo.ui.SyntheticRendering.prototype.pushElevation =
    rhizo.ui.Rendering.prototype.pushElevation;

rhizo.ui.SyntheticRendering.prototype.popElevation =
    rhizo.ui.Rendering.prototype.popElevation;

rhizo.ui.SyntheticRendering.prototype.canRescaleTo =
    rhizo.ui.Rendering.prototype.canRescaleTo;

rhizo.ui.SyntheticRendering.prototype.rescaleRendering =
    rhizo.ui.Rendering.prototype.rescaleRendering;

rhizo.ui.SyntheticRendering.prototype.getDimensions =
    rhizo.ui.Rendering.prototype.getDimensions;


/**
 * A RenderingBootstrap is responsible for building the renderings attached
 * to each model to visualize. It relies on the externally provided renderer
 * to convert each model into a 'naked' rendering, which is then wrapped in
 * a rhizo.ui.Rendering to enrich it with all the additional Rhizosphere
 * functionalities.
 *
 * @param {*} renderer Externally provided renderer, to convert models into
 *     their HTML rendering counterparts.
 * @param {!rhizo.ui.gui.GUI} gui The project gui.
 * @param {!rhizo.Project} project The project itself.
 * @param {!rhizo.Options} options Project-wide options.
 * @constructor
 */
rhizo.ui.RenderingBootstrap = function(renderer, gui, project, options) {
  this.renderer_ = renderer;
  this.gui_ = gui;
  this.project_ = project;
  this.logger_ = project.logger();
  this.options_ = options;
};

/**
 * Converts a list of models into their HTML rendering counterparts.
 *
 * @param {!Array.<!rhizo.model.SuperModel>} models The models to generate
 *     renderings for. They must not have a rendering already.
 * @return {boolean} Whether the renderings were created successfully or not.
 */
rhizo.ui.RenderingBootstrap.prototype.buildRenderings = function(models) {
  var rawRenderings = [];
  var hasCustomDragHandle = this.getDragHandleSelector_() != null;
  for (var i = 0;  i < models.length; i++) {
    if (!!models[i].rendering()) {
      this.logger_.error("Rendering requested for a model that has already " +
                         "been rendered. Model id: " + model.id);
      return false;
    }
    this.rawrender_(models[i], rawRenderings, hasCustomDragHandle);
  }
  if (rawRenderings.length == 0) {
    this.logger_.error("No renderings.");
    return false;
  }

  var numRenderedModels = this.numRenderedModels_();
  if (typeof rawRenderings[0] == 'string') {
    // The project renderer returns raw strings.
    //
    // We concatenate everything together and add it to the DOM in a single
    // pass. We then identify back all the single renderings and bind them
    // to the model they belong to.
    this.buildFromStrings_(models, rawRenderings, numRenderedModels);
  } else {
    // The project renderer returns jQuery objects.
    //
    // We append them to the DOM one at a time and assign them to their model.
    this.buildFromShells_(models, rawRenderings);
  }
  rawRenderings = 
      this.gui_.universe.find('.rhizo-model').slice(numRenderedModels);

  // Sanity checks
  if (!this.sanityCheck_(rawRenderings, models)) {
    return false;
  }

  // Attach events and additional functionality to each rendering. This may be
  // done on the rawRenderings directly for performance reasons.
  this.decorateRenderings_(rawRenderings, models);
  return true;
};

/**
 * Returns the number of models in the current project that already have a
 * rendering attached.
 *
 * @return {number} The number of models that already have a rendering.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.numRenderedModels_ = function() {
  var numRenderedModels = 0;
  var models = this.project_.models();
  for (var i = models.length-1; i >= 0; i--) {
    numRenderedModels += models[i].rendering() == null ? 0 : 1;
  }
  return numRenderedModels;
};

/**
 * Accumulates the raw rendering for the given model to the list of all raw
 * renderings, either as a serie of HTML strings or as a jQuery object
 * (depending on what the naked renderer provides).
 *
 * @param {!rhizo.model.SuperModel} model
 * @param {Array.<*>} rawRenderings
 * @param {boolean} hasCustomDragHandle Whether the renderings will have
 *     a custom drag handler, or otherwise the entire rendering is draggable.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.rawrender_ = function(
    model, rawRenderings, hasCustomDragHandle) {
  var naked_render = this.renderer_.render(model.unwrap(),
                                           model.expanded,
                                           this.gui_.allRenderingHints());
  var renderingClass =
      'rhizo-model' + (hasCustomDragHandle ? '' : ' rhizo-drag-handle');
  if (typeof naked_render == 'string') {
    rawRenderings.push('<div class="');
    rawRenderings.push(renderingClass);
    rawRenderings.push('">');
    rawRenderings.push(naked_render);
    rawRenderings.push('</div>');
  } else {
    // Assume it's a jQuery object.
    var shell = $('<div />', {'class': renderingClass});
    shell.append(naked_render);
    rawRenderings.push(shell);
  }
};

/**
 * Converts HTML strings of raw renderings into rhizo.ui.Rendering objects.
 * Attaches the rendering to the visualization.
 *
 * @param {!Array.<!rhizo.model.SuperModel>} models The models to generate
 *     renderings for.
 * @param {!Array.<string>} rawRenderings The generated renderings (as an
 *     array of raw HTML strings).
 * @param {number} numRenderedModels The number of models that already have
 *     a rendering attached.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.buildFromStrings_ = function(
    models, rawRenderings, numRenderedModels) {
  this.gui_.universe.append(rawRenderings.join(''));
  this.gui_.universe.
      find('.rhizo-model').
      slice(numRenderedModels).
      each(jQuery.proxy(
        function(renderingIdx, rawRendering) {
          var model = models[renderingIdx];
          var rendering = new rhizo.ui.Rendering(
              model, $(rawRendering), this.renderer_,
              this.gui_.allRenderingHints());
          model.setRendering(rendering);
        }, this));
};

/**
 * Converts jQuery objects representing a raw rendering into rhizo.ui.Rendering
 * objects.
 *
 * @param {!Array.<!rhizo.model.SuperModel>} models The models to generate
 *     renderings for.
 * @param {!Array.<*>} rawRenderings The generated renderings (as an
 *     array of jQuery objects).
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.buildFromShells_ = function(
    models, rawRenderings) {
  for (var i = 0; i < models.length; i++) {
    this.gui_.universe.append(rawRenderings[i]);
    var rendering = new rhizo.ui.Rendering(models[i],
                                           rawRenderings[i],
                                           this.renderer_,
                                           this.gui_.allRenderingHints());
    models[i].setRendering(rendering);
  }
};

/**
 * Verifies that the number of models that were passed to the bootstrapper is
 * the same as the number of renderings that were created (both in term of
 * rhizo.ui.Rendering objects and raw HTML nodes). This ensures that rendering
 * creation has been successful.
 *
 * @param {!Array.<!HTMLElement>} rawRenderings
 * @param {!Array.<!rhizo.model.SuperModel>} models
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.sanityCheck_ = function(rawRenderings,
                                                              models) {
  if (rawRenderings.length != models.length) {
    this.logger_.error('The number of new renderings and models differ: ' +
                       rawRenderings.length + '  (raw), ' +
                       numModels + ' (models).');
    return false;
  }
  for (var i = models.length-1; i >= 0; i--) {
    if (!models[i].rendering()) {
      this.logger_.error('At least one model (id=' + models[i].id + ') ' +
                         'has no rendering attached.');
      return false;
    }
  }
  return true;
};

/**
 * @return {boolean|string|null} Whether the renderer declares a custom drag
 *     handle selector or not (in which case, the entire rendering will be
 *     used as a drag handle.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.getDragHandleSelector_ = function() {
  if (typeof(this.renderer_.dragHandle) == 'string') {
    return this.renderer_.dragHandle;
  } else if (typeof(this.renderer_.dragHandle) == 'function') {
    return this.renderer_.dragHandle();
  } else {
    return null;
  }
};

/**
 * Attach events and additional functionality to each newly generated
 * rendering.
 *
 * @param {!Object} rawRenderings The newly generated renderings, as a jQuery
 *     collection.
 * @param {!Array.<!rhizo.model.SuperModel>} models The models the renderings
 *     were generated for.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.decorateRenderings_ = function(
    rawRenderings, models) {
  // Can renderings cache their dimensions?
  if (this.canCacheDimensions_()) {
    this.startDimensionCaching_(models);
  }

  // Do renderings support an expanded state?
  if (this.expandable_()) {
    this.startExpandable_(rawRenderings, models);
  }

  // Listen for click events on renderings.
  this.startClick_(rawRenderings);

  // Enable dragging.
  // This may take some time, especially for thousands of models, so we do
  // this in a timeout callback, to give the UI the possibility to refresh.
  window.setTimeout(jQuery.proxy(function() {
      this.startDraggable_(rawRenderings);
    }, this), 100);
};

/**
 * @return {boolean} Whether the renderer or project options indicate we
 *     should cache renderings dimensions (for improved performance).
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.canCacheDimensions_ = function() {
  return (!!this.renderer_.cacheDimensions) ||
      this.options_.forceDimensionCaching();
};

/**
 * @param {!Array.<!rhizo.model.SuperModel>} models The models renderings were
 *     generated for.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.startDimensionCaching_ = function(
    models) {
  for (var i = models.length-1; i >= 0; i--) {
    models[i].rendering().startDimensionCaching();
  }
};

/**
 * @return {boolean} Whether the renderings can toggle between an expanded
 *     status and a 'normal' one.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.expandable_ = function() {
  if (typeof(this.renderer_.expandable) == 'boolean') {
    return this.renderer_.expandable;
  } else if (typeof(this.renderer_.expandable) == 'function') {
    return this.renderer_.expandable(this.gui_.allRenderingHints());
  } else {
    return false;
  }
};

/**
 * @param {!Object} rawRenderings The newly generated renderings, as a jQuery
 *     collection.
 * @param {!Array.<!rhizo.model.SuperModel>} models The models renderings were
 *     generated for.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.startExpandable_ = function(
    rawRenderings, models) {
  var expander = $('<div />',
                   {'class': 'rhizo-expand-model ' +
                       'rhizo-icon rhizo-maximize-icon',
                    title: 'Maximize'});
  for (var i = models.length-1; i >= 0; i--) {
    models[i].rendering().startExpandable(expander.clone());
  }

  // register the hover effect to show/hide the expand icon
  rawRenderings.hover(
    function() {
      $(this).children('.rhizo-expand-model').css('visibility', 'visible');
    }, function() {
      $(this).children('.rhizo-expand-model').css('visibility', 'hidden');
    });

  // listen to click events on the expand icon
  $('.rhizo-expand-model', this.gui_.container).click(
      jQuery.proxy(function(ev) {
        var model = rhizo.ui.eventToModel(ev, this.project_);
        model.rendering().toggleExpanded();
        return false;
  }, this));
};

/**
 * Start tracking click events on renderings.
 *
 * @param {!Object} rawRenderings The newly generated renderings, as a jQuery
 *     collection.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.startClick_ = function(rawRenderings) {
  rawRenderings.click(jQuery.proxy(function(ev) {
    var model = rhizo.ui.eventToModel(ev, this.project_);
    if (model.rendering().isMode('__dragging__')) {
      // A spurious click event always fires after a drag event, which we
      // ignore.
      model.rendering().removeMode('__dragging__');
      return false;
    }

    if (ev.target.nodeName == 'A') {
      // If a link was clicked, let the event bubble up.
      return;
    }
    
    if ($(ev.target).is('.rhizo-stop-propagation') ||
        $(ev.target).parents('.rhizo-stop-propagation').length > 0) {
      // Stop propagation if the event originated within a node that explicitly
      // requests so.
      return false;
    }
    
    this.project_.eventBus().publish(
        'selection', {'action': 'toggle', 'models': model.id});
    return false;
  }, this));
};

/**
 * Enable support for dragging renderings.
 *
 * @param {!Object} rawRenderings The newly generated renderings, as a jQuery
 *     collection.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.startDraggable_ = function(
    rawRenderings) {
  rawRenderings.draggable({
    cursor: 'pointer',
    handle: this.getDragHandleSelector_() || '.rhizo-drag-handle',
    distance: 3,
    addClasses: false,
    start: jQuery.proxy(function(ev, ui) {
      var model = rhizo.ui.elementToModel(ui.helper[0], this.project_);
      model.rendering().
          setMode('__dragging__').
          markPosition().
          pushElevation('__dragging__', 10000);

      // figure out all the initial positions for the selected elements
      // and store them.
      if (this.project_.selectionManager().isSelected(model.id)) {
        var all_selected = this.project_.selectionManager().allSelected();
        for (var id in all_selected) {
          this.project_.model(id).rendering().markPosition();
        }
      }
    }, this),
    drag: jQuery.proxy(function(ev, ui) {
      var model = rhizo.ui.elementToModel(ui.helper[0], this.project_);
      if (this.project_.selectionManager().isSelected(model.id)) {
        var delta = model.rendering().distanceFromMark(ui.position.top,
                                                      ui.position.left);
        var all_selected = this.project_.selectionManager().allSelected();
        for (var id in all_selected) {
          if (id != model.id) {
            all_selected[id].rendering().moveFromMark(
                delta.top, delta.left, true);
          }
        }
      }
    }, this),
    stop: jQuery.proxy(function(ev, ui) {
      var modelPositions = [];
      var model = rhizo.ui.elementToModel(ui.helper[0], this.project_);
      model.rendering().
          unmarkPosition().
          refreshPosition().
          popElevation('__dragging__');

      modelPositions.push({id: model.id,
                           top: model.rendering().position().top,
                           left: model.rendering().position().left});

      if (this.project_.selectionManager().isSelected(model.id)) {
        var all_selected = this.project_.selectionManager().allSelected();
        for (var id in all_selected) {
          modelPositions.push({
              id: id,
              top: all_selected[id].rendering().position().top,
              left: all_selected[id].rendering().position().left
          });
          all_selected[id].rendering().unmarkPosition().refreshPosition();
        }
      }
      this.project_.layoutManager().modelsMoved(modelPositions);
    }, this),
    refreshPositions: false
  });
};
