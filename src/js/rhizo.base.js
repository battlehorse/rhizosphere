/*
  Copyright 2008 Riccardo Govoni battlehorse@gmail.com

  Licensed under the Apache License, Version 2.0 (the &quot;License&quot;);
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an &quot;AS IS&quot; BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

// Global project namespace
// RHIZODEP=rhizo,rhizo.log,rhizo.model,rhizo.ui,rhizo.layout
namespace("rhizo");

rhizo.Project = function(gui, opt_options) {
  this.models_ = [];
  this.modelsMap_ = {};
  this.selectionMap_ = {};
  this.options_ = opt_options || {};
  this.gui_ = gui;

  if (rhizo.nativeConsoleExists()) {
    this.logger_ = new rhizo.NativeLogger();
  } else {
    this.logger_ = new rhizo.NoOpLogger();
  }

  this.initializeLayoutEngines_();
};

rhizo.Project.prototype.initializeLayoutEngines_ = function() {
  this.curLayoutName_ = 'flow'; // default layout engine
  this.layoutEngines_ = {};
  for (var layoutName in rhizo.layout.layouts) {
    this.layoutEngines_[layoutName] = new rhizo.layout.layouts[layoutName](this);
  }
};

rhizo.Project.prototype.chromeReady = function() {
  // All the static UI components are in place. This might include the
  // logging console.
  if (this.gui_.getComponent('rhizo.ui.component.Console')) {
    this.logger_ = new rhizo.Logger(this.gui_);
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
    this.models_[i] = new rhizo.model.SuperModel(models[i],
                                                 this.renderer_);
  }

  // model loading and rendering
  if (!this.checkModels_()) {
    return false;
  }

  this.buildModelsMap_();
  return true;
};

rhizo.Project.prototype.finalizeUI_ = function() {
  if (!this.initializeRenderings_()) {
    return;
  }

  // Detect whether SuperModels should cache dimensions. If so, do an initial
  // caching pass.
  var cacheDimensions = rhizo.ui.canCacheDimensions(this.renderer_,
                                                    this.options_);
  if (cacheDimensions) {
    for (var i = this.models_.length-1; i >= 0; i--) {
      this.models_[i].setDimensionCaching(cacheDimensions);
      this.models_[i].refreshCachedDimensions();
    }
  }

  // We manually disable animations for the initial layout (the browser is
  // already busy creating the whole dom).
  jQuery.fx.off = true;

  // laying out models
  this.layout(this.curLayoutName_);

  // showing elements and re-aligning animation settings
  this.alignVisibility(true);
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

rhizo.Project.prototype.resetAllFilter = function(key) {
  for (var i = this.models_.length-1; i >= 0; i--) {
    this.models_[i].resetFilter(key);
  }
};

rhizo.Project.prototype.select = function(id) {
  var ids = this.extendSelection_(id);
  for (var i = ids.length-1; i >=0; i--) {
    var supermodel = this.model(ids[i]);
    this.selectionMap_[ids[i]] = supermodel;
    supermodel.selected = true;
    supermodel.rendering.addClass('ui-selected');
  }
};

rhizo.Project.prototype.unselect = function(id) {
  var ids = this.extendSelection_(id);
  for (var i = ids.length-1; i >=0; i--) {
    this.unselectInternal_(ids[i]);
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
  supermodel.selected = false;
  supermodel.rendering.removeClass('ui-selected');
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

rhizo.Project.prototype.initializeRenderings_ = function() {
  var allRenderings = [];
  for (var i = 0;  i < this.models_.length; i++) {
    rhizo.ui.render(this.models_[i], this.renderer_, allRenderings,
                    this.options_);
  }
  if (allRenderings.length == 0) {
    this.logger_.error("No renderings.");
    return false;
  }

  var numModels = this.models_.length;
  if (typeof allRenderings[0] == 'string') {
    // The project renderer returns raw strings.
    //
    // We concatenate everything together and add it to the DOM in a single
    // pass. We then identify back all the single renderings and bind them
    // to the model they belong to.
    this.gui_.universe.append(allRenderings.join(''));
    this.gui_.universe.find('.rhizo-model').each(jQuery.proxy(
        function(renderingIdx, rendering) {
          var model = this.models_[renderingIdx];
          model.rendering = $(rendering);
          model.naked_render = model.rendering.children();
        }, this));
  } else {
    // The project renderer returns jQuery objects.
    //
    // We append them to the DOM one at a time and assign them to their model.
    for (var i = 0; i < this.models_.length; i++) {
      this.models_[i].rendering = allRenderings[i];
      this.models_[i].naked_render = this.models_[i].rendering.children();
      allRenderings[i].appendTo(this.gui_.universe);
    }
  }

  // Sanity check
  var renderings = this.gui_.universe.find('.rhizo-model');
  if (renderings.length != this.models_.length) {
    this.logger_.error('The number of renderings and models differ: ' +
                       renderings.length + ' vs ' + this.models_.length);
    return false;
  }

  // Decorate each rendering.
  rhizo.ui.decorateRendering(renderings,
                             this.models_,
                             this,
                             this.renderer_,
                             this.options_);
  return true;
};

rhizo.Project.prototype.layout = function(opt_layoutEngineName, opt_options) {
  var lastLayoutEngine = this.layoutEngines_[this.curLayoutName_];
  var options = $.extend({}, opt_options, this.options_);

  // Update the name of the current engine.
  if (opt_layoutEngineName) {
    this.curLayoutName_ = opt_layoutEngineName;
  }
  var layoutEngine = this.layoutEngines_[this.curLayoutName_];
  if (!layoutEngine) {
    this.logger_.error("Invalid layout engine:" + this.curLayoutName_);
    return;
  }

  if (lastLayoutEngine && lastLayoutEngine.cleanup) {
    // cleanup previous layout engine.
    lastLayoutEngine.cleanup(lastLayoutEngine == layoutEngine,
                             options);
  }

  this.logger_.info('laying out...');

  // reset panning
  this.gui_.universe.move(0, 0, {'bottom': 0, 'right': 0});

  // layout only non filtered models
  var nonFilteredModels = jQuery.grep(this.models_, function(model) {
    return !model.isFiltered();
  });
  layoutEngine.layout(this.gui_.universe,
                      nonFilteredModels,
                      this.modelsMap_,
                      this.metaModel_,
                      options);
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
    this.resetAllFilter(key);
  }

  // after filtering some elements, perform layout again
  this.layout(null, { filter: true});

  // hide/show filtered elements
  this.alignVisibility();
};

rhizo.Project.prototype.alignVisibility = function(opt_delayCount) {
  // adjust the number of currently shown models.
  // This number affects performance choices.
  // Fade out is done _before_ changing performance settings
  var numShownModels = 0;
  var renderingsToFade = [];
  for (var i = this.models_.length-1; i >=0; i--) {
    if (this.models_[i].isFiltered()) {
      renderingsToFade.push(this.models_[i].rendering.get(0));
    } else {
      numShownModels += 1;
    }
  }
  $(renderingsToFade).fadeOut();

  if (!opt_delayCount) {
    jQuery.fx.off = this.options_.noAnims || numShownModels > 200;
  }

  // fade in all the affected elements according to current filter status
  // fade in is done _after_ changing performance settings, unless explicit
  // delay has been requested.
  renderingsToFade = [];
  for (var i = this.models_.length-1; i >= 0; i--) {
    if (!this.models_[i].isFiltered()) {
      renderingsToFade.push(this.models_[i].rendering.get(0));
    }
  }
  $(renderingsToFade).fadeIn();

  if (opt_delayCount) {
    jQuery.fx.off = this.options_.noAnims || numShownModels > 200;
  }
};
