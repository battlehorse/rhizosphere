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

// RHIZODEP=rhizo.ui
namespace("rhizo.model");

rhizo.model.SuperModel = function(model, opt_selected, opt_filtered) {
  this.model = model;
  this.id = model.id;
  this.selected = opt_selected || false;
  this.filters_ = {}; // a map of filter status, one for each model key
  this.rendering = null;
  this.expanded = false; // whether the rendering is expanded or not

  this.rendererRescaler_ = null;
  this.rendererStyleChanger_ = null;
  this.cachedDimensions_ = {};
};

rhizo.model.SuperModel.prototype.unwrap = function() {
  return this.model;
};

rhizo.model.SuperModel.prototype.toString = function() {
  return this.model.toString();
};

rhizo.model.SuperModel.prototype.isFiltered = function(opt_key) {
  if (opt_key) {
    return this.filters_[opt_key] || false;
  } else {
    var countFilters = 0;
    for (key in this.filters_) { countFilters++;}
    return countFilters != 0;
  }
};

rhizo.model.SuperModel.prototype.filter = function(key) {
  this.filters_[key] = true;
};

rhizo.model.SuperModel.prototype.resetFilter = function(key) {
  delete this.filters_[key];
};

rhizo.model.SuperModel.prototype.setRendererRescaler = function(rescaler) {
  this.rendererRescaler_ = rescaler;
};

rhizo.model.SuperModel.prototype.rescaleRendering = function(
    width, height, opt_failure_callback) {
  // The rendering is guaranteed to be marginless and paddingless, with a
  // 1px border (unless someone tampers the .rhizo-model class), so we
  // programmatically know that internal dimensions need to be resized
  // to a smaller extent (exactly 2px less).
  //
  // If internal width/height falls to 0px we bail out.
  if (width <= 2 || height <= 2) {
    if (opt_failure_callback) {
      opt_failure_callback();
    }
    return false;
  }
  this.cachedDimensions_ = {width: width, height: height};

  // TODO(battlehorse): should rescaling be animated?
  this.rendering.width(width - 2).height(height - 2);
  if (this.rendererRescaler_) {
    // Give the original model renderer a chance to rescale the naked render,
    // if a rescaler has been defined.
    //
    // Like this method, the rescaler too receives outer dimensions.
    this.rendererRescaler_(width - 2, height - 2);
  }
  return true;
};

rhizo.model.SuperModel.prototype.setRendererStyleChanger = function(
    styleChanger) {
  this.rendererStyleChanger_ = styleChanger;
};

rhizo.model.SuperModel.prototype.setNakedCss = function(props) {
  if (typeof props != 'object') {
    throw 'setNakedCss() expects a map of properties.';
  }
  if (this.rendererStyleChanger_) {
    this.rendererStyleChanger_(props);
  } else {
    this.rendering.children('.rhizo-naked-render').css(props);
  }
};

rhizo.model.SuperModel.prototype.nakedCss = function(propName) {
  if (typeof propName != 'string') {
    throw 'nakedCss() expects a string of the property to access.';
  }
  return this.rendering.children('.rhizo-naked-render').css(propName);
};

rhizo.model.SuperModel.prototype.refreshCachedDimensions = function() {
  if (this.rendering) {
    this.cachedDimensions_ = {
      width: this.rendering.width(),
      height: this.rendering.height()
    };
  }
};

rhizo.model.SuperModel.prototype.getCachedDimensions = function() {
  return this.cachedDimensions_;
};


rhizo.model.kickstart = function(model, project, renderer, opt_options) {
  var rendering = $('<div class="rhizo-model"></div>');
  rhizo.ui.reRender(
      renderer, rendering,
      model.unwrap(), // rendered expects the naked model
      model.expanded, // initial expansion status, dictated by the SuperModel
      opt_options);

  // Add the maximize icon, if the renderer supports expansion
  if (rhizo.ui.expandable(renderer, opt_options)) {
    var expander = $('<div class="rhizo-expand-model" ' +
                     'style="display:none"></div>');
    expander.data("id", model.id);
    rendering.append(expander);
  }

  // enrich the super model
  model.rendering = rendering;
  if (typeof(renderer.rescale) == 'function') {
    model.setRendererRescaler(renderer.rescale);
  }
  if (typeof(renderer.changeStyle) == 'function') {
    model.setRendererStyleChanger(renderer.changeStyle);
  }

  rendering.data("id", model.id);
  rendering.dblclick(function() {
    if (project.isSelected($(this).data("id"))) {
      project.unselect($(this).data("id"));
    } else {
      project.select($(this).data("id"));
    }
  });

  rendering.draggable({
    opacity: 0.7,
    cursor: 'pointer',
    zIndex: 10000,
    distance: 3,
    start: function(ev, ui) {
      project.toggleSelection('disable');
      // used by droppable feature
      ui.helper.data(
          "dropTop0",
          parseInt(ui.helper.css("top"),10));
      ui.helper.data(
          "dropLeft0",
          parseInt(ui.helper.css("left"),10));

      // figure out all the initial positions for the selected elements
      // and store them.
      if (project.isSelected(ui.helper.data("id"))) {
        var all_selected = project.allSelected();
        for (var id in all_selected) {
          var selected_rendering = all_selected[id].rendering;
          selected_rendering.data(
            "top0",
            parseInt(selected_rendering.css("top"),10) -
              parseInt(ui.helper.css("top"),10));
          selected_rendering.data(
            "left0",
            parseInt(selected_rendering.css("left"),10) -
              parseInt(ui.helper.css("left"),10));

          // used by droppable feature
          selected_rendering.data("dropTop0",
                                  parseInt(selected_rendering.css("top"),10));
          selected_rendering.data("dropLeft0",
                                  parseInt(selected_rendering.css("left"),10));
        }
      }
    },
    drag: function(ev, ui) {
      var drag_helper_id = ui.helper.data("id");
      if (project.isSelected(drag_helper_id)) {
        var all_selected = project.allSelected();
        for (var id in all_selected) {
          if (id != drag_helper_id) {
            all_selected[id].rendering.css(
                'top',
                all_selected[id].rendering.data("top0") + ui.position.top);
            all_selected[id].rendering.css(
                'left',
                all_selected[id].rendering.data("left0") + ui.position.left);
          }
        }
      }
    },
    stop: function(ev, ui) {
      project.toggleSelection('enable');
      if (project.isSelected(ui.helper.data("id"))) {
        var all_selected = project.allSelected();
        for (var id in all_selected) {
          all_selected[id].rendering.removeData("top0");
          all_selected[id].rendering.removeData("left0");
        }
      }
    },
    refreshPositions: false
  });

  return rendering;
};
