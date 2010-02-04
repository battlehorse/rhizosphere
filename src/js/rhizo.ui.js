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
      move: function(top, left, opt_bottom, opt_right) {
        $(this).css('top', top);
        $(this).css('left', left);
        if (opt_bottom != null) {
          $(this).css('bottom', opt_bottom);
        }
        if (opt_right != null) {
          $(this).css('right', opt_right);
        }
      }
    });

  } else {
    // Define a move() function that discards animations if needed.
    jQuery.fn.extend({
      move: function(top, left, opt_bottom, opt_right) {
        if (jQuery.fx.off) {
          $(this).css('top', top);
          $(this).css('left', left);
          if (opt_bottom != null) {
            $(this).css('bottom', opt_bottom);
          }
          if (opt_right != null) {
            $(this).css('right', opt_right);
          }
        } else {
          var movement = {'top': top, 'left': left};
          if (opt_bottom != null) {
            movement['bottom'] = opt_bottom;
          }
          if (opt_right != null) {
            movement['right'] = opt_right;
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
      var id = $(this).attr('id').replace(/rhizo-expand-/, '');
      var model = project.model(id);

      // flip the expansion status
      model.expanded = !model.expanded;

      // re-render
      var naked_render = renderer.render(
          model.unwrap(), // rendered expects the naked model
          model.expanded,
          opt_options);


      // replace the old rendering
      model.rendering.css('z-index', model.expanded ? 60 : 50);
      model.rendering.children(':not(.rhizo-expand-model)').remove();
      model.rendering.append(naked_render);
    });
  }
};
