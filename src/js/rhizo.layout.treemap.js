/*
  Copyright 2010 Riccardo Govoni battlehorse@gmail.com

  Licensed under the Apache License, Version 2.0 (the &quot;License&quot;);
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an &quot;AS IS&quot; BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

// RHIZODEP=rhizo.layout,rhizo.ui
// Dependency on rhizo.ui is for rhizo.ui.reRender.

namespace("rhizo.layout");
namespace("rhizo.layout.treemap");

// TreeMap Layout.
// Based on the "Squarified Treemaps" algorithm, by Mark Bruls, Kees Huizing,
// and Jarke J. van Wijk (http://tinyurl.com/2eey2zn).
//
// TODO(battlehorse): When expanding and unexpanding a model in this layout, the
// model is re-rendered with its original size, not the one the treemap expects.
//
// TODO(battlehorse): This layout does not support nesting and hierarchies yet.
//
// TODO(battlehorse): Should offer the possibility to color items via a
// logarithmic scale.

/**
 * Enumarates the growing direction of treemap slices (which accumulate treemap
 * nodes either along vertical or horizontal lines).
 * @enum {string}
 */
rhizo.layout.treemap.TreeMapDirection = {
  HOR: 'h',
  VER: 'v'
};


/**
 * Treemaps affect the rendering (size, colors) of models. A backup manager
 * saves models original attributes and restores them once they are used in the
 * layout process.
 * 
 * The backup manager is preserved through multiple consequent applications of
 * the TreeMapLayout:
 * - when two TreeMapLayouts are applied consequently only the delta of models
 *   between the two is restored (removed from backup models) or added to the
 *   set.
 * - when a TreeMapLayout is replaced by a different one, all backup models
 *   are restored (see restoreAll()).
 * - when a TreeMapLayout replaces a previous (different) layout, the set of
 *   backup models is initially empty and populated during the layout
 *   operation.
 * 
 * @constructor
 */
rhizo.layout.treemap.ModelBackupManager = function() {

  /**
   * @type {Object.<string, rhizo.layout.treemap.ModelBackup}
   * @private
   */
  this.modelBackups_ = {};
  this.numBackups_ = 0;
};

/**
 * Adds a new model to the backup, if it is not already in there.
 * @param {rhizo.model.SuperModel} model The model to backup.
 * @return {boolean} if the model was added to the backups.
 */
rhizo.layout.treemap.ModelBackupManager.prototype.backup = function(model) {
  if (!(model.id in this.modelBackups_)) {
    this.modelBackups_[model.id] = new rhizo.layout.treemap.ModelBackup(model);
    this.numBackups_++;
    return true;
  }
  return false;
};

/**
 * Removes a model from the backup (if present) without restoring it.
 * @param {string} modelId.
 */
rhizo.layout.treemap.ModelBackupManager.prototype.removeBackup = function(modelId) {
  if (modelId in this.modelBackups_) {
    delete this.modelBackups_[modelId];
    this.numBackups_--;
  }
};

/**
 * Updates the set of currently backed up models by restoring all the models
 * that were previously rendered as treemap nodes but they won't be anymore in
 * the current layout run.
 * 
 * @param {Array.<rhizo.model.SuperModel>} supermodels List of models that will
 *     be laid out in the current layout run.
 * @param {boolean} colorReset Whether we are moving from a color-coded treemap
 *     layout to a non-color-coded one.
 */
rhizo.layout.treemap.ModelBackupManager.prototype.restore = function(
      supermodels, colorReset) {
  if (this.numBackups_ > 0) {
    var survivingModelIds = {};
    for (var i = 0; i < supermodels.length; i++) {
      survivingModelIds[supermodels[i].id] = true;
    }
    var restorableModels = {};
    for (var modelId in this.modelBackups_) {
      if (!(modelId in survivingModelIds)) {
        restorableModels[modelId] = true;
      }
    }
    this.restoreInternal_(restorableModels, true, true);

    if (colorReset) {
      this.restoreInternal_(this.modelBackups_,
                            /*sizes=*/ false, /*colors=*/ true);
    }
  }
};

/**
 * Restores all the backups.
 */
rhizo.layout.treemap.ModelBackupManager.prototype.restoreAll = function() {
  this.restoreInternal_(this.modelBackups_, true, true);
  this.modelBackups_ = {};  // just in case.
  this.numBackups_ = 0;
};

rhizo.layout.treemap.ModelBackupManager.prototype.restoreInternal_ = function(
    modelsMap, restoreSizes, restoreColors) {
  for (var modelId in modelsMap) {
    this.modelBackups_[modelId].restore(restoreSizes, restoreColors);
    if (restoreSizes && restoreColors) {
      delete this.modelBackups_[modelId];      
      this.numBackups_--;
    }
  }
};


/**
 * A wrapper around a supermodel to backup relevant rendering attributes that
 * will need to be restored once we leave (or change) TreeMapLayout.
 *
 * @param {rhizo.model.SuperModel} model The model to backup.
 * @constructor
 */
rhizo.layout.treemap.ModelBackup = function(model) {
  this.model_ = model;
  this.originalDimensions_ = jQuery.extend({}, model.getDimensions());
  this.originalBackground_ = model.nakedCss('background-color');
};

rhizo.layout.treemap.ModelBackup.prototype.restore = function(restoreSizes,
                                                              restoreColors) {
  if (restoreColors) {
    this.model_.setNakedCss({backgroundColor: this.originalBackground_});
  }
  if (restoreSizes) {
    this.model_.rescaleRendering(this.originalDimensions_.width,
                                 this.originalDimensions_.height);
  }
};


/**
 * A node in the TreeMapLayout. Each node represents a single supermodel and can
 * alter the model rendering to match treemap requirements (such as size and
 * color).
 * 
 * It also keeps track of its positioning information within the layout.
 * 
 * @constructor
 * @param {rhizo.model.SuperModel} supermodel
 * @param {string} areaMeta The model attribute that maps to areas in the
 *     treemap layout.
 * @param {number} areaRatio The squared-pixel to area ratio, to map between
 *     area values as extracted from models and associated pixel dimensions in
 *     the layout representation.
 */
rhizo.layout.treemap.TreeMapNode = function(supermodel, areaMeta, areaRatio) {
  this.model_ = supermodel;
  this.area_ = parseFloat(this.model_.unwrap()[areaMeta]) * areaRatio;
  if (isNaN(this.area_) || this.area_ < 0) {
    this.area_ = 0.0;
  }
  this.top_ = 0;
  this.left_ = 0;
};

rhizo.layout.treemap.TreeMapNode.prototype.area = function() {
  return this.area_;
};

/**
 * Returns the {top, left} coordinates of this node, with respect to the overall
 * container that contains the whole treemap layout.
 */
rhizo.layout.treemap.TreeMapNode.prototype.position = function() {
  return {top: this.top_, left: this.left_};
};

rhizo.layout.treemap.TreeMapNode.prototype.model = function() {
  return this.model_;
};

/**
 * Returns whether this treemap node is hidden from layout. Although it may
 * represent a non-filtered (visible) model, the model characteristics can be
 * of such kind to prevent this node from showing (e.g.: too small area).
 */
rhizo.layout.treemap.TreeMapNode.prototype.isHidden = function() {
  return this.model_.isFiltered('__treemap__');
};

rhizo.layout.treemap.TreeMapNode.prototype.hide = function() {
  this.model_.filter('__treemap__');
};

/**
 * Moves this node model rendering to the given {top, left} coordinates, with
 * respect to the overall container that contains the whole treemap layout.
 */
rhizo.layout.treemap.TreeMapNode.prototype.move = function(top, left) {
  this.top_ = Math.round(top);
  this.left_ = Math.round(left);
  this.model_.rendering.move(this.top_, this.left_);
};

/**
 * Resizes this node model rendering to the desired width and height.
 * @return {boolean} whether the resizing was successful.
 */
rhizo.layout.treemap.TreeMapNode.prototype.resize = function(width, height) {
  return this.model_.rescaleRendering(width, height);
};

rhizo.layout.treemap.TreeMapNode.prototype.color = function(colorRange) {
  var colorVal = parseFloat(this.model_.unwrap()[colorRange.meta]);
  if (!isNaN(colorVal)) {
    this.model_.setNakedCss({backgroundColor:
                             this.getBackgroundColor_(colorVal, colorRange)});
  }
};

/**
 * Returns the color to assign to this node in a scale ranging from
 * colorRange.colorMin to colorRange.colorMax, given the respective positioning
 * of this model color attribute within the {colorRange.min, colorRange.max)
 * scale.
 * @private
 */
rhizo.layout.treemap.TreeMapNode.prototype.getBackgroundColor_ = function(
    colorVal, colorRange) {
  var channels = ['r', 'g', 'b'];
  var outputColor = {};
  for (var i = 0; i < channels.length; i++) {
    var channel = channels[i];
    outputColor[channel] = colorRange.colorMin[channel] +
      (colorRange.colorMax[channel] - colorRange.colorMin[channel])*
      (colorVal - colorRange.min)/(colorRange.max - colorRange.min);
  }
  return 'rgb(' + Math.round(outputColor.r) + ',' +
      Math.round(outputColor.g) + ',' +
      Math.round(outputColor.b) + ')';
};


/**
 * A slice is a linear sequence of given length of treemap nodes.
 * The slice span changes dinamically to accomodate new nodes added to it.
 * @constructor
 * @param {number} length
 * @param {rhizo.layout.treemap.TreeMapDirection} direction
 * @param {Object} anchorPoint The {x,y} position of the top left corner of the
 *     slice, with respect to the overall container that contains the whole
 *     treemap layout.
 */
rhizo.layout.treemap.TreeMapSlice = function(length, direction, anchorPoint) {
  this.length_ = length;
  this.direction_ = direction;
  this.anchorPoint_ = anchorPoint;
  this.nodes_ = [];
  this.sliceArea_ = 0.0;
  this.minArea_ = Number.MAX_VALUE;
};

rhizo.layout.treemap.TreeMapSlice.prototype.direction = function() {
  return this.direction_;
};

rhizo.layout.treemap.TreeMapSlice.prototype.anchorPoint = function() {
  return this.anchorPoint_;
};

/**
 * @param {rhizo.layout.treemap.TreeMapNode} node
 */
rhizo.layout.treemap.TreeMapSlice.prototype.addNode = function(node) {
  this.nodes_.push(node);
  this.sliceArea_ += node.area();
  this.minArea_ = Math.min(this.minArea_, node.area());
};

/**
 * Returns the slice span, either as it currently is, or as it would if
 * opt_newNode were added to it.
 * 
 * @param {rhizo.layout.treemap.TreeMapNode} opt_newNode
 * @return {number}
 */
rhizo.layout.treemap.TreeMapSlice.prototype.span = function(opt_newNode) {
  if (opt_newNode) {
    return (this.sliceArea_ + opt_newNode.area()) / this.length_;
  } else {
    return this.sliceArea_ / this.length_;
  }
};

/**
 * Returns the slice aspect ratio, either as it currently is, or as it would if
 * opt_newNode were added to it.
 * 
 * @param {rhizo.layout.treemap.TreeMapNode} opt_newNode
 * @return {number}
 */
rhizo.layout.treemap.TreeMapSlice.prototype.aspectRatio = function(
    opt_newNode) {
  var span = this.span(opt_newNode);
  var ratio = null;
  if (opt_newNode) {
    ratio = Math.min(this.minArea_, opt_newNode.area()) / (1.0 * span * span);
  } else {
    ratio = this.minArea_ / (1.0 * span * span);
  }
  if (ratio < 1) {
    ratio = 1.0 / ratio;
  }
  return ratio;
};

/**
 * Renders all the nodes in the slice. Nodes are moved, resized and colored
 * to match the computed treemap layout. Any node whose rendering
 * characteristics are altered is backed up before changing it.
 * 
 * Nodes may be hidden if their area is too small to be relevant for the layout.
 * 
 * @param {rhizo.layout.treemap.ModelBackupManager} backupManager
 * @param {Object?} opt_colorRange Defines the coloring scheme to use for the
 *     treemap, if any.
 * @return {number} The total number of hidden nodes in the slice.
 */
rhizo.layout.treemap.TreeMapSlice.prototype.draw = function(backupManager,
                                                            opt_colorRange) {
  var numHiddenModels = 0;
  var t = this.anchorPoint_.y;
  var l = this.anchorPoint_.x;
  for (var i = 0; i < this.nodes_.length; i++) {
    var node = this.nodes_[i];
    if (node.isHidden()) {
      numHiddenModels++;
      continue;
    }
    var span = Math.round(this.span());
    var length = Math.round(node.area() / this.span());

    if (length == 0 || span == 0) {
      // Hide items that are too small to be displayed on screen
      node.hide();
      numHiddenModels++;
    } else {
      var renderingSize = {};
      if (this.direction_ == rhizo.layout.treemap.TreeMapDirection.HOR) {
        renderingSize['width'] = length;
        renderingSize['height'] = span;
      } else {
        renderingSize['width'] = span;
        renderingSize['height'] = length;
      }
      var isNewBackup = backupManager.backup(node.model());
      if (!node.resize(renderingSize['width'], renderingSize['height'])) {
        node.hide();
        numHiddenModels++;
        if (isNewBackup) {
          backupManager.removeBackup(node.model().id);          
        }
      } else {
        if (opt_colorRange) {
          node.color(opt_colorRange);
        }
        node.move(t, l);
      }
    }
    if (this.direction_ == rhizo.layout.treemap.TreeMapDirection.HOR) {
      l += length;
    } else {
      t += length;
    }
  }
  return numHiddenModels;
};


/**
 * Implements the treemap layout algorithm.
 * @constructor
 */
rhizo.layout.TreeMapLayout = function(project) {
  this.project_ = project;

  this.areaSelector_ = null;
  this.colorSelector_ = null;
  this.parentKeySelector_ = null;

  this.prevColorMeta_ = '';
  this.backupManager_ = new rhizo.layout.treemap.ModelBackupManager();
};

rhizo.layout.TreeMapLayout.prototype.layout = function(container,
                                                       supermodels,
                                                       allmodels,
                                                       meta,
                                                       opt_options) {
  var areaMeta = this.areaSelector_.val();
  var colorMeta = this.colorSelector_.val();
  var parentKey = this.parentKeySelector_.val();

  // Restore models that are no longer part of the treemap.
  // Keep track of the last coloring key used, in case we have to restore remove
  // color coding at a later layout run.
  this.backupManager_.restore(supermodels,
                              this.prevColorMeta_ != '' && colorMeta == '');
  this.prevColorMeta_ = colorMeta;  

  // Revert expanded models.
  if (rhizo.ui.expandable(this.project_.renderer(), opt_options)) {
    this.revertExpandedModels_(supermodels, opt_options);    
  }

  // Compute the min and max coloring ranges.
  var colorRange = null;
  if (colorMeta.length > 0) {
    colorRange = this.computeColoringRange_(supermodels, colorMeta);    
  }

  // Pointer to the container were new treemap nodes are added to. Initially
  // maps to the entire available rendering area.
  var boundingRect = {
    width: container.width(),
    height: container.height()
  };

  // Identify whether we are rendering nested treemaps or just a flat one with
  // no hierarchy.
  var treemapRoots;
  if (parentKey.length > 0) {
    try {
      treemapRoots = new rhizo.layout.Treeifier(parentKey).buildTree(
          supermodels, allmodels);
    } catch(e) {
      if (e.name == "TreeCycleException") {
        this.project_.logger().error(e);
        return;
      } else {
        throw e;  
      }
    }
  }

  var numHiddenModels = 0;
  if (!treemapRoots) {
    var slices = this.layoutFlatMap_(boundingRect,
                                     supermodels,
                                     meta,
                                     areaMeta);

    if (slices.length > 0) {
      for (var i = 0; i < slices.length; i++) {
        numHiddenModels += slices[i].draw(this.backupManager_, colorRange);
      }
    }
  } else {
    // NOT IMPLEMENTED YET.
  }

  if (numHiddenModels > 0) {
    this.project_.alignVisibility();
  }
};

rhizo.layout.TreeMapLayout.prototype.cleanup = function(sameEngine,
                                                        opt_options) {
  // Restore all models to their original sizes, if we are moving to a different
  // layout engine.
  if (!sameEngine) {
    this.backupManager_.restoreAll();
  }
  this.project_.resetAllFilter('__treemap__');
  this.project_.alignVisibility();
};

rhizo.layout.TreeMapLayout.prototype.details = function() {
  this.areaSelector_ = rhizo.layout.metaModelKeySelector(
    this.project_, 'rhizo-treemaplayout-area');
  this.colorSelector_ = rhizo.layout.metaModelKeySelector(
    this.project_, 'rhizo-treemaplayout-color');
  this.colorSelector_.append("<option value='' selected>-</option>");
  this.parentKeySelector_ = rhizo.layout.metaModelKeySelector(
    this.project_, 'rhizo-treemaplayout-parentKey');
  this.parentKeySelector_.append("<option value='' selected>-</option>");
  return $("<div />").
      append("Area: ").
      append(this.areaSelector_).
      append(" Color:").
      append(this.colorSelector_).
      append(" Parent: ").
      append(this.parentKeySelector_);
};

rhizo.layout.TreeMapLayout.prototype.toString = function() {
  return "TreeMap";
};

/**
 * Lays out all the given models according to the treemap algorithm, with no
 * nesting (all models are assumed to be on the same level).
 * 
 * @private
 * @return {Array.<rhizo.layout.treemap.TreeMapSlice>}
 */
rhizo.layout.TreeMapLayout.prototype.layoutFlatMap_ = function(
    boundingRect, supermodels, meta, areaMeta) {
  var slices = [];

  if (supermodels.length == 0) {
    return slices;
  }

  // Accumulate area
  var totalArea = 0.0;
  for (var i = 0; i < supermodels.length; i++) {
    var area = parseFloat(supermodels[i].unwrap()[areaMeta]);
    if (!isNaN(area) && area > 0.0) {
      // isNaN() occurs when areaMeta is not a numeric property and/or extracted
      // values cannot be converted into a number.
      totalArea += area;
    }
  }

  // Compute the ratio between the treemap area as defined by the dimension we
  // are treemapping along and the available pixel region as defined by the
  // boundingRect we will render into.
  var areaRatio;
  if (totalArea > 0) {
      areaRatio = boundingRect.width * boundingRect.height * 1.0 / totalArea;
  }

  // Create the first slice.
  if (boundingRect.width < boundingRect.height) {
    slices.push(new rhizo.layout.treemap.TreeMapSlice(
      boundingRect.width,
      rhizo.layout.treemap.TreeMapDirection.HOR,
      {x:0, y:0}));
  } else {
    slices.push(new rhizo.layout.treemap.TreeMapSlice(
      boundingRect.height,
      rhizo.layout.treemap.TreeMapDirection.VER,
      {x:0, y:0}));
  }
  var currentSlice = slices[0];
  var modelsCount = 0;

  // Sort the models and add the first node to the first slice, to bootstrap
  // the algorithm.
  supermodels.sort(rhizo.meta.sortBy(areaMeta, meta[areaMeta].kind, true));
  var node = new rhizo.layout.treemap.TreeMapNode(supermodels[modelsCount++],
                                                  areaMeta,
                                                  areaRatio);
  if (node.area() <= 0.0) {
    node.hide();
  }
  currentSlice.addNode(node);

  while (modelsCount < supermodels.length) {
    node = new rhizo.layout.treemap.TreeMapNode(supermodels[modelsCount++],
                                                areaMeta,
                                                areaRatio);
    if (node.area() <= 0.0) {
      node.hide();
      currentSlice.addNode(node);
      continue;
    }

    // compute the worst aspect ratio the slice would have if the node were
    // added to the current slice.
    var withAspectRatio = currentSlice.aspectRatio(node);
    var withoutAspectRatio = currentSlice.aspectRatio();

    if (withAspectRatio > withoutAspectRatio) {
      // Create a new slice, in the opposite direction from the current one and
      // update the remainder boundingRect.
      boundingRect = this.getRemainderBoundingRect_(boundingRect, currentSlice);

      var boundingRectSpan =
        currentSlice.direction() == rhizo.layout.treemap.TreeMapDirection.HOR ?
        boundingRect.height : boundingRect.width;

      if (currentSlice.direction() == rhizo.layout.treemap.TreeMapDirection.HOR) {
        currentSlice = new rhizo.layout.treemap.TreeMapSlice(
          boundingRectSpan,
          rhizo.layout.treemap.TreeMapDirection.VER,
          {x:currentSlice.anchorPoint().x,
           y: currentSlice.anchorPoint().y + currentSlice.span()});
      } else {
        currentSlice = new rhizo.layout.treemap.TreeMapSlice(
          boundingRectSpan,
          rhizo.layout.treemap.TreeMapDirection.HOR,
          {x: currentSlice.anchorPoint().x + currentSlice.span(),
           y: currentSlice.anchorPoint().y});
      }
      slices.push(currentSlice);
    }
    currentSlice.addNode(node);

  }
  return slices;
};

rhizo.layout.TreeMapLayout.prototype.getRemainderBoundingRect_ = function(
    boundingRect, slice) {
  var sliceSpan = slice.span();
  if (slice.direction() == rhizo.layout.treemap.TreeMapDirection.HOR) {
    return {width: boundingRect.width,
            height: boundingRect.height - sliceSpan};
  } else {
    return {width: boundingRect.width - sliceSpan,
            height: boundingRect.height};
  }
};

/**
 * Computes the minimum and maximum models' values for the coloring attribute,
 * to be able to later map this range into an RGB color range.
 * 
 * @param {Array.<rhizo.model.SuperModel>} supermodels List of models that will
 *     be laid out.
 * @param {string} colorMeta The model property that drives treemap coloring.
 * @return {Object.<string, *>} A map describing the treemap coloring range.
 * @private
 */
rhizo.layout.TreeMapLayout.prototype.computeColoringRange_ = function(
    supermodels, colorMeta) {

  var colorRange = {
      min: Number.MAX_VALUE,
      max: Number.MIN_VALUE,
      meta: colorMeta,
      colorMin: {r: 237, g: 76, b: 95},
      colorMax: {r: 122, g: 255, b: 115}
  };
  for (var i = supermodels.length-1; i >=0; i--) {
    var model = supermodels[i];

    // Identify the minimum and maximum color ranges.
    var colorVal = parseFloat(model.unwrap()[colorMeta]);
    if (!isNaN(colorVal)) {
      colorRange.min = Math.min(colorRange.min, colorVal);
      colorRange.max = Math.max(colorRange.max, colorVal);
    }
  }
  return colorRange;  
};

/**
 * Reverts expanded models to unexpanded status, since the layout takes charge
 * of resizing models directly.
 * 
 * @param {Array.<rhizo.model.SuperModel>} supermodels List of models that will
 *     be laid out.
 * @private
 */
rhizo.layout.TreeMapLayout.prototype.revertExpandedModels_ = function(
      supermodels, opt_options) {
  for (var i = supermodels.length-1; i >= 0; i--) {
    var model = supermodels[i];
    if (model.expanded) {

      // Revert expanded items, since it messes up with treemapping.
      model.expanded = !model.expanded;
      rhizo.ui.reRender(model,
                        this.project_.renderer(),
                        opt_options);
    }    
  }
};

// register the treemaplayout in global layout list
rhizo.layout.layouts.treemap = rhizo.layout.TreeMapLayout;
