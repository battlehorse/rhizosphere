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

// RHIZODEP=rhizo.ui
namespace("rhizo.model");

/**
 * Wraps a 'naked' model with additional functionalities and goodness required
 * by Rhizosphere to manage it.
 *
 * @param {*} model The model to wrap.
 * @constructor
 */
rhizo.model.SuperModel = function(model) {
  this.model = model;
  this.id = model.id;
  this.filters_ = {}; // a map of filter status, one for each model key
  this.rendering_ = null;
  this.selected_ = false;
  this.pinned_ = false;
};

/**
 * @param {rhizo.ui.Rendering} rendering
 */
rhizo.model.SuperModel.prototype.setRendering = function(rendering) {
  this.rendering_ = rendering;
};

/**
 * @return {rhizo.ui.Rendering}
 */
rhizo.model.SuperModel.prototype.rendering = function() {
  return this.rendering_;
};

/**
 * @return {*} the naked model wrapped by this SuperModel.
 */
rhizo.model.SuperModel.prototype.unwrap = function() {
  return this.model;
};

/**
 * @return {boolean} Whether this model participates in layout operations.
 *     A model won't respond to layouts if it's filtered or pinned.
 */
rhizo.model.SuperModel.prototype.isAvailableForLayout = function() {
  return !this.isFiltered() && !this.isPinned();
};

/**
 * Sets the selection status for this model. Propagates to its rendering.
 * @param {boolean} selected
 */
rhizo.model.SuperModel.prototype.setSelected = function(selected) {
  this.selected_ = !!selected;
  this.rendering_.setSelected(this.selected_);
};

/**
 * Pins the model. The model rendering will remain at a fixed position in
 * the visualization universe and won't respond to layout operations. Users
 * can still move the model by manually dragging it.
 */
rhizo.model.SuperModel.prototype.pin = function() {
  this.pinned_ = true;
};

/**
 * Unpins the model.
 */
rhizo.model.SuperModel.prototype.unpin = function() {
  this.pinned_ = false;
};

/**
 * @return {boolean} Whether the model is pinned or not.
 */
rhizo.model.SuperModel.prototype.isPinned = function() {
  return this.pinned_;
};

rhizo.model.SuperModel.prototype.toString = function() {
  return this.model.toString();
};

/**
 * Checks whether this model is filtered out from the visualization.
 *
 * @param {string=} opt_key An optional filtering key. If present, the method
 *     will check only whether the model is filtered on the given key. If
 *     missing, the method will check if the model is filtered according to
 *     any key.
 * @return {boolean} Whether this model is filtered out from the visualization
 *     or not.
 */
rhizo.model.SuperModel.prototype.isFiltered = function(opt_key) {
  if (opt_key) {
    return this.filters_[opt_key] || false;
  } else {
    for (var key in this.filters_) {
      return true;
    }
    return false;
  }
};

/**
 * Applies the given filter to this model.
 * @param {string} key The key of the filter to add.
 * @return {boolean} Whether the filter did not exist on this model (and was
 *     therefore added) or was already there (no-op).
 */
rhizo.model.SuperModel.prototype.filter = function(key) {
  if (key in this.filters_) {
    return false;
  } else {
    this.filters_[key] = true;
    return true;
  }
};

/**
 * Removes the given filter from this model.
 * @param {string} key The key of the filter to remove.
 * @return {boolean} Whether the filter existed on this model (and was
 *     therefore removed) or not.
 */
rhizo.model.SuperModel.prototype.resetFilter = function(key) {
  if (key in this.filters_) {
    delete this.filters_[key];
    return true;
  } else {
    return false;
  }
};

/**
 * Notifies the supermodel that the underlying naked model has changed, forcing
 * it to update the rendering.
 */
rhizo.model.SuperModel.prototype.modelChanged = function() {
  this.rendering_.modelChanged();
};