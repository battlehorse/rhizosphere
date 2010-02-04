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

rhizo.model.kickstart = function(model, project, renderer, opt_options) {
  var naked_render = renderer.render(
      model.unwrap(), // rendered expects the naked model
      model.expanded, // initial expansion status, dictated by the SuperModel
      opt_options);

  // wrap the rendering into a DIV shell
  var rendering = $('<div class="rhizo-model"></div>');
  rendering.append(naked_render);

  // Add the maximize icon, if the renderer supports expansion
  if (rhizo.ui.expandable(renderer, opt_options)) {
    var expander = $('<div class="rhizo-expand-model" ' +
                     'style="display:none" ' +
                     'id="rhizo-expand-' + model.id + '"></div>');
    $(rendering).append(expander);
  }

  // enrich the super model
  model.rendering = rendering;

  $(rendering).attr("id", model.id);
  $(rendering).dblclick(function() {
    if (project.isSelected(this.id)) {
      project.unselect(this.id);
    } else {
      project.select(this.id);
    }
  });

  $(rendering).draggable({
    opacity: 0.7,
    cursor: 'pointer',
    zIndex: 10000,
    distance: 3,
    start: function(ev, ui) {
      project.toggleSelection('disable');

      // used by droppable feature
      $('#' + ui.helper[0].id).data(
          "dropTop0",
          parseInt($('#'+ ui.helper[0].id).css("top"),10));
      $('#' + ui.helper[0].id).data(
          "dropLeft0",
          parseInt($('#'+ ui.helper[0].id).css("left"),10));

      // figure out all the initial positions for the selected elements
      // and store them.
      if (project.isSelected(ui.helper[0].id)) {
        for (id in project.allSelected()) {
          $('#'+id).data(
            "top0",
            parseInt($('#'+id).css("top"),10) -
              parseInt($(ui.helper[0]).css("top"),10));
          $('#'+id).data(
            "left0",
            parseInt($('#'+id).css("left"),10) -
              parseInt($(ui.helper[0]).css("left"),10));

          // used by droppable feature
          $('#' + id).data("dropTop0", parseInt($('#'+id).css("top"),10));
          $('#' + id).data("dropLeft0", parseInt($('#'+id).css("left"),10));
        }
      }
    },
    drag: function(ev, ui) {
      if (project.isSelected(ui.helper[0].id)) {
        for (id in project.allSelected()) {
          if (id != ui.helper[0].id) {
            $('#' + id).css('top',
                            $('#'+id).data("top0") + ui.position.top);
            $('#' + id).css('left',
                            $('#'+id).data("left0") + ui.position.left);
          }
        }
      }
    },
    stop: function(ev, ui) {
      project.toggleSelection('enable');
      if (project.isSelected(ui.helper[0].id)) {
        for (id in project.allSelected()) {
         $('#'+id).removeData("top0");
         $('#'+id).removeData("left0");
        }
      }
    },
    refreshPositions: false
  });

  return rendering;
};
