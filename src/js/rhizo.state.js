/*
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
 * return to the current page or move within current page states).
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

// RHIZODEP=rhizo
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
  FILTER_PREFIX: 'filter_'
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
 * The global state overlord, that oversees state changes for all the
 * visualizations present in a page.
 * @constructor
 */
rhizo.state.MasterOverlord = function() {
  // Plain JS object that describes the global state. Initially empty.
  this.state_ = {
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
 * @param {*} opt_delta Defines that facet that changed state and its associated
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
 * @param {rhizo.state.StateOverlord} overlord
 * @param {rhizo.Project} project
 * @constructor
 */
rhizo.state.ProjectStateBinder = function(overlord, project) {
  rhizo.state.StateBinder.call(this, overlord, rhizo.state.Bindings.PROJECT);
  this.project_ = project;
  this.removed_ = false;
};
rhizo.inherits(rhizo.state.ProjectStateBinder, rhizo.state.StateBinder);

rhizo.state.ProjectStateBinder.prototype.onRemove = function() {
  this.removed_ = true;
};

rhizo.state.ProjectStateBinder.prototype.onTransition = function(opt_delta,
                                                                 state) {
  if (this.removed_) {
    throw("ProjectStateBinder received a transition after being removed from " +
          "overlord.");
  }
  if (opt_delta) {
    // If we know exactly what changed to get to the target state, then
    // just apply the delta.
    this.project_.stateChanged(opt_delta.facet, opt_delta.facetState);
  } else {
    // Otherwise rebuild the full state.
    this.project_.setState(state.uuids[this.overlord_.uuid()]);
  }
};

/**
 * Utility method to change the visualization state because of a change in
 * the visualization layout algorithm.
 *
 * @param {string} layoutName The name of the layout engine that was applied.
 * @param {*} layoutState Layout engine state (see getState() in the layout
 *     documentation.
 * @param {Array.<*>} opt_positions An optional array of all model that have
 *     a custom position, other than the one the layout mandates.
 *     Each entry is a key-value map with the following properties: 'id', the
 *     id of the model that moved, 'top': the ending top coordinate of the
 *     top-left model corner with respect to the visualization universe,
 *     'left', the ending left coordinate of the top-left model corner with
 *     respect to the visualization universe.
 */
rhizo.state.ProjectStateBinder.prototype.pushLayoutChange = function(
    layoutName, layoutState, opt_positions) {
  if (this.removed_) {
    throw("ProjectStateBinder cannot issue transitions after removal from " +
          "overlord");
  }
  var facetState = jQuery.extend({layoutName: layoutName}, layoutState);
  var replace = !!opt_positions && this.curLayoutHasPositions_();
  if (opt_positions) {
    facetState.positions = this.mergePositions_(opt_positions);
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
  return uuid in state.uuids &&
      rhizo.state.Facets.LAYOUT in state.uuids[uuid] &&
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
 * Utility method to change the visualization state because of a change in
 * the set of filtered models via selection.
 * @param {Array.<*>} filteredModels Array of model ids, for all the models
 *     that should be filtered out. null if no model should be filtered out.
 */
rhizo.state.ProjectStateBinder.prototype.pushFilterSelectionChange = function(
    filteredModels) {
  if (this.removed_) {
    throw("ProjectStateBinder cannot issue transitions after removal from " +
          "overlord");
  }
  var delta = this.makeDelta(rhizo.state.Facets.SELECTION_FILTER,
                             filteredModels);
  this.overlord_.transition(this.key(), delta);
};

/**
 * Utility method to change the visualization state because of a change in the
 * set of metamodel filters.
 * @param {string} key The key of the metamodel filter that changed.
 * @param {*} value The target value of the metamodel filter.
 */
rhizo.state.ProjectStateBinder.prototype.pushFilterChange = function(key,
                                                                     value) {
  if (this.removed_) {
    throw("ProjectStateBinder cannot issue transitions after removal from " +
          "overlord");
  }
  var delta = this.makeDelta(rhizo.state.Facets.FILTER_PREFIX + key,
                             value);
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
 * @constructor
 */
rhizo.state.HistoryHelper = function(masterOverlord) {
  this.master_ = masterOverlord;
  this.listeners_ = {};
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
  // Stop listening for initial events after the first push.
  // We assume the initial state was never fired during the init process,
  // as is the case of Safari/MacOs when we are landing directly on the
  // visualization page (not arriving from history browse).
  this.initialStateReceived_ = true;
  if (opt_replace) {
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
  if (!this.initialStateReceived_) {
    // A PopStateEvent is fired on page load when we are arriving on the page
    // as a consequence of browser back/forward navigation. The event contains
    // the initial state Rhizosphere visualizations should be restored to.
    this.initialStateReceived_ = true;
    var initial_state = evt.originalEvent.state;

    // A null PopStateEvent is fired by Chrome (on Linux, Win) and FF4 when
    // we are landing directly on the page that contains the visualization
    // (i.e.: no back/forward buttons were used).
    if (initial_state) {

      // Verify whether the state we received belongs to Rhizosphere.
      if (this.isRhizoState_(initial_state)) {
        this.master_.setInitialState(rhizo.state.Bindings.HISTORY,
                                     initial_state);
      }
    }
    return;
  }

  var delta;
  var target_state = evt.originalEvent.state;
  if (!target_state) {
    // A null target state implies we are moving backward to the initial state
    // the page has when we land on it directly (not coming from an history
    // event).
    //
    // Prepare a suitable delta to revert the facet to its initial (default)
    // state.
    delta = {
      ts: new Date().getTime(),
      uuid: this.master_.state().delta.uuid,
      facet: this.master_.state().delta.facet,
      facetState: null
    };
  } else {
    if (!this.isRhizoState_(target_state)) {
      // Notified of an HTML5 history state change that was not set by
      // Rhizosphere.
      return;
    }

    if (this.master_.state().delta.ts == target_state.delta.ts) {
      // We are receiving the same state twice (assuming timestamp measurement
      // is granular enough).
      // This can happen in some weird cases. For example:
      // - if we are on Chrome/Linux,
      // - and we set an initial state with replacement (as when resuming the
      //   the initial following of a remove visualization)
      // Then:
      // - a popState event will be fired _after_ the initial state was set.
      // Since we performed a state replace, the popstate event will contain
      // the exact state currently in the master.
      return;
    }

    // Compute the transition required to reach the target state.
    delta = this.diff_(this.master_.state(), target_state);
  }

  if (delta.uuid in this.listeners_) {
    // If a listener responsible for the affected visualization still exists,
    // notify it and rely on it to update the master state.
    this.listeners_[delta.uuid](delta, target_state);
  } else {
    // Nobody is tracking history changes for this visualization anymore,
    // update the master state directly.
    // (even though no longer useful, we cannot miss this state, because
    // delta computations in diff() must operate on consecutive states).
    if (target_state) {
      this.master_.setState(target_state);
    } else {
      this.master_.pushDelta(delta);
    }
  }
};

/**
 * Defines whether the history state belongs to Rhizosphere or was defined by
 * someone else living in the same page as the visualization.
 * @private
 */
rhizo.state.HistoryHelper.prototype.isRhizoState_ = function(state) {
  return state.type == rhizo.state.TYPE;
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
 * The singleton helper that manages all interactions with HTML5 History.
 * @type {rhizo.state.HistoryHelper}
 * @private
 */
rhizo.state.history_ = null;
if (window.history && typeof(window.history.pushState) == 'function') {
  rhizo.state.history_ = new rhizo.state.HistoryHelper(
      rhizo.state.getMasterOverlord());
}


/**
 * @return {rhizo.state.HistoryHelper} the singleton helper that manages all
 *   interactions with HTML5 History.
 */
rhizo.state.getHistoryHelper = function() {
  return rhizo.state.history_;
};