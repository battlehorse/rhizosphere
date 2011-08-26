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

/*
  The whole TreeLayout depends on the following classes:
  - TreeLayout: the layout itself. It builds the tree structure out of the
    supermodels and, for every root found, draws a tree. Trees are stacked from
    left to right, top to bottom, hence this class uses the 'traditional' set of
    positioning coordinates (top, left, width, height).

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

// RHIZODEP=rhizo.layout,rhizo.ui
namespace('rhizo.layout');


/**
 * A layout that arranges models in a tree structure.
 *
 * @param {rhizo.Project} project
 * @constructor
 */
rhizo.layout.TreeLayout = function(project) {
  this.project_ = project;

  /**
   * The matcher to identify all model attributes where tree structures can be
   * built from.
   * @type {function(string, Object):boolean}
   * @private
   */
  this.matcher_ = rhizo.layout.orMatcher(
      rhizo.layout.linkMatcher, rhizo.layout.hierarchyMatcher);

  /**
   * Map that accumulates all the nodes matching the models being laid out.
   * @type {Object.<string, rhizo.layout.TreeNode>}
   * @private
   */
  this.globalNodesMap_ = null;
  rhizo.layout.StatefulLayout.call(this, project);
};
rhizo.inherits(rhizo.layout.TreeLayout, rhizo.layout.StatefulLayout);


/**
 * Verifies whether this layout can be used, given the project metamodel.
 * The project metamodel must define at least one model attribute that specifies
 * parent-child relationships, so that trees can be built.
 *
 * @param {*} meta The project metamodel.
 */
rhizo.layout.TreeLayout.prototype.verifyMetaModel = function(meta) {
  for (var key in meta) {
    if (this.matcher_(key, meta[key])) {
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
        this.project_, this.matcher_)
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
             otherState.parentKey, this.matcher_);
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
 */
rhizo.layout.TreeLayout.prototype.layout = function(pipeline,
                                                    layoutBox,
                                                    supermodels,
                                                    allmodels,
                                                    meta) {
  var parentKey = this.getState().parentKey;

  // detect rendering direction
  var vertical = this.getState().direction == 'ver';
  this.treePainter_ = new rhizo.layout.TreePainter(this.project_, vertical);

  try {
    // builds the tree model and also checks for validity
    this.globalNodesMap_ = {};
    var roots = new rhizo.layout.newTreeifier(
        parentKey, meta[parentKey]).buildTree(
            supermodels, allmodels, this.globalNodesMap_).childs;

    var drawingOffset = { left: 0, top: 0 };

    var maxHeight = 0;
    for (var id in roots) { // for each root found

      this.treePainter_.fillSyntheticRenderings_(roots[id], pipeline);

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
  return "TreeLayout";
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
 * @param {rhizo.Project} project
 * @param {boolean} vertical Whether to render the tree vertically or
 *     horizontally.
 * @constructor
 */
rhizo.layout.TreePainter = function(project, vertical) {
  this.project_ = project;
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
 * Recursively analyzes a tree node and all its child, creating synthetic
 * renderings for all nodes that are missing one. When a tree node is not backed
 * by any visualization model, e.g. it represents a model categorization but
 * not a full fledged model, a rhizo.ui.SyntheticRendering is created and used
 * in place of the model rendering.
 * @param {rhizo.layout.SyntheticTreeNode} treenode The tree node to inspect.
 * @param {rhizo.ui.RenderingPipeline} pipeline The rendering pipeline that
 *     stores all drawing operations.
 * @private
 */
rhizo.layout.TreePainter.prototype.fillSyntheticRenderings_ = function(
    treenode, pipeline) {
  if (treenode.synthetic() && !treenode.syntheticRendering()) {
    var raw_node = $('<div />', {'class': 'rhizo-tree-syntheticnode'}).
      text(treenode.payload() || 'Everything Else');
    if (this.project_.options().isClickSelectionMode()) {
      raw_node.click(jQuery.proxy(function() {
        var childNodes = [];
        var modelIds = [];
        treenode.deepChildsAsArray(childNodes);
        for (var i = childNodes.length-1; i >= 0; i--) {
          if (!childNodes[i].synthetic()) {
            modelIds.push(childNodes[i].id);
          }
        }
        this.project_.eventBus().publish(
            'selection', {'action': 'toggle', 'models': modelIds});
      }, this));
    }

    // node must be attached to the DOM when creating a SyntheticRendering,
    // hence we push it on the pipeline first.
    pipeline.artifact(raw_node);
    treenode.setSyntheticRendering(new rhizo.ui.SyntheticRendering(raw_node));
  }

  for (var childId in treenode.childs) {
    this.fillSyntheticRenderings_(treenode.childs[childId], pipeline);
  }
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
    if (treenode.synthetic()) {
      treenode.syntheticRendering().move(
          offset.gd + 5, offset.od, /* instant */ true);
    } else {
      pipeline.move(treenode.payload().id, offset.gd + 5, offset.od);
    }

    // draw connector if needed
    if (parentOffset != null) {
      this.drawConnector_(pipeline,
        this.packedCenter_(offset, dims),
        this.packedCenter_(parentOffset,
                           parentNode.renderingDimensions()));
    }
  } else {
    if (treenode.synthetic()) {
      treenode.syntheticRendering().move(
          offset.od + 5,
          offset.gd + (treenode.boundingRect.gd - this.gd_(dims))/2,
          /* instant */ true);
    } else {
      pipeline.move(
          treenode.payload().id,
          offset.od + 5,
          offset.gd + (treenode.boundingRect.gd - this.gd_(dims))/2);
    }

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
rhizo.layout.layouts.tree = {'name': 'Tree', 'engine': rhizo.layout.TreeLayout};
