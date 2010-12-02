/*
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
 * @param {rhizo.Project} project The visualization project.
 * @param {*} container The jQuery object pointing to a container where
 *     rendering artifacts will be added (typically the visualization universe).
 * @constructor
 */
rhizo.ui.RenderingPipeline = function(project, container) {
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
      css('visibility', 'hidden').
      appendTo(container);
  this.project_ = project;
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
    op.elevation = {key: opt_elevation_key, value: opt_elevation_value};
  }
  modelOps.push(op);
  return this;
};

/**
 * Appends a rendering resize request to the current pipeline.
 *
 * @param {*} modelId The id of the model to resize.
 * @param {number} width The width (in pixels) the rendering should be resized
 *     to.
 * @param {number} height The height (in pixels) the rendering should be resized
 *     to.
 * @return {rhizo.ui.RenderingPipeline} The pipeline itself, for chaining.
 */
rhizo.ui.RenderingPipeline.prototype.resize = function(modelId, width, height) {
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
 * Removes all artifacts that were added to the pipeline.
 */
rhizo.ui.RenderingPipeline.prototype.cleanup = function() {
  this.artifactLayer_.remove();
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
  this.artifactLayer_.css('visibility', 'visible');
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
 * Manages a max-heap of renderings' named elevations (z-indexes when applied to
 * HTML elements). A rendering can be raised to different elevations, with
 * the highest one being the one that is effectively used.
 *
 * Base elevation is 0, and any elevation request below or equal to that
 * threshold will be ignored.
 * @constructor
 */
rhizo.ui.Elevation = function() {
  this.elevations_ = {};
  this.elevation_top_ = 0;

  // An offset that will always be added to the returned elevation values.
  // Should match the base z-index used by Rhizosphere models.
  this.elevation_offset_ = 50;
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
  this.naked_node_ = rawNode.children();

  // Bind the model id to each rendering
  this.raw_node_.data('id', model.id);

  this.renderer_ = renderer;
  this.renderingHints_ = renderingHints;
  this.rendererSizeChecker_ = null;
  this.rendererRescaler_ = null;
  this.rendererStyleChanger_ = null;
  this.setRendererHelpers_();

  this.expandable_ = false;  // Whether the rendering supports expansion or not.
  this.expanded_ = false;  // whether the rendering is expanded or not

  // Whether the rendering should cache its dimensions.
  this.cacheDimensions_ = false;
  this.cachedDimensions_ = {};

  // The rendering position, at the time of the last move() call.
  this.position_ = {};

  // A position mark, that can be used to remember a previous position occupied
  // by the rendering.
  this.mark_ = null;

  // whether the rendering is visible or not. Multiple states might exist,
  // as defined in the rhizo.ui.Visibility enum.
  this.visibility = rhizo.ui.Visibility.HIDDEN;

  // Keeps track of all z-indexes changes.
  this.elevation_ = new rhizo.ui.Elevation();

  /**
   * The set of rendering modes.
   * @type {Object.<string, boolean>}
   * @private
   */
  this.modes_ = {};
};

/**
 * @private
 */
rhizo.ui.Rendering.prototype.setRendererHelpers_ = function() {
  if (typeof(this.renderer_.minSize) == 'function') {
    this.rendererSizeChecker_ = this.renderer_.canRescaleTo;
  }
  if (typeof(this.renderer_.rescale) == 'function') {
    this.rendererRescaler_ = this.renderer_.rescale;
  }
  if (typeof(this.renderer_.changeStyle) == 'function') {
    this.rendererStyleChanger_ = this.renderer_.changeStyle;
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
 * Regenerates the naked and raw renderings for the model managed by this
 * rendering.
 * @private
 */
rhizo.ui.Rendering.prototype.reRender_ = function() {
  // re-render. rendered expects the naked model.
  // Must wrap in $() in case renderer returns raw strings.
  this.naked_node_ = $(this.renderer_.render(this.model_.unwrap(),
                                             this.expanded_,
                                             this.renderingHints_));

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
  this.raw_node_.children(':not(.rhizo-expand-model)').remove();
  this.raw_node_.append(this.naked_node_);
  this.refreshCachedDimensions_();
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
    var canResize = this.rendererSizeChecker_(this.naked_node_,
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
  this.cachedDimensions_ = {width: width, height: height};
  this.raw_node_.width(width - 2).height(height - 2);
  if (this.rendererRescaler_) {
    // Give the original model renderer a chance to rescale the naked render,
    // if a rescaler has been defined.
    //
    // Like this method, the rescaler too receives outer dimensions.
    this.rendererRescaler_(this.naked_node_, width - 2, height - 2);
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
    this.rendererStyleChanger_(this.naked_node_, props, opt_hintRevert);
  } else {
    this.naked_node_.css(props);
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
  return this.naked_node_.css(propName);
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
 * A RenderingBootstrap is responsible for building the renderings attached
 * to each model to visualize. It relies on the externally provided renderer
 * to convert each model into a 'naked' rendering, which is then wrapped in
 * a rhizo.ui.Rendering to enrich it with all the additional Rhizosphere
 * functionalities.
 *
 * @param {*} renderer Externally provided renderer, to convert models into
 *     their HTML rendering counterparts.
 * @param {rhizo.ui.gui.GUI} gui The project gui.
 * @param {rhizo.Project} project The project itself.
 * @param {*} options Project-wide options.
 * @constructor
 */
rhizo.ui.RenderingBootstrap = function(renderer, gui, project, options) {
  this.renderer_ = renderer;
  this.gui_ = gui;
  this.project_ = project;
  this.logger_ = project.logger();
  this.options_ = options;

  this.renderings_ = [];
};

/**
 * Converts a list of models into their HTML rendering counterparts.
 *
 * @param {Array.<rhizo.model.SuperModel>} models
 * @return {boolean} Whether the renderings were created successfully or not.
 */
rhizo.ui.RenderingBootstrap.prototype.buildRenderings = function(models) {
  var rawRenderings = [];
  for (var i = 0;  i < models.length; i++) {
    this.rawrender_(models[i], rawRenderings);
  }
  if (rawRenderings.length == 0) {
    this.logger_.error("No renderings.");
    return false;
  }

  var numModels = models.length;
  if (typeof rawRenderings[0] == 'string') {
    // The project renderer returns raw strings.
    //
    // We concatenate everything together and add it to the DOM in a single
    // pass. We then identify back all the single renderings and bind them
    // to the model they belong to.
    this.buildFromStrings_(models, rawRenderings);
  } else {
    // The project renderer returns jQuery objects.
    //
    // We append them to the DOM one at a time and assign them to their model.
    this.buildFromShells_(models, rawRenderings);
  }
  rawRenderings = this.gui_.universe.find('.rhizo-model');

  // Sanity checks
  if (!this.sanityCheck_(rawRenderings, models.length)) {
    return false;
  }

  // Attach events and additional functionality to each rendering. This may be
  // done on the rawRenderings directly for performance reasons.
  this.decorateRenderings_(rawRenderings);
  return true;
};

/**
 * @return {Array.<rhizo.ui.Rendering>} The list of renderings managed by the
 *     visualization. They are ordered to match the ordering of the models
 *     the renderings were created from.
 */
rhizo.ui.RenderingBootstrap.prototype.renderings = function() {
  return this.renderings_;
};

/**
 * Accumulates the raw rendering for the given model to the list of all raw
 * renderings, either as a serie of HTML strings or as a jQuery object
 * (depending on what the naked renderer provides).
 *
 * @param {rhizo.model.SuperModel} model
 * @param {Array.<*>} rawRenderings
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.rawrender_ = function(model,
                                                            rawRenderings) {
  var naked_render = this.renderer_.render(model.unwrap(),
                                           model.expanded,
                                           this.gui_.allRenderingHints());
  if (typeof naked_render == 'string') {
    rawRenderings.push('<div class="rhizo-model">');
    rawRenderings.push(naked_render);
    rawRenderings.push('</div>');
  } else {
    // Assume it's a jQuery object.
    var shell = $('<div class="rhizo-model"></div>');
    shell.append(naked_render);
    rawRenderings.push(shell);
  }
};

/**
 * Converts HTML strings of raw renderings into rhizo.ui.Rendering objects.
 * Attaches the rendering to the visualization.
 *
 * @param {Array.<rhizo.model.SuperModel>} models
 * @param {Array.<string>} rawRenderings
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.buildFromStrings_ = function(
    models, rawRenderings) {
  this.gui_.universe.append(rawRenderings.join(''));
  this.gui_.universe.find('.rhizo-model').each(jQuery.proxy(
      function(renderingIdx, rawRendering) {
        var model = models[renderingIdx];
        var rendering = new rhizo.ui.Rendering(model,
                                               $(rawRendering),
                                               this.renderer_,
                                               this.gui_.allRenderingHints());
        model.setRendering(rendering);
        this.renderings_.push(rendering);
      }, this));
};

/**
 * Converts jQuery objects representing a raw rendering into rhizo.ui.Rendering
 * objects.
 *
 * @param {Array.<rhizo.model.SuperModel>} models
 * @param {Array.<*>} rawRenderings
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
    this.renderings_.push(rendering);
  }
};

/**
 * Verifies that the number of models, raw renderings and renderings is the
 * same, to ensure the rendering creation has been successful.
 *
 * @param {Array.<HTMLElement>} rawRenderings
 * @param {number} numModels
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.sanityCheck_ = function(rawRenderings,
                                                              numModels) {
  if (rawRenderings.length != numModels ||
      this.renderings_.length != numModels) {
    this.logger_.error('The number of renderings and models differ: ' +
                       rawRenderings.length + '  (raw), ' +
                       this.renderings_.length + ' (renderings), ' +
                       numModels + ' (models).');
    return false;
  }
  return true;
};

rhizo.ui.RenderingBootstrap.prototype.decorateRenderings_ = function(
    rawRenderings) {
  // Can renderings cache their dimensions?
  if (this.canCacheDimensions_()) {
    this.startDimensionCaching_();
  }

  // Do renderings support an expanded state?
  if (this.expandable_()) {
    this.startExpandable_(rawRenderings);
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
  return (!!this.renderer_.cacheDimensions) || (!!this.options_.cacheDimensions);
};

/**
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.startDimensionCaching_ = function() {
  for (var i = this.renderings_.length-1; i >= 0; i--) {
    this.renderings_[i].startDimensionCaching();
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
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.startExpandable_ = function(
    rawRenderings) {
  var expander = $('<div />',
                   {'class': 'rhizo-expand-model ' +
                       'rhizo-icon rhizo-maximize-icon',
                    title: 'Maximize'});
  for (var i = this.renderings_.length-1; i >= 0; i--) {
    this.renderings_[i].startExpandable(expander.clone());
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
    this.project_.toggleSelect(model.id);
    return false;
  }, this));
};

/**
 * Enable support for dragging renderings.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.startDraggable_ = function(
    rawRenderings) {
  rawRenderings.draggable({
    cursor: 'pointer',
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
      if (this.project_.isSelected(model.id)) {
        var all_selected = this.project_.allSelected();
        for (var id in all_selected) {
          this.project_.model(id).rendering().markPosition();
        }
      }
    }, this),
    drag: jQuery.proxy(function(ev, ui) {
      var model = rhizo.ui.elementToModel(ui.helper[0], this.project_);
      if (this.project_.isSelected(model.id)) {
        var delta = model.rendering().distanceFromMark(ui.position.top,
                                                      ui.position.left);
        var all_selected = this.project_.allSelected();
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

      if (this.project_.isSelected(model.id)) {
        var all_selected = this.project_.allSelected();
        for (var id in all_selected) {
          modelPositions.push({
              id: id,
              top: all_selected[id].rendering().position().top,
              left: all_selected[id].rendering().position().left
          });
          all_selected[id].rendering().unmarkPosition();
        }
      }

      this.project_.modelsMoved(modelPositions);
    }, this),
    refreshPositions: false
  });
};
