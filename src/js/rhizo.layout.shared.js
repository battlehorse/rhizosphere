/**
  @license
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

/*
 * Shared components and utilities used by more than one layout engine.
 */

// RHIZODEP=rhizo.log,rhizo.meta
namespace("rhizo.layout");


/**
 * Returns the first key of the project metamodel, optionally satisfying a
 * required constraint.
 * @param {rhizo.Project} project
 * @param {function(string, Object):boolean} opt_matcher Optional function to
 *     decide whether to the given metaModel key is acceptable or not.
 *     Receives as parametes the key itself and the associated metamodel entry.
 * @return {string} The metamodel key, or null if no acceptable key could be
 *     found.
 */
rhizo.layout.firstMetamodelKey = function(project, opt_matcher) {
  for (var key in project.metaModel()) {
    if (!opt_matcher || opt_matcher(key, project.metaModel()[key])) {
      return key;
    }
  }
  return null;
};


/**
 * A function that composes together multiple other matchers OR-wise. Matches
 * metamodel keys that satisfy any of the matchers passed as arguments.
 *
 * @param {...function(string, *):boolean} var_args two or more matchers to
 *     assemble together into a single one.
 * @return {function(string, *):boolean} The composed matcher.
 */
rhizo.layout.orMatcher = function(var_args) {
  var matchers = Array.prototype.slice.call(arguments);
  return function(key, meta) {
    for (var i = 0; i < matchers.length; i++) {
      if (matchers[i](key, meta)) {
        return true;
      }
    }
    return false;
  };
};


/**
 * A function that matches metamodel keys that establish links to other models,
 * for example to define parent-child relationships by having a key whose value
 * points to the parent model of a given one).
 * @param {string} key The key to check.
 * @param {*} meta The metamodel entry associated to this key.
 * @return {boolean} Whether the given metamodel key establish links to other
 *     models.
 */
rhizo.layout.linkMatcher = function(key, meta) {
  return !!meta.isLink;
};


/**
 * A function that matches metamodel keys that identify hierarchical
 * categorizations.
 *
 * @param {string} key The key to check.
 * @param {*} meta The metamodel entry associated to this key.
 * @return {boolean} Whether the given metamodel key identifies a hierarchical
 *     categorization.
 */
rhizo.layout.hierarchyMatcher = function(key, meta) {
  return meta.kind instanceof rhizo.meta.CategoryKind && !!meta.isHierarchy;
};


/**
 * A function that matches metamodel keys that identify numeric model
 * attributes.
 * @param {string} key The key to check.
 * @param {*} meta The metamodel entry associated to this key.
 * @return {boolean} Whether the given metamodel key identifies numeric model
 *     attributes.
 */
rhizo.layout.numericMatcher = function(key, meta) {
  return meta.kind.isNumeric();
};


/**
 * Defines the bounding rectangle inside which models' layout should occur.
 * The bounding rectangle is guaranteed to remain within the container limits.
 *
 * @param {HTMLElement} container The HTML element whose width and height define
 *     the maximum width and height of the layout rectangle. This will typically
 *     be the visualization viewport.
 * @param {*} opt_layoutConstraints An optional map of constraints for the
 *     layout bounding rectangle. The following keys are accepted: top, bottom,
 *     left, right, width and height. Each value in the [0.0,1.0) range is
 *     considered relative to the container width and height, and assumed to
 *     be absolute values otherwise. 'width' and 'height' takes precedence
 *     respectively over 'right' and 'bottom'.
 * @constructor
 */
rhizo.layout.LayoutBox = function(container, opt_layoutConstraints) {
  /**
   * The distance (in pixels) of the layout rectangle from the container top
   * border.
   * @type {number}
   */
  this.top = 0;

  /**
   * The distance (in pixels) of the layout rectangle from the container bottom
   * border.
   * @type {number}
   */
  this.bottom = 0;

  /**
   * The distance (in pixels) of the layout rectangle from the container left
   * border.
   * @type {number}
   */
  this.left = 0;

  /**
   * The distance (in pixels) of the layout rectangle from the container right
   * border.
   * @type {number}
   */
  this.right = 0;

  /**
   * The layout rectangle width (in pixels).
   * @type {number}
   */
  this.width = 0;

  /**
   * The layout rectangle height (in pixels).
   * @type {number}
   */
  this.height = 0;

  this.maxWidth_ = $(container).get(0).clientWidth;
  this.maxHeight_ = $(container).get(0).clientHeight;
  this.computeLayoutBox_(opt_layoutConstraints || {});
};

/**
 * @return {boolean} Whether the layout box has a non-zero area to accomodate
 *     elements to be laid out.
 */
rhizo.layout.LayoutBox.prototype.isEmpty = function() {
  return (this.width <= 0) || (this.height <= 0);
};

/**
 * Computes the top,bottom,left,right,width and height attributes of the layout
 * rectangle, given the surrounding container size and any externally provided
 * constraints.
 *
 * @param {*} layoutConstraints Map of constraints for the layout bounding
 *     rectangle.
 * @private
 */
rhizo.layout.LayoutBox.prototype.computeLayoutBox_ = function(
    layoutConstraints) {
  this.top = this.getAbsoluteDimension_(layoutConstraints.top,
                                        this.maxHeight_);
  if (layoutConstraints.height) {
    this.height = this.getAbsoluteDimension_(layoutConstraints.height,
                                             this.maxHeight_);
    this.bottom = this.maxHeight_ - this.top - this.height;
  } else {
    this.bottom = this.clamp_(
        this.getAbsoluteDimension_(layoutConstraints.bottom, this.maxHeight_),
        0, this.maxHeight_ - this.top);
    this.height = this.maxHeight_ - this.top - this.bottom;
  }

  this.left = this.getAbsoluteDimension_(layoutConstraints.left,
                                         this.maxWidth_);
  if (layoutConstraints.width) {
    this.width = this.getAbsoluteDimension_(layoutConstraints.width,
                                            this.maxWidth_);
    this.right = this.maxWidth_ - this.left - this.width;
  } else {
    this.right = this.clamp_(
        this.getAbsoluteDimension_(layoutConstraints.right, this.maxWidth_),
        0, this.maxWidth_ - this.left);
    this.width = this.maxWidth_ - this.left - this.right;
  }
};

/**
 * Converts a value relative to the container size into an absolute value (in
 * pixels).
 * @param {number} value The value to convert.
 * @param {number} maxValue The maximum acceptable value.
 * @return {number} An absolute number (in pixel units) that is guaranteed to
 *     be in the [0, maxValue] range.
 * @private
 */
rhizo.layout.LayoutBox.prototype.getAbsoluteDimension_ = function(
    value, maxValue) {
  value = value || 0;
  var multiplier = value < 1.0 ? maxValue : 1;
  return this.clamp_(Math.round(value * multiplier), 0, maxValue);
};

/**
 * Clamps the given value between the minimum and maximum range limits.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @private
 */
rhizo.layout.LayoutBox.prototype.clamp_ = function(val, min, max) {
  return Math.min(max, Math.max(min, val));
};


/**
 * Factory function to generate Treeifiers. A Treeifier converts an
 * unorganized set of rhizo.model.SuperModel instances into a tree, according to
 * relationships defined by a chosen model attribute.
 *
 * We currently support two treeifiers: one based an models that have
 * hierarchical categorizations (CategoryTreeifier) and another based on models
 * that links between themselves in parent-child chains (LinkTreeifier).
 *
 * @param {string} key The name of the model attribute where parent-child
 *     relationships are stored and will guide tree construction.
 * @param {*} meta The metamodel entry associated to this key.
 * @return {?Object} A suitable treeifier for the given key, or null if no
 *     suitable treeifier exists.
 */
rhizo.layout.newTreeifier = function(key, meta) {
  if (rhizo.layout.linkMatcher(key, meta)) {
    return new rhizo.layout.LinkTreeifier(key, meta['linkKey'])
  } else if (rhizo.layout.hierarchyMatcher(key, meta)) {
    return new rhizo.layout.CategoryTreeifier(key);
  } else {
    return null;
  }
};


/**
 * Converter that turns an unorganized set of rhizo.model.SuperModel instances
 * into a tree, according to a model attribute (categoryKey) that defines a
 * hierarchical categorization of the model itself.
 *
 * @param {string} categoryKey The name of the model attribute whose value
 *     contains a hierarchical categorization of the model.
 * @constructor
 */
rhizo.layout.CategoryTreeifier = function(categoryKey) {
  this.categoryKey_ = categoryKey;
};

/**
 * Builds a hierarchical structure of TreeNodes. The tree is built out of all
 * the hierarchical categorizations found on all models. Therefore, every
 * non-leaf node (minus the root) is a SyntheticTreeNode representing a single
 * category one or more models belong to, and every leaf node is a ModelTreeNode
 * for a model that belongs to all the categories standing above him.
 *
 * @param {Array.<rhizo.model.SuperModel>} supermodels A list of all supermodels
 *     to treeify.
 * @param {Object.<string, rhizo.model.SuperModel>} allmodels a map associating
 *     model ids to SuperModel instances, for all models currently known to the
 *     project.
 * @param {Object.<string, rhizo.layout.TreeNode>=} opt_globalNodesMap an
 *     optional map that will accumulate all TreeNodes, keyed by model id.
 * @return {rhizo.layout.TreeNode} the root TreeNode (that has no model
 *     attached) that contains the models treeification.
 */
rhizo.layout.CategoryTreeifier.prototype.buildTree = function(
    supermodels, allmodels, opt_globalNodesMap) {
  var root = new rhizo.layout.TreeNode();
  for (var i = 0, l = supermodels.length; i < l; i++) {
    var categories = supermodels[i].unwrap()[this.categoryKey_];
    if (!$.isArray(categories)) {
      categories = [categories];
    }
    var node = root;
    for (var j = 0; j < categories.length; j++) {
      var category = categories[j] ? categories[j] : '__undefined__';
      var categoryNodeId = '__syntethic_id_' + categories[j];
      var childNode = node.childs[categoryNodeId];
      if (!childNode) {
        childNode = new rhizo.layout.SyntheticTreeNode(
            categoryNodeId, categories[j]);
        node.addChild(childNode);
      }
      node = childNode;
    }
    var modelNode = new rhizo.layout.ModelTreeNode(supermodels[i]);
    node.addChild(modelNode);
    if (opt_globalNodesMap) {
      opt_globalNodesMap[supermodels[i].id] = modelNode;
    }
  }
  return root;
};

/**
 * Converter that turns an unorganized set of rhizo.model.SuperModel instances
 * into a tree, according to a model attribute (linkStartKey) that points to
 * other models, defining child-to-parent relationships.
 * 
 * @param {string} linkStartKey the name of the model attribute whose value
 *     points to another model, establishing a child-to-parent relationship.
 * @param {string} opt_linkEndKey The name of the model attribute whose
 *     value resolves the links defined by linkStartKey. If
 *     unspecified, it is assumed that the values of model attributes identified
 *     by linkStartKey will contain the ids of their parent models.
 *     If specified, the model values identified by opt_linkEndKey must be
 *     unique (otherwise it would be possible for a child to link to multiple
 *     parents).
 * @constructor
 */
rhizo.layout.LinkTreeifier = function(linkStartKey, opt_linkEndKey) {
  this.linkStartKey_ = linkStartKey;
  this.linkEndKey_ = opt_linkEndKey || 'id';
};

/**
 * Builds a hierarchical structure of TreeNodes. Since this treeifier relies on
 * model-to-model links, the entire tree (minus the root) is composed of
 * ModelTreeNode instances, each one holding a reference to a model.
 *
 * Raises exceptions if cycles are found within the tree or if childs are found
 * to link to multiple parents. Deals automatically with "unavailable" parts of
 * the tree.
 * 
 * @param {Array.<rhizo.model.SuperModel>} supermodels A list of all supermodels
 *     to treeify.
 * @param {Object.<string, rhizo.model.SuperModel>} allmodels a map associating
 *     model ids to SuperModel instances, for all models currently known to the
 *     project.
 * @param {Object.<string, rhizo.layout.TreeNode>=} opt_globalNodesMap an
 *     optional map that will accumulate all TreeNodes, keyed by model id.
 * @return {rhizo.layout.TreeNode} the root TreeNode (that has no model
 *     attached) that contains the models treeification.
 */
rhizo.layout.LinkTreeifier.prototype.buildTree = function(
    supermodels, allmodels, opt_globalNodesMap) {
  var linkMap = allmodels;
  if (this.linkEndKey_ != 'id') {
    // A key other than the model id is used to resolve child-parent
    // relationships. Assemble a map pointing from the model values the key
    // identifies to SuperModel instances.
    linkMap = this.buildLinkMap_(allmodels);
  }

  var globalNodesMap = opt_globalNodesMap || {};
  for (var i = 0, l = supermodels.length; i < l; i++) {
    globalNodesMap[supermodels[i].id] =
        new rhizo.layout.ModelTreeNode(supermodels[i]);
  }

  var root = new rhizo.layout.TreeNode();

  // supermodels contains only the models that can be laid out, while allmodels
  // contains all the known models.
  for (var i = 0, l = supermodels.length; i < l; i++) {
    if (!globalNodesMap[supermodels[i].unwrap().id].traversed_) {

      // we never encountered the node before. Start navigating
      // this branch upward, paying attention to cycles
      var localNodesMap = {};
      var model = supermodels[i].unwrap();

      while(true) {
        if (localNodesMap[model.id]) {
          // cycle detected
          throw new rhizo.layout.TreeCycleException(
              "Tree is invalid: cycle detected");
        }
        localNodesMap[model.id] = true;
        globalNodesMap[model.id].traversed_ = true;

        var parentSuperModel = this.findFirstAvailableParent_(
            linkMap,
            linkMap[model[this.linkStartKey_]]);
        if (parentSuperModel && parentSuperModel.id != model.id) {
          var parentModel = parentSuperModel.unwrap();
          globalNodesMap[parentModel.id].addChild(globalNodesMap[model.id]);
          model = parentSuperModel.unwrap();
        } else {
          root.addChild(globalNodesMap[model.id]);
          break;
        }
      }
    }
  }
  return root;
};

/**
 * From a given model, returns the first model in the tree hierarchy defined
 * by linkStartKey which is available for layout. Models can be unavailable for
 * various reasons, such as being filtered or pinned.
 * If the given model itself is available, it is returned without further
 * search. If a cycle is detected while traversing unavailable parents,
 * an exception is raised.
 *
 * @param {Object.<*, rhizo.model.SuperModel>} linkMap a map associating
 *     model unique identifiers (either the model id itself, or another unique
 *     attribute identified by 'linkEndKey') to SuperModel instances, for all
 *     models currently known to the project.
 * @param {rhizo.model.SuperModel} superParent the model to start the search
 *     from.
 * @private
 */
rhizo.layout.LinkTreeifier.prototype.findFirstAvailableParent_ = function(
    linkMap, superParent) {
  if (!superParent) {
    return null;
  }

  var localNodesMap = {};
  while (!superParent.isAvailableForLayout()) {
    if (localNodesMap[superParent.id]) {
      // cycle detected
      throw new rhizo.layout.TreeCycleException(
          "Tree is invalid: hidden cycle detected");
    }
    localNodesMap[superParent.id] = true;

    superParent = linkMap[superParent.unwrap()[this.linkStartKey_]];
    if (!superParent) {
      // we reached an hidden root.
      return null;
    }
  }

  return superParent;
};

/**
 * Builds a map of SuperModel instances keying them by the value each model has
 * for the attribute identified by 'linkEndKey'. Raises exceptions if two or
 * more models share the same value for the 'linkEndKey' attribute, i.e.
 * whenever it's not possible to build a unique mapping from attribute values to
 * models.
 *
 * @param {Object.<string, rhizo.model.SuperModel>} allmodels A map associating
 *     model ids to SuperModel instances, for all models currently known to the
 *     project.
 * @return {Object.<*, rhizo.model.SuperModel>} A map associating model values
 *     as extracted from the 'linkEndKey' attribute to SuperModel instances,
 *     for all models currently known to the project.
 * @private
 */
rhizo.layout.LinkTreeifier.prototype.buildLinkMap_ = function(allmodels) {
  var linkMap = {};
  for (var modelId in allmodels) {
    var model = allmodels[modelId].unwrap();
    if (!(this.linkEndKey_ in model)) {
      continue;
    }
    if (model[this.linkEndKey_] in linkMap) {
      // Two or more models share the same value for the 'linkEndKey'
      // attribute. It's not possible to build a unique mapping.
      throw new rhizo.layout.TreeCycleException(
              "Tree is invalid: multiple models have the same value for the " +
              this.linkEndKey_ + " attribute");
    }
    linkMap[model[this.linkEndKey_]] = allmodels[modelId];
  }
  return linkMap;
};


/**
 * A generic tree node.
 * @param {*?} opt_id The unique node id. If null, the node is assumed to a tree
 *     root.
 * @param {*=} opt_payload An optional payload associated to the node.
 * @constructor
 */
rhizo.layout.TreeNode = function(opt_id, opt_payload) {
  this.id = opt_id;
  this.childs = {};
  this.traversed_ = false;
  this.numChilds = 0;
  this.is_root = this.id == null;
  this.synthetic_ = false;
  this.payload_ = opt_payload;
};

/**
 * Defines whether the node is synthetic or not, i.e. whether it is backed by
 * one of the visualization models or not.
 * @param {boolean} synthetic Whether the node is synthetic or not.
 */
rhizo.layout.TreeNode.prototype.setSynthetic = function(synthetic) {
  this.synthetic_ = synthetic;
};

/**
 * @return {boolean} Whether the node is synthetic.
 */
rhizo.layout.TreeNode.prototype.synthetic = function() {
  return this.synthetic_;
};

/**
 * @return {*?} The node payload.
 */
rhizo.layout.TreeNode.prototype.payload = function() {
  return this.payload_;
};

/**
 * Adds another node as child of the this node.
 * @param {rhizo.layout.TreeNode} treenode The child to add.
 */
rhizo.layout.TreeNode.prototype.addChild = function(treenode) {
  if (!this.childs[treenode.id]) {
    this.childs[treenode.id] = treenode;
    this.numChilds++;
  }
};

/**
 * @returns {Array.<rhizo.layout.TreeNode>} The immediate childs of this node.
 */
rhizo.layout.TreeNode.prototype.childsAsArray = function() {
  var nodes = [];
  for (var nodeId in this.childs) {
    nodes .push(this.childs[nodeId]);
  }
  return nodes ;
};

/**
 * Deep find all the children of this node and appends them to the given array.
 * @param {Array.<rhizo.layout.TreeNode>} childs Array into which accumulate
 *     this node children.
 */
rhizo.layout.TreeNode.prototype.deepChildsAsArray = function(childs) {
  for (var nodeId in this.childs) {
    childs.push(this.childs[nodeId]);
    this.childs[nodeId].deepChildsAsArray(childs);
  }
};

/**
 * The space this node will occupy (in width, height terms) in the visualization
 * viewport once positioned by layout operations.
 * @return {Object.<string, number>} The node rendering dimensions.
 */
rhizo.layout.TreeNode.prototype.renderingDimensions = function() {
  return {width: 0, height: 0};
};


/**
 * A tree node backed by a visualization rhizo.model.SuperModel.
 *
 * @param {rhizo.model.SuperModel} opt_superModel The model this tree node
 *     wraps. If unspecified, this node is assumed to be the root of the tree.
 * @constructor
 * @extends rhizo.layout.TreeNode
 */
rhizo.layout.ModelTreeNode = function(opt_superModel) {
  rhizo.layout.TreeNode.call(
      this, opt_superModel ? opt_superModel.id : null, opt_superModel);
};
rhizo.inherits(rhizo.layout.ModelTreeNode, rhizo.layout.TreeNode);

/**
 * @return {Object.<string, number>} The dimensions of the rendering bound to
 *     this node.
 */
rhizo.layout.ModelTreeNode.prototype.renderingDimensions = function() {
  return this.payload().rendering().getDimensions();
};


/**
 * A synthetic tree node, not backed by a visualization model, but instead
 * representing a visualization artifact.
 *
 * @param {*?} opt_id The unique node id. If null, the node is assumed to a tree
 *     root.
 * @param {*=} opt_payload An optional payload associated to the node.d
 * @constructor
 * @extends rhizo.layout.TreeNode
 */
rhizo.layout.SyntheticTreeNode = function(opt_id, opt_payload) {
  rhizo.layout.TreeNode.call(this, opt_id, opt_payload);
  this.setSynthetic(true);
  this.syntheticRendering_ = null;
};
rhizo.inherits(rhizo.layout.SyntheticTreeNode, rhizo.layout.TreeNode);

rhizo.layout.SyntheticTreeNode.prototype.renderingDimensions = function() {
  return this.syntheticRendering_.getDimensions();
};

/**
 * Sets the node synthetic rendering. Since the node is not backed by a
 * visualization model, it doesn't have an associated rendering, which is
 * therefore provided in the form of a synthetic one.
 *
 * @param {rhizo.ui.SyntheticRendering} syntheticRendering
 */
rhizo.layout.SyntheticTreeNode.prototype.setSyntheticRendering = function(
    syntheticRendering) {
  this.syntheticRendering_ = syntheticRendering;
};

/**
 * @return {rhizo.ui.SyntheticRendering} The node synthetic rendering, if any.
 */
rhizo.layout.SyntheticTreeNode.prototype.syntheticRendering = function() {
  return this.syntheticRendering_;
};


/**
 * An exception raised when cycles are encountered when treeifing a list of
 * SuperModels.
 * @constructor
 * @param {string} message Additional information about the specific cycle
 *     found.
 */
rhizo.layout.TreeCycleException = function(message) {
  this.message = message;
  this.name = "TreeCycleException";
};

rhizo.layout.TreeCycleException.prototype.toString = function() {
  return this.name + ": " + this.message;
};
