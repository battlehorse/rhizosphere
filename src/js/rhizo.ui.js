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

// RHIZODEP=rhizo
// UI namespace
namespace("rhizo.ui");

/**
   Converts a value to an human-readable label. If the value is not numeric,
   it is returned untouched. If it is numeric the following logic applies:
     0: is returned untouched,
     0 to 1: only the most significant digit is retained (eg: 0.123 becomes 0.1)
     1 and above: human readable label according to SI units (eg: 100K, 1.2M)
   @param {number} value the value to be converted.
 */
rhizo.ui.toHumanLabel = function(value) {
  if (typeof(value) == 'number' && value != 0) {
    var labels = [ '', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y' ];
    var order = rhizo.util.orderOfMagnitude(value);
    if (order < 0) {
      return value.toFixed(-order);
    }
    var si = parseInt(order / 3, 10);
    var label = labels[si] || ''; // the or is for out-of-scale values
    return (value / Math.pow(10, si * 3)).toPrecision(3) + label;
  } else {
    return value;
  }
};

rhizo.ui.canCacheDimensions = function(renderer, opt_options) {
  var canCacheDimensions = false;

  // Renderer setting.
  if (renderer.cacheDimensions) {
    canCacheDimensions = renderer.cacheDimensions;
  }

  // Project-level override.
  if (opt_options && opt_options.cacheDimensions) {
    canCacheDimensions = opt_options.cacheDimensions;
  }
  return canCacheDimensions;
};

rhizo.ui.performanceTuning = function(opt_disableAllAnims) {
  if (opt_disableAllAnims) {
    // Disable all animations
    jQuery.fx.off = true;

    // Define non-animated move(), fadeIn() and fadeOut() functions
    jQuery.fn.extend({
      move: function(top, left, opt_extras) {
        $(this).css(jQuery.extend({top: top, left: left}, opt_extras));
      },
      fadeIn: function() {
        $(this).css('visibility', 'visible');
      },
      fadeOut: function() {
        $(this).css('visibility', 'hidden');
      }
    });

  } else {
    // Define move(), fadeIn() and fadeOut() functions that discards animations
    // if needed.
    jQuery.fn.extend({
      move: function(top, left, opt_extras) {
        if (jQuery.fx.off) {
          $(this).css(jQuery.extend({top: top, left: left}, opt_extras));
        } else {
          $(this).animate(
            jQuery.extend({top: top, left: left}, opt_extras),
            {duration: 400, queue: false});
        }
      },
      fadeIn: function() {
        if (jQuery.fx.off) {
          $(this).css({visibility: 'visible', opacity: 1.0});
        } else {
          $(this).css('visibility', 'visible').animate({opacity: 1}, 400);
        }
      },
      fadeOut: function() {
        if (jQuery.fx.off) {
          $(this).css({visibility: 'hidden', opacity: 0.0});
        } else {
          $(this).animate({opacity: 0.0},
                          {duration: 400,
                           complete: function() {
                             $(this).css('visibility', 'hidden'); }
                          });
        }
      }
    });
  }
};

rhizo.ui.render = function(model, renderer, allRenderings, opt_options) {
  var naked_render = renderer.render(model.unwrap(),
                                     model.expanded,
                                     opt_options);
  if (typeof naked_render == 'string') {
    allRenderings.push('<div class="rhizo-model">');
    allRenderings.push(naked_render);
    allRenderings.push('</div>');
  } else {
    // Assume it's a jQuery object.
    var rendering = $('<div class="rhizo-model"></div>');
    rendering.append(naked_render);
    allRenderings.push(rendering);
  }
};

rhizo.ui.reRender = function(model,
                             renderer,
                             opt_options) {
  // re-render. rendered expects the naked model.
  // Must wrap in $() in case renderer returns raw strings.
  var naked_render = $(renderer.render(model.unwrap(),
                                       model.expanded,
                                       opt_options));
  model.naked_render = naked_render;

  // keep expanded items above the others.
  // Remove any rescaling that might have been applied to the rendering.
  model.rendering.toggleClass('rhizo-model-expanded', model.expanded).css(
      {width: '', height: ''});

  // replace the old rendering
  model.rendering.children(':not(.rhizo-expand-model)').remove();
  model.rendering.append(naked_render);
  model.refreshCachedDimensions();
};

rhizo.ui.decorateRendering = function(renderings,
                                      models,
                                      project,
                                      renderer,
                                      opt_options) {
  var expander;
  var expandable = rhizo.ui.expandable(renderer, opt_options);
  if (expandable) {
    expander = $('<div class="rhizo-expand-model"></div>');
  }
  renderings.each(function(idx) {
    // Bind the model id to each rendering
    $(this).data('id', models[idx].id);

    // Set the initial z-index depending on expansion status.
    if (models[idx].expanded) {
      $(this).addClass('rhizo-model-expanded');
    }

    // Add the maximize icon, if the renderer supports expansion
    if (expandable) {
      var clonedExpander = expander.clone();
      clonedExpander.data("id", models[idx].id);
      $(this).append(clonedExpander);
    }
  });

  // Bind expandable events.
  if (expandable) {
    rhizo.ui.initExpandable(project, renderer, opt_options);
  }

  // The following ops are applied to all renderings at once.
  // Enable doubleclick selection.
  renderings.dblclick(function() {
    if (project.isSelected($(this).data("id"))) {
      project.unselect($(this).data("id"));
    } else {
      project.select($(this).data("id"));
    }
  });

  // Enable dragging.
  // This may take some time, especially for thousands of models, so we do
  // this in a timeout callback, to give the UI the possibility to refresh.
  window.setTimeout(
    function() {
      rhizo.ui.initDraggable(renderings, project);
    }, 100);
};

rhizo.ui.expandable = function(renderer, opt_options) {
  if (typeof(renderer.expandable) == 'boolean') {
    return renderer.expandable;
  } else if (typeof(renderer.expandable) == 'function') {
    return renderer.expandable(opt_options);
  } else {
    return false;
  }
};

/**
  Wires the expansion listeners to the rendering expansion icons,
  if the renderer supports expansion.
 */
rhizo.ui.initExpandable = function(project, renderer, opt_options) {
  if (rhizo.ui.expandable(renderer, opt_options)) {
    // register the hover effect to show/hide the expand icon
    $('.rhizo-model').hover(
      function() {
        $(this).children('.rhizo-expand-model').css('visibility', 'visible');
      }, function() {
        $(this).children('.rhizo-expand-model').css('visibility', 'hidden');
      });

    // register the expand icon handler
    $('.rhizo-expand-model').click(function() {
      var id = $(this).data('id');
      var model = project.model(id);

      // flip the expansion status
      model.expanded = !model.expanded;

      // re-render
      rhizo.ui.reRender(model,
                        renderer,
                        opt_options);
    });
  }
};

rhizo.ui.initDraggable = function(rendering, project) {
  rendering.draggable({
    opacity: 0.7,
    cursor: 'pointer',
    zIndex: 10000,
    distance: 3,
    addClasses: false,
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
};
