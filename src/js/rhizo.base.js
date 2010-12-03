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

// Global project namespace
// RHIZODEP=rhizo,rhizo.log,rhizo.model,rhizo.ui,rhizo.layout,rhizo.state
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
  this.selectionMap_ = {};
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
  this.initializeLayoutEngines_();
  return true;
};

rhizo.Project.prototype.initializeLayoutEngines_ = function() {
  this.curLayoutName_ = 'flow'; // default layout engine
  this.layoutEngines_ = {};
  this.renderingPipeline_ = new rhizo.ui.RenderingPipeline(
      this, this.gui_.universe);
  for (var layoutName in rhizo.layout.layouts) {
    var engine = new rhizo.layout.layouts[layoutName](this);
    var enableEngine = true;
    if (engine.verifyMetaModel && !engine.verifyMetaModel(this.metaModel_)) {
      enableEngine = false;
    }
    if (enableEngine) {
      this.layoutEngines_[layoutName] = engine;
    }
  }
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
  var initialStateRebuilt = rhizo.state.getMasterOverlord().attachProject(
      this, bindings);
  this.state_ = rhizo.state.getMasterOverlord().projectBinder(this);
  if (!initialStateRebuilt) {
    // The state overlord is not aware of any initial state, so we initialize
    // the visualization using defaults. No state is pushed.
    this.layoutInternal_(this.curLayoutName_, {forcealign: true});
  }
  // re-aligning animation settings
  this.alignFx();
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

rhizo.Project.prototype.metaModel = function() {
  return this.metaModel_;
};

rhizo.Project.prototype.setMetaModel = function(metaModel) {
  this.metaModel_ = metaModel;

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
  this.renderer_ = renderer;
};

rhizo.Project.prototype.gui = function() {
  return this.gui_;
};

rhizo.Project.prototype.logger = function() {
  return this.logger_;
};

rhizo.Project.prototype.layoutEngines = function() {
  return this.layoutEngines_;
};

rhizo.Project.prototype.currentLayoutEngineName = function() {
  return this.curLayoutName_;
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

rhizo.Project.prototype.select = function(id) {
  var ids = this.extendSelection_(id);
  for (var i = ids.length-1; i >=0; i--) {
    var supermodel = this.model(ids[i]);
    this.selectionMap_[ids[i]] = supermodel;
    supermodel.setSelected(true);
  }
};

rhizo.Project.prototype.unselect = function(id) {
  var ids = this.extendSelection_(id);
  for (var i = ids.length-1; i >=0; i--) {
    this.unselectInternal_(ids[i]);
  }
};

rhizo.Project.prototype.toggleSelect = function(id) {
  if (this.isSelected(id)) {
    this.unselect(id);
  } else {
    this.select(id);
  }
};

rhizo.Project.prototype.unselectAll = function() {
  // We don't have to care about selection extension when unselecting
  // everything.
  for (id in this.selectionMap_) {
    this.unselectInternal_(id);
  }
};

rhizo.Project.prototype.unselectInternal_ = function(id) {
  var supermodel = this.model(id);
  this.selectionMap_[id] = null;
  delete this.selectionMap_[id];
  supermodel.setSelected(false);
};

rhizo.Project.prototype.isSelected = function(id) {
  return this.selectionMap_[id];
};

rhizo.Project.prototype.allSelected = function() {
  return this.selectionMap_;
};

rhizo.Project.prototype.allUnselected = function() {
  var selectionMap = this.selectionMap_;
  return $.grep(this.models_, function(superModel) {
    return !selectionMap[superModel.id];
  });
};

/**
 * Removes all the unselected models from user view, filtering them out.
 * @return {number} The number of models that have been hidden from view.
 */
rhizo.Project.prototype.filterUnselected = function() {
  var countSelected = 0;
  for (var id in this.selectionMap_) { countSelected++; }
  if (countSelected == 0) {
    this.logger_.error("No items selected");
    return 0;
  }

  var modelsToFilter = [];
  for (var id in this.modelsMap_) {
    if (!(id in this.selectionMap_)) {
      modelsToFilter.push(id);
    }
  }

  this.state_.pushFilterSelectionChange(modelsToFilter);
  this.updateSelectionFilter_(modelsToFilter);
  this.layoutInternal_(this.curLayoutName_, {filter: true, forcealign: true});

  return modelsToFilter.length;
};

/**
 * Restores any models that were filtered out via selection.
 */
rhizo.Project.prototype.resetUnselected = function() {
  var countFiltered = 0;
  for (var i = this.models_.length - 1; i >= 0; i--) {
    if (this.models_[i].isFiltered('__selection__')) {
      countFiltered++;
    }
  }
  if (countFiltered == 0) {
    return;  // Nothing is filtered out because of previous selections.
  }
  this.state_.pushFilterSelectionChange(null);
  this.updateSelectionFilter_(null);
  this.layoutInternal_(this.curLayoutName_, {filter: true, forcealign: true});
};

/**
 * Assigns or removes the selection filter from a set of models.
 *
 * Note that the modelsToFilter set may come from historical visualization
 * state, so it may contain references to model ids that are no longer part of
 * the current visualization.
 *
 * @param {Array.<*>} modelsToFilter Array of ids for all the models that should
 *     be filtered out. If null, no model should be filtered out.
 * @private
 */
rhizo.Project.prototype.updateSelectionFilter_ = function(modelsToFilter) {
  modelsToFilter = modelsToFilter || [];
  if (modelsToFilter.length > 0) {
    var modelsToFilterMap = {}; 
    for (var i = modelsToFilter.length-1; i >= 0; i--) {
      modelsToFilterMap[modelsToFilter[i]] = true;
    }

    // Transfer selection status to a filter.
    for (var i = this.models_.length-1; i >= 0; i--) {
     if (this.models_[i].id in modelsToFilterMap) {
      this.models_[i].filter('__selection__');  // hard-coded filter key.
     } else {
       this.models_[i].resetFilter('__selection__');
     }
    }
    this.unselectAll();
  } else {
    this.resetAllFilter('__selection__');
  }
  // after changing the filter status of some elements, recompute fx settings.
  this.alignFx();
};

/**
 * If the current layout supports it, ask it to extend a model selection.
 * The layout may be aware of relationships between models (such as hierarchies)
 * so that selecting a model should trigger the selection of dependent ones.
 *
 * @param {string} id The id of the model whose selection state changed.
 * @return {Array.<string>} An array of model ids (including the input one) that
 *     are dependent on the input one.
 * @private
 */
rhizo.Project.prototype.extendSelection_ = function(id) {
  var layoutEngine = this.layoutEngines_[this.curLayoutName_];
  if (layoutEngine.dependentModels) {
    var idsToSelect = layoutEngine.dependentModels(id);
    idsToSelect.push(id);
    return idsToSelect;
  }
  return [id];
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
  var layoutName = this.curLayoutName_;
  var filter = false;
  var customModelPositions = null;

  // When restoring a full state, all facets should be reverted to their default
  // value. Here we set correct defaults for any facet which might be missing
  // from the full state specification.
  if (!(rhizo.state.Facets.SELECTION_FILTER in state)) {
    state[rhizo.state.Facets.SELECTION_FILTER] = [];
  }
  for (var key in this.metaModel_) {
    var facet = rhizo.state.Facets.FILTER_PREFIX + key;
    if (!(facet in state)) {
      state[facet] = null;
    }
  }

  for (var facet in state) {
    if (facet == rhizo.state.Facets.SELECTION_FILTER) {
      filter = true;
      var filteredModels = state[facet] || [];
      this.updateSelectionFilter_(filteredModels);
      this.alignSelectionUI_(filteredModels.length);
    } else if (facet == rhizo.state.Facets.LAYOUT) {
      var layoutState = state[facet];
      layoutName = layoutState ? layoutState.layoutName : 'flow';
      this.alignLayout_(layoutName, layoutState);
      customModelPositions = layoutState.positions;
    } else if (facet.indexOf(rhizo.state.Facets.FILTER_PREFIX) == 0) {
      filter = true;
      var key = facet.substring(rhizo.state.Facets.FILTER_PREFIX.length);
      var value = state[facet];
      this.alignFilterUI_(key, value);

      // We do not care whether the filter requires a re-layout or not, since
      // layout will happen anyway. This will also purge any greyed-out models.
      this.filterInternal_(key, value);
    }
  }
  this.layoutInternal_(layoutName, {filter: filter, forcealign: true});
  // If the state contained custom model positions, restore them _after_
  // having performed layout.
  if (customModelPositions) {
    this.moveModels_(customModelPositions);
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
  if (facet == rhizo.state.Facets.SELECTION_FILTER) {
    var filteredModels = facetState || [];
    this.updateSelectionFilter_(filteredModels);
    this.alignSelectionUI_(filteredModels.length);
    this.layoutInternal_(this.curLayoutName_,
                         {filter: true, forcealign: true});
  } else if (facet == rhizo.state.Facets.LAYOUT) {
    var layoutName = facetState ? facetState.layoutName : 'flow';
    this.alignLayout_(layoutName, facetState);
    this.layoutInternal_(layoutName);
    if (facetState && facetState.positions) {
      this.moveModels_(facetState.positions);
    }
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
        this.alignVisibility_(rhizo.ui.Visibility.GREY);
      }
    }
  }
};

/**
 * Notifies the project that a set of models has been explicitly moved by the
 * user to a different position.
 *
 * @param {Array.<*>} positions An array of all model positions that changed.
 *     Each entry is a key-value map with the following properties: 'id', the
 *     id of the model that moved, 'top': the ending top coordinate of the
 *     top-left model corner with respect to the visualization universe,
 *     'left', the ending left coordinate of the top-left model corner with
 *     respect to the visualization universe.
 */
rhizo.Project.prototype.modelsMoved = function(positions) {
  var layoutState = null;
  if (this.layoutEngines_[this.curLayoutName_].getState) {
    layoutState = this.layoutEngines_[this.curLayoutName_].getState();
  }
  this.state_.pushLayoutChange(this.curLayoutName_, layoutState, positions);
};

/**
 * Moves a set of models to the requested positions.
 *
 * @param {Array.<*>} positions An array of all model positions that changed.
 *     See modelsMoved() for the expected format of the array entries.
 * @private
 */
rhizo.Project.prototype.moveModels_ = function(positions) {
  for (var i = positions.length-1; i >= 0; i--) {
    if (positions[i].id in this.modelsMap_) {
      this.modelsMap_[positions[i].id].rendering().move(
          positions[i].top, positions[i].left);
    }
  }
};

/**
 * Re-arranges the disposition of the project models according to the
 * requested layout algorithm.
 *
 * @param {?string} opt_layoutEngineName The name of the layout engine to use.
 *     If undefined, the last known engine will be used.
 * @param {*} opt_state The state the layout should be set to. The layout state
 *     describes the set of layout-specific parameters. If undefined, the
 *     current (possibly default) state the layout has will be used.
 * @param {*} opt_options An optional key-value map of layout directives.
 *    Currently supported ones include:
 *    - 'filter' (boolean): Whether this layout operation is invoked as a result
 *      of a filter being applied.
 *    - 'forcealign' (boolean): Whether models' visibility should be synced at
 *      the end of the layout operation.
 * @return {boolean} Whether the layout operation completed successfully.
 */
rhizo.Project.prototype.layout = function(opt_layoutEngineName,
                                          opt_state,
                                          opt_options) {
  if (opt_layoutEngineName) {
    if (!(opt_layoutEngineName in this.layoutEngines_)) {
      this.logger_.error("Invalid layout engine:" + opt_layoutEngineName);
      return false;
    }
  }

  var layoutName = opt_layoutEngineName || this.curLayoutName_;
  var layoutEngine = this.layoutEngines_[layoutName];

  var layoutState = null;
  if (opt_state) {
    if (!this.alignLayout_(layoutName, opt_state)) {
      this.logger_.error('Received invalid layout state');
      return false;
    }
    layoutState = opt_state;
  } else if (layoutEngine.getState) {
    layoutState = layoutEngine.getState();
  }
  this.state_.pushLayoutChange(layoutName, layoutState);
  this.layoutInternal_(opt_layoutEngineName || this.curLayoutName_,
                       opt_options);
  return true;
};

/**
 * Internal version of layout that doesn't deal with state management.
 * @param {string} layoutEngineName The name of the layout engine to use.
 * @param {*} opt_options An optional Key-value map of layout directives. See
 *    the documentation for layout().
 * @private
 */
rhizo.Project.prototype.layoutInternal_ = function(layoutEngineName,
                                                   opt_options) {
  var lastLayoutEngine = this.layoutEngines_[this.curLayoutName_];
  var options = $.extend({}, opt_options, this.options_);

  // Update the name of the current engine.
  this.curLayoutName_ = layoutEngineName;
  var layoutEngine = this.layoutEngines_[this.curLayoutName_];

  var dirty = false;
  if (lastLayoutEngine && lastLayoutEngine.cleanup) {
    // cleanup previous layout engine.
    dirty = lastLayoutEngine.cleanup(
        lastLayoutEngine == layoutEngine, options) || dirty;
  }

  this.renderingPipeline_.cleanup();
  if (lastLayoutEngine != layoutEngine) {
    // Restore all models to their original sizes and styles, if we are moving
    // to a different layout engine.
    this.renderingPipeline_.backupManager().restoreAll();
  }

  this.logger_.info('laying out...');

  // reset panning
  this.gui_.universe.move(0, 0, {'bottom': 0, 'right': 0});

  // layout only non filtered models
  var freeModels = jQuery.grep(this.models_, function(model) {
    return model.isAvailableForLayout();
  });

  var boundingLayoutBox = new rhizo.layout.LayoutBox(
      this.gui_.viewport, this.options_.layoutConstraints);
  dirty = layoutEngine.layout(this.renderingPipeline_,
                              boundingLayoutBox,
                              freeModels,
                              this.modelsMap_,
                              this.metaModel_,
                              options) || dirty;
  var resultLayoutBox = this.renderingPipeline_.apply();
  this.gui_.universe.css({
      'width': Math.max(resultLayoutBox.width + resultLayoutBox.left,
                        this.gui_.viewport.width()),
      'height': Math.max(resultLayoutBox.height + resultLayoutBox.top,
                         this.gui_.viewport.height())}).
      move(0, 0);
  if (dirty || options.forcealign) {
    this.alignVisibility_();
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
      this.alignVisibility_(rhizo.ui.Visibility.GREY);
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
  this.layoutInternal_(this.curLayoutName_, {filter: true, forcealign: true});
};

/**
 * Updates the UI and state of the layout engine to match the requested one.
 *
 * The layout selector component, if available, is updated to match the
 * currently selected layout engine. The layout engine itself receives the
 * updated state (which in turn triggers the update of layout UI controls).
 *
 * @param {string} layoutName The currently selected layout engine.
 * @param {*} layoutState The layout state, as returned from its getState()
 *     method.
 * @return {boolean} Whether the operation was successful or errors occurred
 *     because of a malformed input layoutState.
 * @private
 */
rhizo.Project.prototype.alignLayout_ = function(layoutName, layoutState) {
  var success = true;
  if (this.layoutEngines_[layoutName].setState) {
    success = this.layoutEngines_[layoutName].setState(layoutState);
  }
  if (success) {
    var ui = this.gui_.getComponent('rhizo.ui.component.Layout');
    if (ui) {
      ui.setEngine(layoutName);
    }
  }
  return success;
};

/**
 * Updates the visualization UI to match the current selection status.
 * @param {number} numFilteredModels The number of models that have been
 *     filtered out as a result of selection operations.
 * @private
 */
rhizo.Project.prototype.alignSelectionUI_ = function(numFilteredModels) {
  var ui = this.gui_.getComponent('rhizo.ui.component.SelectionManager');
  if (ui) {
    ui.setNumFilteredModels(numFilteredModels);
  }
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
    var filterUiExists = true;

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
 *   alignVisibility_() is invoked).
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
 * @param {rhizo.ui.Visibility?} opt_filtered_visibility An optional visibility
 *     level that filtered items should have. The default is
 *     rhizo.ui.Visibility.HIDDEN.
 * @private
 */
rhizo.Project.prototype.alignVisibility_ = function(opt_filtered_visibility) {
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
