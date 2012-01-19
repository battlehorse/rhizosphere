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

/**
 * === Support classes for state management.
 *
 * The global, document-wide state is the composition of the states of each
 * single Rhizosphere visualization present in the document.
 *
 * Each visualization manages its state as a set of Facets. A Facet is a single
 * aspect of a visualization whose state can be tracked (such as the layout
 * algorithm the visualization is currently using).
 *
 * Each visualization state can be shared among different components that might
 * both be notified of state changes:
 * - the rhizo.Project instance that manages the visualization
 * - HTML5 window.history (for browser navigation)
 * - document location hash (for browser navigation and bookmarking)
 * - HTML5 storage (for persistence across browser restarts)
 * - etc ...
 *
 * Components might also originate state change events, which are then
 * broadcast to all the other components to keep them in sync.
 *
 * To support such model, the following infrastructure is defined:
 * - rhizo.state.MasterOverlord: Maintains the global, document-wide state
 *   and is aware of all the visualizations within the document that might
 *   affect such state.
 *
 * - rhizo.state.ProjectOverlord: There is one ProjectOverlord for every
 *   visualization present in the document. Maintains the set of all
 *   components that track visualization state and broadcast state changes
 *   among those. It's also responsible for propagating per-visualization
 *   state changes upstream to the global state.
 *
 * - rhizo.state.StateBinder: An abstract class, that defines a bi-directional
 *   notification channel for state-changes between a visualization and a single
 *   component.
 *
 * Additional support classes exist:
 * - rhizo.state.HistoryHelper: bi-directional HTML5 History wrapper, to persist
 *   state changes and broadcast history events.
 *
 * === A brief note on HTML5 History.
 * HTML5 history is a sequence of document-wide state. PopStateEvent events are
 * fired whenever the document state should be updated as a consequence of the
 * user hitting the back/forward button (either to arrive in the current page,
 * return to the current page or move within current page states) or generating
 * history changes by other means.
 *
 * Because of differences in browsers implementations:
 * - a PopStateEvent might fire or not when we arrive directly on a page
 *   (without using the back/forward buttons).
 * - the initial PopStateEvent that fires when we arrive on a page using the
 *   back/forward buttons might occur before or after Rhizosphere visualizations
 *   bootstrap.
 *
 * For these reasons, we have to take care of both these scenarios:
 * - the initial PopStateEvent event occurs after a rhizosphere visualization
 *   has initialized (see MasterOverlord.setInitialState).
 * - the initial PopStateEvent event occurs before a rhizosphere visualization
 *   has initialized (see MasterOverlord.attachProject).
 *
 * Also, since history state is document-wide:
 * - We need to differentiate between states pushed by different Rhizosphere
 *   visualizations living in the same page.
 * - We need to exclude states pushed by third-party components living in the
 *   same page.
 */

// RHIZODEP=rhizo,rhizo.log,rhizo.options
namespace("rhizo.state");

/**
 * Constant tag attached to HTML5 history states, to separate Rhizosphere states
 * from other history states generated outside of the visualization.
 * @type {string}
 * @const
 */
rhizo.state.TYPE = '__rhizo_state__';


/**
 * Enumeration of the different aspects of a Rhizosphere visualization whose
 * state can be tracked.
 * @enum {string}
 */
rhizo.state.Facets = {
  LAYOUT: 'layout',
  SELECTION_FILTER: 'selection',
  FILTER: 'filter'
};


/**
 * Enumeration of the different components that might be interested in state
 * changes of a Rhizosphere visualization.
 * @enum {string}
 */
rhizo.state.Bindings = {
  PROJECT: 'project',
  HISTORY: 'history'
};


/**
 * Returns an empty Rhizosphere global state object, that can be used to track
 * the individual state of multiple visualizations in the same page, persisted
 * and distributed for history management and other needs (such as
 * broadcasting).
 *
 * @private
 * @returns {!Object} An empty Rhizosphere global state object.
 */
rhizo.state.getEmptyState_ = function() {
  return {
    type: rhizo.state.TYPE,  // Watermarking
    uuids: {},  // per-visualization state. Each entry has the visualization
                // uuid as its key and the visualization state as the value.
                //
                // The visualization state is represented as facet-facetState
                // pairs.
    delta: {  // last state change that was applied.
      ts: null,  // timestamp
      uuid: null,  // uuid of the affected visualization
      facet: null,  // affected facet
      facetState: null  // associated facet state.
    }
  };
};


/**
 * The global state overlord, that oversees state changes for all the
 * visualizations present in a page.
 * @constructor
 */
rhizo.state.MasterOverlord = function() {
  // Plain JS object that describes the global state. Initially empty.
  this.state_ = rhizo.state.getEmptyState_();

  /**
   * Collection of all project overlords, keyed by project uuid.
   * @type {Object.<string, rhizo.state.ProjectOverlord>}
   * @private
   */
  this.projectOverlords_ = {};

  /**
   * The component that was responsible for setting the initial state.
   * For example, it may indicate that visualization state was initially rebuilt
   * from HTML5 History.
   * @type {rhizo.state.Bindings}
   * @private
   */
  this.initialStateOwner_ = null;
};

/**
 * Enables state management for this project.
 * @param {rhizo.Project} project
 * @param {Array.<rhizo.state.Bindings>} The set of components that will track
 *     state changes for this project. The rhizo.state.Bindings.PROJECT
 *     component (binding for the project itself) it's always automatically
 *     included.
 * @return {boolean} Whether an initial state existed for the project (and was
 *     notified to it) or not (and the project should configure its state
 *     via other defaults).
 */
rhizo.state.MasterOverlord.prototype.attachProject = function(project,
                                                              bindings) {
  var uuid = project.uuid();
  var projectOverlord = new rhizo.state.ProjectOverlord(
      this, project, bindings);
  this.projectOverlords_[uuid] = projectOverlord;

  // Broadcasts the current project state (if already defined) to all the
  // bindings (including the project itself), for them to sync to the current
  // state.
  if (uuid in this.state_.uuids) {
    if (!this.initialStateOwner_) {
      throw('Initial state owner is unknown, ' +
            'even though an initial state exists for: ' + uuid);
    }
    projectOverlord.broadcast(this.initialStateOwner_, null);
    return true;
  }
  // Otherwise, notify solely the project binder for the project to initialize
  // in a default state.
  this.projectBinder(project).onTransition(null, this.state_);
  return false;
};

/**
 * Disables state management for this project.
 *
 * NOTE that you cannot repeatedly enable/disable state management for a
 * project. You can enable and disable it just once, otherwise the initial
 * state received after re-enabling state management may be out-of-sync.
 *
 * @param {rhizo.Project} project
 */
rhizo.state.MasterOverlord.prototype.detachProject = function(project) {
  var uuid = project.uuid();
  if (uuid in this.projectOverlords_) {
    this.projectOverlords_[uuid].removeAllBindings();
    delete this.projectOverlords_[uuid];
  }
  if (uuid in this.state_.uuids) {
    delete this.state_.uuids[uuid];
  }
};

/**
 * Returns the project overlord assigned to the given project.
 * @param {rhizo.Project} project
 * @return {rhizo.state.ProjectOverlord}
 */
rhizo.state.MasterOverlord.prototype.projectOverlord = function(project) {
  return this.projectOverlords_[project.uuid()];
};

/**
 * @param {rhizo.Project} project
 * @return {rhizo.state.ProjectStateBinder} The binding object that expose the
 *     state management interface for the project.
 */
rhizo.state.MasterOverlord.prototype.projectBinder = function(project) {
  return this.projectOverlords_[project.uuid()].getProjectBinder();
};

/**
 * @return {*} The current state.
 */
rhizo.state.MasterOverlord.prototype.state = function() {
  return this.state_;
};

/**
 * Replaces the current state with a new one. Does not trigger any sync.
 * @param {*} state The new state.
 */
rhizo.state.MasterOverlord.prototype.setState = function(state) {
  this.state_ = state;
};

/**
 * Sets the inital document-wide state, and broadcasts it to all the affected
 * components for them to sync.
 *
 * @param {rhizo.state.Bindings} ownerKey The component which is setting the
 *     initial state.
 * @param {*} state The initial state.
 * @param {?boolean} opt_replace Whether the given state should replace a
 *     previous initial state (if defined) or not.
 */
rhizo.state.MasterOverlord.prototype.setInitialState = function(ownerKey,
                                                                state,
                                                                opt_replace) {
  var replace = !!opt_replace;
  if (!replace) {
    // We are trying to set the initial state without forcing a replace.
    // If an initial state already exists, don't change anything.
    var numProjectStates = 0;  // projects that have already set their state.
    for (var uuid in this.state_.uuids) {
      numProjectStates++;
    }
    if (numProjectStates > 0) {
      return;
    }
  }
  this.initialStateOwner_ = ownerKey;
  this.setState(state);

  // Broadcast the initial state to all projects that have already enabled
  // state management.
  for (var uuid in this.state_.uuids) {
    if (uuid in this.projectOverlords_) {
      this.projectOverlords_[uuid].broadcast(ownerKey, null, opt_replace);
    }
  }
};

/**
 * Pushes a delta change of the global state.
 * @param {*} delta A key-value map that describes the delta change to apply.
 *     Must contain the following properties:
 *     - uuid: The id of the affected visualization
 *     - facet: The affected facet
 *     - facetState: The target facetState
 *     - ts: The timestamp at which the change occurred.
 */
rhizo.state.MasterOverlord.prototype.pushDelta = function(delta) {
  this.state_.delta  = delta;
  if (!(delta.uuid in this.state_.uuids)) {
    this.state_.uuids[delta.uuid] = {};
  }
  this.state_.uuids[delta.uuid][delta.facet] = delta.facetState;
};


/**
 * Oversees all the changes that occur in a single Rhizosphere visualization.
 * Maintains all the bi-directional channels to the registered components that
 * are tracking changes on this visualization and keeps them in sync.
 *
 * @param {rhizo.state.MasterOverlord} masterOverlord The global state manager.
 * @param {rhizo.Project} project The project that manages the visualization.
 * @param {Array.<rhizo.state.Bindings>} The set of components that will track
 *     state changes for this project. The rhizo.state.Bindings.PROJECT
 *     component (binding for the project itself) it's always automatically
 *     included.
 * @constructor
 */
rhizo.state.ProjectOverlord = function(masterOverlord, project, bindings) {
  this.master_ = masterOverlord;
  this.uuid_ = project.uuid();
  this.bindings_ = {};

  bindings.push(rhizo.state.Bindings.PROJECT);
  var binder;
  for (var i = 0; i < bindings.length; i++) {
    var binding = bindings[i];
    switch(binding) {
      case rhizo.state.Bindings.PROJECT:
        binder = new rhizo.state.ProjectStateBinder(this, project);
        this.bindings_[binding] = binder;
        break;
      case rhizo.state.Bindings.HISTORY:
        if (rhizo.state.getHistoryHelper()) {  // HTML5 history supported.
          binder = new rhizo.state.HistoryStateBinder(this);
          this.bindings_[binding] = binder;
        }
        break;
      default:
        throw('Unknown binding: ' + binding);
    }
  }
};

/**
 * @return {rhizo.state.ProjectStateBinder} The binding object that expose the
 *     state management interface for the project.
 */
rhizo.state.ProjectOverlord.prototype.getProjectBinder = function() {
  return this.bindings_[rhizo.state.Bindings.PROJECT];
};

/**
 * @return {string} The unique id of the visualization managed by this
 *     overlord.
 */
rhizo.state.ProjectOverlord.prototype.uuid = function() {
  return this.uuid_;
};

/**
 * @return {rhizo.state.MasterOverlord} Returns the master state overlord.
 */
rhizo.state.ProjectOverlord.prototype.master = function() {
  return this.master_;
};

/**
 * Adds a new binder to the list of bindings attached to this overlord.
 * Upon attachment, the binder receives the full state to be able to sync itself
 * to the current visualization state.
 *
 * @param {rhizo.state.StateBinder} binder The StateBinder to add.
 */
rhizo.state.ProjectOverlord.prototype.addBinding = function(binder) {
  if (!(binder.key() in this.bindings_)) {
    this.bindings_[binder.key()] = binder;
  }
  if (this.uuid_ in this.master_.state().uuids) {
    binder.onTransition(null, this.master_.state());
  }
};

/**
 * Removes a binding from the list of bindings this overlord is serving.
 * @param {string} binder_key The key of the binder to remove.
 */
rhizo.state.ProjectOverlord.prototype.removeBinding = function(binder_key) {
  var binder = this.bindings_[binder_key];
  binder.onRemove();
  delete this.bindings_[binder_key];
  return binder;
};

/**
 * Removes all the bindings from this overlord.
 *
 * After this call, the overlord will be effectively blind to any changes that
 * affect the project it was bound to, even the ones originating from the
 * project itself.
 */
rhizo.state.ProjectOverlord.prototype.removeAllBindings = function() {
  for (var binder_key in this.bindings_) {
    this.removeBinding(binder_key);
  }
};

/**
 * Applies a state transition requested by one binder and broadcast the changes
 * to all the other binders.
 *
 * The transition is described as a 'delta' that describes the change from
 * the current state to the target state and, optionally, a target state.
 *
 * Deltas can describe both forward changes (moving from the current state to
 * a future one) and backward changes (rolling back to a previous state).
 *
 * If the target state is missing, the 'delta' is assumed to be a forward change
 * and therefore the target state will be computed from the current one.
 *
 * Deltas can only change one state facet at a time, for one visualization at
 * a time.
 *
 * @param {rhizo.state.Bindings} sourceKey The key that identifies the binder
 *     where the last state change originated from.
 * @param {*} delta A key-value map that describes the delta change to apply.
 *     Must contain the following properties:
 *     - uuid: The id of the affected visualization
 *     - facet: The affected facet
 *     - facetState: The target facetState
 *     - ts: The timestamp at which the change occurred (can be in the past
 *       if we are rolling back to a previous state).
 * @param {*} opt_target_state Optional target state. Can be omitted if the
 *     change is a forward change.
 * @param {boolean} opt_replace Hints that the target state reached by this
 *     delta transition should replace the current one, instead of being a
 *     transition from it.
 */
rhizo.state.ProjectOverlord.prototype.transition = function(sourceKey,
                                                            delta,
                                                            opt_target_state,
                                                            opt_replace) {
  if (opt_target_state) {
    this.master_.setState(opt_target_state);
  } else {
    this.master_.pushDelta(delta);
  }
  this.broadcast(sourceKey, delta, opt_replace);
};

/**
 * Broadcasts a state change from the originating component to all the other
 * interested parties. Each component receives the full target state and, if
 * the transition to the target state affected a single facet, a delta object
 * as well.
 *
 * @param {rhizo.state.Bindings} sourceKey The key that identifies the binder
 *     where the last state change originated from.
 * @param {*} opt_delta An optional key-value map that describes a delta change
 *     that occurred. See transition() for this object attributes.
 * @param {boolean} opt_replace Hints that the target state reached by this
 *     delta transition should replace the current one, instead of being a
 *     transition from it.
 */
rhizo.state.ProjectOverlord.prototype.broadcast = function(sourceKey,
                                                           opt_delta,
                                                           opt_replace) {
  // Propagate the change to all the other binders to keep them in sync.
  for (var binderKey in this.bindings_) {
    if (binderKey != sourceKey) {
      this.bindings_[binderKey].onTransition(
          opt_delta, this.master_.state(), opt_replace);
    }
  }
};


/**
 * Abstract class that defines the interface to notify/listen to state changes.
 * @param {rhizo.state.ProjectOverlord} overlord
 * @param {rhizo.state.Bindings} binderKey
 * @constructor
 */
rhizo.state.StateBinder = function(overlord, binderKey) {
  this.overlord_ = overlord;
  this.binderKey_ = binderKey;
};

/**
 * @return {rhizo.state.Bindings}
 */
rhizo.state.StateBinder.prototype.key = function() {
  return this.binderKey_;
};

/**
 * Callback to notify this binder that a state transition occurred elsewhere.
 * @param {*} opt_delta Defines the facet that changed state and its associated
 *     changes. See the parameter documentation for
 *     rhizo.state.ProjectOverlord.prototype.transition. null if the change
 *     affected multiple facets at the same time.
 * @param {*} state The target state at the end of the transition.
 * @param {boolean} opt_replace Hints that the target state reached by this
 *     delta transition should replace the current one, instead of being a
 *     transition from it.
 */
rhizo.state.StateBinder.prototype.onTransition = function(opt_delta,
                                                          state,
                                                          opt_replace) {
  throw("Unimplemented StateBinder.onTransition");
};

/**
 * Creates a delta object from a facet change.
 * @param {rhizo.state.Facets} facet The facet that change.
 * @param {*} facetState The facet target state.
 * @return {*} An object that describes the change, suitable for passing to
 *     rhizo.state.ProjectOverlord.prototype.transition.
 */
rhizo.state.StateBinder.prototype.makeDelta = function(facet, facetState) {
  return {
    ts: new Date().getTime(),
    uuid: this.overlord_.uuid(),
    facet: facet,
    facetState: facetState
  };
};

/**
 * Callback to notify this binder that is being removed from its overlord.
 * Therefore it won't be sent further state transitions, and it should stop
 * pushing state changes to the overlord.
 */
rhizo.state.StateBinder.prototype.onRemove = function() {};


/**
 * Binds the visualization state to the rhizo.Project that manages the
 * visualization itself.
 *
 * @param {rhizo.state.StateOverlord} overlord
 * @param {rhizo.Project} project
 * @constructor
 */
rhizo.state.ProjectStateBinder = function(overlord, project) {
  rhizo.state.StateBinder.call(this, overlord, rhizo.state.Bindings.PROJECT);
  this.project_ = project;
  this.removed_ = false;
  this.project_.eventBus().subscribe(
      'layout', this.onLayout_, this, /* committed */ true);
  this.project_.eventBus().subscribe(
      'selection', this.onSelection_, this, /* committed */ true);
  this.project_.eventBus().subscribe(
      'filter', this.onFilter_, this, /* committed */ true);
};
rhizo.inherits(rhizo.state.ProjectStateBinder, rhizo.state.StateBinder);

rhizo.state.ProjectStateBinder.prototype.onRemove = function() {
  this.project_.eventBus().unsubscribe('layout', this);
  this.project_.eventBus().unsubscribe('selection', this);
  this.project_.eventBus().unsubscribe('filter', this);
  this.removed_ = true;
};

/** @inheritDoc */
rhizo.state.ProjectStateBinder.prototype.onTransition = function(opt_delta,
                                                                 state) {
  if (this.removed_) {
    throw("ProjectStateBinder received a transition after being removed from " +
          "overlord.");
  }

  // If we know exactly what changed to get to the target state, then
  // just apply the delta, otherwise rebuild the full state.
  if (opt_delta) {
    this.pushDeltaChange_(opt_delta);
  } else {
    this.pushFullState_(state);
  }
};

/**
 * Applies a single facet transition to the managed project.
 *
 * @param {*} delta Defines the facet that changed state and its associated
 *     changes. See the parameter documentation for
 *     rhizo.state.ProjectOverlord.prototype.transition.
 * @private
 */
rhizo.state.ProjectStateBinder.prototype.pushDeltaChange_ = function(delta) {
  this.project_.logger().debug('Received delta state change to push: ', delta);
  var facet = delta.facet;
  var facetState = delta.facetState;
  if (facet == rhizo.state.Facets.LAYOUT) {
    this.pushLayoutChange_(facetState);
  } else if (facet == rhizo.state.Facets.SELECTION_FILTER) {
    this.pushSelectionChange_(facetState);
  } else if (facet == rhizo.state.Facets.FILTER) {
    this.pushFilterChange_(facetState);
  } else {
    throw("Invalid facet: " + facet);
  }
};

/**
 * Rebuilds the full project state.
 *
 * @param {*} state The target state to transition the project to.
 * @private
 */
rhizo.state.ProjectStateBinder.prototype.pushFullState_ = function(state) {
  this.project_.logger().debug('Received full state change to push: ', state);
  var projectState = state.uuids[this.overlord_.uuid()] || {};
  this.pushFilterChange_(projectState[rhizo.state.Facets.FILTER]);
  this.pushSelectionChange_(
      projectState[rhizo.state.Facets.SELECTION_FILTER]);

  // forcealign required to align model visibility since we are rebuilding
  // a full state (it may even be the initial one, when all models are still
  // hidden).
  this.pushLayoutChange_(
      projectState[rhizo.state.Facets.LAYOUT], /* forcealign */ true);
};

/**
 * Publishes a 'layout' message on the project eventbus to update all
 * subscribers about the current layout engine and configuration.
 *
 * @param {Object} facetState An object describing the current layout
 *     configuration, as defined by rhizo.layout.LayoutManager, containing
 *     'engine', 'state' and optional 'positions' settings. Or null if the
 *     layout should be reverted to the visualization default state.
 * @param {boolean=} opt_forcealign Whether a visibility alignment should be
 *     enforced as part of the layout operation. Defaults to false.
 * @private
 */
rhizo.state.ProjectStateBinder.prototype.pushLayoutChange_ = function(
    facetState, opt_forcealign) {
  var message = {
    // Setting engine and state explicitly to null (when facetState is
    // missing) equates to restoring the default engine and/or state (which
    // is the right thing to do when a null, aka initial, state is restored
    // from html5 history and other binders).
    engine: facetState ? facetState.engine: null,
    state: facetState ? facetState.state : null,
    positions: facetState ? facetState.positions : null
  };
  if (!!opt_forcealign) {
    message['options'] = {forcealign: true};
  }
  this.project_.eventBus().publish(
      'layout', message, /* callback */ null, this);
};

/**
 * Callback invoked whenever a layout related change occurs elsewhere on the
 * project. Updates the visualization state to match the layout change.
 *
 * @param {Object} message An eventbus message describing the layout change
 *     that occurred. See rhizo.layout.LayoutManager for the expected message
 *     structure.
 * @private
 */
rhizo.state.ProjectStateBinder.prototype.onLayout_ = function(message) {
  if (this.removed_) {
    throw("ProjectStateBinder cannot issue transitions after removal from " +
          "overlord");
  }

  var facetState = {
    engine: message['engine'],
    state: message['state']
  };
  var replace = !!message['positions'] && this.curLayoutHasPositions_();
  if (message['positions']) {
    facetState.positions = this.mergePositions_(message['positions']);
  }
  var delta = this.makeDelta(rhizo.state.Facets.LAYOUT, facetState);
  this.overlord_.transition(this.key(), delta, null, replace);
};

/**
 * @return {boolean} Whether the current state, and the current layout in
 *     particular, is storing custom model positions or not.
 * @private
 */
rhizo.state.ProjectStateBinder.prototype.curLayoutHasPositions_ = function() {
  var state = this.overlord_.master().state();
  var uuid = this.overlord_.uuid();
  return !!state.uuids[uuid] &&
      !!state.uuids[uuid][rhizo.state.Facets.LAYOUT] &&
      !!state.uuids[uuid][rhizo.state.Facets.LAYOUT].positions;
};

/**
 * Merges all the custom layout positions currently stored in the visualization
 * state with new custom model positions defined in the current transition.
 *
 * @param {Array.<*>} positions An array of all model that have moved to a
 *     custom position as part of the current state transition.
 * @return {Array.<*>} An array of the same format of the input one, that
 *     contains all known custom model positions (current and historical).
 * @private
 */
rhizo.state.ProjectStateBinder.prototype.mergePositions_ = function(positions) {
  var positions_map = {};
  for (var i = positions.length-1; i >= 0; i--) {
    positions_map[positions[i].id] = true;
  }

  if (this.curLayoutHasPositions_()) {
    var cur_positions =
        this.overlord_.master().state().uuids[this.overlord_.uuid()][
            rhizo.state.Facets.LAYOUT].positions || [];
    for (var i = cur_positions.length-1; i >= 0; i--) {
      if (!(cur_positions[i].id in positions_map)) {
        positions.push(cur_positions[i]);
      }
    }
  }
  return positions;
};

/**
 * Publishes a 'selection' message on the project eventbus to update all
 * subscribers about the current selection status.
 *
 * @param {Array} facetState The array of all model ids that should be hidden
 *     from the visualization, or null if all models should be visible.
 * @private
 */
rhizo.state.ProjectStateBinder.prototype.pushSelectionChange_ = function(
    facetState) {
  var hiddenModelIds = facetState || [];
  if (hiddenModelIds.length == 0) {
    this.project_.eventBus().publish(
        'selection', {action: 'resetFocus'}, /* callback */ null, this);
  } else {
    this.project_.eventBus().publish(
        'selection', {
          action: 'hide',
          models: hiddenModelIds,
          incremental: false
        },
        /* callback */ null, this);
  }
};

/**
 * Callback invoked whenever a selection related change occurs elsewhere on the
 * project. Updates the visualization state to match the selection change.
 *
 * @param {Object} message An eventbus message describing the selection change
 *     that occurred. See rhizo.selection.SelectionManager for the expected
 *     message structure.
 * @private
 */
rhizo.state.ProjectStateBinder.prototype.onSelection_ = function(message) {
  if (this.removed_) {
    throw("ProjectStateBinder cannot issue transitions after removal from " +
          "overlord");
  }
  if (message['action'] != 'focus' &&
      message['action'] != 'resetFocus' &&
      message['action'] != 'hide') {
    return;
  }
  var hiddenModelIds = [];
  for (var modelId in this.project_.selectionManager().allHidden()) {
    hiddenModelIds.push(modelId);
  }
  var delta = this.makeDelta(rhizo.state.Facets.SELECTION_FILTER,
                             hiddenModelIds);
  this.overlord_.transition(this.key(), delta);
};

/**
 * Publishes a 'filter' message on the project eventbus to update all
 * subscribers about the current filter status.
 *
 * @param {Object.<string, *>} facetState The set of filters to transition the
 *     project to, or null if all existing filters are to be removed.
 * @private
 */
rhizo.state.ProjectStateBinder.prototype.pushFilterChange_ = function(
    facetState) {
  this.project_.eventBus().publish(
      'filter',
      this.project_.filterManager().filterDiff(facetState || {}),
      /* callback */ null,
      this);
};

/**
 * Callback invoked whenever one or more filters are applied (or removed)
 * elsewhere on the project. Updates the visualization state to match the
 * filter change.
 *
 * @param {Object} message An eventbus message describing the filter change
 *     that occurred. See rhizo.meta.FilterManager for the expected
 *     message structure.
 * @private
 */
rhizo.state.ProjectStateBinder.prototype.onFilter_ = function(message) {
  if (this.removed_) {
    throw("ProjectStateBinder cannot issue transitions after removal from " +
          "overlord");
  }
  var delta = this.makeDelta(
      rhizo.state.Facets.FILTER, this.project_.filterManager().getFilters());
  this.overlord_.transition(this.key(), delta);
};


/**
 * Binds the visualization state to the browser HTML5 history.
 * @param {rhizo.state.StateOverlord} overlord
 * @constructor
 */
rhizo.state.HistoryStateBinder = function(overlord) {
  rhizo.state.StateBinder.call(this, overlord, rhizo.state.Bindings.HISTORY);
  rhizo.state.getHistoryHelper().addListener(
      this.overlord_.uuid(),
      jQuery.proxy(function(delta, target_state) {
        this.overlord_.transition(this.key(), delta, target_state);
      }, this));
};
rhizo.inherits(rhizo.state.HistoryStateBinder, rhizo.state.StateBinder);

rhizo.state.HistoryStateBinder.prototype.onTransition = function(opt_delta,
                                                                 state,
                                                                 opt_replace) {
  rhizo.state.getHistoryHelper().sync(state, opt_replace);
};


rhizo.state.HistoryStateBinder.prototype.onRemove = function() {
  rhizo.state.getHistoryHelper().removeListener(this.overlord_.uuid());
};


/**
 * Helper that manages all interactions with HTML5 History for all the
 * HistoryBinder instances that exist.
 * @param {rhizo.state.MasterOverlord} masterOverlord
 * @param {!Object} logger
 * @constructor
 */
rhizo.state.HistoryHelper = function(masterOverlord, logger) {
  this.master_ = masterOverlord;
  this.logger_ = logger;
  this.listeners_ = {};

  /**
   * @type {boolean}
   * @private
   */
  this.initialStateReceived_ = false;

  $(window).bind('popstate', jQuery.proxy(this.historyChange_, this));
};



/**
 * Registers a callback to be invoked whenever an history-originated change
 * affecting a given visualization occurs.
 * @param {string} uuid The id of the visualization to track.
 * @param {function(rhizo.state.Facets, *, number)} callback Callback function.
 *   Receives as parameters: the facet that changed, the associated facet state
 *   and the timestamp when the change originally occurred.
 */
rhizo.state.HistoryHelper.prototype.addListener = function(uuid, callback) {
  this.listeners_[uuid] = callback;
};

/**
 * Deregisters a callback from being invoked on history-originated changes
 * affecting the given visualization.
 *
 * @param {string} uuid The id of the visualization to stop tracking.
 */
rhizo.state.HistoryHelper.prototype.removeListener = function(uuid) {
  if (uuid in this.listeners_) {
    delete this.listeners_[uuid];
  }
};

/**
 * Pushes the current master state to HTML5 history.
 */
rhizo.state.HistoryHelper.prototype.sync = function(state, opt_replace) {
  // Stop listening for initial events after the first sync,
  // since the sync itself is responsible for setting the initial state.
  this.logger_.debug('Pushing history state, replace=', !!opt_replace);

  var firstSync = !this.initialStateReceived_;
  this.initialStateReceived_ = true;

  if (firstSync) {
    // Once the first user-generated history change, we first push an
    // initial empty state to be able to revert to the visualization
    // default state when going back in history.
    //
    // TODO(battlehorse): replace with the correct state once it is possible
    // to initialize the visualization in a predefined state. 
    window.history.pushState(
        rhizo.state.getEmptyState_(), /* empty title */ '');
  }

  if (!!opt_replace) {
    window.history.replaceState(state, /* empty title */ '');
  } else {
    window.history.pushState(state, /* empty title */ '');
  }
};

/**
 * Callback invoked whenever an history event occurs (forward / back navigation)
 * @param {PopStateEvent} evt
 * @private
 */
rhizo.state.HistoryHelper.prototype.historyChange_ = function(evt) {
  var target_state = evt.originalEvent.state;
  this.logger_.debug('History popstate event: ', target_state);

  if (!this.isRhizoState_(target_state)) {
    // A PopState event with a null (or non-Rhizosphere) state might occur in
    // several occasions:
    // - when transitioning to a 'traditional' history location as set by
    //   simply changing window.location.hash (i.e. not carrying any state),
    // - depending on the browser (Chrome17 has the behavior, Opera 11.6 and
    //   FF4+ do not) when _generating_ a 'traditional' history event (by
    //   clicking on a link that only changes the location hash -- even when
    //   the same link is clicked multiple times -- or by changing the
    //   location.hash programmatically)
    // - when moving backward to the initial arrival on the page, 
    // - depending on the browser (Chrome17 has the behavior, Opera 11.6 and
    //   FF4+ do not) when _arriving_ on the page.
    //
    // Out of all these, the only case we care about is the second, as we
    // want to revert the visualization to its initial (default) state, but
    // this is dealt separately by pushing a double state on the first sync()
    // so we can safely ignore any null states.
    return;
  }

  if (!this.initialStateReceived_) {
    // This is the first Rhizosphere-specific history event that we receive,
    // even before any user action on the visualization(s). This derives
    // from the user either a) browsing back to the page into the last
    // visualization state before he left or b) browsing forward to the page
    // to first visualization state of a previous sequence.
    this.logger_.debug('History event is initial.');
    this.initialStateReceived_ = true;
    this.master_.setInitialState(rhizo.state.Bindings.HISTORY, target_state);
    return;
  }

  if (this.master_.state().delta.ts == target_state.delta.ts) {
    // Under some conditions, the same state can be received twice
    // (assuming timestamp measurement is granular enough), in which case
    // we don't consider the state valid and ignore it.
    //
    // The most common case is when navigating back from a traditional history
    // event (no state attached) to a Rhizosphere one. In such case, the
    // target_state and the current master state coincide and no transition
    // is required.
    //
    // Alternatively, this can happen in some other corner cases. For example:
    // - if we are on Chrome/Linux,
    // - and we set an initial state with replacement (as when resuming the
    //   the initial following of a remote visualization)
    // Then:
    // - a popState event will be fired _after_ the initial state was set.
    // Since we performed a state replace, the popstate event will contain
    // the exact state currently in the master.
    return;
  }

  // Compute the transition required to reach the target state.
  var delta = this.diff_(this.master_.state(), target_state);

  this.logger_.debug('Delta change extracted from history: ', delta);
  if (delta.uuid in this.listeners_) {
    // If a listener responsible for the affected visualization still exists,
    // notify it and rely on it to update the master state.
    this.listeners_[delta.uuid](delta, target_state);
  } else {
    // Nobody is tracking history changes for this visualization anymore,
    // update the master state directly.
    // (even though no longer useful, we cannot miss this state, because
    // delta computations in diff() must operate on consecutive states).
    this.master_.pushDelta(delta);
  }
};

/**
 * Defines whether the history state belongs to Rhizosphere or was defined by
 * someone else living in the same page as the visualization.
 * @private
 */
rhizo.state.HistoryHelper.prototype.isRhizoState_ = function(state) {
  return !!state && state.type == rhizo.state.TYPE;
};

/**
 * Computes the delta state change that occurred between two consecutive
 * global states. It distinguishes between forward changes (the state we
 * diff against occurred after the current one) and backward ones (viceversa).
 *
 * @param {*} current_state The current state.
 * @param {*} target_state The target state, as received from history.
 * @return {*} An object describing the delta change with the following
 *    properties:
 *    - uuid: uuid of the visualization that changed.
 *    - facet: changed facet
 *    - facetState: facet state as it was after the state change.
 *    - ts: The timestamp at which the change occurred.
 */
rhizo.state.HistoryHelper.prototype.diff_ = function(current_state,
                                                     target_state) {
  if (target_state.delta.ts > current_state.delta.ts) {
    // Moving forward through the history
    return target_state.delta;
  } else {
    // Moving backward through the history
    var facetToRollback = current_state.delta.facet;
    var uuidToRollback = current_state.delta.uuid;
    if (uuidToRollback in target_state.uuids &&
        facetToRollback in target_state.uuids[uuidToRollback]) {
      return {
        ts: target_state.delta.ts,
        uuid: uuidToRollback,
        facet: facetToRollback,
        facetState: target_state.uuids[uuidToRollback][facetToRollback]
      }
    } else {
      // Either the uuid or the affected facet is missing in the target state.
      // We are rolling back to a state where either the entire project
      // associated to this uuid, or just one of its facets, was in its
      // default (unconfigured) state.
      // Examples:
      // - missing uuid: null initial state (direct landing on the page),
      //     apply a change and then roll it back.
      // - missing facet: null initial state (direct landing on the page),
      //     apply a change to 2 different facets, then rollback the latter.
      return {
        ts: target_state.delta.ts,
        uuid: uuidToRollback,
        facet: facetToRollback,
        facetState: null
      };
    }
  }
};


/**
 * The singleton master state manager.
 * @type {rhizo.state.MasterOverlord}
 * @private
 */
rhizo.state.overlord_ = new rhizo.state.MasterOverlord();


/**
 * @return {rhizo.state.MasterOverlord} The global state manager.
 */
rhizo.state.getMasterOverlord = function() {
  return rhizo.state.overlord_;
};


/**
 * The detail level rhizo.state.HistoryHelper will use in logging history
 * events.
 *
 * This is defined as a global variable (to customize before
 * Rhizosphere libraries are loaded) because HistoryHelper is a global
 * object shared across multiple visualizations.
 *
 * It is not namespaced, as the 'rhizo' namespace will not exist yet when
 * the user customizes it.
 *
 * @type {string}
 */
rhizosphereHistoryLogLevel = window['rhizosphereHistoryLogLevel'] || 'error';


/**
 * The singleton helper that manages all interactions with HTML5 History.
 * @type {rhizo.state.HistoryHelper}
 * @private
 */
rhizo.state.history_ = null;
if (window.history && typeof(window.history.pushState) == 'function') {
  var logger = rhizo.log.newLogger(
      null, new rhizo.Options({logLevel: rhizosphereHistoryLogLevel}));
  rhizo.state.history_ = new rhizo.state.HistoryHelper(
      rhizo.state.getMasterOverlord(), logger);
}


/**
 * @return {rhizo.state.HistoryHelper} the singleton helper that manages all
 *   interactions with HTML5 History.
 */
rhizo.state.getHistoryHelper = function() {
  return rhizo.state.history_;
};
