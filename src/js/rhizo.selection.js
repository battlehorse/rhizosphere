/**
  @license
  Copyright 2011 The Rhizosphere Authors. All Rights Reserved.

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
 * @fileOverview Class that oversee Rhizosphere models' selection and focus
 * management.
 */

//RHIZODEP=rhizo
namespace('rhizo.selection');


/**
 * A SelectionManager is responsible for handling selection and focus operations
 * applied to models part of a Rhizosphere visualization.
 *
 * Models can be in two states as far as selection is concerned:
 * - selected/deselected : Selection may be visually represented as an highlight
 *   of the model rendering, but both selected and deselected models remain
 *   visible in the visualization viewport.
 * - focused/hidden : The visualization can be 'focused' on a set of models.
 *   All models which are not under focus are hidden from view and not visible
 *   in the visualization viewport (They appear as filtered out, as defined
 *   by rhizo.model.SuperModel.isFiltered()).
 *
 * The two concepts are ortogonal to each other, even though they are usually
 * related as the user first selects a set of models in order to hide or focus
 * on them.
 *
 * Selection operations are triggered by publishing messages on the 'selection'
 * channel of the project eventbus. The messages are expected in the following
 * format:
 *
 * message = {
 *   action: 'select',
 *   models: ['1', '3', '10']
 * };
 *
 * message = {
 *   action: 'hide',
 *   models: ['1', '5'],
 *   incremental: false
 * };
 *
 * Where each key has the following meaning:
 *
 * - action: The action to perform. Supported ones are 'select' (selects one or
 *   more models), 'deselect' (the opposite), 'selectAll' (select all models),
 *   'deselectAll' (the opposite), 'toggle' (toggles the selection status of
 *   one or more models), 'focus' (focuses the visualization on the given
 *   models, hiding all the others), 'hide' (hides the given models from the
 *   visualization), 'resetFocus' (resets focus/hide status making all models
 *   visible).
 *
 * - models: Either one or more (in array form) model ids to apply the action
 *   to. Ignored for 'selectAll', 'deselectAll' and 'resetFocus' operations.
 *   Can be omitted for 'focus' and 'hide' operations, in which case the
 *   operation is applied to the currently selected set of models (if any).
 *   The selection manager can expand or modify the 'models' list during
 *   the message preprocessing phase to normalize it or include additional
 *   selection constraints (such as selection extensions imposed by layout
 *   engines).
 *
 * - incremental: (used only by 'focus' and 'hide' actions) Whether the
 *   operation should be incremental (in addition to other models already
 *   focused or hidden) or absolute (the 'models' list represents the full set
 *   of models to hide or focus).
 *
 * @param {!rhizo.Project} project The project this selection manager
 *     belongs to.
 * @constructor
 */
rhizo.selection.SelectionManager = function(project) {
  /**
   * @type {!rhizo.Project}
   * @private
   */
  this.project_ = project;

  /**
   * Map of all the currently selected models, keyed by their model id.
   * @type {!Object.<*, rhizo.model.SuperModel>}
   * @private
   */
  this.selectionMap_ = {};

  this.project_.eventBus().addPreprocessor(
      'selection', this.onBeforeSelection_, this, /* first */ true);
  this.project_.eventBus().subscribe('selection', this.onSelection_, this);
};

/**
 * Returns the number of currently selected models.
 * @return {number} The number of currently selected models.
 */
rhizo.selection.SelectionManager.prototype.getNumSelected = function() {
  var count = 0;
  for (var modelId in this.selectionMap_) {
    count++;
  }
  return count;
};

/**
 * Returns whether a given model is selected or not.
 * @param {*} id The id of the model to check.
 */
rhizo.selection.SelectionManager.prototype.isSelected = function(id) {
  return !!this.selectionMap_[id];
};

/**
 * Returns a map of all the selected models.
 * @return {!Object.<*, rhizo.model.SuperModel>} All the currently selected
 *     models, keyed by their id.
 */
rhizo.selection.SelectionManager.prototype.allSelected = function() {
  return this.selectionMap_;
};

/**
 * Returns a map of all the de-selected models.
 * @return {!Object.<*, rhizo.model.SuperModel>} All the currently deselected
 *     models, keyed by their id.
 */
rhizo.selection.SelectionManager.prototype.allDeselected = function() {
  var allDeselected = {};
  var allModels = this.project_.modelsMap();
  for (var modelId in allModels) {
    if (!(modelId in this.selectionMap_)) {
      allDeselected[modelId] = allModels[modelId];
    }
  }
  return allDeselected;
};

/**
 * Returns the number of focused models.
 * @return {number} The number of focused models.
 */
rhizo.selection.SelectionManager.prototype.getNumFocused = function() {
  var count = 0;
  for (var modelId in this.project_.modelsMap()) {
    if (!this.project_.model(modelId).isFiltered('__selection__')) {
      count++;
    }
  }
  return count;
};

/**
 * Returns the number of hidden models.
 * @return {number} The number of hidden models.
 */
rhizo.selection.SelectionManager.prototype.getNumHidden = function() {
  var count = 0;
  for (var modelId in this.project_.modelsMap()) {
    if (this.project_.model(modelId).isFiltered('__selection__')) {
      count++;
    }
  }
  return count;
};

/**
 * Returns a map of all the focused models.
 * @return {!Object<*, rhizo.model.SuperModel>} All the currently focused
 *     models, keyed by their id.
 */
rhizo.selection.SelectionManager.prototype.allFocused = function() {
  var focused = {};
  var allModels = this.project_.modelsMap();
  for (var modelId in allModels) {
    if (!allModels[modelId].isFiltered('__selection__')) {
      focused[modelId] = allModels[modelId];
    }
  }
  return focused;
};

/**
 * Returns a map of all the hidden (unfocused) models.
 * @return {!Object<*, rhizo.model.SuperModel>} All the currently hidden
 *     models, keyed by their id.
 */
rhizo.selection.SelectionManager.prototype.allHidden = function() {
  var hidden = {};
  var allModels = this.project_.modelsMap();
  for (var modelId in allModels) {
    if (allModels[modelId].isFiltered('__selection__')) {
      hidden[modelId] = allModels[modelId];
    }
  }
  return hidden;
};

/**
 * Preprocessing callback invoked whenever a message is published on the
 * 'selection' channel.
 *
 * It expands the input set of models to apply selection changes to, to
 * include all the affected ones. This includes, for example, selections that
 * occur when a hierarchical layout engine is applied (so that selection
 * changes on root nodes are automatically expanded to include dependent
 * models).
 *
 * For 'toggle' selections, it resolves whether the toggle is actually
 * selecting or deselecting models.
 *
 * After this preprocessing callback, the 'models' parameter of the eventbus
 * message is guaranteed to contain the complete list of model ids affected
 * by the change.
 *
 * @param {!Object} message The published message.
 * @param {!function(boolean, string=} rspCallback Callback to invoke with the
 *     preprocessing outcome.
 * @private
 */
rhizo.selection.SelectionManager.prototype.onBeforeSelection_ = function(
    message, rspCallback) {
  switch(message['action']) {
    case 'selectAll':
      message['models'] = this.getAllModelIds_(this.project_.modelsMap());
      break;
    case 'deselectAll':
      message['models'] = this.getAllModelIds_(this.selectionMap_);
      break;
    case 'select':
    case 'deselect':
      message['models'] = this.extendSelection_(message['models']);
      break;
    case 'toggle':
      var ids = message['models'];
      if (!$.isArray(ids)) {
        ids = [ids];
      }

      // Decides whether the toggle will resolve into a 'select' or 'deselect'
      // operation.
      var allSelected = true;
      for (var i = ids.length - 1; i >= 0; i--) {
        if (!this.isSelected(ids[i])) {
          allSelected = false;
          break;
        }
      }
      message['models'] = this.extendSelection_(message['models']);
      message['action'] = allSelected ? 'deselect' : 'select';
      break;
    case 'focus':
    case 'hide':
      // Focus or hide operations that do no specify any affected models are
      // applied to the current selection.
      if (!message['models'] || message['models'].length == 0) {
        message['models'] = this.getAllModelIds_(this.selectionMap_);
      } else {
        message['models'] = this.extendSelection_(message['models']);
      }
      break;
    case 'resetFocus':
      message['models'] = this.getAllHiddenModels_(this.project_.modelsMap());
      break;
    default:
      rspCallback(false, 'Invalid selection operation: ' + message['action']);
      return;
  }
  rspCallback(true);
};

/**
 * Callback invoked when a selection request is published on the 'selection'
 * channel.
 * @param {!Object} message The published message.
 * @private
 */
rhizo.selection.SelectionManager.prototype.onSelection_ = function(message) {
  switch (message['action']) {
    case 'select':  // includes 'toggle'
    case 'selectAll':
      this.select_(message['models']);
      break;
    case 'deselect':  // includes 'toggle'
    case 'deselectAll':
      this.deselect_(message['models']);
      break;
    case 'focus':
      if (message['models'].length > 0) {
        this.focus_(message['models'], this.isIncremental_(message));
        this.deselect_(this.getAllModelIds_(this.selectionMap_));
      }
      break;
    case 'hide':
      if (message['models'].length > 0) {
        this.hide_(message['models'], this.isIncremental_(message));
        this.deselect_(this.getAllModelIds_(this.selectionMap_));
      }
      break;
    case 'resetFocus':
      this.resetFocus_();
      this.deselect_(this.getAllModelIds_(this.selectionMap_));
      break;
  }
};

/**
 * Decides whether a 'focus' or 'hide' message should be incremental, i.e.
 * apply itself in addition to the already focused or hidden models, or not,
 * i.e. representing the complete list of models to be focused or hidden.
 *
 * The decision is taken based on the value of the 'incremental' message
 * option, defaulting to true if unspecified.
 *
 * @param {!Object} message The message published on the 'selection' channel.
 * @private
 */
rhizo.selection.SelectionManager.prototype.isIncremental_ = function(message) {
  return (!('incremental' in message)) || !!message['incremental'];
};

/**
 * Converts a mapping of model ids to instances into a linear array of ids.
 * @param {!Object.<*, rhizo.model.SuperModel>} modelsMap A mapping of model
 *     ids to model instances.
 * @return {!Array.<*>} The array of extracted model ids.
 * @private
 */
rhizo.selection.SelectionManager.prototype.getAllModelIds_ = function(
    modelsMap) {
  var modelIds = [];
  for (var modelId in modelsMap) {
    modelIds.push(modelId);
  }
  return modelIds;
};

/**
 * Returns the list of all models (by their ids) from the input modelMap that
 * are currently hidden.
 *
 * @param {!Object.<*, rhizo.model.SuperModel>} modelsMap A mapping of model
 *     ids to model instances.
 * @return {!Array.<*>} The list of hidden model ids.
 */
rhizo.selection.SelectionManager.prototype.getAllHiddenModels_ = function(
    modelsMap) {
  var modelIds = [];
  for (var modelId in modelsMap) {
    if (modelsMap[modelId].isFiltered('__selection__')) {
      modelIds.push(modelId);
    }
  }
  return modelIds;
};

/**
 * Extends the list of models the selection change will apply to, based on the
 * rules defined by the current layout engine. he engine may be aware of
 * relationships between models (such as hierarchies) so that selecting a model
 * should trigger the selection of dependent ones.
 *
 * @param {!(*|Array.<*>)} ids A single model id or an array of model ids.
 * @return {!Array.<*>} The extended list of affected model ids.
 * @private
 */
rhizo.selection.SelectionManager.prototype.extendSelection_ = function(ids) {
  if (!$.isArray(ids)) {
    ids = [ids];
  }
  var extension = [];
  for (var i = 0; i < ids.length; i++) {
    //  The list of models to extend may come from historical visualization
    // states, so it may contain references to model ids that are no longer
    // part of the current visualization.
    if (this.project_.model(ids[i])) {
      Array.prototype.push.apply(
          extension, this.project_.layoutManager().extendSelection(ids[i]));
    }
  }
  return extension;
};

/**
 * Selects a list of models.
 * @param {!Array.<*>} modelIds The ids of the models to select.
 * @private
 */
rhizo.selection.SelectionManager.prototype.select_ = function(modelIds) {
  for (var i = modelIds.length-1; i >= 0; i--) {
    this.selectSingle_(modelIds[i]);
  }
};

/**
 * Deselects a list of models.
 * @param {!Array.<*>} modelIds The ids of the models to deselect.
 * @private
 */
rhizo.selection.SelectionManager.prototype.deselect_ = function(modelIds) {
  for (var i = modelIds.length-1; i >= 0; i--) {
    this.deselectSingle_(modelIds[i]);
  }
};

/**
 * Selects a single model.
 * @param {*} modelId The id of the model to select.
 * @private
 */
rhizo.selection.SelectionManager.prototype.selectSingle_ = function(modelId) {
  var model = this.project_.model(modelId);
  model.setSelected(true);
  this.selectionMap_[modelId] = model;
};

/**
 * Deselects a single model.
 * @param {*} modelId The id of the model to deselect.
 * @private
 */
rhizo.selection.SelectionManager.prototype.deselectSingle_ = function(modelId) {
  var model = this.project_.model(modelId);
  model.setSelected(false);
  delete this.selectionMap_[modelId];
};

/**
 * Focuses a list of models.
 * @param {!Array.<*>} modelIds The ids of the models to focus.
 * @param {boolean} incremental Whether the focus should be incremental (in
 *     addition to other models already focused) or absolute (the input list
 *     represents the full set of models that should be focused, all the others
 *     being hidden).
 * @private
 */
rhizo.selection.SelectionManager.prototype.focus_ = function(
    modelIds, incremental) {
  // convert to map.
  var focusedIds = {};
  for (var i = modelIds.length-1; i >= 0; i--) {
    focusedIds[modelIds[i]] = true;
  }

  var filteredIds = [];
  for (var modelId in this.project_.modelsMap()) {
    if (!(modelId in focusedIds)) {
      filteredIds.push(modelId);
    }
  }
  this.hide_(filteredIds, incremental);
};

/**
 * Hides a list of models.
 * @param {!Array.<*>} modelIds The ids of the models to hide.
 * @param {boolean} incremental Whether the hiding should be incremental (in
 *     addition to other models already hidden) or absolute (the input list
 *     represents the full set of models that should be hidden, all the
 *     others being focused).
 * @private
 */
rhizo.selection.SelectionManager.prototype.hide_ = function(
    modelIds, incremental) {
  if (!incremental) {
    this.project_.resetAllFilter('__selection__');
  }
  for (var i = modelIds.length-1; i >= 0; i--) {
    this.project_.model(modelIds[i]).filter('__selection__');
  }
  // after changing the filter status of some elements, recompute fx settings.
  this.project_.alignFx();
  // TODO(battlehorse): should be delayed when restoring a full state
  // because a layout message will be published afterward anyway.
  this.project_.layoutManager().forceLayout({filter: true});
};

/**
 * Resets the focus status of all the models, making all models focused.
 * @private
 */
rhizo.selection.SelectionManager.prototype.resetFocus_ = function() {
  if (this.project_.resetAllFilter('__selection__')) {
    // If one or more models changed their filtering status, recompute fx
    // and layout.
    this.project_.alignFx();

    // TODO(battlehorse): should be delayed when restoring a full state
    // because a layout message will be published afterward anyway.
    this.project_.layoutManager().forceLayout({filter: true});
  }
};
