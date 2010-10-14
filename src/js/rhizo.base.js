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
  this.initializeLayoutEngines_();
};

rhizo.Project.prototype.initializeLayoutEngines_ = function() {
  this.curLayoutName_ = 'flow'; // default layout engine
  this.layoutEngines_ = {};
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

  // rebuild visualization state, either from defaults or from history.
  var initialStateRebuilt = rhizo.state.getMasterOverlord().attachProject(
      this, [rhizo.state.Bindings.HISTORY]);
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

rhizo.Project.prototype.filterUnselected = function() {
  var countSelected = 0;
  for (var id in this.selectionMap_) { countSelected++; }
  if (countSelected == 0) {
    this.logger_.error("No items selected");
    return 0;
  }

  var allUnselected = this.allUnselected();
  var countFiltered = 0;
  for (var id in allUnselected) {
    allUnselected[id].filter("__selection__"); // hard-coded keyword
    countFiltered++;
  }

  // after filtering some elements, perform layout again
  this.alignFx();
  this.layoutInternal_(this.curLayoutName_, {filter: true, forcealign: true});
  this.unselectAll();
  return countFiltered;
};

rhizo.Project.prototype.resetUnselected = function() {
  if (!this.resetAllFilter("__selection__")) {
    return;
  }
  // after filtering some elements, perform layout again
  this.alignFx();
  this.layoutInternal_(this.curLayoutName_, {filter: true, forcealign: true});
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

rhizo.Project.prototype.checkModels_ = function() {
  this.logger_.info("Checking models...");
  var modelsAreCorrect = true;
  for (var i = this.models_.length-1; i >= 0; i--) {
    if (!this.models_[i].id) {
      modelsAreCorrect = false;
      this.logger_.error("Verify your models: missing ids.");
    }
  }
  return modelsAreCorrect;
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
  if (rhizo.state.Facets.LAYOUT in state) {
    this.stateChanged(rhizo.state.Facets.LAYOUT,
                      state[rhizo.state.Facets.LAYOUT]);
  }
  this.alignVisibility_();
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
  switch(facet) {
    case rhizo.state.Facets.LAYOUT:
      var layoutName = facetState ? facetState.layoutName : 'flow';
      this.gui_.getComponent('rhizo.ui.component.Layout').setEngine(layoutName);
      if (this.layoutEngines_[layoutName].setState) {
        this.layoutEngines_[layoutName].setState(facetState);
      }
      this.layoutInternal_(layoutName);
      break;
    default:
      this.logger_.error('Unknown state change: ' + facet);
  }
};

/**
 * Re-arranges the disposition of the project models according to the
 * requested layout algorithm.
 *
 * @param {?string} opt_layoutEngineName The name of the layout engine to use.
 *     If undefined, the last known engine will be used.
 * @param {*} opt_options An optional key-value map of layout directives.
 *    Currently supported ones include:
 *    - 'filter' (boolean): Whether this layout operation is invoked as a result
 *      of a filter being applied.
 *    - 'forceAlign' (boolean): Whether models' visibility should be synced at
 *      the end of the layout operation.
 */
rhizo.Project.prototype.layout = function(opt_layoutEngineName, opt_options) {
  if (opt_layoutEngineName) {
    if (!(opt_layoutEngineName in this.layoutEngines_)) {
      this.logger_.error("Invalid layout engine:" + opt_layoutEngineName);
      return;
    }
  }

  var layoutName = opt_layoutEngineName || this.curLayoutName_;
  var layoutState = null;
  if (this.layoutEngines_[layoutName].getState) {
    layoutState = this.layoutEngines_[layoutName].getState();
  }
  this.state_.pushLayoutChange(layoutName, layoutState);
  this.layoutInternal_(opt_layoutEngineName || this.curLayoutName_,
                       opt_options);
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

  this.logger_.info('laying out...');

  // reset panning
  this.gui_.universe.move(0, 0, {'bottom': 0, 'right': 0});

  // layout only non filtered models
  var nonFilteredModels = jQuery.grep(this.models_, function(model) {
    return !model.isFiltered();
  });
  dirty = layoutEngine.layout(this.gui_.universe,
                              nonFilteredModels,
                              this.modelsMap_,
                              this.metaModel_,
                              options) || dirty;
  if (dirty || options.forcealign) {
    this.alignVisibility_();
  }
};

rhizo.Project.prototype.filter = function(key, value) {
  if (!this.metaModel_[key]) {
    this.logger_.error("Invalid filtering key: " + key);
  }
  if (value != '') {
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
      return;  // no models had the filter, nothing to re-align, return early.
    }
  }
  this.alignFx();

  if (this.filterAutocommit_) {
    // after filtering some elements, perform layout again
    this.commitFilter();
  } else {
    // Even if we are not autocommiting the filter, we are force to do so if
    // items that were completely hidden now become visible and must be
    // repositioned.
    var forceLayout = false;
    for (var i = this.models_.length-1; i >=0; i--) {
      if (!this.models_[i].isFiltered() &&
          this.models_[i].rendering().visibility ==
              rhizo.ui.Visibility.HIDDEN) {
        forceLayout = true;
        break;
      }
    }
    if (!forceLayout) {
      this.alignVisibility_(rhizo.ui.Visibility.GREY);
    } else {
      this.commitFilter();
    }
  }
};

rhizo.Project.prototype.commitFilter = function() {
  this.layoutInternal_(null, {filter: true, forcealign: true});
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
  this.gui_.disableFx(this.options_.noAnims ||
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
