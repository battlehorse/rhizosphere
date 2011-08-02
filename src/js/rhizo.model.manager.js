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
 * @fileOverview Classes that oversee Rhizosphere model management.
 * @author Riccardo Govoni (battlehorse@google.com)
 */

//RHIZODEP=rhizo.model,rhizo.ui
namespace('rhizo.model');


/**
 * A ModelManager is responsible for keeping track of the models (visualization
 * items) that are currently part of a Rhizosphere visualization and handling
 * their addition and removal.
 *
 * Model addition and removal are triggered by publishing messages on the
 * 'model' channel of the project event bus. The messages are expected in the
 * following format:
 *
 * message = {
 *   action: 'add',
 *   models: [ Object, Object, ... ],
 *   options: {delayLayout: true}
 * };
 *
 * Where each key has the following meaning:
 *
 * - action: The action to perform, 'add' or 'remove'.
 *
 * - models: One or more models to add or remove from the visualization.
 *   New models being added must have an 'id' field that uniquely identifies
 *   them within the visualization. The message won't be processed if invalid
 *   or missing ids are found.
 *   When models are removed, the 'models' parameter can either specify actual
 *   model objects, or just reference them by their id. Invalid or non-existent
 *   ids will be ignored.
 *
 * - options: Additional configuration to tweak the message processing. The
 *   key is optional. Currently supported options are:
 *   - 'delayLayout' (boolean): Whether the refresh of the visualization layout
 *     (to accomodate the newly added or removed models) should be avoided or
 *     not (defaults: false).
 *
 * @param {!rhizo.Project} project The project this model manager belongs to.
 * @param {!Object} options Project-wide configuration options.
 * @constructor
 */
rhizo.model.ModelManager = function(project, options) {
  /**
   * @type {!rhizo.Project}
   * @private
   */
  this.project_ = project;

  /**
   * @type {rhizo.ui.RenderingBoostrap}
   * @private
   */
  this.renderingBootstrap_ = new rhizo.ui.RenderingBootstrap(
      this.project_.renderer(), this.project_.gui(), this.project_, options);

  /**
   * The map of all models currently deployed on the visualization, keyed by
   * their unique id.
   *
   * @type {!Object.<string, !rhizo.model.SuperModel>}
   * @private
   */
  this.modelsMap_ = {};

  this.project_.eventBus().addPreprocessor(
      'model', this.onBeforeModelChange_, this, /* first */ true);
  this.project_.eventBus().subscribe('model', this.onModelChange_, this);
};

rhizo.model.ModelManager.prototype.modelsMap = function() {
  return this.modelsMap_;
};

/**
 * Preprocessing callback invoked whenever a message is published on the
 * 'model' channel. Normalizes the message to mandatorily include an 'action'
 * parameter and ensure that the 'models' key points to an array of
 * SuperModel instances.
 *
 * @param {!Object} message The published message.
 * @param {!function(boolean, string=)} rspCallback Callback to invoke with
 *     the preprocessing outcome.
 * @private
 */
rhizo.model.ModelManager.prototype.onBeforeModelChange_ = function(
    message, rspCallback) {
  var superModels = [];
  var models = message['models'] || [];
  if (!$.isArray(models)) {
    models = [models];
  }

  if (message['action'] == 'remove') {
    superModels = this.extractSuperModelsToRemove_(models);

  } else {  // default action 'add'
    message['action'] = 'add';
    if (!this.createSuperModelsToAdd(models, superModels, rspCallback)) {
      return;
    }
  }

  message['models'] = superModels;
  rspCallback(true);
};

/**
 * Converts a list of (possibly invalid) models or model ids into a list of
 * SuperModel instances that are guaranteed to be part of the visualization.
 *
 * @param {!Array} The list of models (or their ids) to normalize.
 * @return {!Array.<!rhizo.model.SuperModel>} The normalized list of
 *     SuperModel instances matching the input list.
 * @private
 */
rhizo.model.ModelManager.prototype.extractSuperModelsToRemove_ = function(
    models) {
  var superModels = [];
  for (var i = models.length-1; i >= 0; i--) {
    var model = models[i];
    if (model.id) {
      if (model.id in this.modelsMap_) {
        superModels.push(this.modelsMap_[model.id]);
      }
    } else if (model in this.modelsMap_) {
      superModels.push(this.modelsMap_[model]);
    }
  }
  return superModels;
};

/**
 * Validates and a list of model objects to add to the visualization and wraps
 * them into corresponding SuperModel wrappers.
 *
 * @param {!Array} models The models to add to the visualization. Each model
 *     object must have an 'id' field that uniquely identifies it within the
 *     visualization.
 * @param {!Array.<!rhizo.model.SuperModel>} The corresponding SuperModel
 *     wrappers created for each added model.
 * @param {!function(boolean, string=)} rspCallback Callback to invoke with
 *     the validation outcome.
 * @return {boolean} Whether the models passed validation checks.
 * @private
 */
rhizo.model.ModelManager.prototype.createSuperModelsToAdd = function(
    models, superModels, rspCallback) {
  for (var i = 0; i < models.length; i++) {
    var superModel = new rhizo.model.SuperModel(models[i]);
    this.project_.filterManager().applyAllFiltersToModel(superModel);
    superModels.push(superModel);
  }

  // model sanity checking.
  return this.checkModels_(superModels, rspCallback);
};

/**
 * Verify the models' formal correctness, by checking that all the models have
 * an assigned id and no duplicate ids exist.
 *
 * @param {!Array.<!rhizo.model.SuperModel>} modelsToAdd The models to
 *     validate.
 * @param {!function(boolean, string=)} rspCallback Callback to invoke with
 *     the validation outcome.
 * @return {boolean} Whether the models passed validation checks.
 * @private
 */
rhizo.model.ModelManager.prototype.checkModels_ = function(
    modelsToAdd, rspCallback) {
  var uniqueAddedIds = {};
  var missingIds = false;
  for (var i = modelsToAdd.length-1; i >= 0; i--) {
    var id = modelsToAdd[i].id;
    if (typeof(id) == 'undefined') {
      rspCallback(false, 'Missing models\' ids.');
      return false;
    } else {
      if (id in uniqueAddedIds || id in this.modelsMap_) {
        rspCallback(false, 'Verify your models, duplicate id ' + id);
        return false;
      } else {
        uniqueAddedIds[id] = true;
      }
    }
  }
  return true;
};

/**
 * Callback invoked when a model addition or removal request is published on
 * the 'model' channel.
 * @param {!Object} message The published message.
 * @private
 */
rhizo.model.ModelManager.prototype.onModelChange_ = function(message) {
  var superModels = message['models'] || [];
  if (superModels.length > 0) {
    var dirtyVisibility = message['action'] == 'remove' ? 
        this.removeModels_(superModels) : this.addModels_(superModels);
    if (dirtyVisibility && !(message['options'] || {})['delayLayout']) {
      this.project_.layoutManager().forceLayout();
    }
  }
};

/**
 * Adds a set of models to the visualization.
 * @param {!Array.<!rhizo.model.SuperModel>} superModels The models to add.
 * @return {boolean} Whether the addition caused some affected models to change
 *     their visibility (turned from non-existent to visible), hence requiring a
 *     visibility re-alignment.
 * @private
 */
rhizo.model.ModelManager.prototype.addModels_ = function(superModels) {
  // TODO(battlehorse): handle buildRenderings() failure.
  this.renderingBootstrap_.buildRenderings(superModels);

  var dirtyVisibility = false;
  for (var i = superModels.length-1; i >= 0; i--) {
    this.modelsMap_[superModels[i].id] = superModels[i];
    dirtyVisibility = superModels[i].isDirtyVisibility() || dirtyVisibility;
  }
  return dirtyVisibility;
};

/**
 * Removes a set of models from the visualization.
 * @param {!Array.<!rhizo.model.SuperModel>} superModels The models to remove.
 * @return {boolean} Whether the removal caused some affected models to change
 *     their visibility (turned from visible to removed), hence requiring a
 *     visibility re-alignment.
 * @private
 */
rhizo.model.ModelManager.prototype.removeModels_ = function(superModels) {
  var dirtyVisibility = false;
  for (var i = superModels.length-1; i >= 0; i--) {
    superModels[i].destroy();
    dirtyVisibility = superModels[i].isDirtyVisibility() || dirtyVisibility;
    delete this.modelsMap_[superModels[i].id];
  }
  return dirtyVisibility;
};
