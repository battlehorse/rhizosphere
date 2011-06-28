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

// Global project namespace
// RHIZODEP=rhizo,rhizo.log,rhizo.model,rhizo.ui,rhizo.layout,rhizo.layout.manager,rhizo.eventbus,rhizo.selection,rhizo.meta.manager,rhizo.state
namespace("rhizo");


/**
 * Projects are the central entities that manage an entire Rhizosphere
 * visualization.
 *
 * @param {rhizo.ui.gui.GUI} gui The GUI associated to this visualization.
 * @param {*} opt_options A key-value map of project-wide customization
 *     options.
 * @constructor
 */
rhizo.Project = function(gui, opt_options) {
  this.metaModelRegistry_ = rhizo.meta.defaultRegistry;
  this.models_ = [];
  this.modelsMap_ = {};
  this.options_ = opt_options || {};
  this.gui_ = gui;

  if (rhizo.nativeConsoleExists()) {
    this.logger_ = new rhizo.NativeLogger();
  } else {
    this.logger_ = new rhizo.NoOpLogger();
  }

  /**
   * Manages transitions in visualization state.
   * @type {rhizo.state.ProjectStateBinder}
   * @private
   */
  this.state_ = null;

  /**
   * The publish/subscribe message dispatcher used by visualization elements
   * and components to communicate across the project.
   *
   * @type {!rhizo.eventbus.EventBus}
   * @private
   */
  this.eventBus_ = new rhizo.eventbus.EventBus();

  /**
   * @type {!rhizo.selection.SelectionManager}
   * @private
   */
  this.selectionManager_ = new rhizo.selection.SelectionManager(
      this, this.options_);

  /**
   * @type {!rhizo.meta.FilterManager}
   * @private
   */
  this.filterManager_ = new rhizo.meta.FilterManager(this);

  /**
   * @type {!rhizo.UserAgent}
   * @private
   */
  this.userAgent_ = new rhizo.UserAgent(this);
};

rhizo.Project.prototype.chromeReady = function() {
  // All the static UI components are in place. This might include the
  // logging console.
  if (this.gui_.getComponent('rhizo.ui.component.Console')) {
    this.logger_ = new rhizo.Logger(this.gui_);
  }
};

rhizo.Project.prototype.metaReady = function() {
  if (!this.checkMetaModel_()) {
    return false;
  }
  this.layoutManager_ = new rhizo.layout.LayoutManager(this, this.options_);
  this.layoutManager_.initEngines(rhizo.layout.layouts);
  return true;
};

rhizo.Project.prototype.deploy = function(opt_models) {
  if (opt_models && this.addModels_(opt_models)) {
    this.finalizeUI_();
  }
  this.logger_.info("*** Ready!");
};

rhizo.Project.prototype.addModels_ = function(models) {
  // wrap each model into a SuperModel
  for (var i = 0; i < models.length; i++) {
    this.models_[i] = new rhizo.model.SuperModel(models[i]);
  }

  // model sanity checking.
  if (!this.checkModels_()) {
    return false;
  }

  this.buildModelsMap_();
  return true;
};

rhizo.Project.prototype.finalizeUI_ = function() {
  var renderingBootstrap = new rhizo.ui.RenderingBootstrap(this.renderer_,
                                                           this.gui_,
                                                           this,
                                                           this.options_);
  if (!renderingBootstrap.buildRenderings(this.models_)) {
    // Something went wrong while creating the renderings.
    return;
  }

  // We manually disable animations for the initial layout (the browser is
  // already busy creating the whole dom).
  this.gui_.disableFx(true);

  // Enable HTML5 history (if requested) and rebuild visualization state
  // (either from defaults or from HTML5 history itself).
  var bindings = [];
  if (this.options_.enableHTML5History) {
    bindings.push(rhizo.state.Bindings.HISTORY);
  }
  rhizo.state.getMasterOverlord().attachProject(this, bindings);
  this.state_ = rhizo.state.getMasterOverlord().projectBinder(this);
  // re-aligning animation settings
  this.alignFx();
};

/**
 * Destroys the Rhizosphere visualization managed by this project.
 *
 * This includes removal of all renderings, visualization Chrome and other
 * UI elements, and reverting the DOM element that contains the visualization
 * back to its original state.
 */
rhizo.Project.prototype.destroy = function() {
  rhizo.state.getMasterOverlord().detachProject(this);
  for (var i = this.models_.length-1; i >= 0; i--) {
    var rendering = this.models_[i].rendering();
    if (rendering) {
      // Give renderings a chance to cleanup.
      rendering.beforeDestroy();
    }
  }
  this.gui_.destroy();
};

/**
 * @return {string} A unique document-wide identifier for this project. We rely
 *     on an unique id being assigned to the HTML element that contains the
 *     visualization this project manages.
 */
rhizo.Project.prototype.uuid = function() {
  return this.gui_.container.attr('id');
};

rhizo.Project.prototype.model = function(id) {
  return this.modelsMap_[id];
};

/**
 * Returns the set of models that are part of this project, keyed by their
 * unique id.
 * @return {!Object.<string, rhizo.model.SuperModel>} The set of models that
 *     are part of this project.
 */
rhizo.Project.prototype.modelsMap = function() {
  return this.modelsMap_;
};

rhizo.Project.prototype.metaModel = function() {
  return this.metaModel_;
};

rhizo.Project.prototype.setMetaModel = function(metaModel) {
  //TODO(battlehorse): raise error if the metamodel is not valid or null.
  // Clone the metamodel so we can manipulate it.
  this.metaModel_ = $.extend({}, metaModel);

  // Delete all spurious metamodel keys that have no attached kind.
  // This includes, for instance, GWT-generated keys like __gwt_ObjectId.
  // (this implies the cloned metamodel object cannot be passed back to GWT
  // code).
  for (var key in this.metaModel_) {
    if (!this.metaModel_[key].kind) {
      delete this.metaModel_[key];
    }
  }

  // Resolves all 'kind' specifications into metamodel Kind instances.
  // Uses the default kind registry to resolve against.
  for (key in this.metaModel_) {
    if (typeof(this.metaModel_[key].kind) == 'string') {
      this.metaModel_[key].kind = this.metaModelRegistry_.createNewKind(
          this.metaModel_[key].kind);
    }
  }
};

/**
 * Returns the metamodel registry this project uses.
 * @return {!rhizo.meta.KindRegistry} the metamodel registry this project uses.
 */
rhizo.Project.prototype.metaModelRegistry = function() {
  return this.metaModelRegistry_;
};

rhizo.Project.prototype.renderer = function() {
  return this.renderer_;
};

rhizo.Project.prototype.setRenderer = function(renderer) {
  // TODO(battlehorse): raise error if the renderer is not valid or null.
  this.renderer_ = renderer;
};

rhizo.Project.prototype.gui = function() {
  return this.gui_;
};

rhizo.Project.prototype.logger = function() {
  return this.logger_;
};

/**
 * Returns the project event bus, that can be used to publish/subscribe to
 * project-wide messages and notifications.
 *
 * @return {!rhizo.eventbus.EventBus} The project event bus.
 */
rhizo.Project.prototype.eventBus = function() {
  return this.eventBus_;
};

/**
 * Returns the project layout manager.
 *
 * @return {!rhizo.layout.LayoutManager} The project layout manager.
 */
rhizo.Project.prototype.layoutManager = function() {
  return this.layoutManager_;
};

/**
 * Returns the project selection manager.
 *
 * @return {!rhizo.selection.SelectionManager} The project selection manager.
 */
rhizo.Project.prototype.selectionManager = function() {
  return this.selectionManager_;
};

/**
 * Returns the project filter manager.
 *
 * @return {!rhizo.meta.FilterManager} The project filter manager.
 */
rhizo.Project.prototype.filterManager = function() {
  return this.filterManager_;
};

/**
 * Returns a UserAgent bound to this project, to programmatically drive the
 * visualization.
 * @return {!rhizo.UserAgent} a UserAgent bound to this project, to
 *     programmatically drive the visualization.
 */
rhizo.Project.prototype.userAgent = function() {
  return this.userAgent_;
};

/**
 * Verify the models formal correctness, by checking that all the models have
 * an assigned id and no duplicate ids exist.
 * @private
 */
rhizo.Project.prototype.checkModels_ = function() {
  this.logger_.info("Checking models...");
  var uniqueIds = {};
  var missingIds = false;
  var duplicateIds = [];
  for (var i = this.models_.length-1; i >= 0; i--) {
    var id = this.models_[i].id;
    if (!id) {
      missingIds = true;
    } else {
      if (id in uniqueIds) {
        duplicateIds.push(id);
      } else {
        uniqueIds[id] = true;
      }
    }
  }

  if (missingIds) {
    this.logger_.error('Verify your models: missing ids.');
  }
  if (duplicateIds.length > 0) {
    this.logger_.error('Verify your models: duplicate ids (' +
                       duplicateIds.join(',') +
                       ')');
  }

  return !missingIds && duplicateIds.length == 0;
};

/**
 * Verify the metaModel formal correctness, by checking that every metaModel
 * entry has a separate kind instance. MetaModels are stateful, so kinds cannot
 * be shared.
 * @private
 */
rhizo.Project.prototype.checkMetaModel_ = function() {
  var allKinds = [];
  for (var key in this.metaModel_) {
    if (!this.metaModel_[key].kind) {
      this.logger_.error('Verify your metamodel: missing kind for ' + key);
      return false;
    }
    allKinds.push(this.metaModel_[key].kind);
  }

  // Ensure that there are no shared meta instances in the metaModel.
  for (var i = 0; i < allKinds.length; i++) {
    for (var j = i+1; j < allKinds.length; j++) {
      if (allKinds[i] === allKinds[j]) {
        this.logger_.error('Verify your metaModel: shared kind instances.');
        return false;
      }
    }
  }
  return true;
};

rhizo.Project.prototype.buildModelsMap_ = function() {
  this.logger_.info("Building models map...");
  for (var i = this.models_.length-1; i >= 0; i--) {
    var model = this.models_[i];
    this.modelsMap_[model.id] = model;
  }
};

/**
 * Enables or disables project-wide animations.
 *
 * The decision is based on the number of models the browser has to manipulate
 * (move, hide, show, rescale ...). This includes:
 * - models that are currently visible,
 * - 'unfiltered' models (i.e. number of models that will be visible once
 *   this.filterManager_.alignVisibility() is invoked).
 *
 * If either number is too high, animations are disabled.
 */
rhizo.Project.prototype.alignFx = function() {
  var numUnfilteredModels = 0;
  var numVisibleModels = 0;
  for (var i = this.models_.length-1; i >= 0; i--) {
    if (!this.models_[i].isFiltered()) {
      numUnfilteredModels++;
    }
    if (this.models_[i].rendering().visibility >= rhizo.ui.Visibility.GREY) {
      numVisibleModels++;
    }
  }
  this.gui_.disableFx(!this.options_.enableAnims ||
                      numUnfilteredModels > 200 ||
                      numVisibleModels > 200);
};


/**
 * The UserAgent is an high-level interface to programmatically drive a
 * Rhizosphere visualization like a user would do. This allows Rhizosphere
 * visualizations to communicate bidirectionally with any other interacting
 * third party existing in the same webpage.
 *
 * @param {!rhizo.Project} project The project this user agent is bound to.
 * @constructor
 */
rhizo.UserAgent = function(project) {
  /**
   * @type {!rhizo.Project}
   * @private
   */
  this.project_ = project;

  /**
   * Lists of listener/callback pairs to invoke whenver a selection, filter or
   * layout messages are published on the project eventbus channel.
   * @type {!Array.<string, !Array.<!Object> >}
   * @private
   */
  this.listeners_ = {
    'selection': [],
    'filter': [],
    'layout': []
  };
};

/**
 * Returns the managed project, to let external third-parties have access to
 * the low-level visualization functionalities which are not yet exposed through
 * the UserAgent interface.
 *
 * If possible, refrain from programmatically manage a Rhizosphere visualization
 * by directly accessing its internal project, unless you know what you're
 * doing. Be aware that the underlying Project may change its exposed API
 * without notice: all programmatic interactions needs should be addressed at
 * the UserAgent level.
 *
 * @return {!rhizo.Project} The managed project.
 */
rhizo.UserAgent.prototype.getProject = function() {
  return this.project_;
};

/**
 * Adds a listener that will be notified whenever a selection event occurs on
 * the visualization.
 *
 * @param {!function(Object)} listenerCallback The callback to invoke when a
 *     selection event occurs on the visualization. The callback is passed a
 *     'message' describing the event, in the format outlined by
 *     rhizo.selection.SelectionManager.
 * @param {!Object} listener The object in whose scope ('this') the callback
 *     will be invoked.
 */
rhizo.UserAgent.prototype.addSelectionListener = function(
    listenerCallback, listener) {
  this.subscribe_('selection', listenerCallback, listener);
};

/**
 * Removes one or more listeners registered for selection events.
 * If both parameters are specified, only the specific callback is removed. If
 * only opt_listener is specified, all the callbacks associated to that listener
 * are removed. If neither parameter is specified, all the callbacks associated
 * to selection events are removed.
 *
 * @param {Object=} opt_listener The object whose listeners have to be removed.
 * @param {function(Object)=} opt_listenerCallback The specific listener
 *    callback to remove.
 */
rhizo.UserAgent.prototype.removeSelectionListener = function(
    opt_listener, opt_listenerCallback) {
  this.unsubscribe_('selection', opt_listener, opt_listenerCallback);
};

/**
 * Adds a listener that will be notified whenever a filter event occurs on
 * the visualization.
 *
 * @param {!function(Object)} listenerCallback The callback to invoke when a
 *     filter event occurs on the visualization. The callback is passed a
 *     'message' describing the event, in the format outlined by
 *     rhizo.meta.FilterManager.
 * @param {!Object} listener The object in whose scope ('this') the callback
 *     will be invoked.
 */
rhizo.UserAgent.prototype.addFilterListener = function(
    listenerCallback, listener) {
  this.subscribe_('filter', listenerCallback, listener);
};

/**
 * Removes one or more listeners registered for filter events.
 * If both parameters are specified, only the specific callback is removed. If
 * only opt_listener is specified, all the callbacks associated to that listener
 * are removed. If neither parameter is specified, all the callbacks associated
 * to filter events are removed.
 *
 * @param {Object=} opt_listener The object whose listeners have to be removed.
 * @param {function(Object)=} opt_listenerCallback The specific listener
 *    callback to remove.
 */
rhizo.UserAgent.prototype.removeFilterListener = function(
    opt_listener, opt_listenerCallback) {
  this.unsubscribe_('filter', opt_listener, opt_listenerCallback);
};

/**
 * Adds a listener that will be notified whenever a layout event occurs on
 * the visualization.
 *
 * @param {!function(Object)} listenerCallback The callback to invoke when a
 *     layout occurs on the visualization. The callback is passed a
 *     'message' describing the event, in the format outlined by
 *     rhizo.layout.LayoutManager.
 * @param {!Object} listener The object in whose scope ('this') the callback
 *     will be invoked.
 */
rhizo.UserAgent.prototype.addLayoutListener = function(
    listenerCallback, listener) {
  this.subscribe_('layout', listenerCallback, listener);
};

/**
 * Removes one or more listeners registered for layout events.
 * If both parameters are specified, only the specific callback is removed. If
 * only opt_listener is specified, all the callbacks associated to that listener
 * are removed. If neither parameter is specified, all the callbacks associated
 * to layout events are removed.
 *
 * @param {Object=} opt_listener The object whose listeners have to be removed.
 * @param {function(Object)=} opt_listenerCallback The specific listener
 *    callback to remove.
 */
rhizo.UserAgent.prototype.removeLayoutListener = function(
    opt_listener, opt_listenerCallback) {
  this.unsubscribe_('layout', opt_listener, opt_listenerCallback);
};

/**
 * Adds a callback/listener pair to the notification list for events published
 * on the given eventbus channel.
 * @param {string} channel The channel to subscribe to.
 * @param {!function(Object)} listenerCallback listener callback.
 * @param {!Object} listener listener scope ('this').
 * @private
 */
rhizo.UserAgent.prototype.subscribe_ = function(
    channel, listenerCallback, listener) {
  var firstSubscription = this.listeners_[channel].length == 0;
  this.listeners_[channel].push(
      {listener: listener, listenerCallback: listenerCallback});
  if (firstSubscription) {
    this.project_.eventBus().subscribe(channel, function(message) {
      for (var i = 0; i < this.listeners_[channel].length; i++) {
        var l = this.listeners_[channel][i];
        l['listenerCallback'].call(l['listener'], message);
      }
    }, this, /* committed */ true);
  }
};

/**
 * Removes one or more callback/listener pairs from the notification list for
 * events published on the given eventbus channel.
 * If no more listeners exists after the removal, unsubscribes from the eventbus
 * channel altogether.
 *
 * @param {string} channel The channel to unsubscribe from.
 * @param {Object=} opt_listener The object whose listeners have to be removed.
 * @param {function(Object)=} opt_listenerCallback The specific listener
 *    callback to remove.
 */
rhizo.UserAgent.prototype.unsubscribe_ = function(
    channel, opt_listener, opt_listenerCallback) {
  var newListeners = [];
  if (opt_listener) {
    for (var i = 0; i < this.listeners_[channel].length; i++) {
      var listener = this.listeners_[channel][i];
      if (listener['listener'] == opt_listener &&
          (!opt_listenerCallback ||
           opt_listenerCallback == listener['listenerCallback'])) {
        continue;
      }
      newListeners.push(listener);
    }
  }
  this.listeners_[channel] = newListeners;
  if (newListeners.length == 0) {
    this.project_.eventBus().unsubscribe(channel, this);
  }
};

/**
 * Instructs the visualization to perform a selection operation.
 *
 * @param {string} action The operation to perform. See
 *     rhizo.selection.SelectionManager for the list of supported actions.
 * @param {Array.<*>=} opt_models An optional list of model ids the action
 *     should apply to. Not all actions support the parameter. Some actions,
 *     like 'hide' and 'focus' may infer the parameter if unspecified.
 * @param {boolean=} opt_incremental Whether the action should be incremental or
 *     not. Defaults to true if unspecified. Only 'hide' and 'focus' actions
 *     support the options.
 * @param {function(boolean, string=)=} opt_callback An optional callback
 *     invoked after the selection operation has been dispatched. Receives two
 *     parameters: a boolean describing whether the operation was rejected and
 *     an optional string containing the rejection details, if any.
 */
rhizo.UserAgent.prototype.doSelection = function(
    action, opt_models, opt_incremental, opt_callback) {
  var message = {action: action};
  if (opt_models) {
    message['models'] = opt_models;
  }
  if (opt_incremental !== null && opt_incremental != undefined) {
    message['incremental'] = opt_incremental;
  }
  this.project_.eventBus().publish('selection', message, opt_callback, this);
};

/**
 * Instructs the visualization to perform a filter operation. The operation can
 * apply (or remove) multiple filters at the same time.
 *
 * @param {(string|Object.<string, *>)} arg_1 Either a string defining the
 *     single metamodel key the filter should be applied upon (or removed
 *     from), or an Object containing a collection of such keys (and the
 *     associated filter values).
 * @param {(*|function(boolean, string=))=} opt_arg2 If arg_1 is a string, this
 *     should be the value of the filter value to apply. If null is provided,
 *     the filter is instead removed (the same logic applies when multiple
 *     filters are given as an Object in arg_1). If arg_1 is an object, then
 *     this is expected to be the optional callback to invoke after the filter
 *     operation.
 * @param {function(boolean, string=)=} opt_arg3 An optional callback
 *     invoked after the filter operation has been dispatched, if arg_1 is a
 *     string. Receives two parameters: a boolean describing whether the
 *     operation was rejected and an optional string containing the rejection
 *     details, if any.
 */
rhizo.UserAgent.prototype.doFilter = function(arg_1, opt_arg_2, opt_arg_3) {
  if (typeof(arg_1) == 'string') {
    var message = {};
    message[arg_1] = opt_arg_2 || null;
    this.project_.eventBus().publish(
        'filter', message, opt_arg_3 || null, this);
  } else {
    this.project_.eventBus().publish('filter', arg_1, opt_arg_2 || null, this);
  }
};

/**
 * Instructs the visualization to remove all existing filters.
 *
 * @param {function(boolean, string=)=} opt_callback An optional callback
 *     invoked after the filter operation has been dispatched. Receives two
 *     parameters: a boolean describing whether the operation was rejected and
 *     an optional string containing the rejection details, if any.
 */
rhizo.UserAgent.prototype.doResetFilters = function(opt_callback) {
  this.project_.eventBus().publish(
      'filter',
      this.project_.filterManager().filterDiff({}),
      opt_callback,
      this);
};

/**
 * Instructs the visualization to perform a layout operation.
 *
 * @param {string=} opt_engine The layout engine to use. Leave null or
 *     unspecified to re-use the current layout engine. Valid values for this
 *     parameter are all the keys in the rhizo.layout.layouts registry.
 * @param {Object=} opt_state The layout state to use. Each layout engine define
 *     its supported state variables and format. See rhizo.layout.js for each
 *     specific case. Leave null or unspecified to re-use the current layout
 *     state.
 * @param {Array=} opt_positions An array of custom position overrides for
 *     specific model renderings. See rhizo.layout.LayoutManager for the
 *     expected structure of each array entry. Leave unspecified if position
 *     overrides are not needed.
 * @param {function(boolean, string=)=} opt_callback An optional callback
 *     invoked after the layout operation has been dispatched. Receives two
 *     parameters: a boolean describing whether the operation was rejected and
 *     an optional string containing the rejection details, if any.
 */
rhizo.UserAgent.prototype.doLayout = function(
    opt_engine, opt_state, opt_positions, opt_callback) {
  var message = {};
  if (opt_engine) {
    message['engine'] = opt_engine;
  }
  if (opt_state) {
    message['state'] = opt_state;
  }
  if (opt_positions) {
    message['positions'] = opt_positions;
  }
  this.project_.eventBus().publish('layout', message, opt_callback, this);
};

