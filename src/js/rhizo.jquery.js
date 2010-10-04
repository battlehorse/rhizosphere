/*
  Copyright 2010 The Rhizosphere Authors. All Rights Reserved.

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
        fadeOut: function(opt_callback) {
          $(this).css({visibility: 'hidden', opacity: 0.0});
          if (opt_callback) {
            opt_callback.apply(this);
          }
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
          $(this).stop(true, true);
          if (gui.noFx) {
            $(this).css({visibility: 'visible', opacity: 1.0});
          } else {
            $(this).css('visibility', 'visible').animate({opacity: 1.0}, 400);
          }
        },
        fadeOut: function(opt_callback) {
          $(this).stop(true, true);
          if (gui.noFx) {
            $(this).css({visibility: 'hidden', opacity: 0.0});
            if (opt_callback) {
              opt_callback.apply(this);
            }
          } else {
            $(this).animate({opacity: 0.0}, {
                             duration: 400,
                             complete: function() {
                               $(this).css('visibility', 'hidden');
                               if (opt_callback) {
                                 opt_callback.apply(this);
                               }
                             }});
          }
        },
        greyOut: function() {
          $(this).stop(true, true);
          if (gui.noFx) {
            $(this).css({visibility: 'visible', 'opacity': 0.2});
          } else {
            $(this).css('visibility', 'visible').animate({opacity: 0.2}, 400);
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
