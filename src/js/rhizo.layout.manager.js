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
 * @fileOverview Classes that oversee Rhizosphere layout management.
 * @author Riccardo Govoni (battlehorse@google.com)
 */

//RHIZODEP=rhizo
namespace('rhizo.layout');


/**
 * A LayoutManager is responsible for handling layout operations and
 * positioning of Rhizosphere models within a given project.
 *
 * Layout operations are triggered by publishing messages on the 'layout'
 * channel of the project event bus. The messages are expected in the
 * following format:
 *
 * message = {
 *   engine: 'bucket',
 *   state: {bucketBy: 'name', reverse: false}
 *   options: {forcealign: true},
 *   positions: [{id: 1, top: 300, left: 300}, {id: 2, top: 100, left: 150}]
 * };
 *
 * Where each key has the following meaning:
 *
 * - engine: The layout engine to use. Engines are referenced using the key
 *   under which they are registered in the rhizo.layout.layouts registry.
 *   If the 'engine' parameter is not specified, the current layout engine (i.e.
 *   the one used for the last layout) will be used.
 *   If the 'engine' parameter is explicitly null, the default layout engine
 *   will be used.
 *
 * - state: Layout-specific configuration options, as defined by each layout
 *   engine implementing rhizo.layout.StatefulLayout. If unspecified, the
 *   last state used by the requested engine will be used. If null, the default
 *   state for the engine will be used.
 *
 * - options: Additional configuration to tweak the layout operation. Currently
 *   supported ones are:
 *   - 'filter' (boolean): Whether this layout operation is invoked as a result
 *      of a filter being applied.
 *   - 'forcealign' (boolean): Whether models' visibility should be synced at
 *      the end of the layout operation.
 *
 * - positions: List of manual overrides for models that should be explicitly
 *   placed in a given position in the viewport.  Each entry is a key-value map
 *   with the following properties:
 *   - 'id': the id of the model to move,
 *   - 'top': the top coordinate (in px) of the top-left model corner, with
 *      respect to the visualization universe, where the model should be placed.
 *   - 'left', the left coordinate (in px) of the top-left model corner, with
 *     respect to the visualization universe, where the model should be placed.
 *
 *   TODO(battlehorse): Update top/left to be resolution independent. See
 *   http://code.google.com/p/rhizosphere/issues/detail?id=132
 *
 * All the message keys are optional. So, for example:
 *
 * message { engine: 'flow'}
 * - Applies the 'flow' layout using the last state it used, and no custom
 *   positioning.
 *
 * message { engine: 'bucket', state: null }
 * - Applies the 'bucket' layout, resetting it to its default state.
 *
 * @param {!rhizo.Project} project The project this layout manager belongs to.
 * @param {!rhizo.Options} options Project-wide configuration options.
 * @constructor
 */
rhizo.layout.LayoutManager = function(project, options) {
  /**
   * The default layout engine used when the visualization starts.
   * TODO(battlehorse): http://code.google.com/p/rhizosphere/issues/detail?id=61
   * @type {string}
   * @private
   */
  this.defaultEngine_ = 'flow';

  /**
   * The layout engine used in the last layout operation.
   * @type {string}
   * @private
   */
  this.curEngineName_ = null;

  /**
   * @type {!rhizo.Project}
   * @private
   */
  this.project_ = project;

  /**
   * @type {!rhizo.Options}
   * @private
   */
  this.options_ = options;

  /**
   * The visualization GUI
   * @type {!rhizo.ui.gui.GUI}
   * @private
   */
  this.gui_ = project.gui();

  /**
   * The registry of all known layout engines that this visualization will use
   * (out of all the available ones in the rhizo.layout.layouts global
   * registry).
   * @type {!Object.<string, Object>}
   * @private
   */
  this.engines_ = {};

  /**
   * The rendering pipeline that the layout manager will use to accumulate and
   * apply single layout operations.
   * @type {!rhizo.ui.RenderingPipeline}
   * @private
   */
  this.renderingPipeline_ = new rhizo.ui.RenderingPipeline(
      project, project.gui().universe);


  // Registers this manager to validation and notification whenever a
  // message is published on the 'layout' channel.
  this.project_.eventBus().addPreprocessor(
      'layout', this.onBeforeLayout_, this, /* first */ true);
  this.project_.eventBus().subscribe(
      'layout', this.onLayout_, this);
};

rhizo.layout.LayoutManager.prototype.toString = function() {
  return "LayoutManager";
};

/**
 * Initializes the layout engines handled by the manager. Rejects all layout
 * engines that are not compatible with the current project metamodel.
 *
 * @param {!Object} engineRegistry The key-value map definining all available
 *     layout engines (typically rhizo.layout.layouts).
 */
rhizo.layout.LayoutManager.prototype.initEngines = function(
    engineRegistry) {
  for (var engineName in engineRegistry) {
    var engine = new engineRegistry[engineName]['engine'](this.project_);
    if (engine.verifyMetaModel &&
        !engine.verifyMetaModel(this.project_.metaModel())) {
      continue;
    }
    this.engines_[engineName] = engine;
  }
};

/**
 * Returns the list of all layout engines available to project this manager
 * belongs to.
 * @return {Array.<string>} The list of available layout engines.
 */
rhizo.layout.LayoutManager.prototype.getEngineNames = function() {
  var names = [];
  for (var name in this.engines_) {
    names.push(name);
  }
  return names;
};

/**
 * Returns the name of the current layout engine.
 * @return {string} The name of the current layout engine.
 */
rhizo.layout.LayoutManager.prototype.getCurrentEngineName = function() {
  return this.curEngineName_;
};

/**
 * Returns the current state of the requested engine (which may be its default
 * state if it has never been customized).
 * @param {string} engineName The name of the engine to query.
 * @return {Object} The engine state. Null if the engine is unknown or does not
 *     support state management.
 */
rhizo.layout.LayoutManager.prototype.getEngineState = function(engineName) {
  if (this.engines_[engineName] && this.engines_[engineName].getState) {
    return this.engines_[engineName].getState();
  }
  return null;
};

/**
 * If the current layout engine  supports it, ask it to extend a model
 * selection. The engine may be aware of relationships between models (such as
 * hierarchies) so that selecting a model should trigger the selection of
 * dependent ones.
 *
 * @param {string} modelId The id of the model whose selection state changed.
 * @return {Array.<string>} An array of model ids (including the input one)
 *     that are dependent on the input one.
 */
rhizo.layout.LayoutManager.prototype.extendSelection = function(modelId) {
  var engine = this.engines_[this.curEngineName_];
  if (engine.dependentModels) {
    var idsToSelect = engine.dependentModels(modelId);
    idsToSelect.push(modelId);
    return idsToSelect;
  }
  return [modelId];
};


/**
 * Preprocessing callback invoked whenever a message is published on the
 * 'layout' channel.
 *
 * @param {!Object} message The published message.
 * @param {!function(boolean, string=)} rspCallback Callback to invoke with the
 *     preprocessing outcome.
 * @private
 */
rhizo.layout.LayoutManager.prototype.onBeforeLayout_ = function(
    message, rspCallback) {
  // If an engine is not specified, use the current one.
  // If the current engine is undefined (first layout), use the default engine.
  // If a null engine is explicitly specified, the default one is used.
  if (!('engine' in message)) {
    message['engine'] = this.curEngineName_;
  }
  message['engine'] = message['engine'] || this.defaultEngine_;

  var engine = this.engines_[message['engine']];
  if (!engine) {
    rspCallback(false, 'Invalid layout engine:' + message['engine']);
    return;
  }

  // If the message does not specify a state, use the current one.
  // Specify a null state for the layout to apply its default one.
  if (!('state' in message)) {
    message['state'] =  (engine.getState ? engine.getState() : null);
  }

  // If the engine supports state management, ask it to validate the received
  // state.
  if (engine.setState) {
    this.onBeforeEngineLayout_(engine, message, rspCallback);
  } else {
    rspCallback(true);
  }
};

/**
 * Asks a specific engine to validate the received layout state, or to provide
 * a default one if unspecified.
 *
 * @param {!Object} engine The layout engine to query.
 * @param {!Object} message The published layout message.
 * @param {!function(boolean, string=)} rspCallback Callback to invoke with the
 *     preprocessing outcome.
 */
rhizo.layout.LayoutManager.prototype.onBeforeEngineLayout_ = function(
    engine, message, rspCallback) {
  if (!engine.setState(message['state'])) {
    rspCallback(false, 'Received invalid layout state for engine: ' + engine);
  } else {
    // If the state was undefined, the engine will have adopted its default
    // state, hence we update the message payload.
    message['state'] = engine.getState();
    rspCallback(true);
  }
};

/**
 * Callback invoked when a layout request is published on the 'layout'
 * channel.
 * @param {!Object} message The published message.
 * @private
 */
rhizo.layout.LayoutManager.prototype.onLayout_ = function(message) {
  this.project_.logger().time('LayoutManager::onLayout');
  var lastEngine = this.engines_[this.curEngineName_];
  var options = message['options'] || {};

  // Update the name of the current engine.
  this.curEngineName_ = message['engine'];
  var engine = this.engines_[this.curEngineName_];

  var dirty = false;
  if (lastEngine && lastEngine.cleanup) {
    // cleanup previous layout engine.
    dirty = lastEngine.cleanup(lastEngine == engine) || dirty;
  }

  // Empty the rendering pipeline
  this.renderingPipeline_.cleanup();
  if (lastEngine != engine) {
    // Restore all models to their original sizes and styles, if we are moving
    // to a different layout engine.
    this.renderingPipeline_.backupManager().restoreAll();
  }

  // reset panning
  this.gui_.universe.move(0, 0, {'bottom': 0, 'right': 0});

  // Identify all the models that can be laid out.
  var models = this.project_.models();
  var freeModels = [];
  for (var i = models.length-1; i >= 0; i--) {
    if (models[i].isAvailableForLayout()) {
      freeModels.push(models[i]);
    }
  }
  this.project_.logger().debug(
      freeModels.length + ' models available for layout');

  // Compute the layout.
  var boundingLayoutBox = new rhizo.layout.LayoutBox(
      this.gui_.viewport, this.options_.layoutConstraints());
  dirty = engine.layout(this.renderingPipeline_,
                        boundingLayoutBox,
                        freeModels,
                        this.project_.modelsMap(),
                        this.project_.metaModel(),
                        options) || dirty;

  // Apply the layout.
  var resultLayoutBox = this.renderingPipeline_.apply();

  // Resize the universe based on the occupied layout box.
  this.gui_.universe.css({
      'width': Math.max(resultLayoutBox.width + resultLayoutBox.left,
                        this.gui_.viewport.width()),
      'height': Math.max(resultLayoutBox.height + resultLayoutBox.top,
                         this.gui_.viewport.height())}).
      move(0, 0);

  // If the layout altered visibility of some models, or we are forced to do so,
  // realign models' visibility.
  if (dirty || options['forcealign']) {
    this.project_.logger().debug(
        'Align visibility dirty=', dirty,
        ' forceAlign=', options['forcealign']);
    this.project_.filterManager().alignVisibility();
  }

  // If we received some manual positioning requests, apply them.
  if (message['positions']) {
    this.moveModels_(message['positions']);
  }
  this.project_.logger().timeEnd('LayoutManager::onLayout');
};

/**
 * Moves a set of models to the requested custom positions.
 *
 * @param {Array.<*>} positions An array of all model positions that changed.
 *     See the comment at the top of the file for the expected format of the
 *     array entries.
 * @private
 */
rhizo.layout.LayoutManager.prototype.moveModels_ = function(positions) {
  for (var i = positions.length-1; i >= 0; i--) {
    var model = this.project_.model(positions[i].id);
    if (model) {
      model.rendering().move(
          positions[i].top, positions[i].left);
    }
  }
};

/**
 * Notifies the manager that a set of models has been explicitly moved by the
 * user to a different position. The manager just republishes the event on its
 * channel for all the interested parties to catch up with the news.
 *
 * @param {Array.<*>} positions An array of all model positions that changed.
 *     Each entry is a key-value map with the following properties: 'id', the
 *     id of the model that moved, 'top': the ending top coordinate of the
 *     top-left model corner with respect to the visualization universe,
 *     'left', the ending left coordinate of the top-left model corner with
 *     respect to the visualization universe.
 */
rhizo.layout.LayoutManager.prototype.modelsMoved = function(positions) {
  this.project_.eventBus().publish('layout', {
    positions: positions
  }, null, this);
};

/**
 * Forces an out-of-band layout operation for the current layout engine and
 * state, which won't be published on the channel. This is useful when a
 * layout is not directly requested by the user requested, but still necessary
 * as a consequence of other operations (such as model filtering or changes
 * in the selected models).
 *
 * @param {!Object} options Layout configuration options.
 */
rhizo.layout.LayoutManager.prototype.forceLayout = function(options) {
  var message = {
    options: $.extend({}, options, {forcealign: true})
  };
  this.onBeforeLayout_(message, jQuery.proxy(function() {
    this.onLayout_(message);
  }, this));
};
