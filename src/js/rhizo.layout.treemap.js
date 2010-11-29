/*
  Copyright 2010 The Rhizosphere Authors. All Rights Reserved.

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

// RHIZODEP=rhizo.layout

namespace("rhizo.layout");
namespace("rhizo.layout.treemap");

// TreeMap Layout.
// Based on the "Squarified Treemaps" algorithm, by Mark Bruls, Kees Huizing,
// and Jarke J. van Wijk (http://tinyurl.com/2eey2zn).
//
// TODO(battlehorse): When expanding and unexpanding a model in this layout, the
// model is re-rendered with its original size, not the one the treemap expects.
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
 * saves renderings original attributes and restores them once they are used in
 * the layout process.
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
rhizo.layout.treemap.RenderingBackupManager = function() {

  /**
   * @type {Object.<string, rhizo.layout.treemap.RenderingBackup>}
   * @private
   */
  this.renderingBackups_ = {};
  this.numBackups_ = 0;
};

/**
 * Adds a new rendering to the backup, if it is not already in there.
 * @param {*} mid The unique id of the model bound to this rendering.
 * @param {rhizo.ui.Rendering} rendering The rendering to backup.
 * @return {boolean} if the rendering was added to the backups.
 */
rhizo.layout.treemap.RenderingBackupManager.prototype.backup = function(
    mid, rendering) {
  if (!(mid in this.renderingBackups_)) {
    this.renderingBackups_[mid] =
        new rhizo.layout.treemap.RenderingBackup(rendering);
    this.numBackups_++;
    return true;
  }
  return false;
};

/**
 * Removes a rendering from the backup (if present) without restoring it.
 * @param {string} mid The id of the model whose rendering is to remove.
 */
rhizo.layout.treemap.RenderingBackupManager.prototype.removeBackup = function(
    mid) {
  if (mid in this.renderingBackups_) {
    delete this.renderingBackups_[mid];
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
rhizo.layout.treemap.RenderingBackupManager.prototype.restore = function(
      supermodels, colorReset) {
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
    this.restoreInternal_(restorableModels, true, true);

    if (colorReset) {
      this.restoreInternal_(this.renderingBackups_,
                            /*sizes=*/ false, /*colors=*/ true);
    }
  }
};

/**
 * Restores all the backups.
 */
rhizo.layout.treemap.RenderingBackupManager.prototype.restoreAll = function() {
  this.restoreInternal_(this.renderingBackups_, true, true);
  this.renderingBackups_ = {};  // just in case.
  this.numBackups_ = 0;
};

rhizo.layout.treemap.RenderingBackupManager.prototype.restoreInternal_ =
    function(modelsMap, restoreSizes, restoreColors) {
  for (var mid in modelsMap) {
    this.renderingBackups_[mid].restore(restoreSizes, restoreColors);
    if (restoreSizes && restoreColors) {
      delete this.renderingBackups_[mid];
      this.numBackups_--;
    }
  }
};


/**
 * A wrapper around a supermodel rendering to backup relevant attributes that
 * will need to be restored once we leave (or change) TreeMapLayout.
 *
 * @param {rhizo.ui.Rendering} rendering The rendering to backup.
 * @constructor
 */
rhizo.layout.treemap.RenderingBackup = function(rendering) {
  this.rendering_ = rendering;
  this.originalDimensions_ = jQuery.extend({}, rendering.getDimensions());
  this.originalBackground_ = rendering.nakedCss('background-color');
};

rhizo.layout.treemap.RenderingBackup.prototype.restore = function(
    restoreSizes, restoreColors) {
  if (restoreColors) {
    this.rendering_.setNakedCss({backgroundColor: this.originalBackground_},
                                /* revert hint */ true);
  }
  if (restoreSizes) {
    this.rendering_.rescaleRendering(this.originalDimensions_.width,
                                     this.originalDimensions_.height);
    this.rendering_.popElevation('__treemap__');
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
 * @param {rhizo.layout.TreeNode} treenode The TreeNode wrapping the supermodel
 *     this TreeMapNode should bind to (the set of models to layout is converted
 *     to a tree early in the layout process, to support treemap nesting).
 * @param {number} areaRatio The squared-pixel to area ratio, to map between
 *     area values as extracted from models and associated pixel dimensions in
 *     the layout representation.
 */
rhizo.layout.treemap.TreeMapNode = function(treenode, areaRatio) {
  this.id = treenode.id;
  this.model_ = treenode.superModel;
  this.rendering_ = this.model_.rendering();
  this.area_ = treenode.area * areaRatio;
  if (isNaN(this.area_) || this.area_ < 0) {
    this.area_ = 0.0;
  }
  this.top_ = 0;
  this.left_ = 0;
};

rhizo.layout.treemap.TreeMapNode.prototype.area = function() {
  return this.area_;
};

rhizo.layout.treemap.TreeMapNode.prototype.rendering = function() {
  return this.rendering_;
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
 *
 * Also alters the rendering z-index for treemap nesting.
 */
rhizo.layout.treemap.TreeMapNode.prototype.move = function(top, left, deepness) {
  this.top_ = Math.round(top);
  this.left_ = Math.round(left);
  this.rendering_.move(this.top_, this.left_);
  this.rendering_.pushElevation('__treemap__', deepness);
};

/**
 * Resizes this node model rendering to the desired width and height.
 * @return {boolean} whether the resizing was successful.
 */
rhizo.layout.treemap.TreeMapNode.prototype.resize = function(width, height) {
  return this.rendering_.rescaleRendering(width, height);
};

rhizo.layout.treemap.TreeMapNode.prototype.colorWeighted = function(colorRange) {
  var colorVal = parseFloat(this.model_.unwrap()[colorRange.meta]);
  if (!isNaN(colorVal)) {
    this.rendering_.setNakedCss(
        {backgroundColor: this.getBackgroundColor_(colorVal, colorRange)});
  }
};

rhizo.layout.treemap.TreeMapNode.prototype.color = function(color) {
  this.rendering_.setNakedCss({backgroundColor: color});
};

rhizo.layout.treemap.TreeMapNode.prototype.assignColorRange = function(colorRange) {
  var colorVal = parseFloat(this.model_.unwrap()[colorRange.meta]);
  if (!isNaN(colorVal)) {
    colorRange.min = Math.min(colorRange.min, colorVal);
    colorRange.max = Math.max(colorRange.max, colorVal);
  }
};

/**
 * Computes the available area within this node available for nesting treemap
 * nodes that are child of this one.
 *
 * Returns a bounding rectangle of zero area is there is not enough space to
 * render nested elements.
 */
rhizo.layout.treemap.TreeMapNode.prototype.nestedBoundingRect = function() {
  // Minimum widths and heights:
  // 24px: 4px padding, retain a minimum width of 20px for rendering nested
  //       contents.
  // 39px: 4px padding, 15px header space, retain a minimum height of 20px for
  //       rendering nested contents.

  var dims = this.rendering_.getDimensions();
  if (this.isHidden() || dims.width < 24 || dims.height < 39) {
    // Setting boundingRect dimensions to 0 will nullify areaRatio, which in turn
    // zeroes nodes' area, causing them to be hidden.
    return {width: 0, height: 0};
  } else {
    return {
      width: dims.width - 4,  // 4px left and right padding
      height: dims.height - 19  // 4px top/bottom padding + 15px header space
    };
  }
};

/**
 * Returns the {x,y} anchor point, with respect to the overall container that
 * contains the whole treemap layout, to which the top-left corner of the
 * nested bounding rectangle should be anchored to.
 */
rhizo.layout.treemap.TreeMapNode.prototype.nestedAnchor = function() {
  return {
    x: this.left_ + 2,  // 2px left padding.
    y: this.top_ + 17  // 2px left padding, 15px header space
  };
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
 *     slice, with respect to the bounding rectangle this slice was laid into.
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

rhizo.layout.treemap.TreeMapSlice.prototype.nodes = function() {
  return this.nodes_;
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
 * Renders all the nodes in the slice. Nodes are moved and resized to match the
 * computed treemap layout. Any node whose rendering characteristics are altered
 * is backed up before changing it.
 *
 * Nodes may be hidden if their area is too small to be relevant for the layout.
 *
 * @param {rhizo.layout.treemap.RenderingBackupManager} backupManager
 * @param {Object?} anchorDelta The {x,y} position delta to convert node
 *     positioning relative to the slice anchorPoint into absolute positioning
 *     with respect to the overall container that contains the whole treemap
 *     layout.
 * @param {number} deepness The nesting deepness we are currently rendering at.
 * @return {number} The total number of hidden nodes in the slice.
 */
rhizo.layout.treemap.TreeMapSlice.prototype.draw = function(backupManager,
                                                            anchorDelta,
                                                            deepness) {
  anchorDelta = anchorDelta || {x:0, y:0};
  var numHiddenModels = 0;
  var t = this.anchorPoint_.y + anchorDelta.y;
  var l = this.anchorPoint_.x + anchorDelta.x;
  for (var i = 0; i < this.nodes_.length; i++) {
    var node = this.nodes_[i];
    if (node.isHidden()) {
      numHiddenModels++;
      continue;
    }
    var span = Math.round(this.span());
    var length = node.area() / this.span();

    if (Math.round(length) == 0 || span == 0) {
      // Hide items that are too small to be displayed on screen
      node.hide();
      numHiddenModels++;
    } else {
      var renderingSize = {};
      if (this.direction_ == rhizo.layout.treemap.TreeMapDirection.HOR) {
        renderingSize['width'] = Math.round(length);
        renderingSize['height'] = span;
      } else {
        renderingSize['width'] = span;
        renderingSize['height'] = Math.round(length);
      }
      var isNewBackup = backupManager.backup(node.id, node.rendering());
      if (!node.resize(renderingSize['width'], renderingSize['height'])) {
        node.hide();
        numHiddenModels++;
        if (isNewBackup) {
          backupManager.removeBackup(node.id);
        }
      } else {
        node.move(t, l, deepness);
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
 * A layout that arranges models in treemaps, possibly hierarchical.
 *
 * @param {rhizo.Project} project
 * @constructor
 */
rhizo.layout.TreeMapLayout = function(project) {
  this.project_ = project;
  this.prevColorMeta_ = null;
  this.backupManager_ = new rhizo.layout.treemap.RenderingBackupManager();

  /**
   * Map that accumulates all the nodes matching the models being laid out.
   * @type {Object.<string, rhizo.layout.TreeNode>}
   * @private
   */
  this.globalNodesMap_ = {};

  // Number of models that have been hidden specifically by this layout because
  // their area would be too small for display.
  this.numHiddenModels_ = 0;

  rhizo.layout.GUILayout.call(this, project,
                              new rhizo.layout.TreeMapLayoutUI(this, project));
};
rhizo.inherits(rhizo.layout.TreeMapLayout, rhizo.layout.GUILayout);

/**
 * Verifies whether this layout can be used, given the project metamodel.
 * The project metamodel must define at least one numeric model attribute that
 * will be used to compute treemap areas.
 *
 * @param {*} meta The project metamodel.
 */
rhizo.layout.TreeMapLayout.prototype.verifyMetaModel = function(meta) {
  for (var key in meta) {
    if (rhizo.layout.numericMatcher(key, meta[key])) {
      return true;
    }
  }
  return false;
};

/**
 * @private
 */
rhizo.layout.TreeMapLayout.prototype.defaultState_ = function() {
  return {
    area: rhizo.layout.firstMetamodelKey(this.project_,
                                         rhizo.layout.numericMatcher),
    color: null,
    parentKey: null
  };
};

/**
 * Validates a layout state. A valid state must have an 'area' property
 * pointing to the numeric metamodel key that will be used to compute treemap
 * areas.
 *
 * It might contain a 'color' property, which must be numeric, that will be
 * used to assign colors to each treemap element.
 *
 * It might contain a 'parentKey' property, which must define parent-child
 * relationships between models, that will be used to create hierarchical
 * nesting in the treemap.
 *
 * @param {*} otherState
 * @private
 */
rhizo.layout.TreeMapLayout.prototype.validateState_ = function(otherState) {
  if (!this.validateStateAttributePresence_(otherState, 'area')) {
    return false;
  }

  if (!this.validateMetamodelPresence_(otherState.area,
                                       rhizo.layout.numericMatcher)) {
    return false;
  }
  if (otherState.color &&
      !(this.validateMetamodelPresence_(otherState.color,
                                        rhizo.layout.numericMatcher))) {
    return false;
  }
  if (otherState.parentKey &&
      !(this.validateMetamodelPresence_(otherState.parentKey,
                                        rhizo.layout.parentMatcher))) {
    return false;
  }
  return true;
};

/**
 * Lays out models.
 *
 * @param {*} container jQuery object pointing to the HTML container where
 *     layout-specific UI elements should be added.
 * @param {rhizo.layout.LayoutBox} layoutBox The bounding rectangle inside which
 *     the layout should occur.
 * @param {Array.<rhizo.model.SuperModel>} supermodels List of the SuperModels
 *     that will participate in the layout.
 * @param {Object.<*, rhizo.model.SuperModel>} allmodels A map of all
 *     visualization models, mapping from the model id the associated SuperModel
 *     instance.
 * @param {*} meta The project metamodel.
 * @param {*} options The composition of project-wide configuration options and
 *     layout-specific ones.
 */
rhizo.layout.TreeMapLayout.prototype.layout = function(container,
                                                       layoutBox,
                                                       supermodels,
                                                       allmodels,
                                                       meta,
                                                       options) {
  var areaMeta = this.getState().area;
  var colorMeta = this.getState().color;
  var parentKey = this.getState().parentKey;

  // Restore models that are no longer part of the treemap.
  // Keep track of the last coloring key used, in case we have to restore remove
  // color coding at a later layout run.
  this.backupManager_.restore(supermodels,
                              this.prevColorMeta_ && !colorMeta);
  this.prevColorMeta_ = colorMeta;

  // Revert expanded models, if needed.
  this.revertExpandedModels_(supermodels);

  // Identify whether we are rendering nested treemaps or just a flat one with
  // no hierarchy.
  var treeRoot;
  this.globalNodesMap_ = {};
  if (parentKey) {
    try {
      treeRoot = new rhizo.layout.Treeifier(parentKey).buildTree(
          supermodels, allmodels, this.globalNodesMap_);
    } catch(e) {
      if (e.name == "TreeCycleException") {
        this.project_.logger().error(e);
        return false;
      } else {
        throw e;
      }
    }
  } else {
    // In the flat case, convert everything to a tree, so that we can handle
    // this with the same code that handles the tree case.
    treeRoot = new rhizo.layout.TreeNode();
    for (var i = 0; i < supermodels.length; i++) {
      treeRoot.addChild(new rhizo.layout.TreeNode(supermodels[i]));
    }
  }

  // When nesting treemaps are used, non-leaf nodes ignore their own area, and
  // rather rely on the sum of all the underlying (non-filtered) models.
  this.computeNestedAreas_(treeRoot, areaMeta);

  // Actual layout occurs here.
  this.numHiddenModels_ = this.layoutNestedMap_(
      {width: layoutBox.width, height: layoutBox.height},
      treeRoot,
      {x:0, y:0},
      /* deepness */ 50);

  // Treemap coloring (if needed).
  // Color ranges are determined by sampling values from:
  // - all visible leaf nodes.
  // - all visible non-leaf nodes whose children are all hidden.
  if (colorMeta) {
    var colorRange = {
      min: Number.MAX_VALUE,
      max: Number.MIN_VALUE,
      meta: colorMeta,
      colorMin: {r: 237, g: 76, b: 95},
      colorMax: {r: 122, g: 255, b: 115},
      colorGroup: 'transparent'
    };
    this.computeColorRange_(treeRoot, colorRange);
    this.colorTree_(treeRoot, colorRange);
  }

  // If the layout decided to hide some models, mark visibility as dirty to
  // force a realignment after layout.
  return this.numHiddenModels_ > 0;
};

rhizo.layout.TreeMapLayout.prototype.cleanup = function(sameEngine, options) {
  // Restore all models to their original sizes, if we are moving to a different
  // layout engine.
  if (!sameEngine) {
    this.backupManager_.restoreAll();
  }

  if (this.numHiddenModels_ > 0) {
    // There were hidden models, reset their filter and mark visibility as
    // dirty to force visibility alignment.
    this.project_.resetAllFilter('__treemap__');
    this.numHiddenModels_ = 0;
    return true;
  }
  return false;
};

rhizo.layout.TreeMapLayout.prototype.dependentModels = function(modelId) {
  var extension = [];
  var treeNode = this.globalNodesMap_[modelId];
  if (treeNode) {
    treeNode.deepChildsAsArray(extension);
    for (var i = extension.length-1; i >= 0; i--) {
      extension[i] = extension[i].id;
    }
  }
  return extension;
};

rhizo.layout.TreeMapLayout.prototype.toString = function() {
  return "TreeMap";
};

/**
 * Recursively lay out all the models following the tree structure defined by
 * 'treeRoot'. Each level is laid out before moving to the next (deeper) one,
 * since every level needs bounding rectangles and anchoring information from
 * the above one.
 *
 * @param {rhizo.layout.TreeNode} treeRoot
 * @return {number} The number of models that this layout wants to hide because
 *     their pixel area is too small to properly display on screen.
 * @private
 */
rhizo.layout.TreeMapLayout.prototype.layoutNestedMap_ = function(
    boundingRect, treeRoot, anchorDelta, deepness) {
  var numHiddenModels = 0;

  if (treeRoot.numChilds == 0) {
    return numHiddenModels;
  }

  // Layout all the models at the current hierarchy level.
  var slices = this.layoutFlatMap_(boundingRect, treeRoot);
  for (var i = 0; i < slices.length; i++) {

    // Draw the slices at the current level.
    // This also ensures resizing of all the slice nodes, so nested
    // boundingRects can be computed accurately.
    numHiddenModels += slices[i].draw(this.backupManager_, anchorDelta,
                                      deepness);

    // Iterate all over the TreeMapNodes that have been created at this level.
    for (var j = 0; j < slices[i].nodes().length; j++) {
      var node = slices[i].nodes()[j];
      var treenode = treeRoot.childs[node.id];

      // Bind TreeNode and TreeMapNode together (used later for coloring).
      treenode.treemapnode = node;

      // Recurse
      numHiddenModels += this.layoutNestedMap_(node.nestedBoundingRect(),
                                               treenode,
                                               node.nestedAnchor(),
                                               deepness+1);
    }
  }
  return numHiddenModels;
};

/**
 * @private
 * @param {rhizo.layout.TreeNode} firstTreeNode
 * @param {rhizo.layout.TreeNode} secondTreeNode
 */
rhizo.layout.TreeMapLayout.prototype.sortByAreaDesc_ = function(firstTreeNode,
                                                                secondTreeNode) {
  return secondTreeNode.area - firstTreeNode.area;
};

/**
 * Lays out all the given models at the current hierachy according to the
 * treemap algorithm, with no nesting.
 *
 * @private
 * @param {rhizo.layout.TreeNode} treeRoot The tree node whose children are to
 *     be laid out.
 * @return {Array.<rhizo.layout.treemap.TreeMapSlice>}
 */
rhizo.layout.TreeMapLayout.prototype.layoutFlatMap_ = function(boundingRect,
                                                               treeRoot) {
  var slices = [];

  if (treeRoot.numChilds == 0) {
    return slices;
  }

  var treenodes = treeRoot.childsAsArray();

  // Accumulate area
  var totalArea = 0.0;
  for (var i = 0; i < treenodes.length; i++) {
    totalArea += treenodes[i].area;
  }

  // Compute the ratio between the treemap area and the available pixel region as
  // defined by the boundingRect we will render into.
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
  treenodes.sort(this.sortByAreaDesc_);
  var node = new rhizo.layout.treemap.TreeMapNode(treenodes[modelsCount++],
                                                  areaRatio);
  if (node.area() <= 0.0) {
    node.hide();
  }
  currentSlice.addNode(node);

  while (modelsCount < treenodes.length) {
    node = new rhizo.layout.treemap.TreeMapNode(treenodes[modelsCount++],
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
 * Compute the area each node will occupy summing up the area occupied by all
 * childrens. Zeroes any area that cannot be parsed or is negative (causing the
 * associated model to be hidden).
 * @private
 */
rhizo.layout.TreeMapLayout.prototype.computeNestedAreas_ = function(treeNode,
                                                                    areaMeta) {
  if (treeNode.numChilds == 0) {  // leaf node
    treeNode.area = parseFloat(treeNode.superModel.unwrap()[areaMeta]);
    if (isNaN(treeNode.area) || treeNode.area < 0) {
      // isNaN() occurs when areaMeta is not a numeric property and/or extracted
      // values cannot be converted into a number.
      treeNode.area = 0.0;
    }
  } else {
    var childsArea = 0;
    for (var modelId in treeNode.childs) {
      childsArea += this.computeNestedAreas_(treeNode.childs[modelId], areaMeta);
    }
    treeNode.area = childsArea;
  }
  return treeNode.area;
};

/**
 * Recursively computes the minimum and maximum models' values for the coloring
 * attribute, to be able to later map this range into an RGB color range.
 *
 * The only nodes that participate in coloring are a) visible leaf nodes and
 * b) visible non-leaf nodes whose children are all hidden.
 *
 * @param {rhizo.layout.TreeNode} treeNode The tree node to start recursion from.
 * @param {Object.<string, *>} colorRange A map describing the treemap coloring
 *     range.
 * @private
 */
rhizo.layout.TreeMapLayout.prototype.computeColorRange_ = function(treeNode,
                                                                   colorRange) {
  if (!treeNode.is_root && treeNode.treemapnode.isHidden()) {
    return false;
  }

  // Node is visible.
  if (treeNode.numChilds > 0) {
    var hasVisibleChilds = false;
    for (var modelId in treeNode.childs) {
      // Recurse
      hasVisibleChilds = this.computeColorRange_(
          treeNode.childs[modelId], colorRange) || hasVisibleChilds;
    }
    if (!hasVisibleChilds) {
      if (!treeNode.is_root) {
        treeNode.treemapnode.assignColorRange(colorRange);
      }
    }
  } else if (!treeNode.is_root) {
    // visible leaf node.
    treeNode.treemapnode.assignColorRange(colorRange);
  }
  return true;
};

rhizo.layout.TreeMapLayout.prototype.colorTree_ = function(treeNode,
                                                           colorRange) {
  if (!treeNode.is_root && treeNode.treemapnode.isHidden()) {
    return false;
  }

  // Node is visible
  if (treeNode.numChilds > 0) {
    var hasVisibleChilds = false;
    for (var modelId in treeNode.childs) {
      // Recurse
      hasVisibleChilds = this.colorTree_(
          treeNode.childs[modelId], colorRange) || hasVisibleChilds;
    }
    if (!treeNode.is_root) {
      if (hasVisibleChilds) {
        treeNode.treemapnode.color(colorRange.colorGroup);
      } else {
        treeNode.treemapnode.colorWeighted(colorRange);
      }
    }
  } else if (!treeNode.is_root) {
    // visible leaf node.

    // We can safely color with no backup: These are all visible models, hence
    // a backup has already been created for them.
    treeNode.treemapnode.colorWeighted(colorRange);
  }
  return true;
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
      supermodels) {
  for (var i = supermodels.length-1; i >= 0; i--) {
    supermodels[i].rendering().setExpanded(false);
  }
};


/**
 * Helper class that handles TreeMapLayout ui controls.
 * @param {rhizo.layout.TreeMapLayout} layout
 * @param {rhizo.Project} project
 * @constructor
 */
rhizo.layout.TreeMapLayoutUI = function(layout, project) {
  this.layout_ = layout;
  this.project_ = project;

  this.areaSelector_ = null;
  this.colorSelector_ = null;
  this.parentKeySelector_ = null;
};

rhizo.layout.TreeMapLayoutUI.prototype.renderControls = function() {
  var hasParentKeys = this.checkParentKeys_();
  var details = $('<div />');

  this.areaSelector_ = rhizo.layout.metaModelKeySelector(
      this.project_,
      'rhizo-treemaplayout-area',
      rhizo.layout.numericMatcher).
    change(jQuery.proxy(this.updateState_, this));
  this.colorSelector_ = rhizo.layout.metaModelKeySelector(
      this.project_,
      'rhizo-treemaplayout-color',
      rhizo.layout.numericMatcher).
    append("<option value=''>-</option>").
    change(jQuery.proxy(this.updateState_, this));
  details.
      append("Area: ").append(this.areaSelector_).
      append(" Color:").append(this.colorSelector_);

  if (hasParentKeys) {
    this.parentKeySelector_ = rhizo.layout.metaModelKeySelector(
        this.project_,
        'rhizo-treemaplayout-parentKey',
        rhizo.layout.parentMatcher).
      append("<option value=''>-</option>").
      change(jQuery.proxy(this.updateState_, this));

    details.append(" Parent: ").append(this.parentKeySelector_);
  }

  return details;
};

/**
 * Checks whether the project metamodel contains keys that define parent-child
 * relationships between models, so that hierarchical treemaps can be built.
 * @return {boolean} Whether the project allows hierarchical treemaps or not.
 * @private
 */
rhizo.layout.TreeMapLayoutUI.prototype.checkParentKeys_ = function() {
  for (var key in this.project_.metaModel()) {
    if (rhizo.layout.parentMatcher(key, this.project_.metaModel()[key])) {
      return true;
    }
  }
  return false;
};

rhizo.layout.TreeMapLayoutUI.prototype.setState = function(state) {
  this.areaSelector_.val(state.area);
  this.colorSelector_.val(state.color || '');  // color is optional
  if (this.parentKeySelector_) {
    this.parentKeySelector_.val(state.parentKey || '');  // parent is optional.
  }
};

/**
 * Updates the layout state whenever the user modifies the controls.
 * @private
 */
rhizo.layout.TreeMapLayoutUI.prototype.updateState_ = function() {
  var state = {
    area: this.areaSelector_.val(),
    color: this.colorSelector_.val()
  };
  if (this.parentKeySelector_) {
    state.parentKey = this.parentKeySelector_.val();
  }
  this.layout_.setStateFromUI(state);
};


// register the treemaplayout in global layout list
rhizo.layout.layouts.treemap = rhizo.layout.TreeMapLayout;
