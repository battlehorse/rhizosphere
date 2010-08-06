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

rhizo.ui.performanceTuning = function(opt_disableAllAnims) {
  if (opt_disableAllAnims) {
    // Disable all animations
    jQuery.fx.off = true;

    // Define a non-animated move() function
    jQuery.fn.extend({
      move: function(top, left, opt_extras) {
        $(this).css('top', top);
        $(this).css('left', left);
        if (opt_extras) {
          for (var csskey in opt_extras) {
            $(this).css(csskey, opt_extras[csskey]);
          }
        }
      }
    });

  } else {
    // Define a move() function that discards animations if needed.
    jQuery.fn.extend({
      move: function(top, left, opt_extras) {
        if (jQuery.fx.off) {
          $(this).css('top', top);
          $(this).css('left', left);
          if (opt_extras) {
            for (var csskey in opt_extras) {
              $(this).css(csskey, opt_extras[csskey]);
            }
          }
        } else {
          var movement = {'top': top, 'left': left};
          if (opt_extras) {
            jQuery.extend(movement, opt_extras);
          }
          $(this).animate(movement, 1000);
        }
      }
    });
  }
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
        $(this).children('.rhizo-expand-model').css('display', '');
      }, function() {
        $(this).children('.rhizo-expand-model').css('display', 'none');
      });

    // register the expand icon handler
    $('.rhizo-expand-model').click(function() {
      var id = $(this).data('id');
      var model = project.model(id);

      // flip the expansion status
      model.expanded = !model.expanded;

      // re-render
      rhizo.ui.reRender(renderer,
                        model.rendering, model.unwrap(), model.expanded,
                        opt_options);
    });
  }
};

rhizo.ui.reRender = function(renderer,
                             rendering,
                             /* naked */ model,
                             expanded,
                             opt_options) {
  // re-render. rendered expects the naked model.
  var naked_render = renderer.render(model, expanded, opt_options);
  naked_render.addClass('rhizo-naked-render');

  // replace the old rendering
  rendering.css('z-index', expanded ? 60 : 50);
  rendering.children(':not(.rhizo-expand-model)').remove();
  rendering.append(naked_render);
};

rhizo.ui.defaultRenderingRescaler = function() {};

rhizo.ui.defaultRenderingRescaler.prototype.rescale = function(naked_render,
                                                               width,
                                                               height,
                                                               opt_failure_callback) {
  // TODO(battlehorse): should rescaling be animated?
  width = width - naked_render.outerWidth(true) + naked_render.width();
  height = height - naked_render.outerHeight(true) + naked_render.height();
  if (width > 0 && height > 0) {
    naked_render.width(width).height(height);
    return true;
  }
  if (opt_failure_callback) {
    opt_failure_callback();
  }
  return false;
};
