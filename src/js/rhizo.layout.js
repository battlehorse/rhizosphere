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

/**
 * @fileOverview Support classes for the development of layout engines and
 * implementations for basic Rhizosphere layout engines.
 *
 * To define a new layout:
 * - define a new Javascript class.
 *
 * - implement the layout() function
 *   This is responsible for the actual layouting
 *
 * - implement the toString() function
 *   This returns the layout name for debug purposes
 *
 * - implement the verifyMetaModel() function (optional)
 *   This verifies the current project metaModel and decides whether it
 *   contains the right kinds for this layout to work. If not implemented, it is
 *   assumed the layout can work with the current metamodel.
 *
 * - implement a getState()/setState() function pair (optional).
 *   Handle state management for the layout. The former returns a plain js
 *   object with the layout state information, the latter receives back an
 *   object in the ame format, for the layout to restore itself to a given
 *   state.
 *
 *   The layout can use state information to tweak and let the user customize
 *   its behavior.
 *
 *   It is the layout responsibility to validate any received state. A boolean
 *   should be returned from setState() to declare whether the received state
 *   is well formed or not.
 *
 *   setState() will receive a null state if the layout should be restored to
 *   its 'default' (or initial) state.
 *
 *   The rhizo.layout.StatefulLayout helper class can be used to simplify state
 *   management.
 *
 * - implement the cleanup() function (optional)
 *   If your layout creates data structures or UI components that
 *   have to be cleaned up once the layout is dismissed.
 *
 * - implement the dependentModels() function (optional)
 *   If your layout establish specific relationships between models (this may
 *   be the case, for example, of hierarchical layouts that define parent-child
 *   relationships between models). Rhizosphere may use the information about
 *   dependent models to tweak the way other aspects work, such as selection
 *   management.
 *
 * - register the newly created layout in the rhizo.layout.layouts structure.
 *
 * A layout may have an associated user interface to let the user customize
 * its behavior. To provide a user interface for a layout engine, see
 * rhizo.ui.layout.LayoutUi.
 */

// RHIZODEP=rhizo.log,rhizo.meta,rhizo.layout.shared
namespace("rhizo.layout");


/**
 * Helper superclass to simplify state management for stateful layouts.
 *
 * @param {rhizo.Project} project
 * @constructor
 */
rhizo.layout.StatefulLayout = function(project) {
  this.project_ = project;
  this.state_ = this.defaultState_();
};

/**
 * @return {*} The current layout state.
 */
rhizo.layout.StatefulLayout.prototype.getState = function() {
  return this.state_;
};

/**
 * Transitions the layout to a new state. The received state will be validated
 * before setting it on the layout.
 *
 * @param {*} otherState The state the layout should transition to. If null,
 *     the layout will transition back to its default state.
 * @return {boolean} Whether the state was successfully set or not (for example
 *     because it didn't pass validation checks).
 */
rhizo.layout.StatefulLayout.prototype.setState = function(otherState) {
  if (!otherState) {
    this.state_ = this.defaultState_();
    return true;
  }

  if (!this.validateState_(otherState)) {
    return false;
  } else {
    this.state_ = this.cloneState_(otherState);
    return true;
  }
};

/**
 * Subclasses to override to define default layout state.
 * @return {*} The default, or initial, layout state.
 */
rhizo.layout.StatefulLayout.prototype.defaultState_ = function() {
  return null;
};

/**
 * Subclasses to override to perform layout state validation.
 * @param {*} otherState The state the layout is asked to transition to.
 * @return {boolean} Whether the received state is well formed.
 */
rhizo.layout.StatefulLayout.prototype.validateState_ = function(otherState) {
  return true;
};

/**
 * Helper validation function that checks whether the received state contains
 * a given key.
 * @param {*} otherState The state to validate.
 * @param {string} key The key to find in otherState.
 * @return {boolean} Whether the state satisfies the validation rule.
 */
rhizo.layout.StatefulLayout.prototype.validateStateAttributePresence_ =
    function(otherState, key) {
  if (!(key in otherState)) {
    this.project_.logger().error(
        'State must specify a ' + key + ' attribute');
    return false;
  }
  return true;
};

/**
 * Helper validation function that checks whether a given key (found inside
 * a layout state) is present in the project metamodel and (optionally) whether
 * the key kind satisfies additional constraints.
 *
 * @param {string} key The key to find in the project metamodel.
 * @param {function(string, Object):boolean} opt_matcher Optional function to
 *     decide whether the received key is acceptable, given its associated
 *     metamodel information.
 *     Receives as parametes the key itself and the associated metamodel entry.
 */
rhizo.layout.StatefulLayout.prototype.validateMetamodelPresence_ = function(
    key, opt_matcher) {
  if (!(key in this.project_.metaModel())) {
    this.project_.logger().error(key + ' is not part of the metamodel.');
    return false;
  }
  if (opt_matcher && (!opt_matcher(key, this.project_.metaModel()[key]))) {
    this.project_.logger().error(
        key + ' does not match the required constraints');
    return false;
  }
  return true;
};

/**
 * Clones an externally received state.
 * Subclasses to override to customize the cloning policy, for example to
 * enforce specific casts or type conversion when an external state is set on
 * the layout.
 *
 * @param {*} otherState
 */
rhizo.layout.StatefulLayout.prototype.cloneState_ = function(otherState) {
  return $.extend({}, otherState);
};


/**
 * A no-op layout.
 * @param {rhizo.Project} unused_project
 * @constructor
 */
rhizo.layout.NoLayout = function(unused_project) {};

rhizo.layout.NoLayout.prototype.layout = function() {
  return false;
};

rhizo.layout.NoLayout.prototype.toString = function() {
  return "NoLayout";
};


/**
 * A layout that re-arranges models in random positions within the visible
 * viewport.
 * @param {rhizo.Project} unused_project
 * @constructor
 */
rhizo.layout.ScrambleLayout = function(unused_project) {};

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
rhizo.layout.ScrambleLayout.prototype.layout = function(pipeline,
                                                        layoutBox,
                                                        supermodels,
                                                        allmodels,
                                                        meta,
                                                        options) {
  if (options.filter) {
    return false; // re-layouting because of filtering doesn't affect the layout
  }

  // Randomly distributing models leaving a 5%-wide margin between the models
  // and the container.
  for (var i = 0, len = supermodels.length; i < len; i++) {
    var top = Math.round(layoutBox.height*0.05 +
                         Math.random()*0.85*layoutBox.height);
    var left = Math.round(layoutBox.width*0.05 +
                          Math.random()*0.85*layoutBox.width);

    pipeline.move(supermodels[i].id, top, left);
  }
  return false;
};

rhizo.layout.ScrambleLayout.prototype.toString = function() {
  return "ScrambleLayout";
};


/**
 * A layout that positions models sequentially, left to right, top to bottom.
 *
 * @param {rhizo.Project} project
 * @param {?number} opt_top Optional vertical separation (in px) to use between
 *     rows of models.
 * @param {?number} opt_left Optional horizontal separation (in px) to use
 *     between models next to each other.
 * @constructor
 */
rhizo.layout.FlowLayout = function(project, opt_top, opt_left) {
  this.project_ = project;
  this.top = opt_top || 5;
  this.left = opt_left || 5;
  rhizo.layout.StatefulLayout.call(this, project);
};
rhizo.inherits(rhizo.layout.FlowLayout, rhizo.layout.StatefulLayout);

/**
 * @private
 */
rhizo.layout.FlowLayout.prototype.defaultState_ = function() {
  return {
    order: rhizo.layout.firstMetamodelKey(this.project_),
    reverse: false
  };
};

/**
 * Validates a layout state. A valid state must have an 'order' property
 * pointing to the metamodel key that will be used as sorting criteria when
 * laying out models.
 *
 * @param {*} otherState
 * @private
 */
rhizo.layout.FlowLayout.prototype.validateState_ = function(otherState) {
  return this.validateStateAttributePresence_(otherState, 'order') &&
      this.validateMetamodelPresence_(otherState.order);
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
rhizo.layout.FlowLayout.prototype.layout = function(pipeline,
                                                    layoutBox,
                                                    supermodels,
                                                    allmodels,
                                                    meta,
                                                    options) {
  var order = this.getState().order;
  var reverse = !!this.getState().reverse;
  var maxWidth = layoutBox.width;
  var lineHeight = 0;

  // reorder supermodels
  supermodels.sort(rhizo.meta.sortBy(order, meta[order].kind, reverse));

  // layout supermodels
  for (var i = 0, len = supermodels.length; i < len; i++) {
    var modelDims = supermodels[i].rendering().getDimensions();
    lineHeight = Math.max(lineHeight, modelDims.height);

    if (this.left + modelDims.width > maxWidth) {
      this.left = 5;
      this.top += lineHeight + 5;
      lineHeight = modelDims.height;
    }

    pipeline.move(supermodels[i].id, this.top, this.left);
    this.left += modelDims.width + 5;
  }
  // adjust top after last line
  this.top += lineHeight;
  return false;
};

rhizo.layout.FlowLayout.prototype.cleanup = function(sameEngine, options) {
  this.top = this.left = 5;
  return false;
};

rhizo.layout.FlowLayout.prototype.toString = function() {
  return "FlowLayout";
};


/**
 * A layout that arranges models in buckets.
 * @param {rhizo.Project} project
 * @constructor
 */
rhizo.layout.BucketLayout = function(project) {
  this.project_ = project;
  this.internalFlowLayout_ = new rhizo.layout.FlowLayout(project);
  rhizo.layout.StatefulLayout.call(this, project);
};
rhizo.inherits(rhizo.layout.BucketLayout, rhizo.layout.StatefulLayout);

/**
 * @private
 */
rhizo.layout.BucketLayout.prototype.defaultState_ = function() {
  return {
    bucketBy: rhizo.layout.firstMetamodelKey(this.project_),
    reverse: false
  };
};

/**
 * Validates a layout state. A valid state must have a 'bucketBy' property
 * pointing to the metamodel key that will be used as grouping criteria when
 * laying out models.
 *
 * @param {*} otherState
 * @private
 */
rhizo.layout.BucketLayout.prototype.validateState_ = function(otherState) {
  return this.validateStateAttributePresence_(otherState, 'bucketBy') &&
      this.validateMetamodelPresence_(otherState.bucketBy);
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
rhizo.layout.BucketLayout.prototype.layout = function(pipeline,
                                                      layoutBox,
                                                      supermodels,
                                                      allmodels,
                                                      meta,
                                                      options) {
  var reverse = !!this.getState().reverse;
  var bucketBy = this.getState().bucketBy;
  this.internalFlowLayout_.setState({order: bucketBy, reverse: reverse});

  var clusterFunction;
  var clusterThis;
  if (meta[bucketBy].cluster) {
    clusterFunction = meta[bucketBy].cluster;
    clusterThis = meta[bucketBy];
  } else {
    clusterFunction = meta[bucketBy].kind.cluster;
    clusterThis = meta[bucketBy].kind;
  }
  var buckets = {};
  var bucketsLabels = {};

  // figure out the bucket for each model
  for (var i = 0, len = supermodels.length; i < len; i++) {
    var bucketKey = supermodels[i].unwrap()[bucketBy];
    var bucketLabel = bucketKey;
    if (clusterFunction) {
      var keyLabel = clusterFunction.call(clusterThis, bucketKey);
      bucketKey = keyLabel['key'];
      bucketLabel = keyLabel['label'];
    }
    if (!buckets[bucketKey]) {
      buckets[bucketKey] = [];
      bucketsLabels[bucketKey] = bucketLabel;
    }
    buckets[bucketKey].push(supermodels[i]);
  }

  // collect unique bucketKeys
  var bucketKeys = [];
  for (bucketKey in buckets) {
    bucketKeys.push(bucketKey);
  }

  // sort bucketKeys
  bucketKeys.sort(rhizo.meta.sortByKind(meta[bucketBy].kind, reverse));

  var dirty = false;
  var firstBucket = true;
  for (var i = 0; i < bucketKeys.length; i++) {
    var bucketKey = bucketKeys[i];
    this.renderBucketHeader_(pipeline,
                             bucketsLabels[bucketKey],
                             buckets[bucketKey],
                             firstBucket);
    dirty = this.internalFlowLayout_.layout(pipeline,
                                            layoutBox,
                                            buckets[bucketKey],
                                            allmodels,
                                            meta,
                                            options) || dirty;

    // re-position for next bucket
    this.internalFlowLayout_.top += 10;
    this.internalFlowLayout_.left = 5;
    firstBucket = false;
  }
  return dirty;
};

/**
 * Renders a bucket header.
 *
 * @param {rhizo.ui.RenderingPipeline} pipeline The pipeline that
 *     accumulates all the layout operations to perform as part of this layout
 *     request.
 * @param {string} header The bucket label.
 * @param {Array.<rhizo.model.SuperModel>} supermodels The supermodels that are
 *     clustered within this bucket.
 * @param {boolean} firstBucket Whether the bucket header being rendered is the
 *     first one or not.
 * @private
 */
rhizo.layout.BucketLayout.prototype.renderBucketHeader_ =
    function(pipeline, header, supermodels, firstBucket) {
  var modelIds = new Array(supermodels.length);
  for (var i = supermodels.length - 1; i >= 0; i--) {
    modelIds[i] =supermodels[i].id;
  }
  var bucketHeader = $('<div />', {
      'class': firstBucket ? 'rhizo-bucket-header rhizo-bucket-first' :
                             'rhizo-bucket-header'});

  bucketHeader.text(header).
               css('position', 'absolute').
               css('left', 5).
               css('top', this.internalFlowLayout_.top).
               click(jQuery.proxy(function() {
                 this.project_.eventBus().publish(
                     'selection', {'action': 'toggle', 'models': modelIds});
               }, this));
  pipeline.artifact(bucketHeader);
  this.internalFlowLayout_.top += bucketHeader.height() + 5;
};

rhizo.layout.BucketLayout.prototype.cleanup = function(sameEngine, options) {
  this.internalFlowLayout_.cleanup(sameEngine, options);
  return false;
};

rhizo.layout.BucketLayout.prototype.toString = function() {
  return "BucketLayout";
};


/**
 * Enumeration of all available layouts. New layouts should be registered in
 * this enum for Rhizosphere to pick them up.
 */
rhizo.layout.layouts = {
  no: {'name': '-', 'engine': rhizo.layout.NoLayout},
  flow: {'name': 'List', 'engine': rhizo.layout.FlowLayout},
  scramble: {'name': 'Random', 'engine': rhizo.layout.ScrambleLayout},
  bucket: {'name': 'Buckets', 'engine': rhizo.layout.BucketLayout}
};
