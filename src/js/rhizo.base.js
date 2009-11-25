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

$p = null;
rhizo.Project = function(opt_options) {
  this.models_ = [];

  this.modelsMap_ = {};
  this.selectionMap_ = {};

  this.layoutName_ = 'flow'; // default layout engine
  this.layouEngine_ = null;
  this.options_ = opt_options || {};
  $p = this;
};

rhizo.Project.prototype.deploy = function(opt_models) {
  if (opt_models && this.addModels_(opt_models)) {
    this.finalizeUI_();
  }
  rhizo.log("*** Ready!");
};

rhizo.Project.prototype.addModels_ = function(models) {
  // wrap each model into a SuperModel
  this.models_ = jQuery.map(models, function(model) {
    return new rhizo.model.SuperModel(model);
  });

  // model loading and rendering
  if (!this.checkModels_()) {
    return false;
  }

  this.buildModelsMap_();
  this.models_.forEach(this.initializeModel_, this);
  return true;
};

rhizo.Project.prototype.finalizeUI_ = function() {
  // Once the models are rendered, bind events that require rendered
  // DOM elements to be present, such as the maximize icon.
  rhizo.ui.initExpandable(this.renderer_, this.options_);

  // We manually disable animations for the initial layout (the browser is
  // already busy creating the whole dom).
  jQuery.fx.off = true;

  // laying out models
  this.layout(this.layoutName_);

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

rhizo.Project.prototype.resetAllFilter = function(key) {
  this.models_.forEach(function(model) {
    model.resetFilter(key);
  });
}

rhizo.Project.prototype.select = function(id) {
  var supermodel = this.model(id);
  this.selectionMap_[id] = supermodel;
  supermodel.selected = true;
  $('#' + id).addClass('ui-selected');

  rhizo.log("Selected " + supermodel);
};

rhizo.Project.prototype.unselect = function(id) {
  var supermodel = this.model(id);
  this.selectionMap_[id] = null;
  delete this.selectionMap_[id];
  supermodel.selected = false;
  $('#' + id).removeClass('ui-selected');
  rhizo.log("Unselected " + supermodel);
};

rhizo.Project.prototype.unselectAll = function() {
  for (id in this.selectionMap_) {
    this.unselect(id);
  }
};

rhizo.Project.prototype.isSelected = function(id) {
  return this.selectionMap_[id];
};

rhizo.Project.prototype.allSelected = function() {
  return this.selectionMap_;
};

rhizo.Project.prototype.allUnselected = function() {
  return $.grep(this.models_, function(superModel) {
    return !$p.selectionMap_[superModel.id];
  });
};

/**
   Enables or disables models selection.

   @param {string} status either 'enable' or 'disable'
 */
rhizo.Project.prototype.toggleSelection = function(status) {
  $('#rhizo-viewport').selectable(status);
};

rhizo.Project.prototype.checkModels_ = function() {
  rhizo.log("Checking models...");
  var modelsAreCorrect = true;
  this.models_.forEach(function(model){
    if (!model.id) {
      modelsAreCorrect = false;
      rhizo.error("Verify your models: missing ids.")
    }
  });
  return modelsAreCorrect;
};

rhizo.Project.prototype.buildModelsMap_ = function() {
  rhizo.log("Building models map...");
  this.models_.forEach(function(model) {
    this.modelsMap_[model.id] = model;
  }, this);
};

rhizo.Project.prototype.initializeModel_ = function(model) {
  var rendering = rhizo.model.kickstart(model,
                                        this.renderer_,
                                        this.options_);

  // initial positioning in the DOM and layout
  $(rendering).css("position", "absolute")
              .css("top", 0)
              .css("left", 0)
              .css("display", "none");

  $("#rhizo-universe").append(rendering);
};

rhizo.Project.prototype.layout = function(opt_layoutEngineName, opt_options) {
  var layoutEngineName = opt_layoutEngineName ?
                         opt_layoutEngineName : this.layoutName_;
  var engine = rhizo.layout.layouts[layoutEngineName];
  if (!engine) {
    rhizo.error("Invalid layout engine:" + layoutEngineName);
  } else {
    rhizo.log('laying out...');
    if (this.layoutEngine_ && this.layoutEngine_.cleanup) {
      this.layoutEngine_.cleanup(); // cleanup previous layout engine
    }

    this.layoutName_ = layoutEngineName;
    this.layoutEngine_ = engine;

    // reset panning
    $('#rhizo-universe').move(0, 0, 0, 0);

    // layout only non filtered models
    var nonFilteredModels = jQuery.grep(this.models_, function(model) {
      return !model.isFiltered();
    });
    engine.layout('#rhizo-universe',
                  nonFilteredModels,
                  this.metaModel_,
                  opt_options);
  }
};

rhizo.Project.prototype.filter = function(key, value) {
  if (!this.metaModel_[key]) {
    rhizo.error("Invalid filtering key: " + key);
  }
  if (value != '') {
    this.models_.forEach(function(model) {
      if (this.metaModel_[key].kind.survivesFilter(value, model.unwrap()[key])) {
        // matches filter. Doesn't have to be hidden
        model.resetFilter(key);
      } else {
        // do not matches filter. Must be hidden
        model.filter(key);
      }
    }, this);
  } else {
    // reset filter
    this.models_.forEach(function(model) {
      model.resetFilter(key);
    });
  }

  // hide/show filtered elements
  this.alignVisibility();

  // after filtering some elements, perform layout again
  this.layout(null, { filter: true});
};

rhizo.Project.prototype.alignVisibility = function(opt_delayCount) {
  // adjust the number of currently shown models.
  // This number affects performance choices.
  // Fade out is done _before_ changing performance settings
  var numShownModels = 0;
  this.models_.forEach(function(model) {
    numShownModels += model.isFiltered() ? 0 : 1;
    if (model.isFiltered()) {
      $('#' + model.id).fadeOut();
    }
  });

  if (!opt_delayCount) {
    jQuery.fx.off = this.options_.noAnims || numShownModels > 200;
  }

  // fade in all the affected elements according to current filter status
  // fade in is done _after_ changing performance settings, unless explicit
  // delay has been requested.
  this.models_.forEach(function(model) {
    if (!model.isFiltered()) {
      $('#' + model.id).fadeIn();
    }
  });

  if (opt_delayCount) {
    jQuery.fx.off = this.options_.noAnims || numShownModels > 200;
  }
};
