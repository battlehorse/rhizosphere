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

/*
 * Shared components and utilities used by more than one layout engine.
 */

// RHIZODEP=rhizo.log,rhizo.meta
namespace("rhizo.layout");

/**
 * Creates a dropdown control that enumerates all the metaModel keys.
 * @param {rhizo.Project} project
 * @param {string} className
 * @return {Element} the jquery-enhanced HTML dropdown control
 */
rhizo.layout.metaModelKeySelector = function(project, className) {
  var select = $("<select class='" + className + "' />");
  if (project && project.metaModel()) {
    for (key in project.metaModel()) {
      select.append("<option value='" + key + "'>" +
                    project.metaModel()[key].label + "</option>");
    }
  }
  return select;
};

/**
 * Converter that turns an unorganized set of rhizo.model.SuperModel instances
 * into a tree, according to a model attribute (parentKey) that defines the
 * parent-child relationships.
 * 
 * @param {string} parentKey the name of the model attribute that defines the
 *     parent-child relationship.
 */
rhizo.layout.Treeifier = function(parentKey) {
  this.parentKey_ = parentKey;
};

/**
 * Builds a hierarchical structure of TreeNodes. Raises exceptions
 * if cycles are found within the tree. Deals automatically with "filtered"
 * parts of the tree.
 * 
 * @param {Array.<rhizo.model.SuperModel>} supermodels A list of all supermodels
 *     to treeify.
 * @param {Object.<string, rhizo.model.SuperModel>} allmodels a map associating
 *     model ids to SuperModel instances, for all models currently known to the
 *     project.
 * @return {rhizo.layout.TreeNode} the root TreeNode (that has no model
 *     attached) that contains the models treeification.
 */
rhizo.layout.Treeifier.prototype.buildTree = function(supermodels,
                                                      allmodels) {
  var globalNodesMap = {};
  for (var i = 0, l = supermodels.length; i < l; i++) {
    globalNodesMap[supermodels[i].id] =
        new rhizo.layout.TreeNode(supermodels[i]);
  }

  var root = new rhizo.layout.TreeNode();

  // supermodels contains only the _visible_ models, while allmodels contains
  // all the known models.
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

        var parentSuperModel = this.findFirstVisibleParent_(
            allmodels,
            allmodels[model[this.parentKey_]]);
        if (parentSuperModel) {
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
 * From a given model, returns the first non-filtered model in the tree
 * hierarchy defined according to parentKey. If the given model itself is not
 * filtered, it is returned without further search. If a cycle is detected while
 * traversing filtered parents, an exception is raised.
 *
 * @param {Object.<string, rhizo.model.SuperModel>} allmodels a map associating
 *     model ids to SuperModel instances, for all models currently known to the
 *     project.
 * @param {rhizo.model.SuperModel} superParent the model to start the search from.
 * @private
 */
rhizo.layout.Treeifier.prototype.findFirstVisibleParent_ = function(allmodels,
                                                                    superParent) {
  if (!superParent) {
    return null;
  }

  var localNodesMap = {};
  while (superParent.isFiltered()) {
    if (localNodesMap[superParent.id]) {
      // cycle detected
      throw new rhizo.layout.TreeCycleException(
          "Tree is invalid: hidden cycle detected");
    }
    localNodesMap[superParent.id] = true;

    superParent = allmodels[superParent.unwrap()[this.parentKey_]];
    if (!superParent) {
      // we reached an hidden root.
      return null;
    }
  }

  return superParent;
};

/**
 * A class that represents a node in the tree and wraps the superModel
 * it contains.
 * @param {rhizo.model.SuperModel} opt_superModel The model this tree node
 *     wraps. If unspecified, this node is assumed to be the root of the tree.
 *     
 * @constructor
 */
rhizo.layout.TreeNode = function(opt_superModel) {
  this.superModel = opt_superModel;
  this.id = null;
  if (opt_superModel) {
    this.id = opt_superModel.id;    
  }
  this.childs = {};
  this.traversed_ = false;
  this.numChilds = 0;
  this.is_root = this.id == null;
};

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
  var models = [];
  for (var modelId in this.childs) {
    models.push(this.childs[modelId]);
  }
  return models;
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

