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
// RHIZODEP=rhizo,rhizo.log,rhizo.model,rhizo.ui,rhizo.layout,rhizo.layout.manager,rhizo.eventbus,rhizo.selection,rhizo.state
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
  this.models_ = [];
  this.modelsMap_ = {};
  this.options_ = opt_options || {};
  this.gui_ = gui;
  this.filterAutocommit_ = true;

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

  // Convert all 'kind' specifications that are specified as factories into
  // single instances.
  for (var key in this.metaModel_) {
    var obj_kind = rhizo.meta.objectify(this.metaModel_[key].kind);
    this.metaModel_[key].kind = obj_kind;
  }
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
 * Removes the given filter from all models.
 * @param {string} key The key of the filter to remove.
 * @return {boolean} Whether the filter existed on at least one of the models.
 */
rhizo.Project.prototype.resetAllFilter = function(key) {
  var modelsAffected = false;
  for (var i = this.models_.length-1; i >= 0; i--) {
    modelsAffected = this.models_[i].resetFilter(key) || modelsAffected;
  }
  return modelsAffected;
};

rhizo.Project.prototype.enableFilterAutocommit = function(enable) {
  this.filterAutocommit_ = enable;
  if (this.filterAutocommit_) {
    // If there are any greyed models when auto-filtering is re-enabled, we
    // commit the filter.
    for (var i = this.models_.length-1; i >= 0; i--) {
      if (this.models_[i].rendering().visibility == rhizo.ui.Visibility.GREY) {
        this.commitFilter();
        break;
      }
    }
  }
};

rhizo.Project.prototype.isFilterAutocommit = function() {
  return this.filterAutocommit_;
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

  // Ensure that there are no share meta instances in the metaModel.
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
 * Listener method invoked whenever the visualization needs to be fully restored
 * to a given state.
 *
 * @param {Object.<rhizo.state.Facets, *>} state A facet-facetState map
 *     describing the full visualization state.
 */
rhizo.Project.prototype.setState = function(state) {
  for (var facet in state) {
    if (facet == rhizo.state.Facets.SELECTION_FILTER ||
        facet == rhizo.state.Facets.LAYOUT) {
      // TODO(battlehorse): remove once legacy setState() state management
      // is completely replaced by eventbus.
      this.logger_.warn(
          "Ignoring " + facet + " facet when restoring full state.");
    } else if (facet.indexOf(rhizo.state.Facets.FILTER_PREFIX) == 0) {
      var key = facet.substring(rhizo.state.Facets.FILTER_PREFIX.length);
      var value = state[facet];
      this.alignFilterUI_(key, value);

      // We do not care whether the filter requires a re-layout or not, since
      // layout will happen anyway. This will also purge any greyed-out models.
      this.filterInternal_(key, value);
    }
  }
};

/**
 * Listener method invoked whenever a facet of the visualization state changed
 * because of events that are not under the direct control of this project
 * instance (for example, history and navigation events).
 *
 * @param {rhizo.state.Facets} facet The facet that changed.
 * @param {*} The facet-specific state to transition to.
 */
rhizo.Project.prototype.stateChanged = function(facet, facetState) {
  if (facet == rhizo.state.Facets.SELECTION_FILTER ||
      facet == rhizo.state.Facets.LAYOUT) {
    // TODO(battlehorse): remove once legacy setState() state management
    // is completely replaced by eventbus.
    throw("Should never receive a " + facet + " facet.");
  } else if (facet.indexOf(rhizo.state.Facets.FILTER_PREFIX) == 0) {
    var key = facet.substring(rhizo.state.Facets.FILTER_PREFIX.length);
    this.alignFilterUI_ (key, facetState);
    if (this.filterInternal_(key, facetState)) {
      // The filtering status of some models was affected by the filter.
      // Decide whether we need to reposition all models, or we can just grey
      // out the affected ones, without affecting layout.
      if (this.mustLayoutAfterFilter_()) {
        this.commitFilter();
      } else {
        this.alignVisibility(rhizo.ui.Visibility.GREY);
      }
    }
  }
};

/**
 * Applies or removes a filter to the visualization, removing from view (or
 * restoring) all the models that do not survive the filter.
 *
 * @param {string} key The metamodel key for the model attribute that is to
 *     filter.
 * @param {*} value The value that each model must have on the attribute
 *     specified by 'key' in order not to be removed. To remove a previously
 *     set filter, set value to null or undefined.
 */
rhizo.Project.prototype.filter = function(key, value) {
  if (this.filterInternal_(key, value)) {
    this.state_.pushFilterChange(key, value);
    // The filtering status of some models was affected by the filter.
    // Decide whether we need to reposition all models, or we can just grey
    // out the affected ones, without affecting layout.
    if (this.mustLayoutAfterFilter_()) {
      this.commitFilter();
    } else {
      this.alignVisibility(rhizo.ui.Visibility.GREY);
    }
  }
};

/**
 * Changes the filtering status of models because of a change in a filter
 * value.
 * @param {string} key The metamodel key for the model attribute that was
 *     filtered.
 * @param {*} value The filter value. Should be null or undefined when the
 *     filter is to be removed.
 * @return {boolean} Whether the filter status of some models was affected by
 *     this new filter value.
 * @private
 */
rhizo.Project.prototype.filterInternal_ = function(key, value) {
  if (!(key in this.metaModel_)) {
    // This may occur whenever we are applying a filter loaded from an
    // historical state, but which no longer exists in the current
    // visualization.
    return false;
  }
  if (value) {
    for (var i = this.models_.length-1; i >= 0; i--) {
      var model = this.models_[i];
      if (this.metaModel_[key].kind.survivesFilter(value, model.unwrap()[key])) {
        // matches filter. Doesn't have to be hidden
        model.resetFilter(key);
      } else {
        // do not matches filter. Must be hidden
        model.filter(key);
      }
    }
  } else {
    // reset filter
    if (!this.resetAllFilter(key)) {
      return false;  // no models had the filter, nothing to re-align, return early.
    }
  }
  this.alignFx();
  return true;
};

/**
 * Decides whether models should be repositioned after a filter was applied.
 * This may be necessary either because the filters are in autocommit mode, or
 * because the filter change caused some models that were completely hidden
 * to become visible (hence all the models must be repositioned to accomodate
 * these ones).
 *
 * @return {boolean} Whether models should be repositioned after a filter was
 *     applied, or it's enough to align their visibility.
 * @private
 */
rhizo.Project.prototype.mustLayoutAfterFilter_ = function() {
  if (this.filterAutocommit_) {
    return true;
  } else {
    for (var i = this.models_.length-1; i >=0; i--) {
      if (!this.models_[i].isFiltered() &&
          this.models_[i].rendering().visibility ==
              rhizo.ui.Visibility.HIDDEN) {
        return true;
      }
    }
    return false;
  }
};

rhizo.Project.prototype.commitFilter = function() {
  this.layoutManager_.forceLayout({filter: true});
};

/**
 * Updates the visualization UI to match the a given filter status.
 * @param {string} key The metamodel key whose associated filter is to restore
 *     to a given value.
 * @param {*} value The value the filter should be set to. The actual value type
 *     matches what the filter itself initially provided to the Project when
 *     project.filter() was called.
 * @private
 */
rhizo.Project.prototype.alignFilterUI_ = function(key, value) {
  // Verify whether the filter key (which may come from an historical state)
  // still exists in the metaModel.
  if (key in this.metaModel_) {
    // TODO(battlehorse): temporary check for presence of filter containers.
    // Remove once filter-related messages are propagated via eventbus.
    var filterUiExists =
        !!this.gui_.getComponent('rhizo.ui.component.FilterStackContainer') ||
        !!this.gui_.getComponent('rhizo.ui.component.FilterBookContainer');

    // Rebuild and show the affected filter, if needed.
    var ui = this.gui_.getComponent('rhizo.ui.component.FilterStackContainer');
    if (ui) {
      // A filter is explicitly made visible only if it's not in its default
      // non-filtering state (i.e., it has a non-null value).
      if (value) {
        ui.showFilter(key);
      }
      filterUiExists = ui.isFilterActive(key);
    }

    // Restore the filter value, if the filter currently has an UI
    // representation.
    if (filterUiExists) {
      this.metaModel_[key].kind.setFilterValue(value);
    }
  }
};

/**
 * Enables or disables project-wide animations.
 *
 * The decision is based on the number of models the browser has to manipulate
 * (move, hide, show, rescale ...). This includes:
 * - models that are currently visible,
 * - 'unfiltered' models (i.e. number of models that will be visible once
 *   alignVisibility() is invoked).
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
 * Refreshes models' visibility based on their filtering status.
 *
 * @param {rhizo.ui.Visibility?} opt_filtered_visibility An optional visibility
 *     level that filtered items should have. The default is
 *     rhizo.ui.Visibility.HIDDEN.
 */
rhizo.Project.prototype.alignVisibility = function(opt_filtered_visibility) {
  var vis = rhizo.ui.Visibility;
  var filtered_visibility = opt_filtered_visibility || vis.HIDDEN;

  var forceLayout = false;
  var modelsToFadeOut = [];
  var modelsToFadeIn = [];
  for (var i = this.models_.length-1; i >=0; i--) {
    var model = this.models_[i];
    var rendering = model.rendering();
    if (model.isFiltered()) {
      if (rendering.visibility > filtered_visibility) {
        modelsToFadeOut.push(model);
        rendering.visibility = filtered_visibility;
      }
    } else if (rendering.visibility < vis.VISIBLE) {
      // Items that were completely hidden must be repositioned.
      forceLayout = forceLayout || rendering.visibility == vis.HIDDEN;
      modelsToFadeIn.push(model);
      rendering.visibility = vis.VISIBLE;
    }
  }
  rhizo.ui.fadeAllRenderingsTo(modelsToFadeOut, filtered_visibility);
  rhizo.ui.fadeAllRenderingsTo(modelsToFadeIn, vis.VISIBLE);
  return forceLayout;
};
