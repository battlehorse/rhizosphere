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
To define a new layout:

- create the object

- implement the layout() function
  This is responsible for the actual layouting

- implement the toString() function
  This returns the layout name for display purposes

- implement the verifyMetaModel() function (optional)
  This verifies the current project metaModel and decides whether it
  contains the right kinds for this layout to work. If not implemented, it is
  assumed the layout can work with the current metamodel.

- implement the details() function (optional)
  This renders a piece of UI you can use to collect extra options
  for your layout

- implement a getState()/setState() function pair (optional).
  Handle state management for the layout. The former returns a plain js object
  with the layout state information, the latter receives the same object back
  for the layout to restore itself to a given state.
  Most notably the layout will used it to restore the controls handled by
  the details() function to a previous state.
  setState() will receive a null state if the layout should be restored to its
  'default' (or initial) state.

- implement the cleanup() function (optional)
  If your layout creates data structures or UI components that
  have to be cleaned up

- implement the dependentModels() function (optional)
  If your layout establish specific relationships between models (this may be
  the case, for example, of hierarchical layouts that define parent-child
  relationships between models). Rhizosphere may use the information about
  dependent models to tweak the way other aspects work, such as selection
  management.

- update the rhizo.layout.layouts structure
*/

// RHIZODEP=rhizo.log,rhizo.meta,rhizo.layout.shared
namespace("rhizo.layout");

rhizo.layout.NoLayout = function(unused_project) {};

rhizo.layout.NoLayout.prototype.layout = function(container,
                                                  supermodels,
                                                  allmodels,
                                                  meta,
                                                  options) {
  return false;
};

rhizo.layout.NoLayout.prototype.toString = function() {
  return "-";
};

rhizo.layout.FlowLayout = function(project, opt_top, opt_left) {
  this.project_ = project;
  this.top = opt_top || 5;
  this.left = opt_left || 5;
  this.orderSelector_ = null;
  this.reverseCheckbox_ = null;
};

rhizo.layout.FlowLayout.prototype.layout = function(container,
                                                    supermodels,
                                                    allmodels,
                                                    meta,
                                                    options) {
  var maxWidth = container.width();
  var lineHeight = 0;

  // reorder supermodels if needed
  var order = this.orderSelector_.val();
  var reverse = this.reverseCheckbox_.is(":checked");
  if (order) {
    this.project_.logger().info("Sorting by " + order);
    supermodels.sort(rhizo.meta.sortBy(order, meta[order].kind, reverse));
  }

  // layout supermodels
  for (var i = 0, len = supermodels.length; i < len; i++) {
    var modelDims = supermodels[i].rendering().getDimensions();
    lineHeight = Math.max(lineHeight, modelDims.height);

    if (this.left + modelDims.width > maxWidth) {
      this.left = 5;
      this.top += lineHeight + 5;
      lineHeight = modelDims.height;
    }

    supermodels[i].rendering().move(this.top, this.left);
    this.left += modelDims.width + 5;
  }
  // adjust top after last line
  this.top += lineHeight;
  return false;
};

rhizo.layout.FlowLayout.prototype.overrideDetailControls = function(
  orderSelector, reverseCheckbox) {
  this.orderSelector_ = orderSelector;
  this.reverseCheckbox_ = reverseCheckbox;
};

rhizo.layout.FlowLayout.prototype.cleanup = function(sameEngine, options) {
  this.top = this.left = 5;
  return false;
};

rhizo.layout.FlowLayout.prototype.details = function() {
  this.orderSelector_ =  rhizo.layout.metaModelKeySelector(
    this.project_, 'rhizo-flowlayout-order');
  this.reverseCheckbox_ = $(
    '<input type="checkbox" class="rhizo-flowlayout-desc" />');
  return $("<div />").
           append("Ordered by: ").
           append(this.orderSelector_).
           append(" desc?").
           append(this.reverseCheckbox_);
};

rhizo.layout.FlowLayout.prototype.getState = function() {
  return {
    order: this.orderSelector_.val(),
    reverse: this.reverseCheckbox_.is(':checked')
  };
};

rhizo.layout.FlowLayout.prototype.setState = function(state) {
  if (state) {
    this.orderSelector_.val(state.order);
    if (state.reverse) {
      this.reverseCheckbox_.attr('checked', 'checked');
    } else {
    this.reverseCheckbox_.removeAttr('checked');
    }
  } else {
    this.orderSelector_.find('option:first').attr('selected', 'selected');
    this.reverseCheckbox_.removeAttr('checked');
  }
};

rhizo.layout.FlowLayout.prototype.toString = function() {
  return "List";
};

rhizo.layout.ScrambleLayout = function(unused_project) {};

rhizo.layout.ScrambleLayout.prototype.layout = function(container,
                                                        supermodels,
                                                        allmodels,
                                                        meta,
                                                        options) {
  if (options.filter) {
    return false; // re-layouting because of filtering doesn't affect the layout
  }
  var containerWidth = container.width();
  var containerHeight = container.height();

  // Randomly distributing models leaving a 5%-wide margin between the models
  // and the container.
  for (var i = 0, len = supermodels.length; i < len; i++) {
    var top = Math.round(containerHeight*0.05 +
                         Math.random()*0.85*containerHeight);
    var left = Math.round(containerWidth*0.05 +
                          Math.random()*0.85*containerWidth);

    supermodels[i].rendering().move(top, left);
  }
  return false;
};

rhizo.layout.ScrambleLayout.prototype.toString = function() {
  return "Random";
};

rhizo.layout.BucketLayout = function(project) {
  this.project_ = project;
  this.internalFlowLayout_ = new rhizo.layout.FlowLayout(project);
  this.bucketHeaders_ = [];
  this.bucketSelector_ = null;
  this.reverseCheckbox_ = null;
};

rhizo.layout.BucketLayout.prototype.layout = function(container,
                                                      supermodels,
                                                      allmodels,
                                                      meta,
                                                      options) {
  var reverse = this.reverseCheckbox_.is(":checked");

  // detect bucket
  var bucketBy = this.bucketSelector_.val();
  if (!meta[bucketBy]) {
    this.project_.logger().error("layoutBy attribute does not match any property");
    return false;
  }
  this.project_.logger().info("Bucketing by " + bucketBy);

  this.internalFlowLayout_.overrideDetailControls(this.bucketSelector_,
                                                  this.reverseCheckbox_);

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
  for (var i = 0; i < bucketKeys.length; i++) {
    var bucketKey = bucketKeys[i];
    this.renderBucketHeader_(container,
                             bucketsLabels[bucketKey],
                             buckets[bucketKey]);
    dirty = this.internalFlowLayout_.layout(container,
                                            buckets[bucketKey],
                                            allmodels,
                                            meta,
                                            options) || dirty;

    // re-position for next bucket
    this.internalFlowLayout_.top += 10;
    this.internalFlowLayout_.left = 5;
  }
  return dirty;
};

/**
 * Renders a bucket header.
 *
 * @param {*} container JQuery object pointing to the container the bucket
 *     header will be appended to.
 * @param {string} header The bucket label.
 * @param {Array.<rhizo.model.SuperModel>} supermodels The supermodels that are
 *     clustered within this bucket.
 * @private
 */
rhizo.layout.BucketLayout.prototype.renderBucketHeader_ =
    function(container, header, supermodels) {
  var bucketHeader = $("<div class='rhizo-bucket-header'>" +
                       header +
                       "</div>");
  bucketHeader.css('position', 'absolute').
               css('left', 5).
               css('top', this.internalFlowLayout_.top).
               click(jQuery.proxy(function() {
                 var allSelected = true;
                 for (var i = supermodels.length - 1; i >= 0; i--) {
                   if (!this.project_.isSelected(supermodels[i].id)) {
                    allSelected = false;
                    break;
                   }
                 }
                 for (var i = supermodels.length - 1; i >= 0; i--) {
                   if (allSelected) {
                     this.project_.unselect(supermodels[i].id);
                   } else {
                     this.project_.select(supermodels[i].id);
                   }
                 }    
               }, this));
  this.bucketHeaders_.push(bucketHeader);
  container.append(bucketHeader);
  this.internalFlowLayout_.top += bucketHeader.height() + 5;
};


rhizo.layout.BucketLayout.prototype.details = function() {
  this.bucketSelector_ = rhizo.layout.metaModelKeySelector(
      this.project_, 'rhizo-bucketlayout-bucket');
  this.reverseCheckbox_ = $('<input type="checkbox" ' +
                            'class="rhizo-bucketlayout-desc" />');
  return $("<div />").
           append("Group by: ").
           append(this.bucketSelector_).
           append(" desc?").
           append(this.reverseCheckbox_);
};

rhizo.layout.BucketLayout.prototype.cleanup = function(sameEngine, options) {
  this.internalFlowLayout_.cleanup(sameEngine, options);
  $.each(this.bucketHeaders_, function() { this.remove(); });
  this.bucketHeaders_ = [];
  return false;
};

rhizo.layout.BucketLayout.prototype.getState = function() {
  return {
    bucketBy: this.bucketSelector_.val(),
    reverse: this.reverseCheckbox_.is(':checked')
  };
};

rhizo.layout.BucketLayout.prototype.setState = function(state) {
  if (state) {
    this.bucketSelector_.val(state.bucketBy);
    if (state.reverse) {
      this.reverseCheckbox_.attr('checked', 'checked');
    } else {
      this.reverseCheckbox_.removeAttr('checked');
    }
  } else {
    this.bucketSelector_.find('option:first').attr('selected', 'selected');
    this.reverseCheckbox_.removeAttr('checked');
  }
};

rhizo.layout.BucketLayout.prototype.toString = function() {
  return "Buckets";
};


rhizo.layout.layouts = {
  no: rhizo.layout.NoLayout,
  flow: rhizo.layout.FlowLayout,
  scramble: rhizo.layout.ScrambleLayout,
  bucket: rhizo.layout.BucketLayout
};
