/* ./src/js/rhizo.js */
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

function namespace(ns) {
  var nsParts = ns.split(".");
  var root = window;

  for (var i=0; i<nsParts.length; i++) {
    if (typeof root[nsParts[i]] == "undefined") {
      root[nsParts[i]] = {};
    }
    root = root[nsParts[i]];
  }
}

namespace("rhizo");

/**
 * Inherit the prototype methods from one constructor into another.
 */
rhizo.inherits = function(childCtor, parentCtor) {
  function tempCtor() {};
  tempCtor.prototype = parentCtor.prototype;
  childCtor.prototype = new tempCtor();
  childCtor.prototype.constructor = childCtor;
};

namespace("rhizo.util");

rhizo.util.LOG_E_10 = Math.log(10);

/**
   Returns the log_10() of a number.
 */
rhizo.util.log10_ = function(val) {
  return Math.log(val)/rhizo.util.LOG_E_10;
};

/**
   Returns the order of magnitude of a given number.
   E.g. for a number between 100K and 1M returns 5.
   if 0 is passed in, NaN is returned.
   @param {number} num the number to evaluate.
 */
rhizo.util.orderOfMagnitude = function(num) {
  if (num == 0) {
    return Number.NaN;
  }

  // The multiply/divide by 100 trick is just to get rid of rounding errors.
  // For example, in Safari/MacOs log10(1M) would result in 5.999 instead of 6
  // and consequently floored to 5. And we cannot remove floor().
  return Math.floor(Math.round(rhizo.util.log10_(Math.abs(num))*100)/100);
};
/* ./src/js/rhizo.jquery.js */
/*
  Copyright 2010 Riccardo Govoni battlehorse@gmail.com

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

namespace("rhizo.jquery");

/**
 * Extends jQuery with all the additional behaviors required by Rhizosphere.
 * @param {rhizo.ui.gui.GUI} gui
 * @param {boolean?} opt_disableAllAnims whether all animations for the
 *     visualization 'gui' refers to should be disabled permanently.
 */
rhizo.jquery.init = function(gui, opt_disableAllAnims) {
  rhizo.jquery.initAnimations_(gui, opt_disableAllAnims);
  rhizo.jquery.initMouseWheel_();
};

/**
 * Extends jQuery by adding (or rewriting) animation-related functions for
 * movement and opacity.
 * 
 * TODO(battlehorse): This code is flawed when multiple visualizations are
 * present in a single page, since the first GUI object will dictate animation
 * status (via gui.noFx) for all the others.
 * See http://code.google.com/p/rhizosphere/issues/detail?id=68
 * 
 * @param {rhizo.ui.gui.GUI} gui
 * @param {boolean?} opt_disableAllAnims whether all animations for the
 *     visualization 'gui' refers to should be disabled permanently.
 */
rhizo.jquery.initAnimations_ = function(gui, opt_disableAllAnims) {
  if (jQuery().greyOut) {
    return;
  }
  (function($) {
    if (opt_disableAllAnims) {
      // Define non-animated move(), fadeIn() and fadeOut() functions
      $.fn.extend({
        move: function(top, left, opt_extras) {
          $(this).css(jQuery.extend({top: top, left: left}, opt_extras));
        },
        fadeIn: function() {
          $(this).css({visibility: 'visible', opacity: 1.0});
        },
        fadeOut: function() {
          $(this).css({visibility: 'hidden', opacity: 0.0});
        },
        greyOut: function() {
          $(this).css('opacity', 0.2);
        }
      });
    } else {
      // Define move(), fadeIn() and fadeOut() functions that discards
      // animations if needed.
      $.fn.extend({
        move: function(top, left, opt_extras) {
          if (gui.noFx) {
            $(this).css(jQuery.extend({top: top, left: left}, opt_extras));
          } else {
            $(this).animate(
              jQuery.extend({top: top, left: left}, opt_extras),
              {duration: 400, queue: false});
          }
        },
        fadeIn: function() {
          if (gui.noFx) {
            $(this).css({visibility: 'visible', opacity: 1.0});
          } else {
            $(this).css('visibility', 'visible').animate({opacity: 1.0}, 400);
          }
        },
        fadeOut: function() {
          if (gui.noFx) {
            $(this).css({visibility: 'hidden', opacity: 0.0});
          } else {
            $(this).animate({opacity: 0.0},
                            {duration: 400,
                             complete: function() {
                               $(this).css('visibility', 'hidden'); }
                            });
          }
        },
        greyOut: function() {
          if (gui.noFx) {
            $(this).css('opacity', 0.2);
          } else {
            $(this).animate({opacity: 0.2}, 400);
          }
        }
      });
    }

    $.fn.fadeTo = function(target_vis) {
      if (target_vis == rhizo.ui.Visibility.HIDDEN) {
        this.fadeOut();
      } else if (target_vis == rhizo.ui.Visibility.VISIBLE) {
        this.fadeIn();
      } else {  // rhizo.ui.Visibility.GREY
        this.greyOut();
      }
    };
  })(jQuery);
};

/**
 * Extends jQuery by adding mousewheel (and trackpad) tracking events.
 */
rhizo.jquery.initMouseWheel_ = function() {
  // Freely inspired by Brandon Aaron (http://brandonaaron.net)
  // jQuery MouseWheel plugin (http://github.com/brandonaaron/jquery-mousewheel),
  // which is licensed under the MIT License:
  // http://github.com/brandonaaron/jquery-mousewheel/blob/master/LICENSE.txt
  //
  // Mousewheel tracking is an horrible mess. Different browsers use different
  // conventions for the number of 'ticks' each scrolled line corresponds to.
  // In addition to that, specific platforms like MacIntel, alter the reported
  // ticks based on the acceleration of the scrolling movement.
  // 
  // Mousewheel events are also fired by multitouch trackpads (such as Mac ones)
  // which can use different number of ticks to represent fractional movement.
  // 
  // Browser-specific bugs make the entire business even more fun (such as was
  // the case of Safari 5: https://bugs.webkit.org/show_bug.cgi?id=29601).
  //
  // The following code tries to sanitize this behavior, applying the following
  // logic:
  // - The amount of 'ticks' each mousewheel event represents is ignored. Instead
  //   each event will have an associated deltaX, deltaY variables, whose only
  //   purpose is to represent the scrolling direction.
  //   x=-1: right, x=+1: left
  //   y=-1: down, y=+1: up
  //
  // - The 'intensity' of the scrolling (slow vs fast scrolling, that might
  //   affect the number of events fired per second) is attenuated by dropping
  //   events that happen too close to each other.
  //
  // As a result, handlers receive a frequency-capped stream of scrolling
  // requests, which has proven good enough for Rhizosphere purposes to simulate
  // panning.
  //
  // Tested on:
  // Linux (Ubuntu Lucid, scrolling mouse):
  //     Chrome 6, Opera 10.60, Firefox 3.6
  // Mac (OsX 10.5.8, scrolling mouse & trackpad):
  //     Safari 5.0.1, Chrome 6, Opera 10.60, Firefox 3.6 and 4(beta).
  // Windows:
  //     Untested.

  if (jQuery().mouseWheel) {
    return;
  }
  (function($) {
    
    var types = ['DOMMouseScroll', 'mousewheel'];
    var lastWheelEvent = 0;
    var minTimestampDelta = 30;

    $.event.special.mousewheel = {
      setup: function() {
        if ( this.addEventListener ) {
          for ( var i=types.length; i; ) {
            this.addEventListener( types[--i], handler, false );
          }
        } else {
          this.onmousewheel = handler;
        }
      },
    
      teardown: function() {
        if ( this.removeEventListener ) {
          for ( var i=types.length; i; ) {
            this.removeEventListener( types[--i], handler, false );
          }
        } else {
          this.onmousewheel = null;
        }
      }
    };

    $.fn.extend({
      mousewheel: function(fn) {
        return fn ? this.bind("mousewheel", fn) : this.trigger("mousewheel");
      },
   
      unmousewheel: function(fn) {
        return this.unbind("mousewheel", fn);
      }
    });

    function handler(event) {
      var orgEvent = event || window.event;
      var args = [].slice.call( arguments, 1 );

      var ts = orgEvent.timeStamp || new Date().getTime();
      if ((ts - lastWheelEvent) < minTimestampDelta) {
        return false;
      }
      lastWheelEvent = ts;
      
      var deltaX = 0;
      var deltaY = 0;
      if ($.browser.webkit) {
        // Safari, Chrome can track horizontal scrolling (trackpads).
        deltaX = orgEvent.wheelDeltaX;
        deltaY = orgEvent.wheelDeltaY;
      } else if ($.browser.mozilla) {
        // Firefox can track horizontal scrolling (trackpads), but:
        // - it fires separate events (hor, vert) for diagonal movements.
        // - it reports scrolling ticks in inverted fashion.
        if (orgEvent.axis !== undefined &&
            orgEvent.axis === orgEvent.HORIZONTAL_AXIS) {
           deltaX = -orgEvent.detail;
         } else {
           deltaY = -orgEvent.detail;
         }
      } else if ($.browser.opera) {
        // No horizontal scrolling detection in Opera.
        deltaY = orgEvent.wheelDelta;
      } else {
        // MSIE and other browsers. Let's handle them in the same way as IE,
        // and detect only vertical scrolling.
        deltaY = orgEvent.wheelDelta;
      }

      // Shrink to [-1, +1].
      deltaX = deltaX > 0 ? 1 : (deltaX < 0 ? -1 : 0);
      deltaY = deltaY > 0 ? 1 : (deltaY < 0 ? -1 : 0);
      
      event = $.event.fix(orgEvent);
      event.type = "mousewheel";
      
      args.unshift(event, deltaX, deltaY);
      return $.event.handle.apply(this, args);
    }
  })(jQuery);
};
/* ./src/js/rhizo.ui.js */
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
 * Defines the visibility states that models can have.
 * @enum {number}
 */
rhizo.ui.Visibility = {
  HIDDEN: 0,  // model filtered, filter is committed.
  GREY: 1,    // model filterer, filter is not committed yet.
  VISIBLE: 2  // model unfiltered, visible.
};

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
    } else if (order < 3) {
      return value;
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

rhizo.ui.render = function(model, renderer, allRenderings, renderingHints) {
  var naked_render = renderer.render(model.unwrap(),
                                     model.expanded,
                                     renderingHints);
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

rhizo.ui.reRender = function(model, renderer, renderingHints) {
  // re-render. rendered expects the naked model.
  // Must wrap in $() in case renderer returns raw strings.
  var naked_render = $(renderer.render(model.unwrap(),
                                       model.expanded,
                                       renderingHints));
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
                                       renderingHints) {
  var expander;
  var expandable = rhizo.ui.expandable(renderer, renderingHints);
  if (expandable) {
    expander = $('<div />', 
                 {'class': 'rhizo-expand-model rhizo-maximize-icon'});
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
    rhizo.ui.initExpandable(project, renderer, renderingHints);
  }

  // The following ops are applied to all renderings at once.
  // Enable click selection.
  renderings.click(function(ev) {
    if ($(this).data("dragging")) {
      // A spurious click event always fires after a drag event, which we
      // ignore.
      $(this).removeData("dragging");
      return;
    }
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

rhizo.ui.expandable = function(renderer, renderingHints) {
  if (typeof(renderer.expandable) == 'boolean') {
    return renderer.expandable;
  } else if (typeof(renderer.expandable) == 'function') {
    return renderer.expandable(renderingHints);
  } else {
    return false;
  }
};

/**
  Wires the expansion listeners to the rendering expansion icons,
  if the renderer supports expansion.
 */
rhizo.ui.initExpandable = function(project, renderer, renderingHints) {
  if (rhizo.ui.expandable(renderer, renderingHints)) {
    // register the hover effect to show/hide the expand icon
    $('.rhizo-model').hover(
      function() {
        $(this).children('.rhizo-expand-model').css('visibility', 'visible');
      }, function() {
        $(this).children('.rhizo-expand-model').css('visibility', 'hidden');
      });

    // register the expand icon handler
    $('.rhizo-expand-model').click(function(ev) {
      ev.stopPropagation();
      var id = $(this).data('id');
      var model = project.model(id);

      // flip the expansion status
      model.expanded = !model.expanded;

      // re-render
      rhizo.ui.reRender(model,
                        renderer,
                        renderingHints);
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
      ui.helper.data("dragging", true);
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
/* ./src/js/extra/rhizo.keyboard.js */
/*
  Copyright 2010 Riccardo Govoni battlehorse@gmail.com

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

/**
 * @fileoverview Onscreen keyboard based on HTML5 canvas, useful when
 * Rhizosphere is used on a keyboard-less touchscreen.
 * 
 * Implementation inspired by the online virtual keyboard by Joshua Koo
 * (zz85nus@gmail.com, http://lab4games.net/zz85/blog). See
 * http://www.lab4games.net/zz85/blog/2010/02/06/online-virtual-keyboard-with-canvas-and-javascript/
 * 
 * In addition to the changes necessary to embed the virtual keyboard in
 * Rhizosphere, the following has changed from the original script:
 * - no IE support. Tested on Firefox, Chrome, Safari, Opera.
 * - no bookmarklet support. The keyboard must be explicitly embedded in the
 *   web apps that need it.
 * - replaced canvastext.js with native canvas text rendering primitives.
 * - replaced custom drag code with jQuery UI draggable().
 * - no inverse keybinding (i.e. no highlighting of virtual keys when the
 *   equivalent real ones are pressed).
 * - significant code rewrite to leverage object-orientation.
 */

// RHIZODEP=rhizo
namespace('rhizo.keyboard');

/**
 * Enumerates all the hardcoded styles and pixel sizes.
 * 
 * TODO(battlehorse): hardcoded widths, heights and color schemes. Makes it
 * difficult to apply themes. Sizes are hardcoded to produce a keyboard whose
 * size is suitable for finger use (rather than stylus).
 * 
 * @enum {number}
 */
rhizo.keyboard.Style = {
  PADDING: 5,
  KEY_HEIGHT: 40,
  KEY_WIDTH: 40,
  KEY_RADIUS: 5,
  KEY_COLORS: {
    pressed:  {
      fg: "#7aa5d6",
      text: "#7aa5d6",
      bg: "#e5ecf9"
    },
    hover: {
      fg: "#7aa5d6",
      text: "#7aa5d6",
      bg: "#fff"
    },
    base: {
      fg: "#555",
      text: "#555",
      bg: "#fff"
    }
  },
  KEY_FONT: 'normal normal normal 22px sans-serif'
};

/**
 * Onscreen canvas-based keyboard, intended for keyboardless touchscreens.
 * 
 * @param {Object} container A jQuery wrapper for the HTML tree where the
 *     keyboard must trigger (can be the whole page). All input fields within
 *     the given tree will be instrumented to use the keyboard.
 * @constructor
 */
rhizo.keyboard.Keyboard = function(container) {
  this.container_ = container;
  this.keys_ = [];

  this.canvas_ = $('<canvas />', {'class': 'rhizo-keyboard'}).appendTo(container);
  this.canvas_.get(0).width = this.canvas_.width();
  this.canvas_.get(0).height = this.canvas_.height();
  this.ctx_ = this.canvas_.get(0).getContext('2d');

  // Initially position the canvas in the middle of the screen, but make it
  // draggable.
  this.canvas_.css({
      left: ($(window).width()-this.canvas_.width())/2,
      top: ($(window).height()-this.canvas_.height())/2
    });
  this.canvas_.draggable();

  /**
   * The html element which has the focus, where all the keystrokes will be
   * sent to.
   * @type {HTMLElement}
   * @private
   */
  this.focusTarget_ = null;

  /**
   * Whether blur events originating from focusTarget_ should be ignored. This
   * is the case when the blur is triggered by mouse events on the keyboard
   * itself.
   * @type {boolean}
   * @private
   */
  this.ignoreBlur_ = false;

  this.initEvents_();
  this.initKeys_();
};

/**
 * Repaints the keyboard.
 */
rhizo.keyboard.Keyboard.prototype.paint = function() {
  this.ctx_.clearRect(0, 0, this.canvas_.get(0).width, this.canvas_.get(0).height);
  for (var i = 0; i < this.keys_.length; i++) {
    this.keys_[i].paint(this.ctx_);
  }
};

/**
 * @return {Array.<rhizo.keyboard.Key>} The set of keyboard keys.
 */
rhizo.keyboard.Keyboard.prototype.getKeys = function() {
  return this.keys_;
};

/**
 * @return {HTMLElement} The html element which has the focus, where the
 *     keystrokes from the virtual keyboard will be directed to.
 */
rhizo.keyboard.Keyboard.prototype.getFocusTarget = function() {
  return this.focusTarget_;
};

/**
 * Binds all the relevant events, either on the affected input elements or the
 * canvas itself.
 * @private
 */
rhizo.keyboard.Keyboard.prototype.initEvents_ = function() {
  // Focus, blur
  $('input, textarea', this.container_).focus(jQuery.proxy(function(ev) {
    this.focusTarget_ = ev.target;
    this.canvas_.show();
    this.paint();
  }, this)).blur(jQuery.proxy(function(ev) {
    if (!this.ignoreBlur_) {
      this.canvas_.hide();
    }
  }, this));

  // Mouse movement inside the canvas for hover effects.
  this.canvas_.mousemove(
    jQuery.proxy(function(ev) {
      var insideOne = false;
      for (var i = 0; i < this.keys_.length; i++) {
        var inside = this.keys_[i].isInside(ev.offsetX || ev.layerX,
                                            ev.offsetY || ev.layerY);
        insideOne = insideOne || inside;
        this.keys_[i].setHover(inside);
      }
      this.canvas_.css('cursor', insideOne ? 'pointer' : 'move').
                   draggable(insideOne ? 'disable' : 'enable');
      this.paint();
    }, this));

  // Mouse clicks inside the canvas.
  this.canvas_.mousedown(jQuery.proxy(this.mousedown_, this));
  this.canvas_.mouseup(
    jQuery.proxy(function(ev) {
      this.ignoreBlur_ = false;
      for (var i = 0; i < this.keys_.length; i++) {
        if (!this.keys_[i].isToggle()) {
          this.keys_[i].setPressed(false);
        }
      }
      this.paint();
      $(this.focusTarget_).focus();  // restore focus
    }, this));
};

/**
 * Routes mousedown events on the canvas to the relevant tapped key.
 * @private
 */
rhizo.keyboard.Keyboard.prototype.mousedown_ = function(ev) {
  this.ignoreBlur_ = true;
  for (var i = 0; i < this.keys_.length; i++) {
    var inside = this.keys_[i].isInside(ev.offsetX || ev.layerX,
                                        ev.offsetY || ev.layerY);
    
    if (!this.keys_[i].isToggle()) {
      this.keys_[i].setPressed(inside);
    } else {
      if (!inside) {
        if (this.keys_[i].isToggleReleasedByOtherKeys() &&
            this.keys_[i].isPressed()) {
          this.keys_[i].setPressed(false);
        }
      } else {
        // Toggle key.
        this.keys_[i].setPressed(!this.keys_[i].isPressed());
      }
    }
  }
  this.paint();  
};

/**
 * Initializes the keyboard layout.
 * @private
 */
rhizo.keyboard.Keyboard.prototype.initKeys_ = function() {
  var ctors = {
    'enter': rhizo.keyboard.EnterKey,
    'delete': rhizo.keyboard.DeleteKey,
    'tab': rhizo.keyboard.TabKey,
    'caps': rhizo.keyboard.CapsKey,
    'shift': rhizo.keyboard.ShiftKey,
    'reset': rhizo.keyboard.ResetKey,
    'space': rhizo.keyboard.SpaceKey
  };

  // Keyboard Layout.
  var kbItems = [];
  kbItems.push([ '`','1','2','3','4','5','6','7','8','9','0','-','=','delete']);
  kbItems.push([ 'tab','q','w','e','r','t','y','u','i','o','p','[',']','\\']);
  kbItems.push([ 'caps','a','s','d','f','g','h','j','k','l', ';','\'','enter']);
  kbItems.push([ 'shift','z','x','c','v','b','n','m',',','.','/','reset']);
  kbItems.push([ 'space']);

  var padding = rhizo.keyboard.Style.PADDING;
  var ky = padding;
  for (var row = 0; row < kbItems.length; row++) {
    var kx = padding;
    for (var col = 0; col < kbItems[row].length; col++) {
      var ctor;
      var keyItem = kbItems[row][col];
      if (keyItem in ctors) {
        ctor = ctors[keyItem];
      } else {
        ctor = rhizo.keyboard.Key;
      }
      var key = new ctor(kbItems[row][col], kx, ky, this);
      this.keys_.push(key);
      kx += key.width() + padding;
    }
    ky += padding + rhizo.keyboard.Style.KEY_HEIGHT;
  }
};


/**
 * A keyboard key.
 * @param {string} key This key id (which is also used as the display label for
 *     standard keys like letters and numbers).
 * @param {number} kx The x coordinate of this key top-left corner (relative to
 *     the keyboard top-left corner).
 * @param {number} ky The y coordinate of this key top-left corner (relative to
 *     the keyboard top-left corner).
 * @param {rhizo.keyboard.Keyboard} keyboard The keyboard this key belongs to.
 * @constructor
 */
rhizo.keyboard.Key = function(key, kx, ky, keyboard) {
  this.label_ = key;
  this.key_ = key;
  this.kx_ = kx;
  this.ky_ = ky;
  this.keyboard_ = keyboard;

  this.radius_ = rhizo.keyboard.Style.KEY_RADIUS;
  this.height_ = rhizo.keyboard.Style.KEY_HEIGHT;
  this.width_ = rhizo.keyboard.Style.KEY_WIDTH;

  this.pressed_ = false;
  this.hover_ = false;

  /**
   * Will this key fire repeatedly as long as it is pressed down?
   * @type {boolean}
   * @private
   */
  this.canAutofire_ = true;

  /**
   * Handle for the autofire callback, if the key is currently autofiring. null
   * otherwise.
   * @private
   */
  this.autofireIntervalId_ = null;

  this.colors_ = {};
};

rhizo.keyboard.Key.prototype.width = function() {
  return this.width_;
};

/**
 * @return {boolean} Whether this key behaves like a toggle or not.
 */
rhizo.keyboard.Key.prototype.isToggle = function() {
  return false;
};

rhizo.keyboard.Key.prototype.paint = function(ctx) {
  this.setStyles_(ctx);
  this.paintRoundedRect_(ctx);
  this.paintKey_(ctx);
};

rhizo.keyboard.Key.prototype.setStyles_ = function(ctx) {
  if (this.pressed_) {
    this.colors_ = rhizo.keyboard.Style.KEY_COLORS.pressed;
  } else if (this.hover_) {
    this.colors_ = rhizo.keyboard.Style.KEY_COLORS.hover;
  } else {
    this.colors_ = rhizo.keyboard.Style.KEY_COLORS.base;
  }
};

rhizo.keyboard.Key.prototype.paintRoundedRect_ = function(ctx) {
  ctx.beginPath();
  ctx.moveTo(this.kx_, this.ky_ + this.radius_);
  ctx.lineTo(this.kx_, this.ky_ + this.height_ - this.radius_);
  ctx.quadraticCurveTo(this.kx_, this.ky_ + this.height_,
                       this.kx_ + this.radius_, this.ky_ + this.height_);
  ctx.lineTo(this.kx_ + this.width() - this.radius_, this.ky_ + this.height_);
  ctx.quadraticCurveTo(this.kx_ + this.width(), this.ky_ + this.height_,
                       this.kx_ + this.width(),
                       this.ky_ + this.height_ - this.radius_);
  ctx.lineTo(this.kx_ + this.width(), this.ky_ + this.radius_);
  ctx.quadraticCurveTo(this.kx_ + this.width(), this.ky_,
                       this.kx_ + this.width() - this.radius_, this.ky_);
  ctx.lineTo(this.kx_ + this.radius_, this.ky_);
  ctx.quadraticCurveTo(this.kx_, this.ky_,
                       this.kx_, this.ky_ + this.radius_);

  ctx.strokeStyle = this.colors_.fg;
  ctx.fillStyle = this.colors_.bg;
  ctx.fill();
  ctx.stroke();
};

rhizo.keyboard.Key.prototype.paintKey_ = function(ctx) {
  ctx.fillStyle = this.colors_.text;
  ctx.font = rhizo.keyboard.Style.KEY_FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(this.label_, this.kx_ + this.width() / 2,
               this.ky_ + this.height_ / 2);
};

/**
 * @param {number} offsetX The x coordinate (relative to the keyboard top-left
 *     corner) of a mouse click.
 * @param {number} offsetY The y coordinate (relative to the keyboard top-left
 *     corner) of a mouse click.
 * @return {boolean} Whether the mouse click falls inside this key or not.
 */
rhizo.keyboard.Key.prototype.isInside = function(offsetX, offsetY) {
  return this.kx_ < offsetX &&
         (this.kx_ + this.width()) > offsetX &&
         this.ky_ < offsetY &&
         (this.ky_ + this.height_ > offsetY);
};

/**
 * Sets the 'hover' style for this key.
 */
rhizo.keyboard.Key.prototype.setHover = function(hover) {
  this.hover_ = hover;
};

/**
 * Sets the 'pressed' style for this key.
 * If the key is pressed, it also triggers the relevant changes in the
 * controlled HTML input element and starts autofiring (if the key supports the
 * feature).
 */
rhizo.keyboard.Key.prototype.setPressed = function(pressed) {
  this.pressed_ = pressed;
  if (this.pressed_) {
    this.modifyTarget_(this.keyboard_.getFocusTarget());
  }

  // Start autofiring, if needed.
  if (this.canAutofire_) {
    if (this.pressed_) {
      // start autofirirg
      if (this.autofireIntervalId_ == null) {
        this.autofireIntervalId_ = window.setInterval(
          jQuery.proxy(this.setPressed, this), 100, /* pressed= */ true);        
      }
    } else {
      // stop autofiring.
      window.clearInterval(this.autofireIntervalId_);
      this.autofireIntervalId_ = null;
    }
  }
};

/**
 * @return {boolean} Whether the key is currently pressed or not.
 */
rhizo.keyboard.Key.prototype.isPressed = function() {
  return this.pressed_;
};

/**
 * Toggles caps-lock (or shift functionality) on this key.
 */
rhizo.keyboard.Key.prototype.setCaps = function(capsEnabled) {
  var azLower = 'abcdefghijklmnopqrstuvwxyz';
  var symLower = '`1234567890-=[]\\;\',./';

  var azUpper = azLower.toUpperCase();
  var symUpper = '~!@#$%^&*()_+{}|:"<>?';

  var sourceChars = capsEnabled ? azLower + symLower : azUpper + symUpper;
  var destChars = capsEnabled ? azUpper + symUpper : azLower + symLower;
  for (var i = 0; i < sourceChars.length; i++) {
    if (sourceChars[i] == this.label_) {
      this.label_ = destChars[i];
      this.key_ = destChars[i];
      break;
    }
  }
};

/**
 * Adds the pressed character to the input element controlled by this keyboard.
 * Replaces a preexisting text selection, if any.
 * 
 * @param {HTMLElement} focusTarget The html element which has the focus, where
 *     all the keystrokes will be sent to.
 * @private
 */
rhizo.keyboard.Key.prototype.modifyTarget_ = function(focusTarget) {
  var selStart = focusTarget.selectionStart;
  var selEnd = focusTarget.selectionEnd;

  var prefix = $(focusTarget).val();
  var suffix = '';
  if (selEnd - selStart > 0) {
    suffix = prefix.substr(selEnd);
    prefix = prefix.substr(0, selStart);
  }
  $(focusTarget).val(prefix + this.key_ + suffix);
};


/**
 * The Enter key.
 * @constructor
 * @extends rhizo.keyboard.Key
 */
rhizo.keyboard.EnterKey = function(key, kx, ky, keyboard) {
  rhizo.keyboard.Key.call(this, key, kx, ky, keyboard);
  this.width_ = 77;
  this.canAutofire_ = false;
};
rhizo.inherits(rhizo.keyboard.EnterKey, rhizo.keyboard.Key);

rhizo.keyboard.EnterKey.prototype.modifyTarget_ = function(focusTarget) {
  // Rhizosphere events are triggered by 'change' events.
  $(focusTarget).change();
};


/**
 * The Tab key.
 * @constructor
 * @extends rhizo.keyboard.Key
 */
rhizo.keyboard.TabKey = function(key, kx, ky, keyboard) {
  rhizo.keyboard.Key.call(this, key, kx, ky, keyboard);
  this.width_ = 70;
  this.key_ = '\t';
};
rhizo.inherits(rhizo.keyboard.TabKey, rhizo.keyboard.Key);


/**
 * The Delete (Backspace) key.
 * @constructor
 * @extends rhizo.keyboard.Key
 */
rhizo.keyboard.DeleteKey = function(key, kx, ky, keyboard) {
  rhizo.keyboard.Key.call(this, key, kx, ky, keyboard);
  this.width_ = 70;
};
rhizo.inherits(rhizo.keyboard.DeleteKey, rhizo.keyboard.Key);

rhizo.keyboard.DeleteKey.prototype.modifyTarget_ = function(focusTarget) {
  var selStart = focusTarget.selectionStart;
  var selEnd = focusTarget.selectionEnd;

  var currentText = $(focusTarget).val();
  if (selEnd - selStart > 0) {
    $(focusTarget).val(currentText.substr(0, selStart) +
                       currentText.substr(selEnd));
  } else if (currentText.length > 0) {
    $(focusTarget).val(currentText.substr(0, currentText.length-1));
  }
};


/**
 * The CapsLock key.
 * @constructor
 * @extends rhizo.keyboard.Key
 */
rhizo.keyboard.CapsKey = function(key, kx, ky, keyboard) {
  rhizo.keyboard.Key.call(this, key, kx, ky, keyboard);
  this.width_ = 80;
  this.canAutofire_ = false;
};
rhizo.inherits(rhizo.keyboard.CapsKey, rhizo.keyboard.Key);

rhizo.keyboard.CapsKey.prototype.setPressed = function(pressed) {
  this.pressed_ = pressed;
  var keys = this.keyboard_.getKeys();
  for (var i = 0; i < keys.length; i++) {
    keys[i].setCaps(this.pressed_);
  }
};

rhizo.keyboard.CapsKey.prototype.isToggle = function() {
  return true;
};

rhizo.keyboard.CapsKey.prototype.isToggleReleasedByOtherKeys = function() {
  return false;
};


/**
 * The Shift key.
 * @constructor
 * @extends rhizo.keyboard.Key
 */
rhizo.keyboard.ShiftKey = function(key, kx, ky, keyboard) {
  rhizo.keyboard.CapsKey.call(this, key, kx, ky, keyboard);
  this.width_ = 97;
};
rhizo.inherits(rhizo.keyboard.ShiftKey, rhizo.keyboard.CapsKey);

rhizo.keyboard.ShiftKey.prototype.isToggleReleasedByOtherKeys = function() {
  return true;
};


/**
 * The Reset key (which is used to clear the entire input element).
 * @constructor
 * @extends rhizo.keyboard.Key
 */
rhizo.keyboard.ResetKey = function(key, kx, ky, keyboard) {
  rhizo.keyboard.Key.call(this, key, kx, ky, keyboard);
  this.width_ = 105;
  this.canAutofire_ = false;
};
rhizo.inherits(rhizo.keyboard.ResetKey, rhizo.keyboard.Key);

rhizo.keyboard.ResetKey.prototype.modifyTarget_ = function(focusTarget) {
  $(focusTarget).val('').change();
};


/**
 * The Space key (which is used to clear the entire input element).
 * @constructor
 * @extends rhizo.keyboard.Key
 */
rhizo.keyboard.SpaceKey = function(key, kx, ky, keyboard) {
  rhizo.keyboard.Key.call(this, key, kx, ky, keyboard);
  this.width_ = 660;
  this.key_ = ' ';
};
rhizo.inherits(rhizo.keyboard.SpaceKey, rhizo.keyboard.Key);
/* ./src/js/rhizo.meta.js */
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

/*
To define a new meta-type:

- create the object

- implement the renderFilter() function.
  This draws the UI for the filter on this type

- implement the survivesFilter() function.
  This verifies if a model value matches the filter or not

- implement the isNumeric() function.
  This tells whether the kind of data this filter is applied to are numeric
  or not (i.e. can be used in arithmetic computations).

- implement the cluster() function (optional).
  Defines how grouping works for this type

- implement the compare() function (optional).
  Defines how two values of this metatype are compared against each other.
  Returns negative, 0, or positive number if the first element is smaller,
  equal or bigger than the second.

- update the rhizo.meta.Kind structure.
*/

// RHIZODEP=rhizo
// Metamodel namespace
namespace("rhizo.meta");

/* StringKind meta */
rhizo.meta.StringKind = function() {};

// metadata is the part of the metamodel that applies to this kind
rhizo.meta.StringKind.prototype.renderFilter = function(project, metadata, key) {
  var input = $("<input type='text' />");
  // keypress handling removed due to browser quirks in key detection
  $(input).change(function(ev) {
    project.filter(key, $(this).val());
  });
  return $("<div class='rhizo-filter' />").
           append(metadata.label + ": ").
           append($(input));
};

rhizo.meta.StringKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  return filterValue != '' &&
         modelValue.toLowerCase().indexOf(filterValue.toLowerCase()) != -1;
};

rhizo.meta.StringKind.prototype.cluster = function(modelValue) {
  return { key: modelValue.toUpperCase().charAt(0),
           label: modelValue.toUpperCase().charAt(0) };
};

rhizo.meta.StringKind.prototype.isNumeric = function() {
  return false;
};

/* NumberKind meta */
rhizo.meta.NumberKind = function() {};

rhizo.meta.NumberKind.prototype.renderFilter =
    rhizo.meta.StringKind.prototype.renderFilter;

rhizo.meta.NumberKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  var filterValueInt = parseInt(filterValue, 10);
  if (isNaN(filterValueInt)) {
    return true; // invalid numbers shouldn't filter anything
  } else {
    return filterValueInt == modelValue;
  }
};

rhizo.meta.NumberKind.prototype.compare = function(firstValue, secondValue) {
  return parseInt(firstValue, 10) - parseInt(secondValue, 10);
};

rhizo.meta.NumberKind.prototype.cluster = function(modelValue) {
  var iModelValue = parseInt(modelValue, 10);
  if (parseFloat(modelValue) <= 10) {
    return {key: iModelValue, label: iModelValue.toString()};
  }
  // cluster at one order of magnitude less than current scale
  var powCount = 0;
  while (iModelValue >= 10) {
    iModelValue = parseInt(iModelValue / 10);
    powCount++;
  }

  var magnitude  = Math.pow(10, powCount);
  var lowRange = parseInt(modelValue/magnitude, 10)*magnitude;
  var hiRange = parseInt(modelValue/magnitude + 1, 10)*magnitude;
  return { key: lowRange,
           label: lowRange.toString() + " - " + hiRange.toString() };
};

rhizo.meta.NumberKind.prototype.isNumeric = function() {
  return true;
};


/* DateKind meta */
rhizo.meta.DateKind = function(opt_clusterby) {
  this.monthMap_ = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  this.clusterby_ = opt_clusterby || 'y';
  if (this.clusterby_ != 'y' && this.clusterby_ != 'm' && this.clusterby_ != 'd') {
    this.clusterby_ = 'y';
  }
};

rhizo.meta.DateKind.prototype.renderFilter = function(project, metadata, key) {
  var year = $("<select style='vertical-align:top' />");
  year.append("<option value='yyyy'>yyyy</option>");
  for (var i = metadata.minYear ; i <= metadata.maxYear; i++) {
    year.append("<option value='" + i + "'>" + i + "</option>");
  }
  var month = $("<select style='vertical-align:top' />");
  month.append("<option value='mm'>mm</option>");
  for (var i = 0; i < this.monthMap_.length; i++) {
    month.append("<option value='" + i + "'>" + this.monthMap_[i] + "</option>");  
  }

  var day = $("<select style='vertical-align:top' />");
  day.append("<option value='dd'>dd</option>");
  for (var i = 1 ; i <= 31; i++) {
    day.append("<option value='" + i + "'>" + i + "</option>");
  }
  
  $(year).add($(month)).add($(day)).change(function(ev) {
    project.filter(key, [$(year).val(), $(month).val(), $(day).val()]);
  });

  return $("<div class='rhizo-filter' />").
           append(metadata.label + ": ").
           append($(year)).
           append(' - ').
           append($(month)).
           append(' - ').
           append($(day));
};

rhizo.meta.DateKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  var year = parseInt(filterValue[0], 10);
  var month = parseInt(filterValue[1], 10);
  var day = parseInt(filterValue[2], 10);
  
  var survives = ((isNaN(year) || modelValue.getFullYear() == year) &&
          (isNaN(month) || modelValue.getMonth() == month) &&
          (isNaN(day) || modelValue.getDate() == day));
  return survives;
};

// We do not implement a compare() function for dates because the native comparison
// works just fine. Watch out because 2 kinds of comparisons occur for DateKind:
// - date comparison is performed when comparing model objects (for example
//   to order elements in a list layout)
// - string comparison is performed when comparing bucket keys (to order the
//   buckets in a BucketLayout, via rhizo.meta.sortByKind). The cluster()
//   function takes care of rendering bucket keys as strings that respect
//   the underlying date ordering when lexicographically sorted.

rhizo.meta.DateKind.prototype.cluster = function(modelValue) {
  if (this.clusterby_ == 'y') {
    return {
      key: modelValue.getFullYear() + '-00-01',
      label: modelValue.getFullYear()
    };
  } else if (this.clusterby_ == 'm') {
    return {
      key: modelValue.getFullYear() + '-' + this.addZero_(modelValue.getMonth()) + '-01',
      label: modelValue.getFullYear() + '-' + this.monthMap_[modelValue.getMonth()]
    };
  } else {
    return {
      key: modelValue.getFullYear() + '-' + this.addZero_(modelValue.getMonth()) + '-' + this.addZero_(modelValue.getDate()),
      label: modelValue.getFullYear() + '-' + this.monthMap_[modelValue.getMonth()] + '-' + modelValue.getDate()
    };   
  }
};

rhizo.meta.DateKind.prototype.isNumeric = function() {
  return false;
};

rhizo.meta.DateKind.prototype.addZero_ = function(value) {
  var result = value.toString();
  if (result.length == 1) {
    result = '0' + result;
  }
  return result;
}

/* RangeKind meta */
rhizo.meta.RangeKind = function() {};

rhizo.meta.RangeKind.prototype.renderFilter = function(project, metadata, key) {
  var slider = $("<div class='rhizo-slider' />");
  var minLabel = $("<strong>" + this.toHumanLabel_(metadata.min) + "</strong>");
  var maxLabel = $("<strong>" + this.toHumanLabel_(metadata.max) + "</strong>");

  var minFilterScale = this.toFilterScale_(metadata.min);
  var maxFilterScale = this.toFilterScale_(metadata.max);
  var steppingFilterScale;
  if (metadata.stepping) {
    steppingFilterScale = this.toFilterScale_(metadata.stepping);
  }

  // wrap slide handler into a closure to preserve access to the RangeKind
  // filter.
  var slideCallback = jQuery.proxy(function(ev, ui) {
      if (ui.values[0] != minFilterScale) {
        // min slider has moved
        minLabel.text(this.toHumanLabel_(this.toModelScale_(ui.values[0]))).
                 addClass("rhizo-slider-moving");
        maxLabel.removeClass("rhizo-slider-moving");
      }
      if (ui.values[1] != maxFilterScale) {
        // max slider has moved
        maxLabel.text(this.toHumanLabel_(this.toModelScale_(ui.values[1]))).
                 addClass("rhizo-slider-moving");
        minLabel.removeClass("rhizo-slider-moving");
      }
  }, this);

  // wrap change handler into a closure to preserve access to the RangeKind
  // filter.
  var stopCallback = jQuery.proxy(function(ev, ui) {
      var minSlide = Math.max(this.toModelScale_(ui.values[0]), metadata.min);
      var maxSlide = Math.min(this.toModelScale_(ui.values[1]), metadata.max);
      minLabel.text(this.toHumanLabel_(minSlide)).removeClass(
          "rhizo-slider-moving");
      maxLabel.text(this.toHumanLabel_(maxSlide)).removeClass(
          "rhizo-slider-moving");
      project.filter(key, { min: minSlide, max: maxSlide });
  }, this);

  $(slider).slider({
    stepping: steppingFilterScale,
    steps: metadata.steps,
    range: true,
    min: minFilterScale,
    max: maxFilterScale,
    slide: slideCallback,
    stop: stopCallback,
    orientation: 'horizontal',
    values: [ minFilterScale, maxFilterScale ]
  });

  return $("<div class='rhizo-filter' />").append(metadata.label + ": ")
                                          .append($(minLabel))
                                          .append(" to ")
                                          .append($(maxLabel))
                                          .append($(slider));
};

rhizo.meta.RangeKind.prototype.survivesFilter = function(filterValue,
                                                         modelValue) {
  return modelValue >= filterValue.min && modelValue <= filterValue.max;;
};

rhizo.meta.RangeKind.prototype.compare =
    rhizo.meta.NumberKind.prototype.compare;

rhizo.meta.RangeKind.prototype.cluster =
    rhizo.meta.NumberKind.prototype.cluster;

rhizo.meta.RangeKind.prototype.isNumeric =
    rhizo.meta.NumberKind.prototype.isNumeric;

/**
   Converts a value as returned from the slider into a value in the model range.
   This method, and the subsequent one, are particularly useful when the range
   of Model values is not suitable for a slider (which accepts only integer
   ranges). For example, when dealing with small decimal scales.

   The default implementation of this method is a no-op. Custom filters
   extending the range slider should customize this method according to their
   needs.
   @param {number} filterValue the value received from the filter.
 */
rhizo.meta.RangeKind.prototype.toModelScale_ = function(filterValue) {
  return filterValue;
};

/**
   Converts a value as read from the model into a value in the slider scale.
   This is the inverse method of the previous one.
   @param {number} modelValue the value received from the model.
 */
rhizo.meta.RangeKind.prototype.toFilterScale_ = function(modelValue) {
  return modelValue;
};


/**
   Converts a numeric value into a human readable form.

   The default implementation of this method is a no-op. Custom filters
   extending the range slider should customize this method according to their
   needs. rhizo.ui.toHumanLabel() is a useful helper in this case.

   @oaram {number} the value to be converted
 */
rhizo.meta.RangeKind.prototype.toHumanLabel_ = function(modelValue) {
  return modelValue;
};

/* BooleanKind meta */
rhizo.meta.BooleanKind = function() {};

rhizo.meta.BooleanKind.prototype.renderFilter = function(project, metadata, key) {
  var check = $("<select />");
  check.append("<option value=''>-</option>");
  check.append("<option value='true'>Yes</option>");
  check.append("<option value='false'>No</option>");

  $(check).change(function(ev) {
    project.filter(key, $(this).val());
  });
  return $("<div class='rhizo-filter' />").
           append(metadata.label + ": ").
           append($(check));
};

rhizo.meta.BooleanKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  var filterBoolean = filterValue == "true";
  return filterBoolean == modelValue;
};

rhizo.meta.BooleanKind.prototype.compare = function(firstValue, secondValue) {
  // true comes before false
  return firstValue ? (secondValue ? 0 : -1) : (secondValue ? 1 : 0);
};

rhizo.meta.BooleanKind.prototype.isNumeric = function() {
  return false;
};

/* CategoryKind meta */
rhizo.meta.CategoryKind = function() {};

rhizo.meta.CategoryKind.prototype.renderFilter = function(project, metadata, key) {
  var categories = $("<select " +
                     (metadata.multiple ? 'multiple size="4" ' : '') +
                     " style='vertical-align:top' />");
  categories.append("<option value=''>-</option>");
  for (var i = 0; i < metadata.categories.length; i++) {
    categories.append("<option value='" + metadata.categories[i] + "'>" +
                      metadata.categories[i] + "</option>");
  }

  $(categories).change(function(ev) {
    var selectedCategories = [ $(this).val() ];
    if (metadata.multiple) {
      selectedCategories = $.grep($(this).val(), function(category) {
        return category != '';
      });
    }
    project.filter(key, selectedCategories);
  });
  return $("<div class='rhizo-filter' />").
           append(metadata.label + ": ").
           append($(categories));
};

rhizo.meta.CategoryKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  // AND-filter

  // var survives = true;
  // for (var i = 0; i < filterValue.length; i++) {
  //   if (modelValue.indexOf(filterValue[i]) == -1) {
  //     survives = false;
  //     break;
  //   }
  // }
  // return survives;

  // OR-filter
  var survives = false;
  for (var i = 0; i < filterValue.length; i++) {
    if (modelValue.indexOf(filterValue[i]) != -1) {
      survives = true;
      break;
    }
  }
  return survives;
};

rhizo.meta.CategoryKind.prototype.cluster = function(modelValue) {
  return { key: modelValue.length == 0 ? "Nothing" : modelValue,
           label: modelValue.length == 0 ? "Nothing" : modelValue };
};

rhizo.meta.CategoryKind.prototype.compare = function(firstValue, secondValue) {
  // comparison based on number of categories.
  // Not necessarily the most meaningful...
  return firstValue.length - secondValue.length;
};

rhizo.meta.CategoryKind.prototype.isNumeric = function() {
  return false;
};

/* Utility functions */

rhizo.meta.sortBy = function(key, kind, opt_reverse) {
  return function(firstSuperModel, secondSuperModel) {
    var firstModel = firstSuperModel.unwrap();
    var secondModel = secondSuperModel.unwrap();

    // Sign multiplication to invert sorting order
    var reverse = opt_reverse ? -1 : 1;

    if (kind.compare) {
      return kind.compare(firstModel[key], secondModel[key])*reverse;
    } else {
      // try native sorting
      return (firstModel[key] < secondModel[key] ? -1 :
              firstModel[key] > secondModel[key] ? 1 : 0)*reverse;
    }
  };
};

rhizo.meta.sortByKind = function(kind, opt_reverse) {
  return function(firstValue, secondValue) {
    // Sign multiplication to invert sorting order
    var reverse = opt_reverse ? -1 : 1;
    if (kind.compare) {
      return kind.compare(firstValue, secondValue)*reverse;
    } else {
      return (firstValue < secondValue ? -1 : 
	      firstValue > secondValue ? 1 : 0)*reverse;
    }
  };
};

rhizo.meta.Kind = {
  STRING: new rhizo.meta.StringKind(),
  NUMBER: new rhizo.meta.NumberKind(),
  DATE: new rhizo.meta.DateKind(),
  RANGE: new rhizo.meta.RangeKind(),
  BOOLEAN: new rhizo.meta.BooleanKind(),
  CATEGORY: new rhizo.meta.CategoryKind()
};
/* ./src/js/rhizo.log.js */
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
namespace("rhizo");

rhizo.nativeConsoleExists = function() {
  return typeof(console) !== 'undefined' && console != null;
};

rhizo.NoOpLogger = function() {};
rhizo.NoOpLogger.prototype.info = function() {};
rhizo.NoOpLogger.prototype.error = function() {};
rhizo.NoOpLogger.prototype.warning = function() {};

rhizo.NativeLogger = function() {};

rhizo.NativeLogger.prototype.info = function(message) {
  console.info(message);
};

rhizo.NativeLogger.prototype.error = function(message) {
  console.error(message);
};

rhizo.NativeLogger.prototype.warning = function(message) {
  console.warn(message);
};

rhizo.Logger = function(gui) {
  this.console_ = gui.getComponent('rhizo.ui.component.Console');
  this.rightBar_ = gui.getComponent('rhizo.ui.component.RightBar');
};

rhizo.Logger.prototype.log_ = function(message, opt_severity) {
  var severity = opt_severity || 'info';
  var highlightColor = "#888";
  switch(severity) {
    case "error":
      highlightColor = "#ff0000";
      break;
    case "warning":
      highlightColor = "#ffff00";
      break;
  }

  var d = new Date();
  var dateMsg = d.getHours() + ":" +
                d.getMinutes() + ":" +
                d.getSeconds() + " ";
  var htmlMsg = $("<p class='rhizo-log-" + severity + "'>" +
                  dateMsg + message + "</p>");

  this.console_.getContents().prepend(htmlMsg);
  if (opt_severity) {
    htmlMsg.effect("highlight", {color: highlightColor }, 1000);
  }
  if (!this.console_.getContents().is(':visible') && opt_severity) {
    if (this.rightBar_ && !this.rightBar_.getPanel().is(':visible')) {
      this.rightBar_.getToggle().effect(
          "highlight", {color: highlightColor }, 1000);
    } else {
      this.console_.getHeader().effect(
          "highlight", {color: highlightColor }, 1000);
    }
  }
};

rhizo.Logger.prototype.info = function(message) {
  this.log_(message);
};

rhizo.Logger.prototype.error = function(message) {
  this.log_(message, "error");
};

rhizo.Logger.prototype.warning = function(message) {
  this.log_(message, "warning");
};
/* ./src/js/extra/rhizo.meta.extra.js */
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

// RHIZODEP=rhizo.meta

/*
  This file contains extra filters that suit very specialized needs and do not
  make sense to pack into the main distribution.
  Users that need them should be able to include them in their own distribution
  by just including this js file among the others.
*/

/**
   DecimalKind meta: A specialized filter that handles decimal numbers.

   @param {number} opt_precision the precision (in terms of decimal digits after
       the floating point) to use when rendering, parsing and clustering decimal
       numbers. Users of this filter are strongly encouraged to customize this
       setting on a per-field basis.
 */
rhizo.meta.DecimalKind = function(opt_precision) {
  this.precision_ = opt_precision || 2;
};

rhizo.meta.DecimalKind.prototype.renderFilter =
    rhizo.meta.StringKind.prototype.renderFilter;


rhizo.meta.DecimalKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  var filterValueFloat = parseFloat(filterValue);
  if (isNaN(filterValueFloat)) {
    return true; // invalid numbers shouldn't filter anything
  } else {
    return filterValueFloat.toFixed(this.precision_) ==
           modelValue.toFixed(this.precision_);
  }
};

rhizo.meta.DecimalKind.prototype.compare = function(firstValue, secondValue) {
  return parseFloat(firstValue) - parseFloat(secondValue);
}

rhizo.meta.DecimalKind.prototype.cluster = function(modelValue) {
  var fModelValue = parseFloat(modelValue.toFixed(this.precision_), 10);

  // cluster at one order of magnitude less than current scale
  var order = rhizo.util.orderOfMagnitude(fModelValue);
  if (isNaN(order)) {
    return { key: 0,
             label: new Number(0).toFixed(this.precision_) };
  }

  var lowRange = Math.pow(10, order);
  var hiRange = Math.pow(10, order + 1);
  return { key: lowRange,
           label: rhizo.ui.toHumanLabel(lowRange) + " - " +
                  rhizo.ui.toHumanLabel(hiRange) };
};

rhizo.meta.DecimalKind.prototype.isNumeric = function() {
  return true;
};


/**
   DecimalRangeKind meta: A specialized filter that can render range sliders
   that operate over a decimal range of values.
   As this is not natively supported by the JQuery sliders that we are
   using so far, we emulate it by multiplying/dividing in and out of the slider
   to have the required integer range.

   @param {number} opt_precision the precision (in terms of decimal digits after
       the floating point) to use when rendering, parsing and clustering decimal
       numbers. Users of this filter are strongly encouraged to customize this
       setting on a per-field basis.
*/
rhizo.meta.DecimalRangeKind = function(opt_precision) {
  this.precision_ = opt_precision || 2;
  this.scale_ = Math.pow(10, this.precision_);
};

rhizo.meta.DecimalRangeKind.prototype.renderFilter =
    rhizo.meta.RangeKind.prototype.renderFilter;

rhizo.meta.DecimalRangeKind.prototype.survivesFilter =
    rhizo.meta.RangeKind.prototype.survivesFilter;

rhizo.meta.DecimalRangeKind.prototype.compare =
    rhizo.meta.DecimalKind.prototype.compare;

rhizo.meta.DecimalRangeKind.prototype.cluster =
    rhizo.meta.DecimalKind.prototype.cluster;

rhizo.meta.DecimalRangeKind.prototype.isNumeric =
    rhizo.meta.DecimalKind.prototype.isNumeric;

rhizo.meta.DecimalRangeKind.prototype.toModelScale_ = function(filterValue) {
  // toFixed() returns a string, hence the need to parseFloat()
  return parseFloat((filterValue / this.scale_).toFixed(this.precision_));
};

rhizo.meta.DecimalRangeKind.prototype.toFilterScale_ = function(modelValue) {
  return Math.round(modelValue * this.scale_);
};

rhizo.meta.DecimalRangeKind.prototype.toHumanLabel_ =
  rhizo.meta.RangeKind.prototype.toHumanLabel_;

/**
 *  LogarithmRangeKind meta: A specialized filter that can render range sliders
 *  according to a Log10 scale.
 *  This filter reuses what provided by the DecimalRangeKind filter.
 *  
 *  If opt_oneplus is true, then the transformation it applies is Log10(1+x) 
 *  rather than Log10(x) (useful if your dataset has values that start from 0).
 */
rhizo.meta.LogarithmRangeKind = function(opt_precision, opt_oneplus) {
  this.precision_ = opt_precision || 2;
  this.scale_ = Math.pow(10, this.precision_);
  this.oneplus_ = !!opt_oneplus;
};

rhizo.meta.LogarithmRangeKind.prototype.renderFilter =
  rhizo.meta.DecimalRangeKind.prototype.renderFilter;

rhizo.meta.LogarithmRangeKind.prototype.survivesFilter =
    rhizo.meta.DecimalRangeKind.prototype.survivesFilter;

rhizo.meta.LogarithmRangeKind.prototype.compare =
    rhizo.meta.DecimalRangeKind.prototype.compare;

rhizo.meta.LogarithmRangeKind.prototype.cluster =
    rhizo.meta.DecimalRangeKind.prototype.cluster;

rhizo.meta.LogarithmRangeKind.prototype.isNumeric =
    rhizo.meta.DecimalRangeKind.prototype.isNumeric;

rhizo.meta.LogarithmRangeKind.prototype.toModelScale_ = function(filterValue) {
  // toFixed() returns a string, hence the need to parseFloat()
  var delta = this.oneplus_ ? -1 : 0;
  return parseFloat(
    Math.pow(10, filterValue / this.scale_).toFixed(this.precision_)) +  delta;
};

rhizo.meta.LogarithmRangeKind.prototype.toFilterScale_ = function(modelValue) {
  modelValue = this.oneplus_ ? modelValue+1 : modelValue;
  return Math.round(rhizo.util.log10_(modelValue) * this.scale_);
};

rhizo.meta.LogarithmRangeKind.prototype.toHumanLabel_ =
  rhizo.meta.DecimalRangeKind.prototype.toHumanLabel_;

/**
  StringArrayKind meta: A filter that behaves exactly like a String meta but
  expects the model to be an array of strings.

  TODO(battlehorse): This is still very temporary, since a) it doesn't support
  clustering and b) it could be made a lot more generic (create array filters
  out of normal filters by wrapping them).
*/
rhizo.meta.StringArrayKind = function() {};
rhizo.meta.StringArrayKind.prototype.renderFilter =
  rhizo.meta.StringKind.prototype.renderFilter;

rhizo.meta.StringArrayKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  if (filterValue != '') {
    for (var i=0; i<modelValue.length;i++) {
      if (modelValue[i].toLowerCase().indexOf(filterValue.toLowerCase()) != -1) {
        return true;
      }
    }
  }
  return false;
};

rhizo.meta.StringArrayKind.prototype.cluster = function(modelValue) {
  return { key: "undefined",
           label: "Clustering unsupported for this datatype." };
};

rhizo.meta.StringArrayKind.prototype.isNumeric = function() {
  return false;
};


// Register the extra filters
rhizo.meta.Kind.DECIMAL = new rhizo.meta.DecimalKind();
rhizo.meta.Kind.DECIMALRANGE = new rhizo.meta.DecimalRangeKind();
rhizo.meta.Kind.LOGARITHMRANGE = new rhizo.meta.LogarithmRangeKind();
rhizo.meta.Kind.STRINGARRAY = new rhizo.meta.StringArrayKind();
/* ./src/js/rhizo.layout.shared.js */
/*
  Copyright 2010 Riccardo Govoni battlehorse@gmail.com

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

/*
 * Shared components and utilities used by more than one layout engine.
 */

// RHIZODEP=rhizo.log,rhizo.meta
namespace("rhizo.layout");

/**
 * Creates a dropdown control that enumerates all the metaModel keys.
 * @param {rhizo.Project} project
 * @param {string} className
 * @param {function(string, Object):boolean} opt_matcher Optional function to
 *     decide whether to include a given metaModel key in the selector.
 *     Receives as parametes the key itself and the associated metamodel entry.
 * @return {Element} the jquery-enhanced HTML dropdown control
 */
rhizo.layout.metaModelKeySelector = function(project, className, opt_matcher) {
  var select = $("<select class='" + className + "' />");
  if (project && project.metaModel()) {
    for (var key in project.metaModel()) {
      if (!opt_matcher || opt_matcher(key, project.metaModel()[key])) {
        select.append("<option value='" + key + "'>" +
                      project.metaModel()[key].label + "</option>");        
      }
    }
  }
  return select;
};

/**
 * Converter that turns an unorganized set of rhizo.model.SuperModel instances
 * into a tree, according to a model attribute (parentKey) that defines the
 * parent-child relationships.
 * 
 * @param {string} parentKey the name of the model attribute that defines the
 *     parent-child relationship.
 */
rhizo.layout.Treeifier = function(parentKey) {
  this.parentKey_ = parentKey;
};

/**
 * Builds a hierarchical structure of TreeNodes. Raises exceptions
 * if cycles are found within the tree. Deals automatically with "filtered"
 * parts of the tree.
 * 
 * @param {Array.<rhizo.model.SuperModel>} supermodels A list of all supermodels
 *     to treeify.
 * @param {Object.<string, rhizo.model.SuperModel>} allmodels a map associating
 *     model ids to SuperModel instances, for all models currently known to the
 *     project.
 * @param {Object.<string, rhizo.layout.TreeNode>?} opt_globalNodesMap an
 *     optional map that will accumulate all TreeNodes, keyed by model id.
 * @return {rhizo.layout.TreeNode} the root TreeNode (that has no model
 *     attached) that contains the models treeification.
 */
rhizo.layout.Treeifier.prototype.buildTree = function(supermodels,
                                                      allmodels,
                                                      opt_globalNodesMap) {
  var globalNodesMap = opt_globalNodesMap || {};
  for (var i = 0, l = supermodels.length; i < l; i++) {
    globalNodesMap[supermodels[i].id] =
        new rhizo.layout.TreeNode(supermodels[i]);
  }

  var root = new rhizo.layout.TreeNode();

  // supermodels contains only the _visible_ models, while allmodels contains
  // all the known models.
  for (var i = 0, l = supermodels.length; i < l; i++) {
    if (!globalNodesMap[supermodels[i].unwrap().id].traversed_) {

      // we never encountered the node before. Start navigating
      // this branch upward, paying attention to cycles
      var localNodesMap = {};
      var model = supermodels[i].unwrap();

      while(true) {
        if (localNodesMap[model.id]) {
          // cycle detected
          throw new rhizo.layout.TreeCycleException(
              "Tree is invalid: cycle detected");
        }
        localNodesMap[model.id] = true;
        globalNodesMap[model.id].traversed_ = true;

        var parentSuperModel = this.findFirstVisibleParent_(
            allmodels,
            allmodels[model[this.parentKey_]]);
        if (parentSuperModel) {
          var parentModel = parentSuperModel.unwrap();
          globalNodesMap[parentModel.id].addChild(globalNodesMap[model.id]);
          model = parentSuperModel.unwrap();
        } else {
          root.addChild(globalNodesMap[model.id]);
          break;
        }
      }
    }
  }
  return root;
};

/**
 * From a given model, returns the first non-filtered model in the tree
 * hierarchy defined according to parentKey. If the given model itself is not
 * filtered, it is returned without further search. If a cycle is detected while
 * traversing filtered parents, an exception is raised.
 *
 * @param {Object.<string, rhizo.model.SuperModel>} allmodels a map associating
 *     model ids to SuperModel instances, for all models currently known to the
 *     project.
 * @param {rhizo.model.SuperModel} superParent the model to start the search from.
 * @private
 */
rhizo.layout.Treeifier.prototype.findFirstVisibleParent_ = function(allmodels,
                                                                    superParent) {
  if (!superParent) {
    return null;
  }

  var localNodesMap = {};
  while (superParent.isFiltered()) {
    if (localNodesMap[superParent.id]) {
      // cycle detected
      throw new rhizo.layout.TreeCycleException(
          "Tree is invalid: hidden cycle detected");
    }
    localNodesMap[superParent.id] = true;

    superParent = allmodels[superParent.unwrap()[this.parentKey_]];
    if (!superParent) {
      // we reached an hidden root.
      return null;
    }
  }

  return superParent;
};

/**
 * A class that represents a node in the tree and wraps the superModel
 * it contains.
 * @param {rhizo.model.SuperModel} opt_superModel The model this tree node
 *     wraps. If unspecified, this node is assumed to be the root of the tree.
 *     
 * @constructor
 */
rhizo.layout.TreeNode = function(opt_superModel) {
  this.superModel = opt_superModel;
  this.id = null;
  if (opt_superModel) {
    this.id = opt_superModel.id;    
  }
  this.childs = {};
  this.traversed_ = false;
  this.numChilds = 0;
  this.is_root = this.id == null;
};

rhizo.layout.TreeNode.prototype.addChild = function(treenode) {
  if (!this.childs[treenode.id]) {
    this.childs[treenode.id] = treenode;
    this.numChilds++;
  }
};

/**
 * @returns {Array.<rhizo.layout.TreeNode>} The immediate childs of this node.
 */
rhizo.layout.TreeNode.prototype.childsAsArray = function() {
  var models = [];
  for (var modelId in this.childs) {
    models.push(this.childs[modelId]);
  }
  return models;
};

/**
 * Deep find all the children of this node and appends them to the given array.
 * @param {Array.<rhizo.layout.TreeNode>} childs Array into which accumulate
 *     this node children.
 */
rhizo.layout.TreeNode.prototype.deepChildsAsArray = function(childs) {
  for (var modelId in this.childs) {
    childs.push(this.childs[modelId]);
    this.childs[modelId].deepChildsAsArray(childs);
  }
};

/**
 * An exception raised when cycles are encountered when treeifing a list of
 * SuperModels.
 * @constructor
 * @param {string} message Additional information about the specific cycle
 *     found.
 */
rhizo.layout.TreeCycleException = function(message) {
  this.message = message;
  this.name = "TreeCycleException";
};

rhizo.layout.TreeCycleException.prototype.toString = function() {
  return this.name + ": " + this.message;
};
/* ./src/js/rhizo.model.js */
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

rhizo.model.SuperModel = function(model, renderer) {
  this.model = model;
  this.id = model.id;
  this.selected = false;
  this.filters_ = {}; // a map of filter status, one for each model key
  this.rendering = null;
  this.naked_render = null;
  this.expanded = false; // whether the rendering is expanded or not
  // whether the rendering is visible or not. Multiple states might exist,
  // as defined in the rhizo.ui.Visibility enum.
  this.visibility = rhizo.ui.Visibility.HIDDEN;

  this.cacheDimensions_ = false;
  this.cachedDimensions_ = {};
  this.setRendererHelpers_(renderer);
  this.rendererRescaler_ = null;
  this.rendererStyleChanger_ = null;
};

rhizo.model.SuperModel.prototype.setRendererHelpers_ = function(renderer) {
  if (typeof(renderer.rescale) == 'function') {
    this.rendererRescaler_ = renderer.rescale;
  }
  if (typeof(renderer.changeStyle) == 'function') {
    this.rendererStyleChanger_ = renderer.changeStyle;
  }
};

rhizo.model.SuperModel.prototype.setDimensionCaching = function(
    cacheDimensions) {
  this.cacheDimensions_ = cacheDimensions;
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

rhizo.model.SuperModel.prototype.setNakedCss = function(props) {
  if (typeof props != 'object') {
    throw 'setNakedCss() expects a map of properties.';
  }
  if (this.rendererStyleChanger_) {
    this.rendererStyleChanger_(props);
  } else {
    this.naked_render.css(props);
  }
};

rhizo.model.SuperModel.prototype.nakedCss = function(propName) {
  if (typeof propName != 'string') {
    throw 'nakedCss() expects a string of the property to access.';
  }
  return this.naked_render.css(propName);
};

rhizo.model.SuperModel.prototype.refreshCachedDimensions = function() {
  if (this.rendering) {
    this.cachedDimensions_ = {
      width: this.rendering.get(0).offsetWidth,
      height: this.rendering.get(0).offsetHeight
    };
  }
};

/**
 * @return {Object.<string, number>} The cached dimensions of this model
 *     rendering. The returned object has a 'width' and 'height' property
 *     that map to the outer dimensions (incl. border and such) of the
 *     rendering.
 */
rhizo.model.SuperModel.prototype.getDimensions = function() {
  if (this.cacheDimensions_) {
    return this.cachedDimensions_;
  } else {
    return {
      width: this.rendering.get(0).offsetWidth,
      height: this.rendering.get(0).offsetHeight
    };
  }
};
/* ./src/js/rhizo.autorender.js */
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

// RHIZODEP=rhizo.meta
namespace("rhizo.autorender");

rhizo.autorender.AR = function(metamodel,
                               models,
                               opt_fallbackToDefaults,
                               opt_numfields) {
                                 
  this.metamodel_ = metamodel;
  this.metamodelFields_ = 0;
  for (var f in this.metamodel_) {
    this.metamodelFields_++;
  }
    
  this.fallbackToDefaults_ = typeof(opt_fallbackToDefaults) == 'undefined' ?
                             true : opt_fallbackToDefaults;
  this.locateFields_();

  var autoShownFields = 0; // counts the number of fields that will always show
                           // independently on opt_numfields
  if (this.sizeField_) {
    this.sizeRange_ = this.locateMinMax_(models, this.sizeField_);
    autoShownFields++;
  }

  if (this.colorField_) {
    this.colorRange_ = this.locateMinMax_(models, this.colorField_);
    autoShownFields++;    
  }
  
  this.numfields_ = typeof(opt_numfields) == 'undefined' ? 
      5 : 
      Math.max(opt_numfields, autoShownFields);

  // An autorender can always have its dimensions cached.
  this.cacheDimensions = true;
};

rhizo.autorender.AR.prototype.getSizeRange = function() {
  return this.sizeRange_;
};

rhizo.autorender.AR.prototype.getColorRange = function() {
  return this.colorRange_;
};

rhizo.autorender.AR.prototype.locateFields_ = function() {
  for (key in this.metamodel_) {
    this.masterField_ = this.masterField_ ||
                        this.getArField_(key, 'master', 'true');
    this.sizeField_ = this.sizeField_ ||
                      this.getArField_(key, 'bind', 'size');
    this.colorField_ = this.colorField_ ||
                       this.getArField_(key, 'bind', 'color');
  }
  this.locateDefaultFields_();
};

rhizo.autorender.AR.prototype.getArField_ = function(key, property, value) {
  if (this.metamodel_[key].ar) {
    var propVal = this.metamodel_[key].ar[property];
    if (propVal && propVal.toString().indexOf(value) != -1) {
      return key;
    }
  }
  return null;
};

rhizo.autorender.AR.prototype.locateDefaultFields_ = function() {
  for (key in this.metamodel_) {
    // master Field is by default the first one
    if (!this.masterField_) {
      this.masterField_ = key;
    }

    if (!this.fallbackToDefaults_) {
      break;
    }

    // size Field is the first numeric field
    if (!this.sizeField_ &&
          (this.metamodel_[key].kind == rhizo.meta.Kind.NUMBER ||
          this.metamodel_[key].kind == rhizo.meta.Kind.RANGE)) {
      this.sizeField_ = key;
      continue;
    }

    // color Field is the next numeric field, or the first one if
    // size is explicitly bound
    if (this.sizeField_) {
      if (!this.colorField_ &&
            (this.metamodel_[key].kind == rhizo.meta.Kind.NUMBER ||
            this.metamodel_[key].kind == rhizo.meta.Kind.RANGE)) {
        this.colorField_ = key;
      }
    }
  }
};

rhizo.autorender.AR.prototype.locateMinMax_ = function(models, key) {
  if (this.metamodel_[key].kind == rhizo.meta.Kind.RANGE) {
    return { min: this.metamodel_[key].min ,
             max: this.metamodel_[key].max ,
             label: this.metamodel_[key].label };
  } else {
    // number Kind
    // iterate over models to figure out min and max
    var modelMin = Number.POSITIVE_INFINITY;
    var modelMax = Number.NEGATIVE_INFINITY;
    $.each(models, function(i, model) {
      modelMin = Math.min(modelMin, model[key]);
      modelMax = Math.max(modelMax, model[key]);
    });
    return { min: modelMin, max: modelMax, label: this.metamodel_[key].label};
  }
};

rhizo.autorender.AR.prototype.getClass_ = function(value,
                                                   range,
                                                   renderingHints,
                                                   identifier) {
  // 0 to 5 scale
  var size = parseInt(((value - range.min) / (range.max - range.min))*5.0, 10);
  return 'ar-' + identifier + '-' + size.toString() + (renderingHints.small ? 'm' : '');
};


rhizo.autorender.AR.prototype.getFontClass_ = function(value,
                                                       range,
                                                       renderingHints,
                                                       master) {
  return this.getClass_(value, range, renderingHints, 'fon');
};

rhizo.autorender.AR.prototype.getColorClass_ = function(value,
                                                        range,
                                                        renderingHints) {
  return this.getClass_(value, range, renderingHints, 'col');
};

rhizo.autorender.AR.prototype.renderSingleModelKey_ = function(key, value) {
  var html = [];
  html.push('<p><span class="rhizo-autorender-label">');
  html.push(this.metamodel_[key].label);
  html.push('</span>: ');
  html.push(value);
  html.push('</p>');
  return html.join('');
};

/**
  Detects whether the renderings produced by this renderer can be expanded
  or not. 
  If the rendering is small (via renderingHints)
    then only the masterField is shown and expandable is true if there are
    additional fields.
  If the rendering is not small
    then expandable is true if there are more fields, in addition to the
    ones are already shown (numfields_) plus the masterField (that is always
    shown).
 */
rhizo.autorender.AR.prototype.expandable = function(renderingHints) {
  var threshold = renderingHints.small ? 1 :  this.numfields_ + 1;
  return this.metamodelFields_ > threshold;
};

rhizo.autorender.AR.prototype.render = function(model, 
                                                expanded, 
                                                renderingHints) {
  var colorClass = 'ar-col-0' + (renderingHints.small ? 'm' : '');
  if (this.colorField_) {
    colorClass = this.getColorClass_(model[this.colorField_],
                                     this.colorRange_,
                                     renderingHints);
  }

  var fontClass = 'ar-fon-0' + (renderingHints.small ? 'm' : '');
  if (this.sizeField_) {
    fontClass = this.getFontClass_(model[this.sizeField_],
                                   this.sizeRange_,
                                   renderingHints);
  }

  if (renderingHints.small && !expanded) {
    return $("<div class='rhizo-autorender " + colorClass + "'>" +
             "<span class='" + fontClass + "'>" +
             model[this.masterField_] + "</span>" +
             "</div>");
  } else {
    html = [];
    html.push("<div class='rhizo-autorender " + colorClass + "'>");
    html.push("<span class='" + fontClass + "'>" +
              model[this.masterField_] + "</span>");

    var count = 0;
    if (this.sizeField_) {
      html.push(this.renderSingleModelKey_(this.sizeField_,
                                           model[this.sizeField_]));
      count++;
    }

    if (this.colorField_ && this.colorField_ != this.sizeField_) {
      html.push(this.renderSingleModelKey_(this.colorField_,
                                           model[this.colorField_]));
      count++;
    }

    for (key in this.metamodel_) {
      if (count >= this.numfields_ && !expanded) {
        break;
      }
      if (key != this.sizeField_ &&
          key != this.colorField_ &&
          key != this.masterField_) {
        count++;
        html.push(this.renderSingleModelKey_(key, model[key]));
      }
    }
    html.push("</div>");
    return $(html.join(''));
  }
};
/* ./src/js/rhizo.gviz.js */
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

// RHIZODEP=rhizo.meta,rhizo.autorender
namespace("rhizo.gviz");

rhizo.gviz.Initializer = function(dataTable,
                                  project,
                                  opt_options,
                                  opt_customRenderer) {
  this.dt_ = dataTable;
  this.project_ = project;
  this.options_ = opt_options || {};
  this.customRenderer_ = opt_customRenderer;

  this.init_();
};

rhizo.gviz.Initializer.prototype.init_ = function() {
  this.metamodel = this.buildMetaModel_();
  this.models = this.loadModels_(this.metamodel);
  this.renderer = this.customRenderer_ ?
                  this.customRenderer_ :
                  this.createDefaultRenderer_(this.metamodel, this.models);
};

rhizo.gviz.Initializer.prototype.buildMetaModel_ = function() {
  var metamodel = {};
  for (var i = 0, len = this.dt_.getNumberOfColumns(); i < len; i++) {
    var id = this.dt_.getColumnId(i);
    metamodel[id] = {};

    // parsing label
    metamodel[id].label = this.dt_.getColumnLabel(i);
    if (metamodel[id].label == '') {
      metamodel[id].label = "Column " + id;
    }

    // parsing kind
    var type = this.dt_.getColumnType(i);
    if (type == 'number') {
      var min = this.dt_.getColumnRange(i).min;
      var max = this.dt_.getColumnRange(i).max;
      if (min == max) {
        metamodel[id].kind = rhizo.meta.Kind.NUMBER;
      } else {
        metamodel[id].kind = rhizo.meta.Kind.RANGE;
        metamodel[id].min = min;
        metamodel[id].max = max;
      }
    } else if (type == 'boolean') {
      metamodel[id].kind = rhizo.meta.Kind.BOOLEAN;
    } else {
      // assumed string type
      if (type != 'string') {
        this.project_.logger().warning(
            "Column " + metamodel[id].label +
            " will be treated as String. Unsupported type: " + type);
      }

      if (metamodel[id].label.indexOf("CAT") != -1) {
        // if column title contains the word CAT, assume it's a category
        // yeah, I know, pretty crappy way of identifying categories.
        metamodel[id].kind = rhizo.meta.Kind.CATEGORY;
        metamodel[id].label =
            metamodel[id].label.replace("CAT","").replace(/^\s+|\s+$/g, "");
        metamodel[id].categories = this.parseCategories_(i);

        if (metamodel[id].label.indexOf("MUL") != -1) {
          metamodel[id].label =
              metamodel[id].label.replace("MUL","").replace(/^\s+|\s+$/g, "");
          metamodel[id].multiple = true;
        }
      } else {
        metamodel[id].kind = rhizo.meta.Kind.STRING;
      }
    }

    // parsing autorender attributes, if any
    this.buildAutoRenderInfo_(metamodel[id], id);
  }
  return metamodel;
};


rhizo.gviz.Initializer.prototype.parseSingleCategory_ = function(value) {
  var categoriesMap = {};
  var rawCats = value.split(',');
  var prunedCats = $.grep(rawCats, function(category) {
    return category != '';
  });

  for (var i = 0; i < prunedCats.length; i++) {
    categoriesMap[prunedCats[i].replace(/^\s+|\s+$/g, "")] = true;
  }

  var categories = [];
  for (category in categoriesMap) {
    categories.push(category);
  }

  return categories;
};

rhizo.gviz.Initializer.prototype.parseCategories_ = function(columnIndex) {
  var categoriesMap = {};
  for (var i = 0, len = this.dt_.getNumberOfRows(); i < len; i++) {
    var rowCategories = this.parseSingleCategory_(
        this.dt_.getValue(i, columnIndex));
    for (var r = 0; r < rowCategories.length; r++) {
      categoriesMap[rowCategories[r]] = true;
    }
  }

  var categories = [];
  for (category in categoriesMap) {
    categories.push(category);
  }

  return categories.sort();
};

rhizo.gviz.Initializer.prototype.buildAutoRenderInfo_ =
    function(metamodelEntry, id) {
  var ar = {};
  var hasArAttribute = false;
  if (this.options_.arMaster &&
      this.matchAutoRenderOption_(
          this.options_.arMaster, metamodelEntry.label, id)) {
    ar.master = true;
    hasArAttribute = true;
  }
  if (this.options_.arSize &&
      this.matchAutoRenderOption_(
          this.options_.arSize, metamodelEntry.label, id)) {
    ar.bind = (ar.bind ? ar.bind : '') + 'size ';
    hasArAttribute = true;
  }
  if (this.options_.arColor &&
      this.matchAutoRenderOption_(
          this.options_.arColor, metamodelEntry.label, id)) {
    ar.bind = (ar.bind ? ar.bind : '') + 'color ';
    hasArAttribute = true;
  }
  if (hasArAttribute) {
    metamodelEntry.ar = ar;
  }
};

rhizo.gviz.Initializer.prototype.matchAutoRenderOption_ =
    function(optionValue, label, id) {
  var colRegExp = /^[a-zA-Z]$/;
  if (colRegExp.test(optionValue)) {
    // try matching the column header
    return optionValue.toLowerCase() == new String(id).toLowerCase();

  } else {

    // otherwise try to match the column label
    if (label.toLowerCase() == optionValue.toLowerCase()) {
      return true;
    } else {

      // if still unsuccessful, verify that category tags
      // are not causing the problem
      return label.replace("CAT", "").replace("MUL", "").toLowerCase() ==
             optionValue.toLowerCase();
    }
  }
};

rhizo.gviz.Initializer.prototype.loadModels_ = function(metamodel) {
  var models = [];
  for (var i = 0, len = this.dt_.getNumberOfRows(); i < len; i++) {
    var model = {};
    for (var j = 0, clen = this.dt_.getNumberOfColumns(); j < clen; j++) {
      model.id = "gviz-" + i;
      var value = this.dt_.getValue(i, j);
      if (metamodel[this.dt_.getColumnId(j)].kind == rhizo.meta.Kind.CATEGORY) {
        model[this.dt_.getColumnId(j)] = this.parseSingleCategory_(value);
      } else {
        model[this.dt_.getColumnId(j)] = value;
      }

    }
    models.push(model);
  }
  return models;
};

rhizo.gviz.Initializer.prototype.createDefaultRenderer_ =
    function(metamodel, models) {
  return new rhizo.autorender.AR(metamodel,
                                 models,
                                 this.options_.arDefaults,
                                 this.options_.arNumFields);
  // return new rhizo.gviz.DebugRenderer(this.dt_);
};

rhizo.gviz.DebugRenderer = function(dataTable) {
  this.dt_ = dataTable;
}

rhizo.gviz.DebugRenderer.prototype.render = function(model) {
  var div = $("<div />");
  for (var j = 0, clen = this.dt_.getNumberOfColumns(); j < clen; j++) {
    div.append("<p>" + model[this.dt_.getColumnId(j)] + "</p>");
  }
  return div;
};
/* ./src/js/rhizo.layout.js */
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

/*
To define a new layout:

- create the object

- implement the layout() function
  This is responsible for the actual layouting

- implement the toString() function
  This returns the layout name for display purposes

- implement the verifyMetaModel() function (optional)
  This verifies the current project metaModel and decides whether it
  contains the right kinds for this layout to work. If not implemented, it is
  assumed the layout can work with the current metamodel.

- implement the details() function (optional)
  This renders a piece of UI you can use to collect extra options
  for your layout

- implement the cleanup() function (optional)
  If your layout creates data structures or UI components that
  have to be cleaned up

- implement the dependentModels() function (optional)
  If your layout establish specific relationships between models (this may be
  the case, for example, of hierarchical layouts that define parent-child
  relationships between models). Rhizosphere may use the information about
  dependent models to tweak the way other aspects work, such as selection
  management.

- update the rhizo.layout.layouts structure
*/

// RHIZODEP=rhizo.log,rhizo.meta,rhizo.layout.shared
namespace("rhizo.layout");

rhizo.layout.NoLayout = function(unused_project) {};

rhizo.layout.NoLayout.prototype.layout = function(container,
                                                  supermodels,
                                                  allmodels,
                                                  meta,
                                                  options) {
  return false;
};

rhizo.layout.NoLayout.prototype.toString = function() {
  return "-";
};

rhizo.layout.FlowLayout = function(project, opt_top, opt_left) {
  this.project_ = project;
  this.top = opt_top || 5;
  this.left = opt_left || 5;
  this.orderSelector_ = null;
  this.reverseCheckbox_ = null;
};

rhizo.layout.FlowLayout.prototype.layout = function(container,
                                                    supermodels,
                                                    allmodels,
                                                    meta,
                                                    options) {
  var maxWidth = container.width();
  var lineHeight = 0;

  // reorder supermodels if needed
  var order = this.orderSelector_.val();
  var reverse = this.reverseCheckbox_.is(":checked");
  if (order) {
    this.project_.logger().info("Sorting by " + order);
    supermodels.sort(rhizo.meta.sortBy(order, meta[order].kind, reverse));
  }

  // layout supermodels
  for (var i = 0, len = supermodels.length; i < len; i++) {
    var modelDims = supermodels[i].getDimensions();
    lineHeight = Math.max(lineHeight, modelDims.height);

    if (this.left + modelDims.width > maxWidth) {
      this.left = 5;
      this.top += lineHeight + 5;
      lineHeight = modelDims.height;
    }

    supermodels[i].rendering.move(this.top, this.left);
    this.left += modelDims.width + 5;
  }
  // adjust top after last line
  this.top += lineHeight;
  return false;
};

rhizo.layout.FlowLayout.prototype.overrideDetailControls = function(
  orderSelector, reverseCheckbox) {
  this.orderSelector_ = orderSelector;
  this.reverseCheckbox_ = reverseCheckbox;
};

rhizo.layout.FlowLayout.prototype.cleanup = function(sameEngine, options) {
  this.top = this.left = 5;
  return false;
};

rhizo.layout.FlowLayout.prototype.details = function() {
  this.orderSelector_ =  rhizo.layout.metaModelKeySelector(
    this.project_, 'rhizo-flowlayout-order');
  this.reverseCheckbox_ = $(
    '<input type="checkbox" class="rhizo-flowlayout-desc" />');
  return $("<div />").
           append("Ordered by: ").
           append(this.orderSelector_).
           append(" desc?").
           append(this.reverseCheckbox_);
};

rhizo.layout.FlowLayout.prototype.toString = function() {
  return "List";
};

rhizo.layout.ScrambleLayout = function(unused_project) {};

rhizo.layout.ScrambleLayout.prototype.layout = function(container,
                                                        supermodels,
                                                        allmodels,
                                                        meta,
                                                        options) {
  if (options.filter) {
    return false; // re-layouting because of filtering doesn't affect the layout
  }
  var containerWidth = container.width();
  var containerHeight = container.height();
  var maxWidth = Math.round(containerWidth*0.3) ;
  var maxHeight = Math.round(containerHeight*0.3);

  for (var i = 0, len = supermodels.length; i < len; i++) {
    var r = $(supermodels[i].rendering);
    var top = Math.round(containerHeight / 3 +
                         Math.random()*maxHeight*2 - maxHeight);
    var left = Math.round(containerWidth / 3 +
                          Math.random()*maxWidth*2 - maxWidth);

    r.move(top, left);
  }
  return false;
};

rhizo.layout.ScrambleLayout.prototype.toString = function() {
  return "Random";
};

rhizo.layout.BucketLayout = function(project) {
  this.project_ = project;
  this.internalFlowLayout_ = new rhizo.layout.FlowLayout(project);
  this.bucketHeaders_ = [];
  this.bucketSelector_ = null;
  this.reverseCheckbox_ = null;
};

rhizo.layout.BucketLayout.prototype.layout = function(container,
                                                      supermodels,
                                                      allmodels,
                                                      meta,
                                                      options) {
  var reverse = this.reverseCheckbox_.is(":checked");

  // detect bucket
  var bucketBy = this.bucketSelector_.val();
  if (!meta[bucketBy]) {
    this.project_.logger().error("layoutBy attribute does not match any property");
    return false;
  }
  this.project_.logger().info("Bucketing by " + bucketBy);

  this.internalFlowLayout_.overrideDetailControls(this.bucketSelector_,
                                                  this.reverseCheckbox_);

  var clusterFunction;
  var clusterThis;
  if (meta[bucketBy].cluster) {
    clusterFunction = meta[bucketBy].cluster;
    clusterThis = meta[bucketBy];
  } else {
    clusterFunction = meta[bucketBy].kind.cluster;
    clusterThis = meta[bucketBy].kind;
  }
  var buckets = {};
  var bucketsLabels = {};

  // figure out the bucket for each model
  for (var i = 0, len = supermodels.length; i < len; i++) {
    var bucketKey = supermodels[i].unwrap()[bucketBy];
    var bucketLabel = bucketKey;
    if (clusterFunction) {
      var keyLabel = clusterFunction.call(clusterThis, bucketKey);
      bucketKey = keyLabel['key'];
      bucketLabel = keyLabel['label'];
    }
    if (!buckets[bucketKey]) {
      buckets[bucketKey] = [];
      bucketsLabels[bucketKey] = bucketLabel;
    }
    buckets[bucketKey].push(supermodels[i]);
  }

  // collect unique bucketKeys
  var bucketKeys = [];
  for (bucketKey in buckets) {
    bucketKeys.push(bucketKey);
  }

  // sort bucketKeys
  bucketKeys.sort(rhizo.meta.sortByKind(meta[bucketBy].kind, reverse));

  var dirty = false;
  for (var i = 0; i < bucketKeys.length; i++) {
    var bucketKey = bucketKeys[i];
    this.renderBucketHeader_(container, bucketsLabels[bucketKey]);
    dirty = this.internalFlowLayout_.layout(container,
                                            buckets[bucketKey],
                                            allmodels,
                                            meta,
                                            options) || dirty;

    // re-position for next bucket
    this.internalFlowLayout_.top += 10;
    this.internalFlowLayout_.left = 5;
  }
  return dirty;
};

rhizo.layout.BucketLayout.prototype.renderBucketHeader_ =
    function(container, header) {
  var bucketHeader = $("<div class='rhizo-bucket-header'>" +
                       header +
                       "</div>");
  bucketHeader.css('position', 'absolute').
               css('left', 5).
               css('top', this.internalFlowLayout_.top);
  this.bucketHeaders_.push(bucketHeader);
  container.append(bucketHeader);
  this.internalFlowLayout_.top += bucketHeader.height() + 5;
};


rhizo.layout.BucketLayout.prototype.details = function() {
  this.bucketSelector_ = rhizo.layout.metaModelKeySelector(
      this.project_, 'rhizo-bucketlayout-bucket');
  this.reverseCheckbox_ = $('<input type="checkbox" ' +
                            'class="rhizo-bucketlayout-desc" />');
  return $("<div />").
           append("Group by: ").
           append(this.bucketSelector_).
           append(" desc?").
           append(this.reverseCheckbox_);
};

rhizo.layout.BucketLayout.prototype.cleanup = function(sameEngine, options) {
  this.internalFlowLayout_.cleanup(sameEngine, options);
  $.each(this.bucketHeaders_, function() { this.remove(); });
  this.bucketHeaders_ = [];
  return false;
};

rhizo.layout.BucketLayout.prototype.toString = function() {
  return "Buckets";
};


rhizo.layout.layouts = {
  no: rhizo.layout.NoLayout,
  flow: rhizo.layout.FlowLayout,
  scramble: rhizo.layout.ScrambleLayout,
  bucket: rhizo.layout.BucketLayout
};
/* ./src/js/rhizo.base.js */
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
  this.filterAutocommit_ = true;

  if (rhizo.nativeConsoleExists()) {
    this.logger_ = new rhizo.NativeLogger();
  } else {
    this.logger_ = new rhizo.NoOpLogger();
  }
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
  this.gui_.disableFx(true);

  // laying out models and re-aligning elements' visibility
  this.layout(this.curLayoutName_, {forcealign: true});

  // re-aligning animation settings
  this.alignFx();
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

rhizo.Project.prototype.enableFilterAutocommit = function(enable) {
  this.filterAutocommit_ = enable;
  if (this.filterAutocommit_) {
    // If there are any greyed models when auto-filtering is re-enabled, we
    // commit the filter.
    for (var i = this.models_.length-1; i >= 0; i--) {
      if (this.models_[i].visibility == rhizo.ui.Visibility.GREY) {
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
                    this.gui_.allRenderingHints());
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
                             this.gui_.allRenderingHints());
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
    this.resetAllFilter(key);
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
          this.models_[i].visibility == rhizo.ui.Visibility.HIDDEN) {
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
  this.layout(null, {filter: true, forcealign: true});
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
    if (this.models_[i].visibility >= rhizo.ui.Visibility.GREY) {
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
  var renderingsToFadeOut = [];
  var renderingsToFadeIn = [];
  for (var i = this.models_.length-1; i >=0; i--) {
    if (this.models_[i].isFiltered()) {
      if (this.models_[i].visibility > filtered_visibility) {
        renderingsToFadeOut.push(this.models_[i].rendering.get(0));
        this.models_[i].visibility = filtered_visibility;
      }
    } else if (this.models_[i].visibility <= filtered_visibility) {
      // Items that were completely hidden must be repositioned.
      forceLayout = forceLayout || this.models_[i].visibility == vis.HIDDEN;
      renderingsToFadeIn.push(this.models_[i].rendering.get(0));
      this.models_[i].visibility = vis.VISIBLE;
    }
  }
  $(renderingsToFadeOut).fadeTo(filtered_visibility);
  $(renderingsToFadeIn).fadeTo(vis.VISIBLE);

  return forceLayout;
};
/* ./src/js/rhizo.layout.tree.js */
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

/*
  The whole TreeLayout depends on the following classes:
  - TreeLayout: the layout itself. It builds the tree structure out of the
    supermodels and, for every root found, draws a tree. Trees are stacked from
    left to right, top to bottom, hence this class uses the 'traditional' set of
    positioning coordinates (top, left, width, height).

  - TreeNode: a simple datastructure representing a node in the tree. It is used
    also to store some rendering information about the node, such as the
    bounding rectangle which can contain the rendering of the node itself and
    all its children

  - TreePainter: the class responsible for drawing each tree (aka, each set of
    nodes connected to a single root). Since trees can be rendered both
    vertically and horizontally, the TreePainter uses and abstract set of
    coordinates :
    * gd: the growing direction
    * od: the opposite direction
    Siblings are appended to the layout following the growing direction.
    Childs are appended to their parents following the opposite direction.

    Hence, in a horizontal tree, _gd_ is left to right and _od_ is top to bottom.
    In a vertical tree, _gd_ is top to bottom and _od_ is left to right.

    Using this abstract set of coordinates allows the TreePainter to re-use the
    same rendering code.
    Utility methods are provided to convert between the 'physical' and
    'abstract' coordinate set.
*/

// RHIZODEP=rhizo.layout

/**
 * @constructor
 */
rhizo.layout.TreeLayout = function(project) {
  this.project_ = project;
  this.directionSelector_ = null;
  this.metaModelKeySelector_ = null;

  this.parentKeys_ = [];

  /**
   * @type {Object.<string, rhizo.layout.TreeNode>}
   * @private
   */
  this.globalNodesMap_ = null;
};

rhizo.layout.TreeLayout.prototype.verifyMetaModel = function(meta) {
  for (var key in meta) {
    if (!!meta[key].isParent) {
      this.parentKeys_.push(key);
    }
  }
  return this.parentKeys_.length > 0;
};

rhizo.layout.TreeLayout.prototype.layout = function(container,
                                                    supermodels,
                                                    allmodels,
                                                    meta,
                                                    options) {
  // detect parent
  var parentKey;
  if (this.parentKeys_.length == 0) {
    this.project_.logger().error(
        'Unable to identify parent-child relationships');
    return false;
  } else if (this.parentKeys_.length == 1) {
    parentKey = this.parentKeys_[0];
  } else {
    parentKey = this.metaModelKeySelector_.val();
  }
  this.project_.logger().info("Creating tree by " + parentKey);

  // detect rendering direction
  var vertical = this.directionSelector_.val() == 'ver';
  this.treePainter_ = new rhizo.layout.TreePainter(vertical);

  try {
    // builds the tree model and also checks for validity
    this.globalNodesMap_ = {};
    var roots = new rhizo.layout.Treeifier(parentKey).buildTree(
        supermodels, allmodels, this.globalNodesMap_).childs;

    var drawingOffset = { left: 0, top: 0 };

    var maxHeight = 0;
    for (var id in roots) { // for each root found

      // calculate the bounding rectangle for the whole tree,
      // in gd-od coordinates
      var unrotatedBoundingRect =
          this.treePainter_.calculateBoundingRect_(roots[id]);

      // flip the bounding rectangle back to physical coordinates
      var boundingRect =
          this.treePainter_.toAbsoluteCoords_(unrotatedBoundingRect);

      // 'return carriage' if needed
      if (drawingOffset.left + boundingRect.w > container.width()) {
        drawingOffset.left = 0;
        drawingOffset.top += maxHeight + (maxHeight > 0 ? 5 : 0);
      }

      // Flip the drawing offset back into the gd-od coordinate set
      // and draw the tree.
      this.treePainter_.draw_(
          container, roots[id],
          this.treePainter_.toRelativeCoords_(drawingOffset));

      // update offset positions
      drawingOffset.left += boundingRect.w;
      maxHeight = Math.max(maxHeight, boundingRect.h);
    }
  } catch(e) {
    if (e.name == "TreeCycleException") {
      this.project_.logger().error(e);
    } else {
      throw e;
    }
  }
  return false;
};

rhizo.layout.TreeLayout.prototype.details = function() {
  var details = $("<div />");
  if (this.parentKeys_.length == 0) {
    details.append("No parent-child relationships exist");
    return details;
  }

  details.append(" arrange ");
  this.directionSelector_ = $("<select class='rhizo-treelayout-direction' />");
  this.directionSelector_.append("<option value='hor'>Horizontally</option>");
  this.directionSelector_.append("<option value='ver'>Vertically</option>");
  details.append(this.directionSelector_);

  if (this.parentKeys_.length > 1) {
    this.metaModelKeySelector_ = rhizo.layout.metaModelKeySelector(
      this.project_, 'rhizo-treelayout-parentKey', function(key, meta) {
        return !!meta.isParent;
      });
    details.append(" by ").append(this.metaModelKeySelector_);
  }
  return details;
};

rhizo.layout.TreeLayout.prototype.toString = function() {
  return "Tree";
};

rhizo.layout.TreeLayout.prototype.cleanup = function(sameEngine, options) {
  if (this.treePainter_) {
    this.treePainter_.cleanup_();
  }
  return false;
};

rhizo.layout.TreeLayout.prototype.dependentModels = function(modelId) {
  var extension = [];
  var treeNode = this.globalNodesMap_[modelId];
  if (treeNode) {
    treeNode.deepChildsAsArray(extension);
    for (var i = extension.length-1; i >= 0; i--) {
      extension[i] = extension[i].id;
    }
  }
  return extension;
};


/*
  The whole class depends on coordinate transformation between screen
  width-height into the gd-od coordinates.

  +--------> width/left
  |
  |        Vertical layout      Horizontal Layout
  |        +-------> od         +-------> gd
  |        |                    |
  \/       |  [P]               |   +-[P]-+---+
  height   |   |__[c]           |   |     |   |
  top      |   |__[c]           |   [c]   [c] [c]
           \/                   \/
          gd                    od

  This class adopts two different layout variations when rendered vertically
  rather than horizontally.

  When rendered vertically, each parent will always be above, or at the same
  (physical or, equivalently, gd) height as the highest of its children.
  In this way, it looks like childrens are hanging under the parents.
  This is called the 'packed' layout.

  When rendered horizontally, each parent will be positioned evenly in the
  middle along the (phyisical, or, equivalently gd) width of the area occupied
  by all its children. It this way, the tree appears to be balanced.
  This is called the 'even' layout.
*/
/**
 * @constructor
 */
rhizo.layout.TreePainter = function(vertical) {
  this.connectors_ = [];
  this.vertical_ = vertical;

  // translate coordinate names and distances into gd-od names
  if (this.vertical_) {
    this.gdName_ = 'top';
    this.odName_ = 'left';
    this.gdLength_ = 'height';
    this.odLength_ = 'width';
  } else {
    this.gdName_ = 'left';
    this.odName_ = 'top';
    this.gdLength_ = 'width';
    this.odLength_ = 'height';

  }
}

/**
 * Given the dimensions of a rendering, which is a DOM block element with
 * physical coordinates, return its size in the growing direction.
 *
 * @param {Object.<string, Number>} renderingDims a map describing the
 *     dimensions (width, height) of a model rendering.
 * @returns {number} its dimension in the gd axis
 * @private
 */
rhizo.layout.TreePainter.prototype.gd_ = function(renderingDims) {
  return this.vertical_ ? renderingDims.height : renderingDims.width;
};

/**
 * Given the dimensions of a rendering, which is a DOM block element with
 * physical coordinates, return its size in the opposite direction.
 *
 * @param {Object.<string, Number>} rendering a map describing the
 *     dimensions (width, height) of a model rendering.
 * @returns {number} its dimension in the od axis
 * @private
 */
rhizo.layout.TreePainter.prototype.od_ = function(renderingDims) {
  return this.vertical_ ? renderingDims.width : renderingDims.height;
};

/**
 * Converts gd-od coordinates into a physical width-height pair
 * @private
 */
rhizo.layout.TreePainter.prototype.toAbsoluteCoords_ = function(boundingRect) {
  return this.vertical_ ?
    { w: boundingRect.od , h: boundingRect.gd} :
    { w: boundingRect.gd , h: boundingRect.od};
};

/**
 * Converts a phyisical top-left coordinate into its gd-od equivalent
 * @private
 */
rhizo.layout.TreePainter.prototype.toRelativeCoords_ = function(offset) {
  return this.vertical_ ?
    { gd: offset.top, od: offset.left } :
    { gd: offset.left, od: offset.top };
};

/**
 * Given the dimensions of a rendering, it returns the gd-od coordinate of its
 * center, assuming it is positioned in 'packed' layout.
 * @private
 */
rhizo.layout.TreePainter.prototype.packedCenter_ = function(offset,
                                                            renderingDims) {
  return {
    gd: offset.gd + 5 + this.gd_(renderingDims)/2,
    od: offset.od + this.od_(renderingDims)/2
  };
};

/**
 * Given the dimensions of a rendering, it returns the gd-od coordinate of its
 * center, assuming it is positioned in 'even' layout.
 * @private
 */
rhizo.layout.TreePainter.prototype.evenCenter_ = function(offset,
                                                          renderingDims,
                                                          boundingRect) {
  return {
    gd: offset.gd + boundingRect.gd / 2,
    od: offset.od + 5 + this.od_(renderingDims)/2
  };
};


/**
 * For every node, recursively calculate its bounding rectangle,
 * in gd-od coordinates.
 *
 * @param {rhizo.layout.TreeNode} treenode the node
 * @private
 */
rhizo.layout.TreePainter.prototype.calculateBoundingRect_ = function(treenode) {
  var childsArea = { gd: 0, od: 0};
  for (var childId in treenode.childs) {
    var childRect = this.calculateBoundingRect_(treenode.childs[childId]);
    childsArea.gd += childRect.gd + 5;
    childsArea.od = Math.max(childsArea.od, childRect.od);
  }

  var dims = treenode.superModel.getDimensions();

  // enrich the treenode with rendering info
  treenode.boundingRect =
    {
      // 20 px padding between node and childs, 5 px padding for the whole rect
      od: this.od_(dims) + childsArea.od + 25,
      gd: Math.max(this.gd_(dims), childsArea.gd) + 5};

  return treenode.boundingRect;
};

/**
 * Recursively draw every node and, if the node is not a root, the connectors to
 * its parent. This method differentiates between the packed and even layouting
 * within the tree.
 *
 * @private
 */
rhizo.layout.TreePainter.prototype.draw_ = function(container,
                                                    treenode,
                                                    offset,
                                                    parentOffset,
                                                    parentNode) {
  var r = treenode.superModel.rendering;
  var dims = treenode.superModel.getDimensions();

  // vertical layout stacks items from the top, while the horizontal layout
  // keeps the tree center aligned.
  if (this.vertical_) {
    r.move(offset.gd + 5, offset.od);

    // draw connector if needed
    if (parentOffset != null) {
      this.drawConnector_(container,
        this.packedCenter_(offset, dims),
        this.packedCenter_(parentOffset,
                           parentNode.superModel.getDimensions()));
    }
  } else {
    r.move(offset.od + 5,
           offset.gd + (treenode.boundingRect.gd - this.gd_(dims))/2);

    // draw connector if needed
    if (parentOffset != null) {
      this.drawConnector_(container,
        this.evenCenter_(offset, dims, treenode.boundingRect),
        this.evenCenter_(parentOffset,
                         parentNode.superModel.getDimensions(),
                         parentNode.boundingRect));
    }
  }

  // Renders all the children along the gd direction
  var progressiveGd = offset.gd;
  for (var childId in treenode.childs) {
    var childNode = treenode.childs[childId];

    var childOffset = {
      od: offset.od + this.od_(dims) + 20,
      gd: progressiveGd
    };
    this.draw_(container, childNode, childOffset, offset, treenode);
    progressiveGd += childNode.boundingRect.gd + 5;
  }
};


/**
 * Draws a connector between a node and its parent. A connector is always
 * composed of two segments.
 * A segment along the gd axis and a segment along the od axis.
 *
 * @param curCenter the gd-od coordinate of the center of the current node
 * @param parentCenter the gd-od coordinate of the center of its parent node
 * @private
 */
rhizo.layout.TreePainter.prototype.drawConnector_ = function(container,
                                                             curCenter,
                                                             parentCenter) {
  var gdCssAttrs = {position: 'absolute'};
  gdCssAttrs[this.gdName_] = Math.min(curCenter.gd, parentCenter.gd);
  gdCssAttrs[this.odName_] = parentCenter.od;
  gdCssAttrs[this.odLength_] = 2;
  gdCssAttrs[this.gdLength_] = Math.abs(parentCenter.gd - curCenter.gd);

  var gdconnector = $('<div />', {
                        'class': 'rhizo-tree-connector',
                        css: gdCssAttrs});

  var odCssAttrs = {position: 'absolute'};
  odCssAttrs[this.gdName_] = curCenter.gd;
  odCssAttrs[this.odName_] = parentCenter.od;
  odCssAttrs[this.gdLength_] = 2;
  odCssAttrs[this.odLength_] = Math.abs(parentCenter.od - curCenter.od);

  var odconnector = $('<div />', {
                        'class': 'rhizo-tree-connector',
                        css: odCssAttrs});

  this.connectors_.push(gdconnector);
  this.connectors_.push(odconnector);
  container.append(gdconnector);
  container.append(odconnector);
};

rhizo.layout.TreePainter.prototype.cleanup_ = function() {
  $.each(this.connectors_, function() { this.remove(); });
  this.connectors_ = [];
};


// register the treelayout in the global layouts list
rhizo.layout.layouts.tree = rhizo.layout.TreeLayout;
/* ./src/js/rhizo.ui.component.js */
/*
  Copyright 2009 Riccardo Govoni battlehorse@gmail.com

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

// RHIZODEP=rhizo.ui,rhizo.layout
// Components Namespace
namespace("rhizo.ui.component");

// Progress-bar to handle application startup feedback
rhizo.ui.component.Progress = function(container) {
  this.pbarPanel_ = $('<div/>', {'class': 'rhizo-progressbar-panel'}).appendTo(container);
  var pbar = $('<div/>', {'class': 'rhizo-progressbar'}).appendTo(this.pbarPanel_);
  this.pbar_ = pbar.progressbar({value: 1});
  this.pbarText_ = $('<div/>', {'class': 'rhizo-progressbar-text'}).
      text('Loading...').
      appendTo(this.pbarPanel_);
};

rhizo.ui.component.Progress.prototype.update = function(value, opt_text) {
  this.pbar_.progressbar('value', value);
  if (opt_text) {
    this.pbarText_.text(opt_text);
  }
  if (value >= 100) {
    this.destroy_();
  }
};

rhizo.ui.component.Progress.prototype.destroy_ = function() {
  if (this.pbarPanel_.is(':visible')) {
    setTimeout(jQuery.proxy(function() {
      this.pbarPanel_.fadeOut(500, function() {
        $(this).remove();
      });
    }, this), 1000);
  } else {
    this.pbarPanel_.remove();
  }
};

rhizo.ui.component.Logo = function(floating) {
  this.floating_ = floating;
};

rhizo.ui.component.Logo.prototype.getPanel = function() {
  return this.logoPanel_;
};

rhizo.ui.component.Logo.prototype.render = function(container, gui, options) {
  gui.addComponent('rhizo.ui.component.Logo', this);
  this.logoPanel_ = $('<div />', {'class': 'rhizo-logo'}).html(
      '<h1>Rhizosphere</h1><p>' +
      'by <a href="mailto:battlehorse@gmail.com">Riccardo Govoni</a> (c) 2010<br />' +
      '<a href="http://sites.google.com/site/rhizosphereui/" target="_blank">Project info</a>' +
      '&nbsp;' +
      '<a href="http://sites.google.com/site/rhizosphereui/Home/documentation" target="_blank" ' +
      'style="font-weight:bold; text-decoration: underline">I Need Help!</a>' +
      '</p>').appendTo(container);

  if (this.floating_) {
    this.logoPanel_.addClass('rhizo-floating-panel').css('display', 'none');
  }
};

rhizo.ui.component.Viewport = function() {};

rhizo.ui.component.Viewport.prototype.render = function(container, gui, options) {
  this.viewport_ = $('<div/>', {'class': 'rhizo-viewport'}).appendTo(container);
  this.universe_ = $('<div/>', {'class': 'rhizo-universe'}).appendTo(this.viewport_);

  // Update the GUI object.
  gui.setViewport(this.viewport_);
  gui.setUniverse(this.universe_);
};

rhizo.ui.component.Viewport.prototype.activate = function(gui, options) {
  gui.viewport.draggable({
    helper: function() {
      return $("<div />").appendTo(gui.viewport);
    },
    start: function(ev, ui) {
      var position = gui.universe.position();
      gui.universe.data("top0", position.top).data("left0", position.left);
    },
    drag: function(ev, ui) {
      // Computes where to reposition the universe pane from the delta movement
      // of the drag helper.
      //
      // - gui.universe.data({top0, left0}) points to the relative position of
      //   the universe (in respect to the viewport) at the start of the drag
      //   movement.
      // - ui.position.{top,left} points to the relative position of the drag
      //   helper (in respect to the viewport) at the current instant.
      var dragTop = ui.position.top + gui.universe.data("top0");
      var dragLeft = ui.position.left + gui.universe.data("left0");
      
      var snapDistance = 15;
      if (Math.abs(ui.position.left) <= snapDistance) {
        dragLeft = gui.universe.data("left0");
      }
      if (Math.abs(dragLeft) <= 15) {
        dragLeft = 0;
      }

      gui.moveUniverse({top: dragTop, left: dragLeft});
    },
    refreshPositions: false
  });

  // Mousewheel (or trackpad) based panning.
  $(gui.viewport).mousewheel(
    function (evt, deltaX, deltaY) {
      gui.panUniverse(deltaY, deltaX, evt.timeStamp);
  });
};

rhizo.ui.component.BottomBar = function() {};

rhizo.ui.component.BottomBar.prototype.render = function(container, project, gui, options) {
  gui.addComponent('rhizo.ui.component.BottomBar', this);
  this.resizeLink_ = $('<a/>', {'class': 'rhizo-maximize-icon', href: 'javascript:;', title: 'Maximize'}).appendTo(container);

  this.components_ = [
    {component: 'rhizo.ui.component.Layout', title: 'Display', 'class': ''},
    {component: 'rhizo.ui.component.SelectionManager', title: 'Selection', 'class': '',
     callback: function(gui, isActive) {
       if (gui.isSelectionModeOn() != isActive) {
         // Selection mode is not enable, but the selection panel is active,
         // or viceversa.
         gui.toggleSelectionMode();
       }
     }
    },
    {component: 'rhizo.ui.component.Filters', title: 'Filters', 'class': ''},
    {component: 'rhizo.ui.component.Legend', title: 'Legend', 'class': ''},
    {component: 'rhizo.ui.component.Logo', title: '?', 'class': 'rhizo-link-help'}
  ];
  this.components_ = jQuery.grep(
    this.components_,
    function(c) {
      return gui.getComponent(c.component) ? true : false;
    });
  for (var i = 0; i < this.components_.length; i++) {
    this.components_[i].clickable = this.createLink_(this.components_[i].title,
                                                     this.components_[i]['class'],
                                                     container);
    this.components_[i].panel = gui.getComponent(this.components_[i].component).getPanel();
  }
};

rhizo.ui.component.BottomBar.prototype.createLink_ = function(text, className, container) {
  var div = $('<div />', {'class': 'rhizo-section-header'}).appendTo(container);
  var link = $('<a/>', {href:  'javascript:;', title: text, 'class': className}).text(text).appendTo(div);
  return div;
};

rhizo.ui.component.BottomBar.prototype.activate = function(project, gui, options) {
  this.resizeLink_.click(function() {
    self.resizeTo(1000, 700);
    self.location.reload();
    return false;
  });

  jQuery.each(this.components_, jQuery.proxy(function(i, currentComponent) {
    currentComponent.clickable.click(jQuery.proxy(function() {
      jQuery.each(this.components_, function(j, comp) {
        if (comp == currentComponent) {
          $(comp.panel).toggle();
          $(comp.clickable).toggleClass('rhizo-section-open');
        } else {
          $(comp.panel).css('display', 'none');
          $(comp.clickable).removeClass('rhizo-section-open');
        }
        if (comp.callback) {
          comp.callback(gui, $(comp.clickable).hasClass('rhizo-section-open'));
        }
      });
      return false;
    }, this));
  }, this));
};

rhizo.ui.component.BottomBar.prototype.toggleComponent = function(component_id,
                                                                  active) {
  for (var i = 0; i < this.components_.length; i++) {
    if (this.components_[i].component == component_id) {
      var currentActive = this.components_[i].clickable.hasClass(
          'rhizo-section-open');
      if (currentActive != active) {
        this.components_[i].clickable.click();
      }
      break;
    }
  }
};

rhizo.ui.component.Console = function() {};

rhizo.ui.component.Console.prototype.render = function(container, gui, options) {
  gui.addComponent('rhizo.ui.component.Console', this);

  this.toggleButton_ = $('<div />', {'class': 'rhizo-console-close'}).html('&#8659;');

  this.consoleHeader_ = $('<div />', {'class': 'rhizo-console-header'});
  this.consoleHeader_.append(this.toggleButton_).append('Log Console');
  this.consoleHeader_.appendTo(container);

  this.consoleContents_ = $('<div />', {'class': 'rhizo-console-contents'});
  this.consoleContents_.appendTo(container);
};

rhizo.ui.component.Console.prototype.activate = function(gui, options) {
  this.toggleButton_.click(jQuery.proxy(function() {
    if (this.consoleContents_.is(":visible")) {
      this.consoleContents_.slideUp("slow", jQuery.proxy(function() {
        this.toggleButton_.html("&#8659;");
        this.consoleContents_.empty();
      }, this));
    } else {
      this.consoleContents_.slideDown("slow", jQuery.proxy(function() {
        this.toggleButton_.html("&#8657;");
      }, this));
    }
  }, this));
};

rhizo.ui.component.Console.prototype.getContents = function() {
  return this.consoleContents_;
};

rhizo.ui.component.Console.prototype.getHeader = function() {
  return this.consoleHeader_;
};

rhizo.ui.component.RightBar = function() {};

rhizo.ui.component.RightBar.prototype.render = function(container, gui, options) {
  gui.addComponent('rhizo.ui.component.RightBar', this);

  this.toggle_ = $('<div />', {'class': 'rhizo-right-pop'}).html('&#x25c2;').appendTo(container);
  this.rightBar_ = $('<div />', {'class': 'rhizo-right'}).css('display', 'none').
      appendTo(container);
};

rhizo.ui.component.RightBar.prototype.activate = function(gui, options) {
  this.toggle_.click(jQuery.proxy(function() {
    if (this.rightBar_.is(":visible")) {
      this.toggle_.css('right', 0).html('&#x25c2;');
      gui.viewport.css('right', 5);
      this.rightBar_.css('display', 'none');
    } else {
      gui.viewport.css('right', 135);
      this.toggle_.css('right', 130).html('&#x25b8;');
      this.rightBar_.css('display', '');
    }
  }, this));
};

rhizo.ui.component.RightBar.prototype.getToggle = function() {
  return this.toggle_;
};

rhizo.ui.component.RightBar.prototype.getPanel = function() {
  return this.rightBar_;
};

rhizo.ui.component.Layout = function(floating) {
  this.floating_ = floating;
};

rhizo.ui.component.Layout.prototype.getPanel = function() {
  return this.layoutPanel_;
};

rhizo.ui.component.Layout.prototype.render = function(container, project, gui, options) {
  gui.addComponent('rhizo.ui.component.Layout', this);

  if (!this.floating_) {
    $('<div />', {'class': 'rhizo-section-header'}).
        text('Display').
        appendTo(container);
  }

  this.layoutPanel_ = $('<div />').appendTo(container);
  this.layoutOptions_ = $('<div />', {'class': 'rhizo-layout-extra-options'}).appendTo(this.layoutPanel_);

  if (this.floating_) {
    this.layoutPanel_.addClass('rhizo-floating-panel').css('display', 'none');
  }

  this.layoutSelector_ = $("<select />");
  this.detailsMap_ = {};
  var layoutEngines = project.layoutEngines();
  for (var layoutEngineName in layoutEngines) {
    var layoutEngine = layoutEngines[layoutEngineName];
    this.layoutSelector_.append(
      $("<option value='" + layoutEngineName + "' " +
        (project.currentLayoutEngineName() == layoutEngineName ? "selected" : "") +
        ">" + layoutEngine  + "</option>"));
    if (layoutEngine.details) {
	var details = layoutEngine.details();
	this.detailsMap_[layoutEngineName] = details;
        if (project.currentLayoutEngineName() != layoutEngineName) {
          details.css("display","none");
        }
        this.layoutOptions_.append(details);
    }
  }

  this.submit_ = $('<button />').text('Update');
  this.layoutPanel_.prepend(this.submit_).
      prepend(this.layoutSelector_).
      prepend("Keep items ordered by: ");
};

rhizo.ui.component.Layout.prototype.activate = function(project, gui, options) {
  var detailsMap = this.detailsMap_;
  this.layoutSelector_.change(function(ev) {
    for (var layout in detailsMap) {
      if (layout == $(this).val()) {
        detailsMap[layout].show("fast");
      } else {
        detailsMap[layout].hide("fast");
      }
    }
  });

  this.submit_.click(jQuery.proxy(function() {
    // TODO(battlehorse): forceAlign should be true only if there are
    // uncommitted filters (i.e. GREY models).
    project.layout(this.layoutSelector_.val(), {forcealign:true});
  }, this));
};

rhizo.ui.component.SelectionManager = function(floating) {
  this.floating_ = floating;
};

rhizo.ui.component.SelectionManager.prototype.getPanel = function() {
  return this.selectionPanel_;
};

rhizo.ui.component.SelectionManager.prototype.render = function(container, project, gui, options) {
  gui.addComponent('rhizo.ui.component.SelectionManager', this);

  if (!this.floating_) {
    $('<div />', {'class': 'rhizo-section-header'}).
        text('Selection').
        appendTo(container);
  }

  this.selectionPanel_ = $('<div />', {'class': 'rhizo-selection'}).
      appendTo(container);

  if (this.floating_) {
    this.selectionPanel_.addClass('rhizo-floating-panel').css('display', 'none');
  }

  this.selection_trigger_ = $('<div />', {
      'class': 'rhizo-selection-trigger',
      'title': 'Start selecting items'}).appendTo(gui.viewport);

  this.selectButton_ = $('<button />').text('Work on selected items only');
  this.resetButton_ = $('<button />', {disabled: 'disabled'}).text('Reset');
  this.selectionPanel_.append(this.selectButton_).append(this.resetButton_);
};

rhizo.ui.component.SelectionManager.prototype.activate = function(project, gui, options) {
  this.activateSelectableViewport_(project, gui, options);
  this.activateButtons_(project, options);
};

rhizo.ui.component.SelectionManager.prototype.activateButtons_ = function(project, options) {
  //TODO(battlehorse): consolidate this filtering operations inside Project.
  this.selectButton_.click(jQuery.proxy(function(ev) {
    var countSelected = 0;
    for (var id in project.allSelected()) { countSelected++; };
    if (countSelected == 0) {
      project.logger().error("No items selected");
      return;
    }

    var allUnselected = project.allUnselected();
    var countFiltered = 0;
    for (var id in allUnselected) {
      allUnselected[id].filter("__selection__"); // hard-coded keyword
      countFiltered++;
    }

    // after filtering some elements, perform layout again
    project.alignFx();
    project.layout(null, {filter: true, forcealign: true});
    project.unselectAll();
    this.resetButton_.
        removeAttr("disabled").
        text("Reset (" + countFiltered + " filtered)");
  }, this));


  this.resetButton_.click(function(ev) {
    project.resetAllFilter("__selection__");
    project.alignFx();
    // after filtering some elements, perform layout again
    project.layout(null, {filter: true, forcealign: true});
    $(this).attr("disabled","disabled").text("Reset");
  });
};

/**
   Checks whether an event was raised on empty space, i.e. somewhere in the
   viewport, but not on top of any models or any other elements.

   Since the viewport and the universe may be not on top of each other, the
   method checks whether any of the two is the original target of the event.

   @params {Event} the event to inspect.
   @returns {boolean} true if the click occurred on the viewport, false
     otherwise.
 */
rhizo.ui.component.SelectionManager.prototype.isOnEmptySpace_ = function(evt) {
  return $(evt.target).hasClass('rhizo-viewport') ||
         $(evt.target).hasClass('rhizo-universe');
};

rhizo.ui.component.SelectionManager.prototype.activateSelectableViewport_ =
    function(project, gui, options) {
  this.selection_trigger_.click(function() {
    project.gui().toggleSelectionMode();
  });

  gui.viewport.selectable({
    disabled: true,  // initially disabled.
    selected: function(ev, ui) {
      var selected_id = $(ui.selected).data("id");
      if (selected_id) {
        project.select(selected_id);
      }
    },
    unselected: function(ev, ui) {
      var unselected_id = $(ui.unselected).data("id");
      if (unselected_id) {
        project.unselect(unselected_id);
      }
    },
    // TODO: disabled until incremental refresh() is implemented
    // autoRefresh: false,
    filter: options.selectfilter,
    tolerance: 'touch',
    distance: 1
  });

  gui.viewport.click(jQuery.proxy(function(ev, ui) {
    if (this.isOnEmptySpace_(ev)) {
      project.unselectAll();
    }
  }, this));
};

rhizo.ui.component.SelectionManager.prototype.toggleSelectionTrigger =
    function(selectionModeOn) {
 this.selection_trigger_.attr(
     'title',
     selectionModeOn ? 'Stop selecting items' : 'Start selecting items');
};

rhizo.ui.component.Filters = function(floating) {
  this.floating_ = floating;
};

rhizo.ui.component.Filters.prototype.getPanel = function() {
  return this.filterPanel_;
};

rhizo.ui.component.Filters.prototype.render = function(container, project, gui, options) {
  gui.addComponent('rhizo.ui.component.Filters', this);

  if (!this.floating_) {
    $('<div />', {'class': 'rhizo-section-header'}).
        text('Filters').
        appendTo(container);
  }

  this.filterPanel_ = $('<div />', {'class': 'rhizo-filter-container'}).appendTo(container);

  this.nextFilter_ = null;
  this.prevFilter_ = null;
  this.hideLink_ = null;
  if (this.floating_) {
    this.filterPanel_.addClass('rhizo-floating-panel').css('display', 'none');

    this.nextFilter_ = $('<div />', {'class': 'rhizo-next-filter', title: 'Next filter'}).
      text('>').
      appendTo(this.filterPanel_);
    this.prevFilter_ = $('<div />', {'class': 'rhizo-prev-filter', title: 'Previous filter'}).
      text('<').
      appendTo(this.filterPanel_);
    this.hideLink_ = $('<a />', {'href': '#', 'class': 'rhizo-autocommit-link'}).text('Apply').
      appendTo(this.filterPanel_);
    if (project.isFilterAutocommit()) {
      this.hideLink_.css('display', 'none');
    }
  }

  var autocommitPanel = $('<div />',
                          {'class': 'rhizo-filter ' +
                                    'rhizo-autocommit-panel'}).
      appendTo(this.filterPanel_);
  this.autocommit_ = $('<input />', {type: 'checkbox',
                                     checked: project.isFilterAutocommit()}).
    appendTo(autocommitPanel);
  $('<span>Autocommit</span>').appendTo(autocommitPanel);
  this.hideButton_ = $('<button />', {disabled: project.isFilterAutocommit()}).
      text('Apply filters').appendTo(autocommitPanel);

  var metaModel = project.metaModel();
  for (key in metaModel) {
    var filter = metaModel[key].kind.renderFilter(project, metaModel[key], key);
    if (this.floating_) {
      filter.css('display', 'none');
    }
    this.filterPanel_.append(filter);
  }
};

rhizo.ui.component.Filters.prototype.activate = function(project, gui, options) {
  // Every single filter implementation auto-activates itself when created.
  // Here we only need to activate the navigation between filters.
  if (this.nextFilter_) {
    this.nextFilter_.click(function() {
      var current = $('.rhizo-filter:visible', gui.container);
      var next = current.next('.rhizo-filter:hidden').eq(0);
      if (next.length > 0) {
        // cannot use hide/show otherwise safari clips rendering
        current.css('display', 'none');
        next.css('display', '');
      }
    });
  }

  if (this.prevFilter_) {
    this.prevFilter_.click(function() {
      var current = $('.rhizo-filter:visible', gui.container);
      var prev = current.prev('.rhizo-filter:hidden').eq(0);
      if (prev.length > 0) {
        // cannot use hide/show otherwise safari clips rendering
        current.css('display', 'none');
        prev.css('display', '');
      }
    });
  }

  this.autocommit_.click(jQuery.proxy(function(ev) {
    var checked = $(ev.target).is(':checked');
    if (checked) {
      this.hideButton_.attr('disabled', 'disabled');
      if (this.hideLink_) {
        this.hideLink_.css('display', 'none');
      }
    } else {
      this.hideButton_.removeAttr('disabled');
      if (this.hideLink_) {
        this.hideLink_.css('display', '');
      }
    }
    project.enableFilterAutocommit(checked);
  }, this));

  this.hideButton_.click(function() {
    project.commitFilter();
  });
  if (this.hideLink_) {
    this.hideLink_.click(function() {
      project.commitFilter();
    });
  }
};

rhizo.ui.component.Legend = function(floating) {
  this.floating_ = floating;
};

rhizo.ui.component.Legend.prototype.getPanel = function() {
  return this.legendPanel_;
};

rhizo.ui.component.Legend.prototype.render = function(container, project, gui, options) {
  gui.addComponent('rhizo.ui.component.Legend', this);

  var sizeRange = null;
  if (project.renderer().getSizeRange) {
    sizeRange = project.renderer().getSizeRange();
  }
  var colorRange = null;
  if (project.renderer().getColorRange) {
    colorRange = project.renderer().getColorRange();
  }

  if (!this.floating_) {
    $('<div />', {'class': 'rhizo-section-header'}).
    text('Legend').
    appendTo(container);
  }

  this.legendPanel_ = $('<div />', {'class': "rhizo-legend-panel"}).appendTo(container);

  if (this.floating_) {
    this.legendPanel_.addClass('rhizo-floating-panel').css('display', 'none');
  }

  if (sizeRange) {
    var panel = $('<div />', {'class': 'rhizo-legend-size'});
    var minLabel = $('<span />', {'class': 'rhizo-legend-size-min'}).html(
        sizeRange.label + ' &nbsp; ' + rhizo.ui.toHumanLabel(sizeRange.min) + ':');
    var maxLabel = $('<span />', {'class': 'rhizo-legend-size-max'}).html(
        ': ' + rhizo.ui.toHumanLabel(sizeRange.max));

    panel.append(minLabel).append(
        '<span class="ar-fon-0">A</span> -- ' +
        '<span class="ar-fon-5">A</span>').
        append(maxLabel).appendTo(this.legendPanel_);
  }

  if (colorRange) {
    var panel = $('<div />', {'class': 'rhizo-legend-color'});
    var minLabel = $('<span />', {'class': 'rhizo-legend-color-min'}).html(
        colorRange.label + ' &nbsp; ' + rhizo.ui.toHumanLabel(colorRange.min) + ':');
    var maxLabel = $('<span />', {'class': 'rhizo-legend-color-max'}).html(
        ': ' + rhizo.ui.toHumanLabel(colorRange.max));

    panel.append(minLabel).append(
        '<span class="ar-col-0 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;' +
        '<span class="ar-col-1 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;' +
        '<span class="ar-col-2 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;' +
        '<span class="ar-col-3 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;' +
        '<span class="ar-col-4 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;' +
        '<span class="ar-col-5 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;').
        append(maxLabel).appendTo(this.legendPanel_);
  }
};

rhizo.ui.component.Legend.prototype.activate = function(project, gui, options) {};

rhizo.ui.component.Actions = function() {};

rhizo.ui.component.Actions.prototype.render = function(container, project, gui, options) {
  var actionsContainer = $('<div />', {'class': 'rhizo-actions'}).
    append($('<div />', {'class': 'rhizo-section-header'}).text('Actions')).
    appendTo(container);

  // Create 2 sample actions
  for (var i = 0; i < 2; i++) {
    $('<div />', {'class': 'rhizo-action'}).text('Sample Action ' + (i+1)).appendTo(actionsContainer);
  }
};

rhizo.ui.component.Actions.prototype.activate = function(project, gui, options) {
  if ($('.rhizo-action').length > 0) {
    $('.rhizo-action').draggable({helper: 'clone'});
    gui.universe.droppable({
      accept: '.rhizo-action',
      drop: function(ev, ui) {
        var offset = gui.universe.offset();
        var rightBorder = gui.universe.width();
        var bottomBorder = gui.universe.height();

        var actionName = ui.draggable.text();

        var left = ui.offset.left - offset.left;
        if ((left + 200) > rightBorder) {
          left = rightBorder - 210;
        }

        var top = ui.offset.top - offset.top;
        if ((top + 200) > bottomBorder) {
          top = bottomBorder - 210;
        }

        var dropbox = $("<div class='rhizo-droppable-action'>" +
                        "Drop your items here to perform:<br />" +
                        actionName  +"</div>").css({top: top, left: left});

        gui.universe.append(dropbox);
        dropbox.fadeIn();
        dropbox.draggable();
        dropbox.droppable({
          accept: '.rhizo-model',
          drop: function(ev, ui) {
            var id = ui.draggable.data("id");
            if (!project.isSelected(id)) {
              alert("Action applied on " + project.model(id));
              ui.draggable.move(ui.draggable.data("dropTop0"),
                                ui.draggable.data("dropLeft0"));
            } else {
              var countSelected = 0;
              var all_selected = project.allSelected();
              for (var id in all_selected) { countSelected++;}
              alert("Action applied on " + countSelected + " elements");

              for (var id in all_selected) {
                all_selected[id].rendering.move(
                  all_selected[id].rendering.data("dropTop0"),
                  all_selected[id].rendering.data("dropLeft0"));
              }
              project.unselectAll();
            }
          }
        });

        dropbox.dblclick(function() {
          dropbox.remove();
          return false;
        });
      }
    });
  }
};

rhizo.ui.component.BottomTemplate = function(project) {
  this.project_ = project;
  this.gui_ = project.gui();
  this.components_ = {
    // chrome components
    LOGO: new rhizo.ui.component.Logo(/* floating = */ true),
    VIEWPORT: new rhizo.ui.component.Viewport(),

    // dynamic components
    LAYOUT: new rhizo.ui.component.Layout(/* floating = */ true),
    SELECTION_MANAGER: new rhizo.ui.component.SelectionManager(/* floating = */ true),
    FILTERS: new rhizo.ui.component.Filters(/* floating = */ true),
    LEGEND: new rhizo.ui.component.Legend(/* floating = */ true),
    BOTTOMBAR: new rhizo.ui.component.BottomBar()
  };
};

rhizo.ui.component.BottomTemplate.prototype.renderChrome = function(options) {
  this.gui_.container.addClass('rhizo-template-bottom');

  this.components_.VIEWPORT.render(this.gui_.container, this.gui_, options);
  this.progress_ = new rhizo.ui.component.Progress(this.gui_.viewport);

  this.progress_.update(10, 'Creating static UI...');
  this.bottomBar_ = $('<div />', {'class': "rhizo-bottom-bar"}).appendTo(this.gui_.container);
  this.components_.LOGO.render(this.bottomBar_, this.gui_, options);
  this.progress_.update(25, 'All static UI created.');
};

rhizo.ui.component.BottomTemplate.prototype.activateChrome = function(options) {
  this.progress_.update(26, 'Activating static UI...');
  this.components_.VIEWPORT.activate(this.gui_, options);
  this.progress_.update(33, 'Loading models...');
};

rhizo.ui.component.BottomTemplate.prototype.renderDynamic = function(options) {
  this.progress_.update(34, 'Creating dynamic controls...');
  this.components_.LAYOUT.render(this.bottomBar_, this.project_, this.gui_, options);
  this.progress_.update(36, 'Layout engine created.');
  this.components_.SELECTION_MANAGER.render(this.bottomBar_, this.project_, this.gui_, options);
  this.progress_.update(40, 'Selection manager created.');
  this.components_.FILTERS.render(this.bottomBar_, this.project_, this.gui_, options);
  this.progress_.update(44, 'Filters created.');

  if (this.project_.renderer().getSizeRange ||
      this.project_.renderer().getColorRange) {
    this.components_.LEGEND.render(this.bottomBar_,
                                   this.project_,
                                   this.gui_,
                                   options);
    this.progress_.update(46, 'Legend created.');
  }

  // All other components must be in place before creating the toolbar.
  this.components_.BOTTOMBAR.render(this.bottomBar_, this.project_, this.gui_, options);
  this.progress_.update(48, 'Toolbar created.');
};

rhizo.ui.component.BottomTemplate.prototype.activateDynamic = function(options) {
  this.progress_.update(51, 'Activating dynamic controls...');
  this.components_.LAYOUT.activate(this.project_, this.gui_, options);
  this.components_.SELECTION_MANAGER.activate(this.project_, this.gui_, options);
  this.components_.FILTERS.activate(this.project_, this.gui_, options);
  this.components_.LEGEND.activate(this.project_, this.gui_, options);
  this.components_.BOTTOMBAR.activate(this.project_, this.gui_, options);
  this.progress_.update(66, 'Rhizosphere controls are ready.');
};

rhizo.ui.component.BottomTemplate.prototype.done = function() {
  this.progress_.update(100, 'Rhizosphere ready!');
};



rhizo.ui.component.StandardTemplate = function(project) {
  this.project_ = project;
  this.gui_ = project.gui();
  this.components_ = {
    // chrome components
    LOGO: new rhizo.ui.component.Logo(/* floating = */ false),
    VIEWPORT: new rhizo.ui.component.Viewport(),
    RIGHTBAR: new rhizo.ui.component.RightBar(),
    CONSOLE: new rhizo.ui.component.Console(),

    // dynamic components
    LAYOUT: new rhizo.ui.component.Layout(/* floating = */ false),
    SELECTION_MANAGER: new rhizo.ui.component.SelectionManager(/* floating = */ false),
    FILTERS: new rhizo.ui.component.Filters(/* floating = */ false),
    LEGEND: new rhizo.ui.component.Legend(/* floating = */ false),
    ACTIONS: new rhizo.ui.component.Actions()
  };
};

rhizo.ui.component.StandardTemplate.prototype.renderChrome = function(options) {
  this.gui_.container.addClass('rhizo-template-default');

  this.components_.VIEWPORT.render(this.gui_.container, this.gui_, options);
  this.progress_ = new rhizo.ui.component.Progress(this.gui_.viewport);

  this.leftBar_= $('<div/>', {'class': 'rhizo-left'}).appendTo(this.gui_.container);
  this.components_.RIGHTBAR.render(this.gui_.container, this.gui_, options);

  this.progress_.update(10, 'Creating static UI...');
  this.components_.LOGO.render(this.leftBar_, this.gui_, options);
  this.components_.CONSOLE.render(
      this.components_.RIGHTBAR.getPanel(),
      this.gui_,
      options);
  this.progress_.update(25, 'All static UI created.');
};

rhizo.ui.component.StandardTemplate.prototype.activateChrome = function(options) {
  this.progress_.update(26, 'Activating static UI...');

  this.components_.RIGHTBAR.activate(this.gui_, options);
  this.components_.CONSOLE.activate(this.gui_, options);
  this.components_.VIEWPORT.activate(this.gui_, options);
  this.progress_.update(33, 'Loading models...');
};

rhizo.ui.component.StandardTemplate.prototype.renderDynamic =
    function(options) {
  this.progress_.update(34, 'Creating dynamic controls...');
  this.components_.LAYOUT.render(this.leftBar_, this.project_, this.gui_, options);
  this.progress_.update(38, 'Layout engine created.');
  this.components_.SELECTION_MANAGER.render(this.leftBar_, this.project_, this.gui_, options);
  this.progress_.update(42, 'Selection manager created.');
  this.components_.FILTERS.render(this.leftBar_, this.project_, this.gui_, options);
  this.progress_.update(46, 'Filters created.');

  if (this.project_.renderer().getSizeRange ||
      this.project_.renderer().getColorRange) {
    this.components_.LEGEND.render(this.leftBar_,
                                   this.project_,
                                   this.gui_,
                                   options);
    this.progress_.update(48, 'Legend created.');
  }
  this.components_.ACTIONS.render(
      this.components_.RIGHTBAR.getPanel(),
      this.project_,
      this.gui_,
      options);
  this.progress_.update(50, 'Actions created');
};

rhizo.ui.component.StandardTemplate.prototype.activateDynamic = 
    function(options) {
  this.progress_.update(51, 'Activating dynamic controls...');
  this.components_.LAYOUT.activate(this.project_, this.gui_, options);
  this.components_.SELECTION_MANAGER.activate(this.project_, this.gui_, options);
  this.components_.FILTERS.activate(this.project_, this.gui_, options);
  this.components_.LEGEND.activate(this.project_, this.gui_, options);
  this.components_.ACTIONS.activate(this.project_, this.gui_, options);
  this.progress_.update(66, 'Rhizosphere controls are ready.');
};

rhizo.ui.component.StandardTemplate.prototype.done = function() {
  this.progress_.update(100, 'Rhizosphere ready!');
};
/* ./src/js/rhizo.layout.treemap.js */
/*
  Copyright 2010 Riccardo Govoni battlehorse@gmail.com

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

// RHIZODEP=rhizo.layout,rhizo.ui
// Dependency on rhizo.ui is for rhizo.ui.reRender.

namespace("rhizo.layout");
namespace("rhizo.layout.treemap");

// TreeMap Layout.
// Based on the "Squarified Treemaps" algorithm, by Mark Bruls, Kees Huizing,
// and Jarke J. van Wijk (http://tinyurl.com/2eey2zn).
//
// TODO(battlehorse): When expanding and unexpanding a model in this layout, the
// model is re-rendered with its original size and z-index, not the one the
// treemap expects.
//
// TODO(battlehorse): Should offer the possibility to color items via a
// logarithmic scale.

/**
 * Enumarates the growing direction of treemap slices (which accumulate treemap
 * nodes either along vertical or horizontal lines).
 * @enum {string}
 */
rhizo.layout.treemap.TreeMapDirection = {
  HOR: 'h',
  VER: 'v'
};


/**
 * Treemaps affect the rendering (size, colors) of models. A backup manager
 * saves models original attributes and restores them once they are used in the
 * layout process.
 *
 * The backup manager is preserved through multiple consequent applications of
 * the TreeMapLayout:
 * - when two TreeMapLayouts are applied consequently only the delta of models
 *   between the two is restored (removed from backup models) or added to the
 *   set.
 * - when a TreeMapLayout is replaced by a different one, all backup models
 *   are restored (see restoreAll()).
 * - when a TreeMapLayout replaces a previous (different) layout, the set of
 *   backup models is initially empty and populated during the layout
 *   operation.
 *
 * @constructor
 */
rhizo.layout.treemap.ModelBackupManager = function() {

  /**
   * @type {Object.<string, rhizo.layout.treemap.ModelBackup>}
   * @private
   */
  this.modelBackups_ = {};
  this.numBackups_ = 0;
};

/**
 * Adds a new model to the backup, if it is not already in there.
 * @param {rhizo.model.SuperModel} model The model to backup.
 * @return {boolean} if the model was added to the backups.
 */
rhizo.layout.treemap.ModelBackupManager.prototype.backup = function(model) {
  if (!(model.id in this.modelBackups_)) {
    this.modelBackups_[model.id] = new rhizo.layout.treemap.ModelBackup(model);
    this.numBackups_++;
    return true;
  }
  return false;
};

/**
 * Removes a model from the backup (if present) without restoring it.
 * @param {string} modelId.
 */
rhizo.layout.treemap.ModelBackupManager.prototype.removeBackup = function(modelId) {
  if (modelId in this.modelBackups_) {
    delete this.modelBackups_[modelId];
    this.numBackups_--;
  }
};

/**
 * Updates the set of currently backed up models by restoring all the models
 * that were previously rendered as treemap nodes but they won't be anymore in
 * the current layout run.
 *
 * @param {Array.<rhizo.model.SuperModel>} supermodels List of models that will
 *     be laid out in the current layout run.
 * @param {boolean} colorReset Whether we are moving from a color-coded treemap
 *     layout to a non-color-coded one.
 */
rhizo.layout.treemap.ModelBackupManager.prototype.restore = function(
      supermodels, colorReset) {
  if (this.numBackups_ > 0) {
    var survivingModelIds = {};
    for (var i = 0; i < supermodels.length; i++) {
      survivingModelIds[supermodels[i].id] = true;
    }
    var restorableModels = {};
    for (var modelId in this.modelBackups_) {
      if (!(modelId in survivingModelIds)) {
        restorableModels[modelId] = true;
      }
    }
    this.restoreInternal_(restorableModels, true, true);

    if (colorReset) {
      this.restoreInternal_(this.modelBackups_,
                            /*sizes=*/ false, /*colors=*/ true);
    }
  }
};

/**
 * Restores all the backups.
 */
rhizo.layout.treemap.ModelBackupManager.prototype.restoreAll = function() {
  this.restoreInternal_(this.modelBackups_, true, true);
  this.modelBackups_ = {};  // just in case.
  this.numBackups_ = 0;
};

rhizo.layout.treemap.ModelBackupManager.prototype.restoreInternal_ = function(
    modelsMap, restoreSizes, restoreColors) {
  for (var modelId in modelsMap) {
    this.modelBackups_[modelId].restore(restoreSizes, restoreColors);
    if (restoreSizes && restoreColors) {
      delete this.modelBackups_[modelId];
      this.numBackups_--;
    }
  }
};


/**
 * A wrapper around a supermodel to backup relevant rendering attributes that
 * will need to be restored once we leave (or change) TreeMapLayout.
 *
 * @param {rhizo.model.SuperModel} model The model to backup.
 * @constructor
 */
rhizo.layout.treemap.ModelBackup = function(model) {
  this.model_ = model;
  this.originalDimensions_ = jQuery.extend({}, model.getDimensions());
  this.originalBackground_ = model.nakedCss('background-color');
};

rhizo.layout.treemap.ModelBackup.prototype.restore = function(restoreSizes,
                                                              restoreColors) {
  if (restoreColors) {
    this.model_.setNakedCss({backgroundColor: this.originalBackground_});
  }
  if (restoreSizes) {
    this.model_.rescaleRendering(this.originalDimensions_.width,
                                 this.originalDimensions_.height);
    this.model_.rendering.css('z-index', '');
  }
};


/**
 * A node in the TreeMapLayout. Each node represents a single supermodel and can
 * alter the model rendering to match treemap requirements (such as size and
 * color).
 *
 * It also keeps track of its positioning information within the layout.
 *
 * @constructor
 * @param {rhizo.layout.TreeNode} treenode The TreeNode wrapping the supermodel
 *     this TreeMapNode should bind to (the set of models to layout is converted
 *     to a tree early in the layout process, to support treemap nesting).
 * @param {number} areaRatio The squared-pixel to area ratio, to map between
 *     area values as extracted from models and associated pixel dimensions in
 *     the layout representation.
 */
rhizo.layout.treemap.TreeMapNode = function(treenode, areaRatio) {
  this.model_ = treenode.superModel;
  this.area_ = treenode.area * areaRatio;
  if (isNaN(this.area_) || this.area_ < 0) {
    this.area_ = 0.0;
  }
  this.top_ = 0;
  this.left_ = 0;
};

rhizo.layout.treemap.TreeMapNode.prototype.area = function() {
  return this.area_;
};

/**
 * Returns the {top, left} coordinates of this node, with respect to the overall
 * container that contains the whole treemap layout.
 */
rhizo.layout.treemap.TreeMapNode.prototype.position = function() {
  return {top: this.top_, left: this.left_};
};

rhizo.layout.treemap.TreeMapNode.prototype.model = function() {
  return this.model_;
};

/**
 * Returns whether this treemap node is hidden from layout. Although it may
 * represent a non-filtered (visible) model, the model characteristics can be
 * of such kind to prevent this node from showing (e.g.: too small area).
 */
rhizo.layout.treemap.TreeMapNode.prototype.isHidden = function() {
  return this.model_.isFiltered('__treemap__');
};

rhizo.layout.treemap.TreeMapNode.prototype.hide = function() {
  this.model_.filter('__treemap__');
};

/**
 * Moves this node model rendering to the given {top, left} coordinates, with
 * respect to the overall container that contains the whole treemap layout.
 *
 * Also alters the rendering z-index for treemap nesting.
 */
rhizo.layout.treemap.TreeMapNode.prototype.move = function(top, left, deepness) {
  this.top_ = Math.round(top);
  this.left_ = Math.round(left);
  this.model_.rendering.move(this.top_, this.left_);
  this.model_.rendering.css('z-index', 50+deepness);
};

/**
 * Resizes this node model rendering to the desired width and height.
 * @return {boolean} whether the resizing was successful.
 */
rhizo.layout.treemap.TreeMapNode.prototype.resize = function(width, height) {
  return this.model_.rescaleRendering(width, height);
};

rhizo.layout.treemap.TreeMapNode.prototype.colorWeighted = function(colorRange) {
  var colorVal = parseFloat(this.model_.unwrap()[colorRange.meta]);
  if (!isNaN(colorVal)) {
    this.model_.setNakedCss({backgroundColor:
                             this.getBackgroundColor_(colorVal, colorRange)});
  }
};

rhizo.layout.treemap.TreeMapNode.prototype.color = function(color) {
  this.model_.setNakedCss({backgroundColor: color});
};

rhizo.layout.treemap.TreeMapNode.prototype.assignColorRange = function(colorRange) {
  var colorVal = parseFloat(this.model_.unwrap()[colorRange.meta]);
  if (!isNaN(colorVal)) {
    colorRange.min = Math.min(colorRange.min, colorVal);
    colorRange.max = Math.max(colorRange.max, colorVal);
  }
};

/**
 * Computes the available area within this node available for nesting treemap
 * nodes that are child of this one.
 *
 * Returns a bounding rectangle of zero area is there is not enough space to
 * render nested elements.
 */
rhizo.layout.treemap.TreeMapNode.prototype.nestedBoundingRect = function() {
  // Minimum widths and heights:
  // 24px: 4px padding, retain a minimum width of 20px for rendering nested
  //       contents.
  // 39px: 4px padding, 15px header space, retain a minimum height of 20px for
  //       rendering nested contents.

  var dims = this.model_.getDimensions();
  if (this.isHidden() || dims.width < 24 || dims.height < 39) {
    // Setting boundingRect dimensions to 0 will nullify areaRatio, which in turn
    // zeroes nodes' area, causing them to be hidden.
    return {width: 0, height: 0};
  } else {
    return {
      width: dims.width - 4,  // 4px left and right padding
      height: dims.height - 19  // 4px top/bottom padding + 15px header space
    };
  }
};

/**
 * Returns the {x,y} anchor point, with respect to the overall container that
 * contains the whole treemap layout, to which the top-left corner of the
 * nested bounding rectangle should be anchored to.
 */
rhizo.layout.treemap.TreeMapNode.prototype.nestedAnchor = function() {
  return {
    x: this.left_ + 2,  // 2px left padding.
    y: this.top_ + 17  // 2px left padding, 15px header space
  };
};

/**
 * Returns the color to assign to this node in a scale ranging from
 * colorRange.colorMin to colorRange.colorMax, given the respective positioning
 * of this model color attribute within the {colorRange.min, colorRange.max)
 * scale.
 * @private
 */
rhizo.layout.treemap.TreeMapNode.prototype.getBackgroundColor_ = function(
    colorVal, colorRange) {
  var channels = ['r', 'g', 'b'];
  var outputColor = {};
  for (var i = 0; i < channels.length; i++) {
    var channel = channels[i];
    outputColor[channel] = colorRange.colorMin[channel] +
      (colorRange.colorMax[channel] - colorRange.colorMin[channel])*
      (colorVal - colorRange.min)/(colorRange.max - colorRange.min);
  }
  return 'rgb(' + Math.round(outputColor.r) + ',' +
      Math.round(outputColor.g) + ',' +
      Math.round(outputColor.b) + ')';
};


/**
 * A slice is a linear sequence of given length of treemap nodes.
 * The slice span changes dinamically to accomodate new nodes added to it.
 * @constructor
 * @param {number} length
 * @param {rhizo.layout.treemap.TreeMapDirection} direction
 * @param {Object} anchorPoint The {x,y} position of the top left corner of the
 *     slice, with respect to the bounding rectangle this slice was laid into.
 */
rhizo.layout.treemap.TreeMapSlice = function(length, direction, anchorPoint) {
  this.length_ = length;
  this.direction_ = direction;
  this.anchorPoint_ = anchorPoint;
  this.nodes_ = [];
  this.sliceArea_ = 0.0;
  this.minArea_ = Number.MAX_VALUE;
};

rhizo.layout.treemap.TreeMapSlice.prototype.direction = function() {
  return this.direction_;
};

rhizo.layout.treemap.TreeMapSlice.prototype.anchorPoint = function() {
  return this.anchorPoint_;
};

rhizo.layout.treemap.TreeMapSlice.prototype.nodes = function() {
  return this.nodes_;
};

/**
 * @param {rhizo.layout.treemap.TreeMapNode} node
 */
rhizo.layout.treemap.TreeMapSlice.prototype.addNode = function(node) {
  this.nodes_.push(node);
  this.sliceArea_ += node.area();
  this.minArea_ = Math.min(this.minArea_, node.area());
};

/**
 * Returns the slice span, either as it currently is, or as it would if
 * opt_newNode were added to it.
 *
 * @param {rhizo.layout.treemap.TreeMapNode} opt_newNode
 * @return {number}
 */
rhizo.layout.treemap.TreeMapSlice.prototype.span = function(opt_newNode) {
  if (opt_newNode) {
    return (this.sliceArea_ + opt_newNode.area()) / this.length_;
  } else {
    return this.sliceArea_ / this.length_;
  }
};

/**
 * Returns the slice aspect ratio, either as it currently is, or as it would if
 * opt_newNode were added to it.
 *
 * @param {rhizo.layout.treemap.TreeMapNode} opt_newNode
 * @return {number}
 */
rhizo.layout.treemap.TreeMapSlice.prototype.aspectRatio = function(
    opt_newNode) {
  var span = this.span(opt_newNode);
  var ratio = null;
  if (opt_newNode) {
    ratio = Math.min(this.minArea_, opt_newNode.area()) / (1.0 * span * span);
  } else {
    ratio = this.minArea_ / (1.0 * span * span);
  }
  if (ratio < 1) {
    ratio = 1.0 / ratio;
  }
  return ratio;
};

/**
 * Renders all the nodes in the slice. Nodes are moved and resized to match the
 * computed treemap layout. Any node whose rendering characteristics are altered
 * is backed up before changing it.
 *
 * Nodes may be hidden if their area is too small to be relevant for the layout.
 *
 * @param {rhizo.layout.treemap.ModelBackupManager} backupManager
 * @param {Object?} anchorDelta The {x,y} position delta to convert node
 *     positioning relative to the slice anchorPoint into absolute positioning
 *     with respect to the overall container that contains the whole treemap
 *     layout.
 * @param {number} deepness The nesting deepness we are currently rendering at.
 * @return {number} The total number of hidden nodes in the slice.
 */
rhizo.layout.treemap.TreeMapSlice.prototype.draw = function(backupManager,
                                                            anchorDelta,
                                                            deepness) {
  anchorDelta = anchorDelta || {x:0, y:0};
  var numHiddenModels = 0;
  var t = this.anchorPoint_.y + anchorDelta.y;
  var l = this.anchorPoint_.x + anchorDelta.x;
  for (var i = 0; i < this.nodes_.length; i++) {
    var node = this.nodes_[i];
    if (node.isHidden()) {
      numHiddenModels++;
      continue;
    }
    var span = Math.round(this.span());
    var length = node.area() / this.span();

    if (Math.round(length) == 0 || span == 0) {
      // Hide items that are too small to be displayed on screen
      node.hide();
      numHiddenModels++;
    } else {
      var renderingSize = {};
      if (this.direction_ == rhizo.layout.treemap.TreeMapDirection.HOR) {
        renderingSize['width'] = Math.round(length);
        renderingSize['height'] = span;
      } else {
        renderingSize['width'] = span;
        renderingSize['height'] = Math.round(length);
      }
      var isNewBackup = backupManager.backup(node.model());
      if (!node.resize(renderingSize['width'], renderingSize['height'])) {
        node.hide();
        numHiddenModels++;
        if (isNewBackup) {
          backupManager.removeBackup(node.model().id);
        }
      } else {
        node.move(t, l, deepness);
      }
    }
    if (this.direction_ == rhizo.layout.treemap.TreeMapDirection.HOR) {
      l += length;
    } else {
      t += length;
    }
  }
  return numHiddenModels;
};


/**
 * Implements the treemap layout algorithm.
 * @constructor
 */
rhizo.layout.TreeMapLayout = function(project) {
  this.project_ = project;

  this.numericKeys_ = [];
  this.areaSelector_ = null;
  this.colorSelector_ = null;

  this.parentKeySelector_ = null;
  this.parentKeys_ = [];

  this.prevColorMeta_ = '';
  this.backupManager_ = new rhizo.layout.treemap.ModelBackupManager();
  this.globalNodesMap_ = {};

  // Number of models that have been hidden specifically by this layout because
  // their area would be too small for display.
  this.numHiddenModels_ = 0;
};

rhizo.layout.TreeMapLayout.prototype.verifyMetaModel = function(meta) {
  for (var key in meta) {
    if (!!meta[key].isParent) {
      this.parentKeys_.push(key);
    }
    if (meta[key].kind.isNumeric()) {
      this.numericKeys_.push(key);
    }
  }

  return this.numericKeys_.length > 0;
};

rhizo.layout.TreeMapLayout.prototype.layout = function(container,
                                                       supermodels,
                                                       allmodels,
                                                       meta,
                                                       options) {
  var areaMeta = this.areaSelector_.val();
  var colorMeta = this.colorSelector_.val();
  var parentKey = this.parentKeySelector_ ? this.parentKeySelector_.val() : '';

  // Restore models that are no longer part of the treemap.
  // Keep track of the last coloring key used, in case we have to restore remove
  // color coding at a later layout run.
  this.backupManager_.restore(supermodels,
                              this.prevColorMeta_ != '' && colorMeta == '');
  this.prevColorMeta_ = colorMeta;

  // Revert expanded models.
  if (rhizo.ui.expandable(this.project_.renderer(),
                          this.project_.gui().allRenderingHints())) {
    this.revertExpandedModels_(supermodels, options);
  }

  // Identify whether we are rendering nested treemaps or just a flat one with
  // no hierarchy.
  var treeRoot;
  this.globalNodesMap_ = {};
  if (parentKey.length > 0) {
    try {
      treeRoot = new rhizo.layout.Treeifier(parentKey).buildTree(
          supermodels, allmodels, this.globalNodesMap_);
    } catch(e) {
      if (e.name == "TreeCycleException") {
        this.project_.logger().error(e);
        return false;
      } else {
        throw e;
      }
    }
  } else {
    // In the flat case, convert everything to a tree, so that we can handle
    // this with the same code that handles the tree case.
    treeRoot = new rhizo.layout.TreeNode();
    for (var i = 0; i < supermodels.length; i++) {
      treeRoot.addChild(new rhizo.layout.TreeNode(supermodels[i]));
    }
  }

  // When nesting treemaps are used, non-leaf nodes ignore their own area, and
  // rather rely on the sum of all the underlying (non-filtered) models.
  this.computeNestedAreas_(treeRoot, areaMeta);

  // Pointer to the container were new treemap nodes are added to. Initially
  // maps to the entire available rendering area.
  var boundingRect = {
    width: container.width(),
    height: container.height()
  };

  // Actual layout occurs here.
  this.numHiddenModels_ = this.layoutNestedMap_(boundingRect,
                                                treeRoot,
                                                {x:0, y:0},
                                                /* deepness */ 0);

  // Treemap coloring (if needed).
  // Color ranges are determined by sampling values from:
  // - all visible leaf nodes.
  // - all visible non-leaf nodes whose children are all hidden.
  if (colorMeta.length > 0) {
    var colorRange = {
      min: Number.MAX_VALUE,
      max: Number.MIN_VALUE,
      meta: colorMeta,
      colorMin: {r: 237, g: 76, b: 95},
      colorMax: {r: 122, g: 255, b: 115},
      colorGroup: 'transparent'
    };
    this.computeColorRange_(treeRoot, colorRange);
    this.colorTree_(treeRoot, colorRange);
  }

  // If the layout decided to hide some models, mark visibility as dirty to
  // force a realignment after layout.
  return this.numHiddenModels_ > 0;
};

rhizo.layout.TreeMapLayout.prototype.cleanup = function(sameEngine, options) {
  // Restore all models to their original sizes, if we are moving to a different
  // layout engine.
  if (!sameEngine) {
    this.backupManager_.restoreAll();
  }

  if (this.numHiddenModels_ > 0) {
    // There were hidden models, reset their filter and mark visibility as
    // dirty to force visibility alignment.
    this.project_.resetAllFilter('__treemap__');
    this.numHiddenModels_ = 0;
    return true;
  }
  return false;
};

rhizo.layout.TreeMapLayout.prototype.details = function() {
  var details = $('<div />');

  this.areaSelector_ = rhizo.layout.metaModelKeySelector(
    this.project_, 'rhizo-treemaplayout-area', function(key, meta) {
      return meta.kind.isNumeric();
    });
  this.colorSelector_ = rhizo.layout.metaModelKeySelector(
    this.project_, 'rhizo-treemaplayout-color', function(key, meta) {
      return meta.kind.isNumeric();
    });
  this.colorSelector_.append("<option value='' selected>-</option>");
  details.append("Area: ").append(this.areaSelector_).
      append(" Color:").append(this.colorSelector_);

  if (this.parentKeys_.length > 0) {
    this.parentKeySelector_ = rhizo.layout.metaModelKeySelector(
      this.project_, 'rhizo-treemaplayout-parentKey', function(key, meta) {
        return !!meta.isParent;
      });
    this.parentKeySelector_.append("<option value='' selected>-</option>");    

    details.append(" Parent: ").append(this.parentKeySelector_);
  }

  return details;
};

rhizo.layout.TreeMapLayout.prototype.dependentModels = function(modelId) {
  var extension = [];
  var treeNode = this.globalNodesMap_[modelId];
  if (treeNode) {
    treeNode.deepChildsAsArray(extension);
    for (var i = extension.length-1; i >= 0; i--) {
      extension[i] = extension[i].id;
    }
  }
  return extension;
};


rhizo.layout.TreeMapLayout.prototype.toString = function() {
  return "TreeMap";
};

/**
 * Recursively lay out all the models following the tree structure defined by
 * 'treeRoot'. Each level is laid out before moving to the next (deeper) one,
 * since every level needs bounding rectangles and anchoring information from
 * the above one.
 *
 * @param {rhizo.layout.TreeNode} treeRoot
 * @return {number} The number of models that this layout wants to hide because
 *     their pixel area is too small to properly display on screen.
 * @private
 */
rhizo.layout.TreeMapLayout.prototype.layoutNestedMap_ = function(
    boundingRect, treeRoot, anchorDelta, deepness) {
  var numHiddenModels = 0;

  if (treeRoot.numChilds == 0) {
    return numHiddenModels;
  }

  // Layout all the models at the current hierarchy level.
  var slices = this.layoutFlatMap_(boundingRect, treeRoot);
  for (var i = 0; i < slices.length; i++) {

    // Draw the slices at the current level.
    // This also ensures resizing of all the slice nodes, so nested
    // boundingRects can be computed accurately.
    numHiddenModels += slices[i].draw(this.backupManager_, anchorDelta,
                                      deepness);

    // Iterate all over the TreeMapNodes that have been created at this level.
    for (var j = 0; j < slices[i].nodes().length; j++) {
      var node = slices[i].nodes()[j];
      var treenode = treeRoot.childs[node.model().id];

      // Bind TreeNode and TreeMapNode together (used later for coloring).
      treenode.treemapnode = node;

      // Recurse
      numHiddenModels += this.layoutNestedMap_(node.nestedBoundingRect(),
                                               treenode,
                                               node.nestedAnchor(),
                                               deepness+1);
    }
  }
  return numHiddenModels;
};

rhizo.layout.TreeMapLayout.prototype.sortByAreaDesc_ = function(firstTreeNode,
                                                                secondTreeNode) {
  return secondTreeNode.area - firstTreeNode.area;
};

/**
 * Lays out all the given models at the current hierachy according to the
 * treemap algorithm, with no nesting.
 *
 * @private
 * @param {rhizo.layout.TreeNode} treeRoot The tree node whose children are to
 *     be laid out.
 * @return {Array.<rhizo.layout.treemap.TreeMapSlice>}
 */
rhizo.layout.TreeMapLayout.prototype.layoutFlatMap_ = function(boundingRect,
                                                               treeRoot) {
  var slices = [];

  if (treeRoot.numChilds == 0) {
    return slices;
  }

  var treenodes = treeRoot.childsAsArray();

  // Accumulate area
  var totalArea = 0.0;
  for (var i = 0; i < treenodes.length; i++) {
    totalArea += treenodes[i].area;
  }

  // Compute the ratio between the treemap area and the available pixel region as
  // defined by the boundingRect we will render into.
  var areaRatio;
  if (totalArea > 0) {
      areaRatio = boundingRect.width * boundingRect.height * 1.0 / totalArea;
  }

  // Create the first slice.
  if (boundingRect.width < boundingRect.height) {
    slices.push(new rhizo.layout.treemap.TreeMapSlice(
      boundingRect.width,
      rhizo.layout.treemap.TreeMapDirection.HOR,
      {x:0, y:0}));
  } else {
    slices.push(new rhizo.layout.treemap.TreeMapSlice(
      boundingRect.height,
      rhizo.layout.treemap.TreeMapDirection.VER,
      {x:0, y:0}));
  }
  var currentSlice = slices[0];
  var modelsCount = 0;

  // Sort the models and add the first node to the first slice, to bootstrap
  // the algorithm.
  treenodes.sort(this.sortByAreaDesc_);
  var node = new rhizo.layout.treemap.TreeMapNode(treenodes[modelsCount++],
                                                  areaRatio);
  if (node.area() <= 0.0) {
    node.hide();
  }
  currentSlice.addNode(node);

  while (modelsCount < treenodes.length) {
    node = new rhizo.layout.treemap.TreeMapNode(treenodes[modelsCount++],
                                                areaRatio);
    if (node.area() <= 0.0) {
      node.hide();
      currentSlice.addNode(node);
      continue;
    }

    // compute the worst aspect ratio the slice would have if the node were
    // added to the current slice.
    var withAspectRatio = currentSlice.aspectRatio(node);
    var withoutAspectRatio = currentSlice.aspectRatio();

    if (withAspectRatio > withoutAspectRatio) {
      // Create a new slice, in the opposite direction from the current one and
      // update the remainder boundingRect.
      boundingRect = this.getRemainderBoundingRect_(boundingRect, currentSlice);

      var boundingRectSpan =
        currentSlice.direction() == rhizo.layout.treemap.TreeMapDirection.HOR ?
        boundingRect.height : boundingRect.width;

      if (currentSlice.direction() == rhizo.layout.treemap.TreeMapDirection.HOR) {
        currentSlice = new rhizo.layout.treemap.TreeMapSlice(
          boundingRectSpan,
          rhizo.layout.treemap.TreeMapDirection.VER,
          {x:currentSlice.anchorPoint().x,
           y: currentSlice.anchorPoint().y + currentSlice.span()});
      } else {
        currentSlice = new rhizo.layout.treemap.TreeMapSlice(
          boundingRectSpan,
          rhizo.layout.treemap.TreeMapDirection.HOR,
          {x: currentSlice.anchorPoint().x + currentSlice.span(),
           y: currentSlice.anchorPoint().y});
      }
      slices.push(currentSlice);
    }
    currentSlice.addNode(node);

  }
  return slices;
};

rhizo.layout.TreeMapLayout.prototype.getRemainderBoundingRect_ = function(
    boundingRect, slice) {
  var sliceSpan = slice.span();
  if (slice.direction() == rhizo.layout.treemap.TreeMapDirection.HOR) {
    return {width: boundingRect.width,
            height: boundingRect.height - sliceSpan};
  } else {
    return {width: boundingRect.width - sliceSpan,
            height: boundingRect.height};
  }
};

/**
 * Compute the area each node will occupy summing up the area occupied by all
 * childrens. Zeroes any area that cannot be parsed or is negative (causing the
 * associated model to be hidden).
 * @private
 */
rhizo.layout.TreeMapLayout.prototype.computeNestedAreas_ = function(treeNode,
                                                                    areaMeta) {
  if (treeNode.numChilds == 0) {  // leaf node
    treeNode.area = parseFloat(treeNode.superModel.unwrap()[areaMeta]);
    if (isNaN(treeNode.area) || treeNode.area < 0) {
      // isNaN() occurs when areaMeta is not a numeric property and/or extracted
      // values cannot be converted into a number.
      treeNode.area = 0.0;
    }
  } else {
    var childsArea = 0;
    for (var modelId in treeNode.childs) {
      childsArea += this.computeNestedAreas_(treeNode.childs[modelId], areaMeta);
    }
    treeNode.area = childsArea;
  }
  return treeNode.area;
};

/**
 * Recursively computes the minimum and maximum models' values for the coloring
 * attribute, to be able to later map this range into an RGB color range.
 *
 * The only nodes that participate in coloring are a) visible leaf nodes and
 * b) visible non-leaf nodes whose children are all hidden.
 *
 * @param {rhizo.layout.TreeNode} treeNode The tree node to start recursion from.
 * @param {Object.<string, *>} colorRange A map describing the treemap coloring
 *     range.
 * @private
 */
rhizo.layout.TreeMapLayout.prototype.computeColorRange_ = function(treeNode,
                                                                   colorRange) {
  if (!treeNode.is_root && treeNode.treemapnode.isHidden()) {
    return false;
  }

  // Node is visible.
  if (treeNode.numChilds > 0) {
    var hasVisibleChilds = false;
    for (var modelId in treeNode.childs) {
      // Recurse
      hasVisibleChilds = this.computeColorRange_(
          treeNode.childs[modelId], colorRange) || hasVisibleChilds;
    }
    if (!hasVisibleChilds) {
      treeNode.treemapnode.assignColorRange(colorRange);
    }
  } else if (!treeNode.is_root) {
    // visible leaf node.
    treeNode.treemapnode.assignColorRange(colorRange);
  }
  return true;
};

rhizo.layout.TreeMapLayout.prototype.colorTree_ = function(treeNode,
                                                           colorRange) {
  if (!treeNode.is_root && treeNode.treemapnode.isHidden()) {
    return false;
  }

  // Node is visible
  if (treeNode.numChilds > 0) {
    var hasVisibleChilds = false;
    for (var modelId in treeNode.childs) {
      // Recurse
      hasVisibleChilds = this.colorTree_(
          treeNode.childs[modelId], colorRange) || hasVisibleChilds;
    }
    if (!treeNode.is_root) {
      if (hasVisibleChilds) {
        treeNode.treemapnode.color(colorRange.colorGroup);
      } else {
        treeNode.treemapnode.colorWeighted(colorRange);
      }
    }
  } else if (!treeNode.is_root) {
    // visible leaf node.

    // We can safely color with no backup: These are all visible models, hence
    // a backup has already been created for them.
    treeNode.treemapnode.colorWeighted(colorRange);
  }
  return true;
};

/**
 * Reverts expanded models to unexpanded status, since the layout takes charge
 * of resizing models directly.
 *
 * @param {Array.<rhizo.model.SuperModel>} supermodels List of models that will
 *     be laid out.
 * @private
 */
rhizo.layout.TreeMapLayout.prototype.revertExpandedModels_ = function(
      supermodels, options) {
  for (var i = supermodels.length-1; i >= 0; i--) {
    var model = supermodels[i];
    if (model.expanded) {

      // Revert expanded items, since it messes up with treemapping.
      model.expanded = !model.expanded;
      rhizo.ui.reRender(model,
                        this.project_.renderer(),
                        this.project_.gui().allRenderingHints());
    }
  }
};

// register the treemaplayout in global layout list
rhizo.layout.layouts.treemap = rhizo.layout.TreeMapLayout;
/* ./src/js/rhizo.model.loader.js */
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

// TODO(battlehorse): this file should depend on rhizo.bootstrap, but this
// dependency is omitted because it would cause a circular dependency.
// The reason is that the bootstrap sequence is actually composed of 2 steps:
// - a first step that render the chrome, initiates model loading (hence calling
//   the functions declared here)
// - a second step that renders and deploys the loaded models (called from
//   within this file for some loaders).
// The fix requires splitting bootstrap into 2 separate files.

// RHIZODEP=rhizo.gviz
namespace("rhizo.model.loader");

// Global registry of available loaders.
// Add elements to this array if you want to include your loader.
rhizo.model.loader.loaders = [];

// Global tracking of existing Javascript loaders, necessary to match the
// JSONP callbacks fired by included scripts to the right loader.
$globalJSLoaderCount = 0;
$globalJSLoaderMap = {};

// Plain Javascript file loader
rhizo.model.loader.JS = function(bootstrapper, project, globalOptions) {
  this.bootstrapper_ = bootstrapper;
  this.project_ = project;
  this.globalOptions_ = globalOptions;
  this.loaderCount_ = $globalJSLoaderCount++;
  $globalJSLoaderMap[this.loaderCount_] = this;
};
rhizo.model.loader.loaders.push(rhizo.model.loader.JS);

rhizo.model.loader.JS.prototype.match = function(resource) {
  return /\.js$/.test(resource);
};

rhizo.model.loader.JS.prototype.load = function(resource) {
  var e = document.createElement("script");
  e.src = resource + '?jsonp=$globalJSLoaderMap[' + this.loaderCount_ + '].loadDone';
  e.type="text/javascript";
  document.getElementsByTagName("head")[0].appendChild(e);

  // we expect the script to contain the code the deploy the project,
  // in addition to just defining models and renderers.
};

rhizo.model.loader.JS.prototype.loadDone = function(payload) {
  this.bootstrapper_.deploy(payload);
  $globalJSLoaderMap[this.loaderCount_] = null;
};

// Google Spreadsheet GViz loader
rhizo.model.loader.GoogleSpreadsheet = function(bootstrapper, project, globalOptions) {
  this.bootstrapper_ = bootstrapper;
  this.project_ = project;
  this.globalOptions_ = globalOptions;
};
rhizo.model.loader.loaders.push(rhizo.model.loader.GoogleSpreadsheet);

rhizo.model.loader.GoogleSpreadsheet.prototype.match = function(resource) {
  return /spreadsheets\.google\.com/.test(resource);
};

rhizo.model.loader.GoogleSpreadsheet.prototype.load = function(resource) {
  // The javascript http://www.google.com/jsapi and the visualization
  // package must be already included in the page and available at this point.
  if (typeof google == 'undefined' ||
      typeof google.visualization == 'undefined') {
    this.project_.logger().error('Google Visualization APIs not available.');
  } else {
    var query = new google.visualization.Query(resource);
    var that = this;  // needed to propagate this through the Gviz callback.
    var callback = function(response) {
      that.handleQueryResponse_(response);
    };
    query.send(callback);
  }
};

rhizo.model.loader.GoogleSpreadsheet.prototype.handleQueryResponse_ =
    function(response) {
  if (response.isError()) {
    this.project_.logger().error("GViz load failed: " + response.getMessage());
    return;
  }
  var initializer = new rhizo.gviz.Initializer(response.getDataTable(),
                                               this.project_,
                                               this.globalOptions_);

  this.bootstrapper_.deploy({
    'renderer': initializer.renderer,
    'metamodel': initializer.metamodel,
    'models': initializer.models});
};

// Gadget GViz loader
rhizo.model.loader.GoogleGadget = function(bootstrapper, project, globalOptions) {
  this.bootstrapper_ = bootstrapper;
  this.project_ = project;
  this.globalOptions_ = globalOptions;
};
rhizo.model.loader.loaders.push(rhizo.model.loader.GoogleGadget);

rhizo.model.loader.GoogleGadget.RESOURCE = "__google_gadget";
rhizo.model.loader.GoogleGadget.prototype.match = function(resource) {
  var regexp = new RegExp(rhizo.model.loader.GoogleGadget.RESOURCE);
  return regexp.test(resource);
};

rhizo.model.loader.GoogleGadget.prototype.load = function(resource) {
  if (typeof google == 'undefined' ||
      typeof google.visualization == 'undefined') {
    this.project_.logger().error('Google Visualization APIs not available.');
    return;
  }

  if (typeof _IG_Prefs == 'undefined') {
    this.project_.logger().error('Google Gadget APIs not available.');
    return;
  }

  var prefs = new _IG_Prefs();
  var gadgetHelper = new google.visualization.GadgetHelper();
  var query = gadgetHelper.createQueryFromPrefs(prefs);
  var that = this;  // needed to propagate this through the Gviz callback.
  var callback = function(response) {
    that.handleQueryResponse_(response);
  };
  query.send(callback);
};

rhizo.model.loader.GoogleGadget.prototype.handleQueryResponse_ =
  rhizo.model.loader.GoogleSpreadsheet.prototype.handleQueryResponse_;


/**
 * Global function that load a resource containing a Rhizosphere
 * model and creates a rhizo.Project out of it.
 * This method call should probably appear somewhere in your bootstrap
 * sequence, unless you only want to explicitly load a specific model.
 *
 * @param {string} resource the resource to load.
 *     Tipically this will be a URL.
 * @param {rhizo.boostrap.Bootstrap} bootstrapper the project bootstrapper.
 * @param {rhizo.Project} project the project we're loading the models for.
 * @param {Object} globalOptions key-values for the global options.
 */
rhizo.model.loader.load = function(resource, bootstrapper, project, globalOptions) {
  var loader_ctors = rhizo.model.loader.loaders;

  for (var i = 0; i < loader_ctors.length; i++) {
    var loader = new loader_ctors[i](bootstrapper, project, globalOptions);
    if (loader.match(resource)) {
      loader.load(resource);
      return;
    }
  }

  // TODO(battlehorse): The logger here might not be visible to the user
  // (e.g.: native console or NoOpLogger ), should we rely on alert() to
  // make sure the user receives the message?
  project.logger().error('No loader available for the resource: ' + resource);
};
/* ./src/js/rhizo.ui.gui.js */
/*
  Copyright 2010 Riccardo Govoni battlehorse@gmail.com

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

// RHIZODEP=rhizo.ui.component
// GUI Namespace
namespace("rhizo.ui.gui");

/*
  A GUI is a collection of UI Components. A GUI is built by a Template.
*/
rhizo.ui.gui.GUI = function(container, platform, device) {
  // The target platform we are rendering onto (e.g.: 'mobile').
  this.platform_ = platform;

  // The specific device we are targeting (e.g.: 'ipad').
  this.device_ = device;

  // A JQuery object pointing to the DOM element that contains the whole
  // Rhizosphere instance.
  this.container = container;
  this.is_small_container_ = false;
  this.initContainer_();

  // The universe component is the container for all the models managed
  // by Rhizosphere. A universe must always exist in a Rhizosphere
  // visualization.
  this.universe = null;
  this.universeTargetPosition_ = {top: 0, left: 0};

  // The viewport component defines which part of the universe is visible to
  // the user. The universe may be bigger than the current visible area,
  // so the viewport is responsible for panning too.
  this.viewport = null;

  // A set of additional components, each one identified by a unique name
  // (map key).
  //
  // In addition to the mandatory components, defined above, a GUI can have
  // extra components attached to it.
  this.componentsMap_ = {};

  // Dictates whether animations are enabled or not.
  this.noFx = false;

  this.selectionModeOn_ = false;
};

rhizo.ui.gui.GUI.prototype.initContainer_ = function() {
  // Enable device-specific and platform-specific styles.
  this.container.
      addClass('rhizo').
      addClass('rhizo-device-' + this.device_).
      addClass('rhizo-platform-' + this.platform_);  
  this.is_small_container_ = this.container.width() < 600 ||
      this.container.height() < 250;
};

rhizo.ui.gui.GUI.prototype.setViewport = function(viewport) {
  this.viewport = viewport;
};

rhizo.ui.gui.GUI.prototype.setUniverse = function(universe) {
  this.universe = universe;
};

rhizo.ui.gui.GUI.prototype.addComponent = function(component_key, component) {
  this.componentsMap_[component_key] = component;
};

rhizo.ui.gui.GUI.prototype.getComponent = function(component_key) {
  return this.componentsMap_[component_key];
};

/**
 * @return {boolean} Whether the GUI is 'small' (in terms of pixel area).
 *     Renderers might use this hint to customize the renderings they produce.
 */
rhizo.ui.gui.GUI.prototype.isSmall = function() {
  return this.is_small_container_;
};

/**
 * @return {boolean} Are we running on a mobile device?
 */
rhizo.ui.gui.GUI.prototype.isMobile = function() {
  return this.platform_ == 'mobile';
};

rhizo.ui.gui.GUI.prototype.allRenderingHints = function() {
  return {
    small: this.isSmall(),
    mobile: this.isMobile()
  };
};

/**
 * @return {boolean} Whether the viewport is in selection mode or not.
 */
rhizo.ui.gui.GUI.prototype.isSelectionModeOn = function() {
  return this.selectionModeOn_;
};

/**
 * Toggles the viewport between selection mode and panning mode (the default),
 * which determines how mouse drag operations will be interpreted.
 */
rhizo.ui.gui.GUI.prototype.toggleSelectionMode = function() {
  this.selectionModeOn_ = !this.selectionModeOn_;
  var selectable_status = this.selectionModeOn_ ? 'enable' : 'disable';
  var draggable_status = this.selectionModeOn_ ? 'disable' : 'enable';
  this.viewport.selectable(selectable_status).
      draggable(draggable_status).
      toggleClass('rhizo-selection-mode');

  // If a BottomBar exists, ask it to make the SelectionManager component
  // visible whenever we are in selection mode.
  var bottomBar = this.getComponent('rhizo.ui.component.BottomBar');
  if (bottomBar) {
    bottomBar.toggleComponent('rhizo.ui.component.SelectionManager',
                              this.selectionModeOn_); 
  }

  var selManager = this.getComponent('rhizo.ui.component.SelectionManager');
  if (selManager) {
    selManager.toggleSelectionTrigger(this.selectionModeOn_);
  }
};

rhizo.ui.gui.GUI.prototype.disableFx = function(disabled) {
  this.noFx = disabled;
};

rhizo.ui.gui.GUI.prototype.moveUniverse = function(position) {
  this.universeTargetPosition_ = {top: position.top, left: position.left};
  this.universe.stop().css(this.universeTargetPosition_);
};

rhizo.ui.gui.GUI.prototype.panUniverse = function(yMagnitude,
                                                  xMagnitude,
                                                  timestamp) {
  var scale = Math.round(this.viewport.get(0).offsetHeight / 10);
  this.universeTargetPosition_ = {
    top: yMagnitude*scale + this.universeTargetPosition_.top,
    left: xMagnitude*scale + this.universeTargetPosition_.left
  };
  this.universe.stop().animate(this.universeTargetPosition_);
};

rhizo.ui.gui.GUI.prototype.activateOnscreenKeyboard = function() {
  if (rhizo.keyboard && rhizo.keyboard.Keyboard) {
    new rhizo.keyboard.Keyboard(this.container);
  }
};
/* ./src/js/rhizo.bootstrap.js */
/*
  Copyright 2009 Riccardo Govoni battlehorse@gmail.com

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

// RHIZODEP=rhizo.model.loader,rhizo.base,rhizo.ui.component,rhizo.jquery,rhizo.ui.gui
namespace('rhizo.bootstrap');

rhizo.bootstrap.Bootstrap = function(container, opt_options) {
  this.container_ = container;
  this.options_ = { selectfilter: '.rhizo-model:visible' };
  if (opt_options) {
    $.extend(this.options_, opt_options);
  }
};

/**
 * Identify the platform and device we are running onto.
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.identifyPlatformAndDevice_ = function() {
  if (this.options_.forcePlatform && this.options_.forceDevice) {
    return {platform: this.options_.forcePlatform,
            device: this.options_.forceDevice};
  }
  var ua = navigator.userAgent;
  if (ua.toLowerCase().indexOf('ipad') != -1) {
    return {platform: 'mobile', device: 'ipad'};
  }
  return {platform: 'default', device: 'default'};
};

/**
 * Identifies the best template to use for the visualization.
 * @param {rhizo.ui.gui.GUI} gui
 * @return {function(rhizo.Project):Object} A constructor for the template to
 *     use. 
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.identifyTemplate_ = function(gui) {
  var templateCtors = {
    'bottom' : rhizo.ui.component.BottomTemplate,
    'default': rhizo.ui.component.StandardTemplate
  };

  if (this.options_.forceTemplate &&
      this.options_.forceTemplate in templateCtors)
  if (this.options_.forceTemplate) {
    return templateCtors[this.options_.forceTemplate];
  }

  // No specific template has been forced. Select a specific one based on
  // document size and target platform.
  if (gui.isMobile() || gui.isSmall()) {
    return templateCtors['bottom'];
  }
  return templateCtors['default'];
};

rhizo.bootstrap.Bootstrap.prototype.go = function(opt_resource) {
  // Identify the target platform and device we are running onto.
  var platformDevice = this.identifyPlatformAndDevice_();  

  // Create the GUI.
  var gui = new rhizo.ui.gui.GUI(this.container_,
                                 platformDevice.platform,
                                 platformDevice.device);
  if (this.options_.noAnims) {
    gui.disableFx(true);
  }

  // Extends jQuery with all the additional behaviors required by Rhizosphere
  // Disable animations and other performance tunings if needed.
  // 
  // TODO(battlehorse): this must happen at the global level, and not locally
  // for every single visualization.
  // See http://code.google.com/p/rhizosphere/issues/detail?id=68.
  rhizo.jquery.init(gui, this.options_.noAnims);

  // Create the project.
  this.project_ = new rhizo.Project(gui, this.options_);

  // Identify the target device and template to use.
  var templateCtor = this.identifyTemplate_(gui);
  this.template_ = new templateCtor(this.project_);

  // Get the minimum chrome up and running.
  this.template_.renderChrome(this.options_);
  this.template_.activateChrome(this.options_);

  this.project_.chromeReady();

  // Open the models' source...
  var source = opt_resource;
  if (!source && this.options_.allowSourcesFromUrl) {
    var regex = new RegExp('(source|src)=([^&]+)');
    var results = regex.exec(document.location.href);
    if (!results || !results[2]) {
      this.project_.logger().error("Unable to identify datasource from location");
    } else {
      source = decodeURIComponent(results[2]);
    }
  }

  // ... and load it.
  if (source) {
    rhizo.model.loader.load(source, this, this.project_, this.options_);
  }
};

rhizo.bootstrap.Bootstrap.prototype.deploy = function(payload) {
  this.project_.setMetaModel(payload.metamodel);
  this.project_.setRenderer(payload.renderer);

  this.project_.metaReady();

  this.template_.renderDynamic(this.options_);
  this.template_.activateDynamic(this.options_);

  this.project_.deploy(payload.models);
  this.template_.done();

  if (/kb=(true|yes|1)/.test(document.location.href)) {
    this.project_.gui().activateOnscreenKeyboard();
  }
};
