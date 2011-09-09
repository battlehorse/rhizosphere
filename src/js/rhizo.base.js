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
// RHIZODEP=rhizo,rhizo.options,rhizo.log,rhizo.model,rhizo.ui,rhizo.layout,rhizo.layout.manager,rhizo.eventbus,rhizo.selection,rhizo.meta.manager,rhizo.state
namespace("rhizo");


/**
 * Projects are the central entities that manage an entire Rhizosphere
 * visualization.
 *
 * @param {!rhizo.ui.gui.GUI} gui The GUI associated to this visualization.
 * @param {!rhizo.Options} options Project-wide configuration options.
 * @constructor
 */
rhizo.Project = function(gui, options) {
  this.metaModelRegistry_ = rhizo.meta.defaultRegistry;

  /**
   * Project-wide configuration options.
   *
   * @type {!rhizo.Options}
   * @private
   */
  this.options_ = options;
  this.gui_ = gui;

  /**
   * The project logger.
   * @private
   */
  this.logger_ = rhizo.log.newLogger(this, this.options_);

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
  this.eventBus_ = new rhizo.eventbus.EventBus(this.logger_);

  /**
   * @type {rhizo.model.ModelManager}
   * @private
   */
  this.modelManager_ = null;

  /**
   * @type {!rhizo.selection.SelectionManager}
   * @private
   */
  this.selectionManager_ = new rhizo.selection.SelectionManager(this);

  /**
   * @type {rhizo.layout.LayoutManager}
   * @private
   */
  this.layoutManager_ = null;

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

/**
 * Initializes the Rhizosphere visualization managed by this project from the
 * provided metaModel and renderer (received via configuration options).
 *
 * At this stage Rhizosphere differentiates its UI and logic to match the type
 * of data that will subsequently visualize. This includes configuring the
 * layout and filtering capabilities to match the received metaModel.
 *
 * After this stage, the visualization is ready to perform any operation
 * exposed by the visualization user agent, including model additions and
 * removals.
 *
 * The metaModel formal correctness is verified at this point, by checking that
 * every metaModel entry has a separate kind instance. MetaModels are stateful,
 * so kinds cannot be shared.
 *
 * @return {!Object.<string, *>} An object describing the outcome of the
 *     deployment phase. It contains two keys: 'success', pointing to a
 *     boolean, indicates whether the deployment was successful. 'details',
 *     pointing to a string, contains the error details in case of failure.
 */
rhizo.Project.prototype.deploy = function() {
  var outcome = this.parseOptions_();
  if (!outcome.success) {
    return outcome;
  }

  // Delay instantiation of those managers that depend on the rendering
  // infrastructure to be present to work properly.
  this.modelManager_ = new rhizo.model.ModelManager(this);
  this.layoutManager_ = new rhizo.layout.LayoutManager(this);
  this.layoutManager_.initEngines(rhizo.layout.layouts);

  // Enable HTML5 history (if requested) and rebuild visualization state
  // (either from defaults or from HTML5 history itself).
  // Rebuilding the full state has no visual impact at this point, since
  // the visualization does not contain any models yet.
  var bindings = [];
  if (this.options_.isHTML5HistoryEnabled()) {
    bindings.push(rhizo.state.Bindings.HISTORY);
  }
  rhizo.state.getMasterOverlord().attachProject(this, bindings);
  this.state_ = rhizo.state.getMasterOverlord().projectBinder(this);

  if (this.options_.mustLayoutOnResize()) {
    this.gui_.trackViewportResize(this.layoutManager_);
  }

  return {success: true};
};

/**
 * Extracts and validates the visualization metamodel and renderer as received
 * via configuration options.
 *
 * @return {!Object.<string, *>} An object describing the outcome of the
 *     validation. It contains two keys: 'success', pointing to a boolean,
 *     indicates whether the validation was successful. 'details',
 *     pointing to a string, contains the error details in case of failure.
 * @private
 */
rhizo.Project.prototype.parseOptions_ = function() {
  var outcome = this.parseMetaModel_();
  if (!outcome.success) {
    return outcome;
  }
  outcome = this.parseRenderer_();
  if (!outcome.success) {
    return outcome;
  }
  return {success: true};
};

/**
 * Extracts and validates the visualization metamodel as received via
 * configuration options.
 *
 * @return {!Object.<string, *>} An object describing the outcome of the
 *     validation. It contains two keys: 'success', pointing to a boolean,
 *     indicates whether the validation was successful. 'details',
 *     pointing to a string, contains the error details in case of failure.
 * @private
 */
rhizo.Project.prototype.parseMetaModel_ = function() {
  if (!this.options_.metamodel()) {
    return {
      success: false,
      details: 'Missing metaModel specification'
    };
  }

  // Clone the metamodel so we can manipulate it.
  // Also, merge any fragments that have been defined.
  this.metaModel_ = $.extend(
      {}, this.options_.metamodel(), this.options_.metamodelFragment());

  var allKinds = [];
  for (var key in this.metaModel_) {
    if (!this.metaModel_[key].kind) {
      // Delete all spurious metamodel keys that have no attached kind.
      // This includes, for instance, GWT-generated keys like __gwt_ObjectId.
      // (this implies the cloned metamodel object cannot be passed back to GWT
      // code).
      delete this.metaModel_[key];
    } else {
      // Resolves all 'kind' specifications into metamodel Kind instances.
      // Uses the default kind registry to resolve against.
      if (typeof(this.metaModel_[key].kind) == 'string') {
        this.metaModel_[key].kind = this.metaModelRegistry_.createNewKind(
            this.metaModel_[key].kind, this.metaModel_[key]);
      }
      allKinds.push(this.metaModel_[key].kind);
    }
  }

  // Ensure that there are no shared meta instances in the metaModel, since
  // Kind instances are stateful.
  for (var i = 0; i < allKinds.length; i++) {
    for (var j = i+1; j < allKinds.length; j++) {
      if (allKinds[i] === allKinds[j]) {
        return {
          success: false,
          details: 'Verify your metaModel: shared kind instances.'
        };
      }
    }
  }
  return {success: true};
};

/**
 * Extracts and validates the visualization renderer as received via
 * configuration options.
 *
 * @return {!Object.<string, *>} An object describing the outcome of the
 *     validation. It contains two keys: 'success', pointing to a boolean,
 *     indicates whether the validation was successful. 'details',
 *     pointing to a string, contains the error details in case of failure.
 * @private
 */
rhizo.Project.prototype.parseRenderer_ = function() {
  // TODO(battlehorse): perform a more comprehensive renderer validation.
  if (!this.options_.renderer()) {
    return {
      success: false,
      details: 'Missing renderer'
    };
  }
  this.renderer_ = this.options_.renderer();
  return {success: true};
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
  if (this.modelManager_) {
    var models = this.modelManager_.models();
    for (var i = models.length-1; i >= 0; i--) {
      var rendering = models[i].rendering();
      if (rendering) {
        // Give renderings a chance to cleanup.
        rendering.beforeDestroy();
      }
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

/**
 * @return {!rhizo.Options} Project-wide configuration options.
 */
rhizo.Project.prototype.options = function() {
  return this.options_;
};

/**
 * Returns the model object matching the given model id.
 * @param {*} id The unique id of the model to retrieve.
 * @return {rhizo.model.SuperModel} The matching model object.
 */
rhizo.Project.prototype.model = function(id) {
  return this.modelManager_.modelsMap()[id];
};

/**
 * Returns the list of models that are part of this project. Preferable over
 * modelsMap() for faster iterations.
 *
 * @return {!Array.<!rhizo.model.SuperModel>} The list of models that are part
 *     of this project.
 */
rhizo.Project.prototype.models = function() {
  return this.modelManager_.models();
};

/**
 * Returns the set of models that are part of this project, keyed by their
 * unique id.
 * @return {!Object.<string, rhizo.model.SuperModel>} The set of models that
 *     are part of this project.
 */
rhizo.Project.prototype.modelsMap = function() {
  return this.modelManager_.modelsMap();
};

rhizo.Project.prototype.metaModel = function() {
  return this.metaModel_;
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
 * Returns the project model manager.
 *
 * @return {!rhizo.model.ModelManager} The project model manager.
 */
rhizo.Project.prototype.modelManager = function() {
  return this.modelManager_;
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
  var models = this.modelManager_.models();
  for (var i = models.length-1; i >= 0; i--) {
    var model = models[i];
    if (!model.isFiltered()) {
      numUnfilteredModels++;
    }
    if (model.rendering().visibility >= rhizo.ui.Visibility.GREY) {
      numVisibleModels++;
    }
  }
  this.gui_.disableFx(!this.options_.areAnimationsEnabled() ||
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
    'layout': [],
    'model': [],
    'error': []
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
 * Adds a listener that will be notified whenever a model event occurs on the
 * visualization.
 *
 * @param {!function(Object)} listenerCallback The callback to invoke when
 *     models are added or removed from the visualization. The callback is
 *     passed a 'message' describing the event, in the format outlined by
 *     rhizo.model.ModelManager.
 * @param {!Object} listener The object in whose scope ('this') the callback
 *     will be invoked.
 */
rhizo.UserAgent.prototype.addModelListener = function(
    listenerCallback, listener) {
  this.subscribe_('model', listenerCallback, listener);
};

/**
 * Removes one or more listeners registered for model events.
 * If both parameters are specified, only the specific callback is removed. If
 * only opt_listener is specified, all the callbacks associated to that listener
 * are removed. If neither parameter is specified, all the callbacks associated
 * to model events are removed.
 *
 * @param {Object=} opt_listener The object whose listeners have to be removed.
 * @param {function(Object)=} opt_listenerCallback The specific listener
 *    callback to remove.
 */
rhizo.UserAgent.prototype.removeModelListener = function(
    opt_listener, opt_listenerCallback) {
  this.unsubscribe_('model', opt_listener, opt_listenerCallback);
};

/**
 * Adds a listener that will be notified whenever an error occurs on the
 * visualization.
 *
 * @param {!function(Object)} listenerCallback The callback to invoke when
 *     models are added or removed from the visualization. The callback is
 *     passed a 'message' describing the event. The message contains either
 *     a 'clear' field (indicating the desire to clear previous errors) or
 *     an 'arguments' field (pointing to an array of objects representing the
 *     error details).
 * @param {!Object} listener The object in whose scope ('this') the callback
 *     will be invoked.
 */
rhizo.UserAgent.prototype.addErrorListener = function(
    listenerCallback, listener) {
  this.subscribe_('error', listenerCallback, listener);
};

/**
 * Removes one or more listeners registered for error events.
 * If both parameters are specified, only the specific callback is removed. If
 * only opt_listener is specified, all the callbacks associated to that listener
 * are removed. If neither parameter is specified, all the callbacks associated
 * to error events are removed.
 *
 * @param {Object=} opt_listener The object whose listeners have to be removed.
 * @param {function(Object)=} opt_listenerCallback The specific listener
 *    callback to remove.
 */
rhizo.UserAgent.prototype.removeErrorListener = function(
    opt_listener, opt_listenerCallback) {
  this.unsubscribe_('error', opt_listener, opt_listenerCallback);
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

/**
 * Adds one or more models to the visualization.
 *
 * @param {Array|Object} models one or more models to add to the visualization.
 * @param {function(boolean, string=)=} opt_callback An optional callback
 *     invoked after the model addition request has been dispatched. Receives
 *     two parameters: a boolean describing whether the operation was rejected
 *     and an optional string containing the rejection details, if any.
 */
rhizo.UserAgent.prototype.addModels = function(models, opt_callback) {
  this.project_.eventBus().publish('model', {
      'action': 'add',
      'models': models
  }, opt_callback, this);
};

/**
 * Removes one or more models to the visualization.
 *
 * @param {Array|Object} models one or more models to remove from the
 *     visualization. The method accepts a list of model objects or a list of
 *     model ids.
 * @param {function(boolean, string=)=} opt_callback An optional callback
 *     invoked after the model removal request has been dispatched. Receives
 *     two parameters: a boolean describing whether the operation was rejected
 *     and an optional string containing the rejection details, if any.
 */
rhizo.UserAgent.prototype.removeModels = function(models, opt_callback) {
  this.project_.eventBus().publish('model', {
      'action': 'remove',
      'models': models
  }, opt_callback, this);
};

/**
 * Adds one error to the visualization. This would tipycally result in a
 * visual notification shown to the user.
 *
 * @param {Array} args An array containing arbitrary error details.
 * @param {function(boolean, string=)=} opt_callback An optional callback
 *     invoked after the error addition request has been dispatched. Receives
 *     two parameters: a boolean describing whether the operation was rejected
 *     and an optional string containing the rejection details, if any.
 */
rhizo.UserAgent.prototype.addError = function(args, opt_callback) {
  this.project_.eventBus().publish(
      'error', {'arguments': args}, opt_callback, this);
};

/**
 * Clears all visualization errors, if any.
 *
 * @param {function(boolean, string=)=} opt_callback An optional callback
 *     invoked after the error clearing request has been dispatched. Receives
 *     two parameters: a boolean describing whether the operation was rejected
 *     and an optional string containing the rejection details, if any.
 */
rhizo.UserAgent.prototype.clearErrors = function(opt_callback) {
  this.project_.eventBus().publish(
      'error', {'clear': true}, opt_callback, this);
};
