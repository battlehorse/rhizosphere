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

/*
  The whole TreeLayout depends on the following classes:
  - TreeLayout: the layout itself. It builds the tree structure out of the
    supermodels and, for every root found, draws a tree. Trees are stacked from
    left to right, top to bottom, hence this class uses the 'traditional' set of
    positioning coordinates (top, left, width, height).

  - TreeLayoutUI: Helper class to manage layout UI controls.

  - TreeNode: a simple datastructure representing a node in the tree. It is used
    also to store some rendering information about the node, such as the
    bounding rectangle which can contain the rendering of the node itself and
    all its children

  - TreePainter: the class responsible for drawing each tree (aka, each set of
    nodes connected to a single root). Since trees can be rendered both
    vertically and horizontally, the TreePainter uses and abstract set of
    coordinates :
    * gd: the growing direction
    * od: the opposite direction
    Siblings are appended to the layout following the growing direction.
    Childs are appended to their parents following the opposite direction.

    Hence, in a horizontal tree, _gd_ is left to right and _od_ is top to bottom.
    In a vertical tree, _gd_ is top to bottom and _od_ is left to right.

    Using this abstract set of coordinates allows the TreePainter to re-use the
    same rendering code.
    Utility methods are provided to convert between the 'physical' and
    'abstract' coordinate set.
*/

// RHIZODEP=rhizo.layout

/**
 * Helper class that handles TreeLayout ui controls.
 * @param {rhizo.layout.TReeLayout} layout
 * @param {rhizo.Project} project
 */
rhizo.layout.TreeLayoutUI = function(layout, project) {
  this.layout_ = layout;
  this.project_ = project;

  this.directionSelector_ = null;
  this.metaModelKeySelector_ = null;
};

rhizo.layout.TreeLayoutUI.prototype.renderControls = function() {
  var parentKeys = this.getParentKeys_();
  var details = $("<div />");
  if (parentKeys.length == 0) {
    // should never happen because of verifyMetaModel
    details.append("No parent-child relationships exist");
    return details;
  }

  details.append(" arrange ");
  this.directionSelector_ = $("<select class='rhizo-treelayout-direction' />");
  this.directionSelector_.append("<option value='hor'>Horizontally</option>");
  this.directionSelector_.append("<option value='ver'>Vertically</option>");
  this.directionSelector_.change(jQuery.proxy(this.updateState_, this));
  details.append(this.directionSelector_);

  if (parentKeys.length > 1) {
    this.metaModelKeySelector_ = rhizo.layout.metaModelKeySelector(
        this.project_,
        'rhizo-treelayout-parentKey',
        rhizo.layout.parentMatcher);
    this.metaModelKeySelector_.change(jQuery.proxy(this.updateState_, this));
    details.append(" by ").append(this.metaModelKeySelector_);
  } else if (parentKeys.length == 1) {
    this.metaModelKeySelector_ =
        $("<input type='hidden' />").val(parentKeys[0]);
  }
  return details;
};

/**
 * @return {Array.<string>} The list of all metamodel keys which can be used
 *     to arrange models in a tree structure (i.e., the point to parent-child
 *     relationships).
 * @private
 */
rhizo.layout.TreeLayoutUI.prototype.getParentKeys_ = function() {
  var parentKeys = [];
  for (var key in this.project_.metaModel()) {
    if (rhizo.layout.parentMatcher(key, this.project_.metaModel()[key])) {
      parentKeys.push(key);
    }
  }
  return parentKeys;
};

rhizo.layout.TreeLayoutUI.prototype.setState = function(state) {
  this.directionSelector_.val(state.direction);
  if (this.metaModelKeySelector_) {
    this.metaModelKeySelector_.val(state.parentKey);
  }
};

/**
 * Updates the layout state whenever the user modifies the controls.
 * @private
 */
rhizo.layout.TreeLayoutUI.prototype.updateState_ = function() {
  var state = {
    direction: this.directionSelector_.val()
  };
  if (this.metaModelKeySelector_) {
    state.parentKey = this.metaModelKeySelector_.val();
  }
  this.layout_.setStateFromUI(state);
};


/**
 * A layout that arranges models in a tree structure.
 *
 * @param {rhizo.Project} project
 * @constructor
 */
rhizo.layout.TreeLayout = function(project) {
  this.project_ = project;

  /**
   * Map that accumulates all the nodes matching the models being laid out.
   * @type {Object.<string, rhizo.layout.TreeNode>}
   * @private
   */
  this.globalNodesMap_ = null;
  rhizo.layout.GUILayout.call(this, project,
                              new rhizo.layout.TreeLayoutUI(this, project));
};
rhizo.inherits(rhizo.layout.TreeLayout, rhizo.layout.GUILayout);


/**
 * Verifies whether this layout can be used, given the project metamodel.
 * The project metamodel must define at least one model attribute that specifies
 * parent-child relationships, so that trees can be built.
 *
 * @param {*} meta The project metamodel.
 */
rhizo.layout.TreeLayout.prototype.verifyMetaModel = function(meta) {
  for (var key in meta) {
    if (rhizo.layout.parentMatcher(key, meta[key])) {
      return true;
    }
  }
  return false;
};

/**
 * @private
 */
rhizo.layout.TreeLayout.prototype.defaultState_ = function() {
  return {
    direction: 'ver',
    parentKey : rhizo.layout.firstMetamodelKey(
        this.project_, rhizo.layout.parentMatcher)
  };
};

/**
 * Validates a layout state. A valid state must have a 'parentKey' property
 * pointing to the metamodel key that contains parent-child relationships to
 * create the layout tree.
 *
 * @param {*} otherState
 * @private
 */
rhizo.layout.TreeLayout.prototype.validateState_ = function(otherState) {
  return this.validateStateAttributePresence_(otherState, 'parentKey') &&
         this.validateMetamodelPresence_(
             otherState.parentKey, rhizo.layout.parentMatcher);
};

/**
 * Lays out models.
 *
 * @param {rhizo.ui.RenderingPipeline} pipeline The pipeline that
 *     accumulates all the layout operations to perform as part of this layout
 *     request.
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
rhizo.layout.TreeLayout.prototype.layout = function(pipeline,
                                                    layoutBox,
                                                    supermodels,
                                                    allmodels,
                                                    meta,
                                                    options) {
  var parentKey = this.getState().parentKey;
  this.project_.logger().info("Creating tree by " + parentKey);

  // detect rendering direction
  var vertical = this.getState().direction == 'ver';
  this.treePainter_ = new rhizo.layout.TreePainter(vertical);

  try {
    // builds the tree model and also checks for validity
    this.globalNodesMap_ = {};
    var roots = new rhizo.layout.Treeifier(parentKey).buildTree(
        supermodels, allmodels, this.globalNodesMap_).childs;

    var drawingOffset = { left: 0, top: 0 };

    var maxHeight = 0;
    for (var id in roots) { // for each root found

      // calculate the bounding rectangle for the whole tree,
      // in gd-od coordinates
      var unrotatedBoundingRect =
          this.treePainter_.calculateBoundingRect_(roots[id]);

      // flip the bounding rectangle back to physical coordinates
      var boundingRect =
          this.treePainter_.toAbsoluteCoords_(unrotatedBoundingRect);

      // 'return carriage' if needed
      if (drawingOffset.left + boundingRect.w > layoutBox.width) {
        drawingOffset.left = 0;
        drawingOffset.top += maxHeight + (maxHeight > 0 ? 5 : 0);
      }

      // Flip the drawing offset back into the gd-od coordinate set
      // and draw the tree.
      this.treePainter_.draw_(
          pipeline, roots[id],
          this.treePainter_.toRelativeCoords_(drawingOffset));

      // update offset positions
      drawingOffset.left += boundingRect.w;
      maxHeight = Math.max(maxHeight, boundingRect.h);
    }
  } catch(e) {
    if (e.name == "TreeCycleException") {
      this.project_.logger().error(e);
    } else {
      throw e;
    }
  }
  return false;
};

rhizo.layout.TreeLayout.prototype.toString = function() {
  return "Tree";
};

rhizo.layout.TreeLayout.prototype.dependentModels = function(modelId) {
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


/*
  The whole class depends on coordinate transformation between screen
  width-height into the gd-od coordinates.

  +--------> width/left
  |
  |        Vertical layout      Horizontal Layout
  |        +-------> od         +-------> gd
  |        |                    |
  \/       |  [P]               |   +-[P]-+---+
  height   |   |__[c]           |   |     |   |
  top      |   |__[c]           |   [c]   [c] [c]
           \/                   \/
          gd                    od

  This class adopts two different layout variations when rendered vertically
  rather than horizontally.

  When rendered vertically, each parent will always be above, or at the same
  (physical or, equivalently, gd) height as the highest of its children.
  In this way, it looks like childrens are hanging under the parents.
  This is called the 'packed' layout.

  When rendered horizontally, each parent will be positioned evenly in the
  middle along the (phyisical, or, equivalently gd) width of the area occupied
  by all its children. It this way, the tree appears to be balanced.
  This is called the 'even' layout.
*/
/**
 * @constructor
 */
rhizo.layout.TreePainter = function(vertical) {
  this.vertical_ = vertical;

  // translate coordinate names and distances into gd-od names
  if (this.vertical_) {
    this.gdName_ = 'top';
    this.odName_ = 'left';
    this.gdLength_ = 'height';
    this.odLength_ = 'width';
  } else {
    this.gdName_ = 'left';
    this.odName_ = 'top';
    this.gdLength_ = 'width';
    this.odLength_ = 'height';

  }
};

/**
 * Given the dimensions of a rendering, which is a DOM block element with
 * physical coordinates, return its size in the growing direction.
 *
 * @param {Object.<string, Number>} renderingDims a map describing the
 *     dimensions (width, height) of a model rendering.
 * @returns {number} its dimension in the gd axis
 * @private
 */
rhizo.layout.TreePainter.prototype.gd_ = function(renderingDims) {
  return this.vertical_ ? renderingDims.height : renderingDims.width;
};

/**
 * Given the dimensions of a rendering, which is a DOM block element with
 * physical coordinates, return its size in the opposite direction.
 *
 * @param {Object.<string, Number>} rendering a map describing the
 *     dimensions (width, height) of a model rendering.
 * @returns {number} its dimension in the od axis
 * @private
 */
rhizo.layout.TreePainter.prototype.od_ = function(renderingDims) {
  return this.vertical_ ? renderingDims.width : renderingDims.height;
};

/**
 * Converts gd-od coordinates into a physical width-height pair
 * @private
 */
rhizo.layout.TreePainter.prototype.toAbsoluteCoords_ = function(boundingRect) {
  return this.vertical_ ?
    { w: boundingRect.od , h: boundingRect.gd} :
    { w: boundingRect.gd , h: boundingRect.od};
};

/**
 * Converts a phyisical top-left coordinate into its gd-od equivalent
 * @private
 */
rhizo.layout.TreePainter.prototype.toRelativeCoords_ = function(offset) {
  return this.vertical_ ?
    { gd: offset.top, od: offset.left } :
    { gd: offset.left, od: offset.top };
};

/**
 * Given the dimensions of a rendering, it returns the gd-od coordinate of its
 * center, assuming it is positioned in 'packed' layout.
 * @private
 */
rhizo.layout.TreePainter.prototype.packedCenter_ = function(offset,
                                                            renderingDims) {
  return {
    gd: offset.gd + 5 + this.gd_(renderingDims)/2,
    od: offset.od + this.od_(renderingDims)/2
  };
};

/**
 * Given the dimensions of a rendering, it returns the gd-od coordinate of its
 * center, assuming it is positioned in 'even' layout.
 * @private
 */
rhizo.layout.TreePainter.prototype.evenCenter_ = function(offset,
                                                          renderingDims,
                                                          boundingRect) {
  return {
    gd: offset.gd + boundingRect.gd / 2,
    od: offset.od + 5 + this.od_(renderingDims)/2
  };
};


/**
 * For every node, recursively calculate its bounding rectangle,
 * in gd-od coordinates.
 *
 * @param {rhizo.layout.TreeNode} treenode the node
 * @private
 */
rhizo.layout.TreePainter.prototype.calculateBoundingRect_ = function(treenode) {
  var childsArea = { gd: 0, od: 0};
  for (var childId in treenode.childs) {
    var childRect = this.calculateBoundingRect_(treenode.childs[childId]);
    childsArea.gd += childRect.gd + 5;
    childsArea.od = Math.max(childsArea.od, childRect.od);
  }

  var dims = treenode.renderingDimensions();

  // enrich the treenode with rendering info
  treenode.boundingRect =
    {
      // 20 px padding between node and childs, 5 px padding for the whole rect
      od: this.od_(dims) + childsArea.od + 25,
      gd: Math.max(this.gd_(dims), childsArea.gd) + 5};

  return treenode.boundingRect;
};

/**
 * Recursively draw every node and, if the node is not a root, the connectors to
 * its parent. This method differentiates between the packed and even layouting
 * within the tree.
 *
 * @private
 */
rhizo.layout.TreePainter.prototype.draw_ = function(pipeline,
                                                    treenode,
                                                    offset,
                                                    parentOffset,
                                                    parentNode) {
  var dims = treenode.renderingDimensions();

  // vertical layout stacks items from the top, while the horizontal layout
  // keeps the tree center aligned.
  if (this.vertical_) {
    pipeline.move(treenode.superModel.id, offset.gd + 5, offset.od);

    // draw connector if needed
    if (parentOffset != null) {
      this.drawConnector_(pipeline,
        this.packedCenter_(offset, dims),
        this.packedCenter_(parentOffset,
                           parentNode.renderingDimensions()));
    }
  } else {
    pipeline.move(
        treenode.superModel.id,
        offset.od + 5,
        offset.gd + (treenode.boundingRect.gd - this.gd_(dims))/2);

    // draw connector if needed
    if (parentOffset != null) {
      this.drawConnector_(pipeline,
        this.evenCenter_(offset, dims, treenode.boundingRect),
        this.evenCenter_(parentOffset,
                         parentNode.renderingDimensions(),
                         parentNode.boundingRect));
    }
  }

  // Renders all the children along the gd direction
  var progressiveGd = offset.gd;
  for (var childId in treenode.childs) {
    var childNode = treenode.childs[childId];

    var childOffset = {
      od: offset.od + this.od_(dims) + 20,
      gd: progressiveGd
    };
    this.draw_(pipeline, childNode, childOffset, offset, treenode);
    progressiveGd += childNode.boundingRect.gd + 5;
  }
};


/**
 * Draws a connector between a node and its parent. A connector is always
 * composed of two segments.
 * A segment along the gd axis and a segment along the od axis.
 *
 * @param curCenter the gd-od coordinate of the center of the current node
 * @param parentCenter the gd-od coordinate of the center of its parent node
 * @private
 */
rhizo.layout.TreePainter.prototype.drawConnector_ = function(pipeline,
                                                             curCenter,
                                                             parentCenter) {
  var gdCssAttrs = {position: 'absolute'};
  gdCssAttrs[this.gdName_] = Math.min(curCenter.gd, parentCenter.gd);
  gdCssAttrs[this.odName_] = parentCenter.od;
  gdCssAttrs[this.odLength_] = 2;
  gdCssAttrs[this.gdLength_] = Math.abs(parentCenter.gd - curCenter.gd);

  var gdconnector = $('<div />', {
                        'class': 'rhizo-tree-connector',
                        css: gdCssAttrs});

  var odCssAttrs = {position: 'absolute'};
  odCssAttrs[this.gdName_] = curCenter.gd;
  odCssAttrs[this.odName_] = parentCenter.od;
  odCssAttrs[this.gdLength_] = 2;
  odCssAttrs[this.odLength_] = Math.abs(parentCenter.od - curCenter.od);

  var odconnector = $('<div />', {
                        'class': 'rhizo-tree-connector',
                        css: odCssAttrs});

  pipeline.artifact(gdconnector);
  pipeline.artifact(odconnector);
};


// register the treelayout in the global layouts list
rhizo.layout.layouts.tree = rhizo.layout.TreeLayout;
