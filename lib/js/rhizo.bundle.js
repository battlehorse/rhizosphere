/* ./src/js/rhizo.js */
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

/**
 * Parses an URI extracting the different parts that compose it.
 *
 * This function comes straight from Steven Levithan's parseURI library
 * (http://blog.stevenlevithan.com/archives/parseuri), released under the MIT
 * license. See the NOTICE file for further info.
 * @param {string} str The URI to parse.
 * @return {Object.<string, string>} A key-value map for all the composing
 *     parts of the parsed URI, like 'protocol', 'host', 'path' and so forth.
 */
rhizo.util.parseUri = function(str) {
  var o = rhizo.util.parseUri.options_;
  var m = o.parser[o.strictMode ? "strict" : "loose"].exec(str);
  var uri = {};
  var i   = 14;

  while (i--) uri[o.key[i]] = m[i] || "";

  uri[o.q.name] = {};
  uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
    if ($1) uri[o.q.name][$1] = $2;
  });

  return uri;
};

/**
 * Configuration options for rhizo.util.parseUri
 * @type {*}
 * @private
 */
rhizo.util.parseUri.options_ = {
  strictMode: false,
  key: ["source","protocol","authority","userInfo","user","password","host",
        "port","relative","path","directory","file","query","anchor"],
  q: {
    name:   "queryKey",
    parser: /(?:^|&)([^&=]*)=?([^&]*)/g
  },
  parser: {
    strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
    loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
  }
};

/**
 * @return {Object.<stirng, string>} A key-value map of all the URL parameters
 *     in the current document URL.
 */
rhizo.util.urlParams = function() {
  return rhizo.util.parseUri(document.location.href).queryKey;
};

/**
 * Creates a new url by adding extra query parameters to a base url.
 *
 * @param {string} opt_url The base url to build the new one from. Defaults to
 *     document.location.href if unspecified.
 * @param {Object.<string, string>} opt_extra_params A key-value map of
 *     query parameters that will be added to the url.
 * @return {string} The newly built url.
 */
rhizo.util.buildUrl = function(opt_url, opt_extra_params) {
  var url = opt_url || document.location.href;
  if (!opt_extra_params) {
    return url;
  }
  urlData = rhizo.util.parseUri(url);
  var newUrl = [
      urlData.protocol, '://',
      urlData.authority,
      urlData.path, '?',
      urlData.query ];
  for (var key in opt_extra_params) {
    newUrl.push('&');
    newUrl.push(key);
    newUrl.push('=');
    newUrl.push(encodeURIComponent(opt_extra_params[key]))
  }
  if (urlData.anchor.length > 0) {
    newUrl.push('#');
    newUrl.push(urlData.anchor)
  }
  return newUrl.join('');
};/* ./src/js/rhizo.jquery.js */
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
 * @param {boolean} enableAnims whether the visualization can use animations to
 *     smooth UI transitions, such as applying layouts and filters.
 * @param {boolean} enableMouseWheelForPanning whether the visualization should
 *     explicitly trap mousewheel (and trackpad) events and convert them into
 *     panning requests for the visualization viewport.
 */
rhizo.jquery.init = function(gui, enableAnims, enableMouseWheelForPanning) {
  rhizo.jquery.initAnimations_(gui, enableAnims);
  if (enableMouseWheelForPanning) {
    rhizo.jquery.initMouseWheel_();
  }
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
 * @param {boolean} enableAnims whether the visualization can use animations to
 *     smooth UI transitions, such as applying layouts and filters.
 */
rhizo.jquery.initAnimations_ = function(gui, enableAnims) {
  if ($.support.greyOut) {
    return;
  }
  $.extend($.support, {greyOut: true});

  (function($) {
    if (!enableAnims) {
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
      // animations only in case of overload.
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

  if ($.support.mouseWheel) {
    return;
  }

  $.extend($.support, {mouseWheel: true});
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


/**
 * Changes the visibility of a list of models in bulk.
 * @param {Array.<rhizo.model.SuperModel>} models The list of models to affect.
 * @param {rhizo.ui.Visibility} visibility The visibility renderings should
 *     fade to.
 */
rhizo.ui.fadeAllRenderingsTo = function(models, visibility) {
  var nodes = [];
  for (var i = 0; i < models.length; i++) {
    nodes.push(models[i].rendering().raw_());
  }
  $(nodes).fadeTo(visibility);
};


/**
 * Extracts the affected model from a triggered user event.
 * @param {Event} ev
 * @param {rhizo.Project} project
 * @return {?rhizo.model.SuperModel} The affected model, or null if the
 *     event was not bound to any model.
 */
rhizo.ui.eventToModel = function(ev, project) {
  return project.model($(ev.currentTarget).data('id'));
};


/**
 * Extracts the associated model from an HTMLElement.
 * @param {HTMLElement} element
 * @param {rhizo.Project} project
 * @return {?rhizo.model.SuperModel} The associated model, or null if the
 *     element is not bound to any model.
 */
rhizo.ui.elementToModel = function(element, project) {
  return project.model($(element).data('id'));
};


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
 * Defines all the rendering operations supported by a RenderingPipeline.
 * @enum {string}
 */
rhizo.ui.RenderingOp = {
  // Request to add an artifact (i.e. any UI control or element which is not a
  // SuperModel) to the layout.
  ARTIFACT: 'artifact',

  // Request to move a SuperModel rendering.
  MOVE: 'move',

  // Request to resize a SuperModel rendering.
  RESIZE: 'resize',

  // Request to change the style of a SuperModel rendering.
  STYLE: 'style'
};


/**
 * A RenderingPipeline accumulates operations to be performed on the project
 * renderings, and applies all of the at once when requested.
 *
 * Typically used to accumulate all operations that are part of a layout
 * request.
 *
 * A RenderingPipeline by default keeps backup copies of the renderings
 * it modifies and subsequently restore them.
 * See also rhizo.ui.RenderingBackupManager.
 *
 * @param {rhizo.Project} project The visualization project.
 * @param {*} container The jQuery object pointing to a container where
 *     rendering artifacts will be added (typically the visualization universe).
 * @constructor
 */
rhizo.ui.RenderingPipeline = function(project, container) {
  this.project_ = project;
  this.container_ = container;

  /**
   * Maps model ids to the list of operations to be applied onto them.
   * @type {Object.<*, Array.<*>>}
   * @private
   */
  this.renderingOps_ = {};

  /**
   * The list of artifacts the must be added to the container as part of the
   * pipeline execution.
   *
   * @type {Array.<*>}
   * @private
   */
  this.artifacts_ = [];

  /**
   * jQuery object pointing to the container where all artifacts will be added
   * to.
   * @type {*}
   * @private
   */
  this.artifactLayer_ = $('<div />').
      css('visibility', 'hidden').
      appendTo(this.container_);

  this.backupEnabled_ = true;
  this.backupManager_ = new rhizo.ui.RenderingBackupManager();
};

/**
 * Clears the pipeline.
 */
rhizo.ui.RenderingPipeline.prototype.cleanup = function() {
  this.artifactLayer_.remove();
  this.artifactLayer_ = $('<div />').
      css('visibility', 'hidden').
      appendTo(this.container_);

  this.artifacts_ = [];
  this.renderingOps_ = {};
};

/**
 * @return {?rhizo.ui.RenderingBackupManager} The backup manager associated
 *     to the pipeline, if backups are enabled.
 */
rhizo.ui.RenderingPipeline.prototype.backupManager = function() {
  return this.backupEnabled_ ? this.backupManager_ : null;
};

/**
 * Enables or disables backup functionality for the pipeline. Backups are
 * enabled by default.
 *
 * @param {boolean} enabled Whether to enable or disable backups.
 */
rhizo.ui.RenderingPipeline.prototype.setBackupEnabled = function(enabled) {
  if (!enabled) {
    this.backupManager_.clear();
  }
  this.backupEnabled_ = enabled;
};

/**
 * If backups are enabled, backs up the given model.
 * @param {*} modelId The id of the model to backup.
 * @return {boolean} if the model rendering was added to the backups.
 * @private
 */
rhizo.ui.RenderingPipeline.prototype.backup_ = function(modelId) {
  if (this.backupEnabled_) {
    return this.backupManager_.backup(
        modelId, this.project_.model(modelId).rendering());
  }
  return false;
};

/**
 * Returns the list of operations currently queued for a given model.
 * @param {*} modelId The model id.
 * @return {Array.<*>} The list of operations currently queued for the model.
 * @private
 */
rhizo.ui.RenderingPipeline.prototype.getModelOps_ = function(modelId) {
  if (!(modelId in this.renderingOps_)) {
    this.renderingOps_[modelId] = [];
  }
  return this.renderingOps_[modelId];
};

/**
 * Appends a rendering movement request to the current pipeline.
 *
 * @param {*} modelId The id of the model to move.
 * @param {number} top The top coordinate where the top-left corner of the
 *     model rendering should be moved to (with respect to the visualization
 *     universe top-left corner position).
 * @param {number} left The left coordinate where the top-left corner of the
 *     model rendering should be moved to (with respect to the visualization
 *     universe top-left corner position).
 * @param {?string} opt_elevation_key An optional elevation key to change the
 *     rendering elevation.
 * @param {?number} opt_elevation_value An optional elevation value to set
 *     elevation to, for the given elevation_key.
 * @return {rhizo.ui.RenderingPipeline} The pipeline itself, for chaining.
 */
rhizo.ui.RenderingPipeline.prototype.move = function(
    modelId, top, left, opt_elevation_key, opt_elevation_value) {
  var modelOps = this.getModelOps_(modelId);
  var op = {
    op: rhizo.ui.RenderingOp.MOVE,
    top: top,
    left: left
  };
  if (opt_elevation_key !== undefined && opt_elevation_value !== undefined) {
    this.backup_(modelId);
    op.elevation = {key: opt_elevation_key, value: opt_elevation_value};
  }
  modelOps.push(op);
  return this;
};

/**
 * Appends a rendering resize request to the current pipeline.
 * The method assumes that the rendering accepts resizing to the given size,
 * as defined by rhizo.ui.Rendering.prototype.canRescaleTo().
 *
 * @param {*} modelId The id of the model to resize.
 * @param {number} width The width (in pixels) the rendering should be resized
 *     to.
 * @param {number} height The height (in pixels) the rendering should be resized
 *     to.
 * @return {rhizo.ui.RenderingPipeline} The pipeline itself, for chaining.
 */
rhizo.ui.RenderingPipeline.prototype.resize = function(modelId, width, height) {
  this.backup_(modelId);
  this.getModelOps_(modelId).push({
    op: rhizo.ui.RenderingOp.RESIZE,
    width: width,
    height: height
  });
  return this;
};

/**
 * Appends a request to the current pipeline to change a rendering style.
 *
 * @param {*} modelId The id of the model to change.
 * @param {*} styleProps The styles to set, in the form of a plain javascript
 *     object mapping CSS property names to their target values.
 * @return {rhizo.ui.RenderingPipeline} The pipeline itself, for chaining.
 */
rhizo.ui.RenderingPipeline.prototype.style = function(modelId, styleProps) {
  this.backup_(modelId);
  this.getModelOps_(modelId).push({
    op: rhizo.ui.RenderingOp.STYLE,
    styleProps: styleProps
  });
  return this;
};

/**
 * Adds an artifact. An artifact is any HTML element which needs to be added to
 * the visualization viewport when applying the pipeline.
 *
 * Technically, artifacts are immediately added to an invisible pane when this
 * method is called, and then only displayed when the pipeline is applied.
 *
 * This allows the caller to access the true artifact dimensions immediately
 * after this method call.
 *
 * This includes, for instance, reference elements such as headers and
 * connectors, used by layouts.
 *
 * @param {*} artifact The HTML element, or jQuery object pointing to it,
 *     representing the artifact to add.
 * @return {rhizo.ui.RenderingPipeline} The pipeline itself, for chaining.
 */
rhizo.ui.RenderingPipeline.prototype.artifact =  function(artifact) {
  this.artifactLayer_.append(artifact);
  return this;
};

/**
 * Applies the pipeline, executing all the queued operations.
 *
 * @return {*} An object containing 'top', 'left', 'width' and 'height'
 *   properties, representing the area (in pixels) occupied by all the models'
 *   renderings that were part of this pipeline. The top,left coords define
 *   the offset between the top-left corner of the bounding rectangle and
 *   the top-left corner of the visualization universe.
 */
rhizo.ui.RenderingPipeline.prototype.apply = function() {
  var boundingRect = {
      top: Number.POSITIVE_INFINITY,
      left: Number.POSITIVE_INFINITY,
      width: 0,
      height: 0
  };
  for (var modelId in this.renderingOps_) {
    var ops = this.renderingOps_[modelId];
    for (var i = ops.length-1; i >= 0; i--) {
      var rendering = this.project_.model(modelId).rendering();
      switch (ops[i].op) {
        case rhizo.ui.RenderingOp.MOVE:
          rendering.move(ops[i].top, ops[i].left);
          if (ops[i].elevation) {
            rendering.pushElevation(ops[i].elevation.key,
                                    ops[i].elevation.value);
          }
          break;
        case rhizo.ui.RenderingOp.RESIZE:
          rendering.rescaleRendering(ops[i].width, ops[i].height);
          break;
        case rhizo.ui.RenderingOp.STYLE:
          rendering.setNakedCss(ops[i].styleProps);
          break;
        default:
          throw("Unrecognized rendering op: " + ops[i].op);
      }
    }
    this.updateBoundingRectangleCorner_(rendering, boundingRect);
  }
  this.computeBoundingRectangleArea_(boundingRect);
  this.artifactLayer_.css('visibility', 'visible');
  return boundingRect;
};

/**
 * Updates the bounding rectangle top-left coordinates including the position
 * of the given rendering.
 *
 * @param {rhizo.ui.Rendering} rendering The rendering under inspection.
 * @param {*} boundingRect
 * @private
 */
rhizo.ui.RenderingPipeline.prototype.updateBoundingRectangleCorner_ = function(
    rendering, boundingRect) {
  var renderingPosition = rendering.position();
  boundingRect.top = Math.min(renderingPosition.top, boundingRect.top);
  boundingRect.left = Math.min(renderingPosition.left, boundingRect.left);

};

/**
 * Updates the width and height of the bounding rectangle from the position
 * and sizes of all the renderings managed by the pipeline.
 *
 * @param {*} boundingRect
 * @private
 */
rhizo.ui.RenderingPipeline.prototype.computeBoundingRectangleArea_ = function(
    boundingRect) {
  for (var modelId in this.renderingOps_) {
    var rendering = this.project_.model(modelId).rendering();
    var renderingDimensions = rendering.getDimensions();
    var renderingPosition = rendering.position();
    boundingRect.width = Math.max(
        boundingRect.width,
        renderingDimensions.width + renderingPosition.left - boundingRect.left);
    boundingRect.height = Math.max(
        boundingRect.height,
        renderingDimensions.height + renderingPosition.top - boundingRect.top);
  }
};


/**
 * A backup manager saves Renderings original attributes and restores them once
 * any applied change is no longer needed.
 *
 * Backup managers are used to revert the changes pushed onto renderings by
 * the execution of RenderingPipelines.
 *
 * Rendering pipelines, used by layout operations, may affect the aspect
 * of Renderings, such as their size or styles (in contrast with only changing
 * their position), which will then be restored once the layout changes.
 *
 * A backup manager can be preserved through multiple consequent executions
 * of a RenderingPipeline. Depending on the condition:
 * - Only the delta of models between the two executions is restored
 *   (removed from backup models) or added to the set (such as when the same
 *   layout is applied twice).
 * - All backup models are restored (see restoreAll()).
 * - when a new RenderingPipeline is created, the set of associated backup
 *   models is initially empty and populated during the pipeline buildup.
 *
 * @constructor
 */
rhizo.ui.RenderingBackupManager = function() {

  /**
   * @type {Object.<string, rhizo.layout.treemap.RenderingBackup>}
   * @private
   */
  this.renderingBackups_ = {};
  this.numBackups_ = 0;
};

/**
 * Clears all the currently stored backups, without restoring them.
 */
rhizo.ui.RenderingBackupManager.prototype.clear = function() {
  this.renderingBackups_ = {};
  this.numBackups_ = 0;
};

/**
 * Adds a new rendering to the backup, if it is not already in there.
 * @param {*} mid The unique id of the model bound to this rendering.
 * @param {rhizo.ui.Rendering} rendering The rendering to backup.
 * @return {boolean} if the rendering was added to the backups.
 */
rhizo.ui.RenderingBackupManager.prototype.backup = function(
    mid, rendering) {
  if (!(mid in this.renderingBackups_)) {
    this.renderingBackups_[mid] =
        new rhizo.ui.RenderingBackup(rendering);
    this.numBackups_++;
    return true;
  }
  return false;
};

/**
 * Removes a rendering from the backup (if present) without restoring it.
 * @param {string} mid The id of the model whose rendering is to remove.
 */
rhizo.ui.RenderingBackupManager.prototype.removeBackup = function(
    mid) {
  if (mid in this.renderingBackups_) {
    delete this.renderingBackups_[mid];
    this.numBackups_--;
  }
};

/**
 * Partially restores the set of currently backed up models by comparing the
 * backups stored so far and all the models the are potentially going to be
 * affected. All the models that are in the former set but not in the latter
 * will be restored.
 *
 * @param {Array.<rhizo.model.SuperModel>} supermodels List of models that will
 *     be (potentially) affected from now on.
 * @param {boolean} styleReset Whether we are still required to restore all
 *     style changes on all backed up models.
 */
rhizo.ui.RenderingBackupManager.prototype.restore = function(
      supermodels, styleReset) {
  if (this.numBackups_ > 0) {
    var survivingModelIds = {};
    for (var i = 0; i < supermodels.length; i++) {
      survivingModelIds[supermodels[i].id] = true;
    }
    var restorableModels = {};
    for (var mid in this.renderingBackups_) {
      if (!(mid in survivingModelIds)) {
        restorableModels[mid] = true;
      }
    }
    this.restoreInternal_(restorableModels, true, true, true);

    if (styleReset) {
      this.restoreInternal_(
          this.renderingBackups_,
          /*sizes=*/ false, /*elevation=*/ false, /*styles=*/ true);
    }
  }
};

/**
 * Restores all the backups.
 */
rhizo.ui.RenderingBackupManager.prototype.restoreAll = function() {
  this.restoreInternal_(this.renderingBackups_, true, true, true);
  this.renderingBackups_ = {};  // just in case.
  this.numBackups_ = 0;
};

/**
 * Restores a specified set of models from their backups.
 * @param {Object.<*, rhizo.ui.RenderingBackup>} modelsMap A map of models to
 *     restore, mapping from the model id to the associated backup.
 * @param {boolean} restoreSizes Whether to restore the size of the rendering.
 * @param {boolean} restoreElevation Whether to restore the rendering elevation
 *     map.
 * @param {boolean} restoreStyles Whether to restore the styles of the
 *     rendering.
 * @private
 */
rhizo.ui.RenderingBackupManager.prototype.restoreInternal_ =
    function(modelsMap, restoreSizes, restoreElevation, restoreStyles) {
  for (var mid in modelsMap) {
    this.renderingBackups_[mid].restore(restoreSizes,
                                        restoreElevation,
                                        restoreStyles);
    if (restoreSizes && restoreElevation && restoreStyles) {
      delete this.renderingBackups_[mid];
      this.numBackups_--;
    }
  }
};


/**
 * A wrapper around a supermodel Rendering to backup relevant attributes that
 * will need to be restored once we clean up a RenderingPipeline.
 *
 * @param {rhizo.ui.Rendering} rendering The rendering to backup.
 * @constructor
 */
rhizo.ui.RenderingBackup = function(rendering) {
  this.rendering_ = rendering;
  this.originalDimensions_ = jQuery.extend({}, rendering.getDimensions());

  // NOTE: background-color is the only style that Rhizosphere layouts and
  // RenderingPipelines actually change, so we take the shortcut here of
  // tracking the initial value of just this style attribute.
  this.originalBackground_ = rendering.nakedCss('background-color');

  this.originalElevation_ = this.rendering_.cloneElevation();
};

/**
 * Restores the model managed by this backup.
 * @param {boolean} restoreSizes Whether to restore the size of the rendering.
 * @param {boolean} restoreElevation Whether to restore the rendering elevation
 *     map.
 * @param {boolean} restoreStyles Whether to restore the styles of the
 *     rendering.
 */
rhizo.ui.RenderingBackup.prototype.restore = function(
    restoreSizes, restoreElevation, restoreStyles) {
  if (restoreStyles) {
    this.rendering_.setNakedCss({backgroundColor: this.originalBackground_},
                                /* revert hint */ true);
  }
  if (restoreSizes) {
    this.rendering_.rescaleRendering(this.originalDimensions_.width,
                                     this.originalDimensions_.height);

  }
  if (restoreElevation) {
    this.rendering_.restoreElevation(this.originalElevation_);
  }
};


/**
 * Manages a max-heap of renderings' named elevations (z-indexes when applied to
 * HTML elements). A rendering can be raised to different elevations, with
 * the highest one being the one that is effectively used.
 *
 * Base elevation is 0, and any elevation request below or equal to that
 * threshold will be ignored.
 * @constructor
 */
rhizo.ui.Elevation = function() {
  this.elevations_ = {};
  this.elevation_top_ = 0;

  // An offset that will always be added to the returned elevation values.
  // Should match the base z-index used by Rhizosphere models.
  this.elevation_offset_ = 50;
};

rhizo.ui.Elevation.prototype.clone = function() {
  var el = new rhizo.ui.Elevation();
  el.elevations_ = $.extend({}, this.elevations_);
  el.elevation_top_ = this.elevation_top_;
  return el;
};

/**
 * Adds a named elevation.
 * @param {string} el_key
 * @param {number} el_value
 * @return {boolean} Whether the highest elevation changed because of this
 *     addition.
 */
rhizo.ui.Elevation.prototype.add = function(el_key, el_value) {
  if (el_value <= 0) {
    return false;
  }
  this.elevations_[el_key] = el_value;
  return this.recomputeTop_();
};

/**
 * Removes a named elevation.
 * @param {string} el_key
 * @return {boolean} Whether the highest elevation changed because of this
 *     removal.
 */
rhizo.ui.Elevation.prototype.remove = function(el_key) {
  delete this.elevations_[el_key];
  return this.recomputeTop_();
};

/**
 * @return {number} The highest elevation value.
 */
rhizo.ui.Elevation.prototype.top = function() {
  return this.elevation_top_ + this.elevation_offset_;
};

/**
 * @return {boolean} Whether no named elevations are recorded yet.
 */
rhizo.ui.Elevation.prototype.empty = function() {
  return this.elevation_top_ == 0;
};

/**
 * @private
 * @return {boolean} Whether the highest elevation changed
 */
rhizo.ui.Elevation.prototype.recomputeTop_ = function() {
  var new_top_ = 0;
  for (var key in this.elevations_) {
    new_top_ = Math.max(new_top_, this.elevations_[key]);
  }
  if (new_top_ != this.elevation_top_) {
    this.elevation_top_ = new_top_;
    return true;
  }
  return false;
};

/**
 * A Rendering is a wrapper that enriches plain (naked) model renderings
 * returned from the project renderer with all the additional events,
 * functionality and goodness Rhizosphere requires.
 *
 * Three layers of rendering exist:
 * - A 'naked' rendering is the plain output of the project renderer. This is
 *   where per-project customization occurs.
 * - A 'raw' (or 'shell') rendering is a thin wrapper on the naked rendering,
 *   to simplify isolation and targeting of renderings among the other HTML
 *   elements that exist within a Rhizosphere visualization. Typically it's
 *   just a DIV wrapper around the naked renderer, with a specific CSS class
 *   assigned to it.
 * - A rhizo.ui.Rendering wraps a 'raw' rendering and exposes to the rest of
 *   Rhizosphere all the available operations that can be performed on
 *   renderings.
 *
 * @param {rhizo.model.SuperModel} model The model this rendering will be bound
 *     to.
 * @param {*} rawNode The jQuery object that manages the 'raw' rendering.
 * @param {*} renderer The project renderer.
 * @param {*} renderingHints The project rendering hints.
 * @constructor
 */
rhizo.ui.Rendering = function(model, rawNode, renderer, renderingHints) {
  this.model_ = model;
  this.id = model.id;
  this.raw_node_ = rawNode;
  this.naked_node_ = rawNode.children();

  // Bind the model id to each rendering
  this.raw_node_.data('id', model.id);

  this.renderer_ = renderer;
  this.renderingHints_ = renderingHints;
  this.rendererSizeChecker_ = null;
  this.rendererRescaler_ = null;
  this.rendererStyleChanger_ = null;
  this.setRendererHelpers_();

  this.expandable_ = false;  // Whether the rendering supports expansion or not.
  this.expanded_ = false;  // whether the rendering is expanded or not

  // Whether the rendering should cache its dimensions.
  this.cacheDimensions_ = false;
  this.cachedDimensions_ = {};

  // The rendering position, at the time of the last move() call.
  this.position_ = {};

  // A position mark, that can be used to remember a previous position occupied
  // by the rendering.
  this.mark_ = null;

  // whether the rendering is visible or not. Multiple states might exist,
  // as defined in the rhizo.ui.Visibility enum.
  this.visibility = rhizo.ui.Visibility.HIDDEN;

  // Keeps track of all z-indexes changes.
  this.elevation_ = new rhizo.ui.Elevation();

  /**
   * The set of rendering modes.
   * @type {Object.<string, boolean>}
   * @private
   */
  this.modes_ = {};
};

/**
 * @private
 */
rhizo.ui.Rendering.prototype.setRendererHelpers_ = function() {
  if (typeof(this.renderer_.minSize) == 'function') {
    this.rendererSizeChecker_ = this.renderer_.canRescaleTo;
  }
  if (typeof(this.renderer_.rescale) == 'function') {
    this.rendererRescaler_ = this.renderer_.rescale;
  }
  if (typeof(this.renderer_.changeStyle) == 'function') {
    this.rendererStyleChanger_ = this.renderer_.changeStyle;
  }
};

/**
 * @return {HTMLElement} The root node of the raw rendering, for internal
 *     use only by the rhizo.ui module.
 * @private
 */
rhizo.ui.Rendering.prototype.raw_ = function() {
  return this.raw_node_.get(0);
};

/**
 * Regenerates the naked and raw renderings for the model managed by this
 * rendering.
 * @private
 */
rhizo.ui.Rendering.prototype.reRender_ = function() {
  // re-render. rendered expects the naked model.
  // Must wrap in $() in case renderer returns raw strings.
  this.naked_node_ = $(this.renderer_.render(this.model_.unwrap(),
                                             this.expanded_,
                                             this.renderingHints_));

  // keep expanded items above the others.
  // Remove any rescaling that might have been applied to the rendering.
  this.raw_node_.toggleClass('rhizo-model-expanded', this.expanded_).css(
      {width: '', height: ''});
  if (this.expanded_) {
    this.pushElevation('__expanded__', 200);
  } else {
    this.popElevation('__expanded__');
  }

  // replace the old rendering
  this.raw_node_.children(':not(.rhizo-expand-model)').remove();
  this.raw_node_.append(this.naked_node_);
  this.refreshCachedDimensions_();
};

/**
 * Moves the rendering.
 * @param {number} top The target y coordinate of the top-left corner of the
 *     rendering, relative to the universe top-left corner.
 * @param {number} left The target x coordinate of the top-left corner of the
 *     rendering, relative to the universe top-left corner.
 * @param {?boolean} opt_instant Whether the move should be instantaneous
 *   (no animations) or not.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.move = function(top, left, opt_instant) {
  if (!!opt_instant) {
    this.raw_node_.css({top: top, left: left});
  } else {
    this.raw_node_.move(top, left);
  }
  this.position_ = {top: top, left: left};
  return this;
};

/**
 * Moves the rendering back to last marked position.
 * @param {?boolean} opt_instant Whether the move should be instantaneous
 *   (no animations) or not.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.moveToMark = function(opt_instant) {
  if (this.mark_ !== null) {
    this.move(this.mark_.top, this.mark_.left, opt_instant);
  }
  return this;
};

/**
 * Moves the rendering of a {top, left} delta distance from the last marked
 * position (if no mark exists, the move is relative to the universe top-left
 * corner).
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.moveFromMark = function(top, left, opt_instant) {
  if (this.mark_ != null) {
    this.move(this.mark_.top + top, this.mark_.left + left, opt_instant);
  } else {
    this.move(top, left, opt_instant);
  }
  return this;
};

/**
 * Marks the current model position.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.markPosition = function() {
  this.mark_ = {
    top: parseInt(this.raw_node_.css('top'), 10),
    left: parseInt(this.raw_node_.css('left'), 10)
  };
  return this;
};

/**
 * Discards the current mark, if any.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.unmarkPosition = function() {
  this.mark_ = null;
  return this;
};

/**
 * @return {*} A {top,left} distance from the given {top, left} position and
 *   this rendering mark position. Returns null if no mark exists.
 */
rhizo.ui.Rendering.prototype.distanceFromMark = function(top, left) {
  if (this.mark_ != null) {
    return {left: left - this.mark_.left,
            top: top - this.mark_.top};
  } else {
    return null;
  }
};

/**
 * Updates the current rendering position. This happens automatically if models
 * are always repositioned using move() or one of its derivates.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.refreshPosition = function() {
  this.position_ = {
    top: parseInt(this.raw_node_.css('top'), 10),
    left: parseInt(this.raw_node_.css('left'),10)
  };
  return this;
};

/**
 * @return {*} the {top, left} position of top-left corner of the rendering, with
 * respect to the visualization universe top-left corner.
 */
rhizo.ui.Rendering.prototype.position = function() {
  return this.position_;
};

/**
 * Toggles selection status for this rendering.
 * @param {boolean} selected Whether this rendering should be displayed as
 *     selected or not.
 */
rhizo.ui.Rendering.prototype.setSelected = function(selected) {
  if (selected) {
    this.raw_node_.addClass('ui-selected');
  } else {
    this.raw_node_.removeClass('ui-selected');
  }
};

/**
 * Enables dimension caching for this rendering.
 */
rhizo.ui.Rendering.prototype.startDimensionCaching = function() {
  this.cacheDimensions_ = true;
  this.refreshCachedDimensions_();
};

/**
 * Re-computes this rendering width and height dimensions.
 * @private
 */
rhizo.ui.Rendering.prototype.refreshCachedDimensions_ = function() {
  this.cachedDimensions_ = {
    width: this.raw_().offsetWidth,
    height: this.raw_().offsetHeight
  };
};

/**
 * @return {Object.<string, number>} The (cached?) dimensions of this model
 *     rendering. The returned object has a 'width' and 'height' property
 *     that map to the outer dimensions (incl. border and such) of the
 *     rendering.
 */
rhizo.ui.Rendering.prototype.getDimensions = function() {
  if (this.cacheDimensions_) {
    return this.cachedDimensions_;
  } else {
    return {
      width: this.raw_().offsetWidth,
      height: this.raw_().offsetHeight
    };
  }
};

/**
 * Enables expansion support.
 * @param {*} expander The UI control that will trigger expansions, to be
 *     appended to the raw rendering.
 */
rhizo.ui.Rendering.prototype.startExpandable = function(expander) {
  if (!this.expandableByModel_()) {
    return;
  }
  expander.data("id", this.id);
  this.raw_node_.append(expander);
  this.expandable_ = true;
};

/**
 * @return {boolean} Whether the specific model attached to this rendering
 *     supports expansion.
 * @private
 */
rhizo.ui.Rendering.prototype.expandableByModel_ = function() {
  if (typeof(this.renderer_.expandableByModel) == 'function') {
    return this.renderer_.expandableByModel(this.model_.unwrap(),
                                            this.renderingHints_);
  } else {
    return true;
  }
};

/**
 * Sets the expansion status of this rendering.
 * @param {boolean} expanded
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.setExpanded = function(expanded) {
  if (!this.expandable_ || this.expanded_ == expanded) {
    // already in the expected status, or expansion is not supported.
    return this;
  }
  this.expanded_ = expanded;
  this.reRender_();
  return this;
};

/**
 * Toggles the expansion status for this rendering.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.toggleExpanded = function() {
  this.expanded_ = !this.expanded_;
  this.reRender_();
  return this;
};

/**
 * Updates the rendering after a change that occurred to the underlying model.
 */
rhizo.ui.Rendering.prototype.modelChanged = function() {
  this.reRender_();
};

/**
 * Pushes an elevation request on this rendering. Re-sets the z-index of this
 * rendering if needed.
 * @param {string} elevation_key
 * @param {number} elevation_value
 */
rhizo.ui.Rendering.prototype.pushElevation = function(elevation_key,
                                                      elevation_value) {
  var zIndexChange = this.elevation_.add(elevation_key, elevation_value);
  if (zIndexChange) {
    this.raw_node_.css('z-index', this.elevation_.top());
  }
};

/**
 * Removes a named elevation from this rendering. Re-sets the z-index of this
 * rendering if needed.
 * @param {string} elevation_key
 */
rhizo.ui.Rendering.prototype.popElevation = function(elevation_key) {
  var zIndexChange = this.elevation_.remove(elevation_key);
  if (zIndexChange) {
    this.raw_node_.css(
        'z-index',
        this.elevation_.empty() ? '' : this.elevation_.top());
  }
};

/**
 * Returns a clone of the rendering current elevation map.
 *
 * This method is intended for internal use only by the rendering backup
 * features.
 *
 * @return {rhizo.ui.Elevation} A clone of the rendering current elevation map.
 */
rhizo.ui.Rendering.prototype.cloneElevation = function() {
  return this.elevation_.clone();
};

/**
 * Replaces the rendering current elevation map with another one, adjusting the
 * rendering z-index as a consequence.
 *
 * @param {rhizo.ui.Elevation} elevation The new Rendering elevation map to use.
 */
rhizo.ui.Rendering.prototype.restoreElevation = function(elevation) {
  this.elevation_ = elevation;
  this.raw_node_.css(
      'z-index',
      this.elevation_.empty() ? '' : this.elevation_.top());
};

/**
 * Checks whether the rendering can be resized to the requested dimensions.
 *
 * Resizing can fail, for example if we determine that the requested target
 * dimensions are too small for a proper rendering display.
 *
 * @param {number} width The target width.
 * @param {number} height The target height.
 * @param {?Function} opt_failure_callback callback invoked whenever the
 *   requested rescaling is not possible.
 * @return {boolean} Whether rescaling to the desired dimensions is possible.
 */
rhizo.ui.Rendering.prototype.canRescaleTo = function(width,
                                                     height,
                                                     opt_failure_callback) {
  // The raw_node_ is guaranteed to be marginless and paddingless, with a
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

  if (this.rendererSizeChecker_) {
    // Give the original model renderer a chance to veto rescaling, if a
    // size checker has been defined.
    //
    // Like this method, the size checker too receives outer dimensions.
    var canResize = this.rendererSizeChecker_(this.naked_node_,
                                              width - 2,
                                              height - 2);
    if (!canResize && opt_failure_callback) {
      opt_failure_callback();
    }
    return canResize;
  }
  return true;
};

/**
 * Resizes this rendering. By default, only the raw rendering is resized. If
 * the project renderer includes a rescaler, then the rescaler is asked to
 * resize the naked rendering too.
 *
 * This method assumes that canRescaleTo() has already been invoked and
 * successfully returned.
 *
 * @param {number} width The target width.
 * @param {number} height The target height.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.rescaleRendering = function(width,
                                                         height) {
  this.cachedDimensions_ = {width: width, height: height};
  this.raw_node_.width(width - 2).height(height - 2);
  if (this.rendererRescaler_) {
    // Give the original model renderer a chance to rescale the naked render,
    // if a rescaler has been defined.
    //
    // Like this method, the rescaler too receives outer dimensions.
    this.rendererRescaler_(this.naked_node_, width - 2, height - 2);
  }
  return this;
};

/**
 * Applies a set of CSS styles to the naked rendering. If the renderer
 * exposes a style changer, the task is delegated to it, otherwise the styles
 * are applied directly on the naked rendering.
 *
 * @param {*} props CSS styles to apply, in the form of a plain javascript
 *     object.
 * @param {?boolean} opt_hintRevert An optional boolean hint to indicate that
 *     the rendering properties are being reverted to their original state,
 *     to cancel the effects of a previous call to this function.
 */
rhizo.ui.Rendering.prototype.setNakedCss = function(props, opt_hintRevert) {
  if (typeof props != 'object') {
    throw 'setNakedCss() expects a map of properties.';
  }
  if (this.rendererStyleChanger_) {
    this.rendererStyleChanger_(this.naked_node_, props, opt_hintRevert);
  } else {
    this.naked_node_.css(props);
  }
};

/**
 * @param {string} propName The property to extract.
 * @return {*} A CSS style extracted from the naked rendering.
 */
rhizo.ui.Rendering.prototype.nakedCss = function(propName) {
  if (typeof propName != 'string') {
    throw 'nakedCss() expects a string of the property to access.';
  }
  return this.naked_node_.css(propName);
};

/**
 * Sets the given mode. Modes are simple tags that can be applied to a
 * rendering and can alter the rendering behavior under certain conditions
 * (for example: to make the rendering behave differently during drag
 * operations).
 *
 * @param {string} mode The mode to apply.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.setMode = function(mode) {
  this.modes_[mode] = true;
  return this;
};

/**
 * Removes the given mode.
 * @param {string} mode The mode to remove.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.removeMode = function(mode) {
  delete this.modes_[mode];
  return this;
};

/**
 * @param {string} mode
 * @return {boolean} Whether the requested mode is on or not.
 */
rhizo.ui.Rendering.prototype.isMode = function(mode) {
  return !!this.modes_[mode];
};



/**
 * A RenderingBootstrap is responsible for building the renderings attached
 * to each model to visualize. It relies on the externally provided renderer
 * to convert each model into a 'naked' rendering, which is then wrapped in
 * a rhizo.ui.Rendering to enrich it with all the additional Rhizosphere
 * functionalities.
 *
 * @param {*} renderer Externally provided renderer, to convert models into
 *     their HTML rendering counterparts.
 * @param {rhizo.ui.gui.GUI} gui The project gui.
 * @param {rhizo.Project} project The project itself.
 * @param {*} options Project-wide options.
 * @constructor
 */
rhizo.ui.RenderingBootstrap = function(renderer, gui, project, options) {
  this.renderer_ = renderer;
  this.gui_ = gui;
  this.project_ = project;
  this.logger_ = project.logger();
  this.options_ = options;

  this.renderings_ = [];
};

/**
 * Converts a list of models into their HTML rendering counterparts.
 *
 * @param {Array.<rhizo.model.SuperModel>} models
 * @return {boolean} Whether the renderings were created successfully or not.
 */
rhizo.ui.RenderingBootstrap.prototype.buildRenderings = function(models) {
  var rawRenderings = [];
  for (var i = 0;  i < models.length; i++) {
    this.rawrender_(models[i], rawRenderings);
  }
  if (rawRenderings.length == 0) {
    this.logger_.error("No renderings.");
    return false;
  }

  var numModels = models.length;
  if (typeof rawRenderings[0] == 'string') {
    // The project renderer returns raw strings.
    //
    // We concatenate everything together and add it to the DOM in a single
    // pass. We then identify back all the single renderings and bind them
    // to the model they belong to.
    this.buildFromStrings_(models, rawRenderings);
  } else {
    // The project renderer returns jQuery objects.
    //
    // We append them to the DOM one at a time and assign them to their model.
    this.buildFromShells_(models, rawRenderings);
  }
  rawRenderings = this.gui_.universe.find('.rhizo-model');

  // Sanity checks
  if (!this.sanityCheck_(rawRenderings, models.length)) {
    return false;
  }

  // Attach events and additional functionality to each rendering. This may be
  // done on the rawRenderings directly for performance reasons.
  this.decorateRenderings_(rawRenderings);
  return true;
};

/**
 * @return {Array.<rhizo.ui.Rendering>} The list of renderings managed by the
 *     visualization. They are ordered to match the ordering of the models
 *     the renderings were created from.
 */
rhizo.ui.RenderingBootstrap.prototype.renderings = function() {
  return this.renderings_;
};

/**
 * Accumulates the raw rendering for the given model to the list of all raw
 * renderings, either as a serie of HTML strings or as a jQuery object
 * (depending on what the naked renderer provides).
 *
 * @param {rhizo.model.SuperModel} model
 * @param {Array.<*>} rawRenderings
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.rawrender_ = function(model,
                                                            rawRenderings) {
  var naked_render = this.renderer_.render(model.unwrap(),
                                           model.expanded,
                                           this.gui_.allRenderingHints());
  if (typeof naked_render == 'string') {
    rawRenderings.push('<div class="rhizo-model">');
    rawRenderings.push(naked_render);
    rawRenderings.push('</div>');
  } else {
    // Assume it's a jQuery object.
    var shell = $('<div class="rhizo-model"></div>');
    shell.append(naked_render);
    rawRenderings.push(shell);
  }
};

/**
 * Converts HTML strings of raw renderings into rhizo.ui.Rendering objects.
 * Attaches the rendering to the visualization.
 *
 * @param {Array.<rhizo.model.SuperModel>} models
 * @param {Array.<string>} rawRenderings
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.buildFromStrings_ = function(
    models, rawRenderings) {
  this.gui_.universe.append(rawRenderings.join(''));
  this.gui_.universe.find('.rhizo-model').each(jQuery.proxy(
      function(renderingIdx, rawRendering) {
        var model = models[renderingIdx];
        var rendering = new rhizo.ui.Rendering(model,
                                               $(rawRendering),
                                               this.renderer_,
                                               this.gui_.allRenderingHints());
        model.setRendering(rendering);
        this.renderings_.push(rendering);
      }, this));
};

/**
 * Converts jQuery objects representing a raw rendering into rhizo.ui.Rendering
 * objects.
 *
 * @param {Array.<rhizo.model.SuperModel>} models
 * @param {Array.<*>} rawRenderings
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.buildFromShells_ = function(
    models, rawRenderings) {
  for (var i = 0; i < models.length; i++) {
    this.gui_.universe.append(rawRenderings[i]);
    var rendering = new rhizo.ui.Rendering(models[i],
                                           rawRenderings[i],
                                           this.renderer_,
                                           this.gui_.allRenderingHints());
    models[i].setRendering(rendering);
    this.renderings_.push(rendering);
  }
};

/**
 * Verifies that the number of models, raw renderings and renderings is the
 * same, to ensure the rendering creation has been successful.
 *
 * @param {Array.<HTMLElement>} rawRenderings
 * @param {number} numModels
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.sanityCheck_ = function(rawRenderings,
                                                              numModels) {
  if (rawRenderings.length != numModels ||
      this.renderings_.length != numModels) {
    this.logger_.error('The number of renderings and models differ: ' +
                       rawRenderings.length + '  (raw), ' +
                       this.renderings_.length + ' (renderings), ' +
                       numModels + ' (models).');
    return false;
  }
  return true;
};

rhizo.ui.RenderingBootstrap.prototype.decorateRenderings_ = function(
    rawRenderings) {
  // Can renderings cache their dimensions?
  if (this.canCacheDimensions_()) {
    this.startDimensionCaching_();
  }

  // Do renderings support an expanded state?
  if (this.expandable_()) {
    this.startExpandable_(rawRenderings);
  }

  // Listen for click events on renderings.
  this.startClick_(rawRenderings);

  // Enable dragging.
  // This may take some time, especially for thousands of models, so we do
  // this in a timeout callback, to give the UI the possibility to refresh.
  window.setTimeout(jQuery.proxy(function() {
      this.startDraggable_(rawRenderings);
    }, this), 100);
};

/**
 * @return {boolean} Whether the renderer or project options indicate we
 *     should cache renderings dimensions (for improved performance).
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.canCacheDimensions_ = function() {
  return (!!this.renderer_.cacheDimensions) || (!!this.options_.cacheDimensions);
};

/**
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.startDimensionCaching_ = function() {
  for (var i = this.renderings_.length-1; i >= 0; i--) {
    this.renderings_[i].startDimensionCaching();
  }
};

/**
 * @return {boolean} Whether the renderings can toggle between an expanded
 *     status and a 'normal' one.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.expandable_ = function() {
  if (typeof(this.renderer_.expandable) == 'boolean') {
    return this.renderer_.expandable;
  } else if (typeof(this.renderer_.expandable) == 'function') {
    return this.renderer_.expandable(this.gui_.allRenderingHints());
  } else {
    return false;
  }
};

/**
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.startExpandable_ = function(
    rawRenderings) {
  var expander = $('<div />',
                   {'class': 'rhizo-expand-model ' +
                       'rhizo-icon rhizo-maximize-icon',
                    title: 'Maximize'});
  for (var i = this.renderings_.length-1; i >= 0; i--) {
    this.renderings_[i].startExpandable(expander.clone());
  }

  // register the hover effect to show/hide the expand icon
  rawRenderings.hover(
    function() {
      $(this).children('.rhizo-expand-model').css('visibility', 'visible');
    }, function() {
      $(this).children('.rhizo-expand-model').css('visibility', 'hidden');
    });

  // listen to click events on the expand icon
  $('.rhizo-expand-model', this.gui_.container).click(
      jQuery.proxy(function(ev) {
        var model = rhizo.ui.eventToModel(ev, this.project_);
        model.rendering().toggleExpanded();
        return false;
  }, this));
};

/**
 * Start tracking click events on renderings.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.startClick_ = function(rawRenderings) {
  rawRenderings.click(jQuery.proxy(function(ev) {
    var model = rhizo.ui.eventToModel(ev, this.project_);
    if (model.rendering().isMode('__dragging__')) {
      // A spurious click event always fires after a drag event, which we
      // ignore.
      model.rendering().removeMode('__dragging__');
      return false;
    }

    if (ev.target.nodeName == 'A') {
      // If a link was clicked, let the event bubble up.
      return;
    }
    this.project_.toggleSelect(model.id);
    return false;
  }, this));
};

/**
 * Enable support for dragging renderings.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.startDraggable_ = function(
    rawRenderings) {
  rawRenderings.draggable({
    cursor: 'pointer',
    distance: 3,
    addClasses: false,
    start: jQuery.proxy(function(ev, ui) {
      var model = rhizo.ui.elementToModel(ui.helper[0], this.project_);
      model.rendering().
          setMode('__dragging__').
          markPosition().
          pushElevation('__dragging__', 10000);

      // figure out all the initial positions for the selected elements
      // and store them.
      if (this.project_.isSelected(model.id)) {
        var all_selected = this.project_.allSelected();
        for (var id in all_selected) {
          this.project_.model(id).rendering().markPosition();
        }
      }
    }, this),
    drag: jQuery.proxy(function(ev, ui) {
      var model = rhizo.ui.elementToModel(ui.helper[0], this.project_);
      if (this.project_.isSelected(model.id)) {
        var delta = model.rendering().distanceFromMark(ui.position.top,
                                                      ui.position.left);
        var all_selected = this.project_.allSelected();
        for (var id in all_selected) {
          if (id != model.id) {
            all_selected[id].rendering().moveFromMark(
                delta.top, delta.left, true);
          }
        }
      }
    }, this),
    stop: jQuery.proxy(function(ev, ui) {
      var modelPositions = [];
      var model = rhizo.ui.elementToModel(ui.helper[0], this.project_);
      model.rendering().
          unmarkPosition().
          refreshPosition().
          popElevation('__dragging__');

      modelPositions.push({id: model.id,
                           top: model.rendering().position().top,
                           left: model.rendering().position().left});

      if (this.project_.isSelected(model.id)) {
        var all_selected = this.project_.allSelected();
        for (var id in all_selected) {
          modelPositions.push({
              id: id,
              top: all_selected[id].rendering().position().top,
              left: all_selected[id].rendering().position().left
          });
          all_selected[id].rendering().unmarkPosition();
        }
      }

      this.project_.modelsMoved(modelPositions);
    }, this),
    refreshPositions: false
  });
};
/* ./src/js/extra/rhizo.keyboard.js */
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

/**
 * Onscreen keyboard based on HTML5 canvas, useful when Rhizosphere is used on
 * a keyboard-less touchscreen.
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

/*
To define a new meta-type:

- create the object

- implement the renderFilter() function.
  This draws the UI for the filter on this type. It is also responsible for
  hooking up any listeners on created UI controls that will generate calls
  to rhizo.Project.prototype.filter() to trigger actual filtering.

- implement the survivesFilter() function.
  This verifies if a model value matches the filter or not

- implement the isNumeric() function.
  This tells whether the kind of data this filter is applied to are numeric
  or not (i.e. can be used in arithmetic computations).

- implment the setFilterValue() function.
  This updates the filter UI as if it was set to the given value.
  The object received is of the same kind the filter passes to project.filter()
  calls. setFilterValue() will receive a null value if the filter is to be
  restored to its initial (default) value.

- implement the cluster() function (optional).
  Defines how grouping works for this type

- implement the compare() function (optional).
  Defines how two values of this metatype are compared against each other.
  Returns negative, 0, or positive number if the first element is smaller,
  equal or bigger than the second.

- implement a toFilterScale() / toModelScale() function pair (optional).
  Define how to convert the scale of model values respectively to/from a user
  facing scale. For example, a logarithmic conversion may be applied to
  normalize model values that span a range that would otherwise be too wide.

- update the rhizo.meta.Kind structure.
*/

// RHIZODEP=rhizo
// Metamodel namespace
namespace("rhizo.meta");

/* StringKind meta */
rhizo.meta.StringKind = function() {
  this.input_ = null;
};

// metadata is the part of the metamodel that applies to this kind
rhizo.meta.StringKind.prototype.renderFilter = function(project,
                                                        metadata,
                                                        key) {
  this.input_ = $("<input type='text' />");
  // keypress handling removed due to browser quirks in key detection
  $(this.input_).change(function(ev) {
    project.filter(key, $(this).val().length > 0 ? $(this).val() : null);
  });
  return $("<div class='rhizo-filter' />").
           append(metadata.label + ": ").
           append($(this.input_));
};

rhizo.meta.StringKind.prototype.setFilterValue = function(value) {
  this.input_.val(value || '');
};

rhizo.meta.StringKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  return filterValue != '' &&
         modelValue.toLowerCase().indexOf(filterValue.toLowerCase()) != -1;
};

rhizo.meta.StringKind.prototype.cluster = function(modelValue) {
  if (modelValue === null || typeof(modelValue) == 'undefined') {
    modelValue = '';
  }
  return { key: modelValue.toString().toUpperCase().charAt(0),
           label: modelValue.toString().toUpperCase().charAt(0) };
};

rhizo.meta.StringKind.prototype.isNumeric = function() {
  return false;
};

/* NumberKind meta */
rhizo.meta.NumberKind = function() {
  rhizo.meta.StringKind.call(this);
};
rhizo.inherits(rhizo.meta.NumberKind, rhizo.meta.StringKind);

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
  if (isNaN(iModelValue)) {
    return {key: '-', label: '-'};
  }
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
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul',
    'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  this.clusterby_ = opt_clusterby || 'y';
  if (this.clusterby_ != 'y' &&
      this.clusterby_ != 'm' &&
      this.clusterby_ != 'd') {
    this.clusterby_ = 'y';
  }

  this.year_ = null;
  this.month_ = null;
  this.day_ = null;
};

rhizo.meta.DateKind.prototype.renderFilter = function(project, metadata, key) {
  this.year_ = $("<select style='vertical-align:top' />");
  this.year_.append("<option value='yyyy'>yyyy</option>");
  for (var i = metadata.minYear ; i <= metadata.maxYear; i++) {
    this.year_.append("<option value='" + i + "'>" + i + "</option>");
  }
  this.month_ = $("<select style='vertical-align:top' />");
  this.month_.append("<option value='mm'>mm</option>");
  for (var i = 0; i < this.monthMap_.length; i++) {
    this.month_.append("<option value='" + i + "'>" +
                       this.monthMap_[i] +
                       "</option>");
  }

  this.day_ = $("<select style='vertical-align:top' />");
  this.day_.append("<option value='dd'>dd</option>");
  for (var i = 1 ; i <= 31; i++) {
    this.day_.append("<option value='" + i + "'>" + i + "</option>");
  }
  
  $(this.year_).add($(this.month_)).add($(this.day_)).change(
      jQuery.proxy(function(ev) {
        var year = $(this.year_).val();
        var month = $(this.month_).val();
        var day = $(this.day_).val();
        if (year == 'yyyy' && month == 'mm' && day == 'dd') {
          project.filter(key, null);
        } else {
          project.filter(key,
              [year != 'yyyy' ? year : undefined,
               month != 'mm' ? month : undefined,
               day != 'dd' ? day : undefined]);
        }
      }, this));

  return $("<div class='rhizo-filter' />").
           append(metadata.label + ": ").
           append($(this.year_)).
           append(' - ').
           append($(this.month_)).
           append(' - ').
           append($(this.day_));
};

rhizo.meta.DateKind.prototype.setFilterValue = function(value) {
  value = value || [undefined, undefined, undefined];
  this.year_.val(value[0] || 'yyyy');
  this.month_.val(value[1] || 'mm');
  this.day_.val(value[2] || 'dd');
};

rhizo.meta.DateKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  var year = parseInt(filterValue[0], 10);
  var month = parseInt(filterValue[1], 10);
  var day = parseInt(filterValue[2], 10);

  if (!modelValue) {
    return isNaN(year) && isNaN(month) && isNaN(day);
  }

  var survives = ((isNaN(year) || modelValue.getFullYear() == year) &&
          (isNaN(month) || modelValue.getMonth() == month) &&
          (isNaN(day) || modelValue.getDate() == day));
  return survives;
};

// We do not implement a compare() function for dates because the native
// comparison works just fine. Watch out because 2 kinds of comparisons occur
// for DateKind:
// - date comparison is performed when comparing model objects (for example
//   to order elements in a list layout)
// - string comparison is performed when comparing bucket keys (to order the
//   buckets in a BucketLayout, via rhizo.meta.sortByKind). The cluster()
//   function takes care of rendering bucket keys as strings that respect
//   the underlying date ordering when lexicographically sorted.

rhizo.meta.DateKind.prototype.cluster = function(modelValue) {
  if (!modelValue) {
    return {key: 'Undefined date', label: 'Undefined date'};
  }
  if (this.clusterby_ == 'y') {
    return {
      key: modelValue.getFullYear() + '-00-01',
      label: modelValue.getFullYear()
    };
  } else if (this.clusterby_ == 'm') {
    return {
      key: modelValue.getFullYear() + '-' +
           this.addZero_(modelValue.getMonth()) + '-01',
      label: modelValue.getFullYear() + '-' +
             this.monthMap_[modelValue.getMonth()]
    };
  } else {
    return {
      key: modelValue.getFullYear() + '-' +
           this.addZero_(modelValue.getMonth()) + '-' +
           this.addZero_(modelValue.getDate()),
      label: modelValue.getFullYear() + '-' +
             this.monthMap_[modelValue.getMonth()] + '-' +
             modelValue.getDate()
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
};

/* RangeKind meta */
rhizo.meta.RangeKind = function() {
  this.slider_ = null;
  this.minLabel_ = null;
  this.maxLabel_ = null;

  this.metadataMin_ = null;
  this.metadataMax_ = null;
};

rhizo.meta.RangeKind.prototype.renderFilter = function(project, metadata, key) {
  this.slider_ = $("<div class='rhizo-slider' />");
  this.minLabel_ = $('<span />', {'class': 'rhizo-slider-label'}).
      text(this.toHumanLabel_(metadata.min));
  this.maxLabel_ = $('<span />', {'class': 'rhizo-slider-label'}).
      text(this.toHumanLabel_(metadata.max));

  this.metadataMin_ = metadata.min;
  this.metadataMax_ = metadata.max;

  var minFilterScale = this.toFilterScale(metadata.min);
  var maxFilterScale = this.toFilterScale(metadata.max);
  var steppingFilterScale;
  if (metadata.stepping) {
    steppingFilterScale = this.toFilterScale(metadata.stepping);
  }

  // wrap slide handler into a closure to preserve access to the RangeKind
  // filter.
  var slideCallback = jQuery.proxy(function(ev, ui) {
      if (ui.values[0] != minFilterScale) {
        // min slider has moved
        this.minLabel_.
            text(this.toHumanLabel_(this.toModelScale(ui.values[0]))).
            addClass("rhizo-slider-moving");
        this.maxLabel_.removeClass("rhizo-slider-moving");
      }
      if (ui.values[1] != maxFilterScale) {
        // max slider has moved
        this.maxLabel_.
            text(this.toHumanLabel_(this.toModelScale(ui.values[1]))).
            addClass("rhizo-slider-moving");
        this.minLabel_.removeClass("rhizo-slider-moving");
      }
  }, this);

  // wrap change handler into a closure to preserve access to the RangeKind
  // filter.
  var stopCallback = jQuery.proxy(function(ev, ui) {
      var minSlide = Math.max(this.toModelScale(ui.values[0]), metadata.min);
      var maxSlide = Math.min(this.toModelScale(ui.values[1]), metadata.max);
      this.minLabel_.text(this.toHumanLabel_(minSlide)).removeClass(
          "rhizo-slider-moving");
      this.maxLabel_.text(this.toHumanLabel_(maxSlide)).removeClass(
          "rhizo-slider-moving");
      if (minSlide != this.metadataMin_ || maxSlide != this.metadataMax_) {
        project.filter(key, { min: minSlide, max: maxSlide });
      } else {
        project.filter(key, null);
      }
  }, this);

  $(this.slider_).slider({
    stepping: steppingFilterScale,
    steps: metadata.steps,
    range: true,
    min: minFilterScale,
    max: maxFilterScale,
    slide: slideCallback,
    stop: stopCallback,
    orientation: 'horizontal',
    values: [minFilterScale, maxFilterScale]
  });

  return $("<div class='rhizo-filter' />").append(metadata.label + ": ")
                                          .append($(this.minLabel_))
                                          .append(" to ")
                                          .append($(this.maxLabel_))
                                          .append($(this.slider_));
};

rhizo.meta.RangeKind.prototype.setFilterValue = function(value) {
  value = {
    min: value ? this.clamp_(value.min) : this.metadataMin_,
    max: value ? this.clamp_(value.max) : this.metadataMax_
  };
  this.minLabel_.text(this.toHumanLabel_(value.min));
  this.maxLabel_.text(this.toHumanLabel_(value.max));
  this.slider_.slider(
      'values',
      [this.toFilterScale(value.min), this.toFilterScale(value.max)]);
};

/**
 * Clamps the given value between the minimum and maximum range limits.
 * @param {number} val
 * @private
 */
rhizo.meta.RangeKind.prototype.clamp_ = function(val) {
  return Math.min(this.metadataMax_, Math.max(this.metadataMin_, val));
};

rhizo.meta.RangeKind.prototype.survivesFilter = function(filterValue,
                                                         modelValue) {
  return modelValue >= filterValue.min && modelValue <= filterValue.max;
};

rhizo.meta.RangeKind.prototype.compare =
    rhizo.meta.NumberKind.prototype.compare;

rhizo.meta.RangeKind.prototype.cluster =
    rhizo.meta.NumberKind.prototype.cluster;

rhizo.meta.RangeKind.prototype.isNumeric =
    rhizo.meta.NumberKind.prototype.isNumeric;

/**
 * Converts a value as returned from the slider into a value in the model range.
 * This method, and the subsequent one, are particularly useful when the range
 * of Model values is not suitable for a slider (which accepts only integer
 * ranges). For example, when dealing with small decimal scales.
 *
 * The default implementation of this method is a no-op. Custom filters
 * extending the range slider should customize this method according to their
 * needs.
 * @param {number} filterValue the value received from the filter.
 */
rhizo.meta.RangeKind.prototype.toModelScale = function(filterValue) {
  return filterValue;
};

/**
 * Converts a value as read from the model into a value in the slider scale.
 * This is the inverse method of the previous one.
 * @param {number} modelValue the value received from the model.
 */
rhizo.meta.RangeKind.prototype.toFilterScale = function(modelValue) {
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
rhizo.meta.BooleanKind = function() {
  this.check_ = null;
};

rhizo.meta.BooleanKind.prototype.renderFilter = function(project,
                                                         metadata,
                                                         key) {
  this.check_ = $("<select />");
  this.check_.append("<option value=''>-</option>");
  this.check_.append("<option value='true'>Yes</option>");
  this.check_.append("<option value='false'>No</option>");

  $(this.check_).change(function(ev) {
    project.filter(key, $(this).val().length > 0 ? $(this).val() : null);
  });
  return $("<div class='rhizo-filter' />").
           append(metadata.label + ": ").
           append($(this.check_));
};

rhizo.meta.BooleanKind.prototype.setFilterValue = function(value) {
  this.check_.val(value || '');
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
rhizo.meta.CategoryKind = function() {
  this.categories_ = null;
  this.multiple_ = false;
};

rhizo.meta.CategoryKind.prototype.renderFilter = function(project,
                                                          metadata,
                                                          key) {
  this.multiple_ = !!metadata.multiple;
  this.categories_ = $("<select " +
                       (metadata.multiple ? 'multiple size="4" ' : '') +
                       " style='vertical-align:top' />");
  this.categories_.append("<option value=''>-</option>");
  for (var i = 0; i < metadata.categories.length; i++) {
    this.categories_.append("<option value='" + metadata.categories[i] + "'>" +
                            metadata.categories[i] +
                            "</option>");
  }

  $(this.categories_).change(function(ev) {
    var selectedCategories = [];
    if (metadata.multiple) {
      selectedCategories = $.grep($(this).val(), function(category) {
        return category != '';
      });
    } else if ($(this).val().length > 0) {
      selectedCategories = [ $(this).val() ];
    }
    if (selectedCategories.length == 0) {
      selectedCategories = null;
    }
    project.filter(key, selectedCategories);
  });
  return $("<div class='rhizo-filter' />").
           append(metadata.label + ": ").
           append($(this.categories_));
};

rhizo.meta.CategoryKind.prototype.setFilterValue = function(value) {
  // val() accepts both a single string and an array.
  this.categories_.val(value || (this.multiple_ ? [] : ''));
};

rhizo.meta.CategoryKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  // This function relies on Javascript 1.6 for the indexOf() method to be
  // present both on Arrays and Strings (since models can use both to define
  // the value of a CategoryKind meta).

  // AND-filter

  // var survives = true;
  // for (var i = 0; i < filterValue.length; i++) {
  //   if (modelValue && modelValue.indexOf(filterValue[i]) == -1) {
  //     survives = false;
  //     break;
  //   }
  // }
  // return survives;

  // OR-filter
  var survives = false;
  for (var i = 0; i < filterValue.length; i++) {
    if (modelValue && modelValue.indexOf(filterValue[i]) != -1) {
      survives = true;
      break;
    }
  }
  return survives;
};

rhizo.meta.CategoryKind.prototype.cluster = function(modelValue) {
  // This function relies on the length property being available both on
  // Arrays and Strings (since models can use both to define
  // the value of a CategoryKind meta) and in both cases a length == 0
  // implies a missing value.
  if (!modelValue) {
    return {key: 'Nothing', label: 'Nothing'};
  }
  return { key: modelValue.length == 0 ? "Nothing" : modelValue.toString(),
           label: modelValue.length == 0 ? "Nothing" : modelValue.toString() };
};

rhizo.meta.CategoryKind.prototype.compare = function(firstValue, secondValue) {
  // comparison based on number of categories (if values are Arrays) or value
  // length (if the value is a single category, represented as string).
  // Not necessarily the most meaningful thing to do...
  // TODO(battlehorse): define a better CategoryKind comparison strategy
  return (firstValue ? firstValue.length : 0) -
         (secondValue ? secondValue.length : 0);
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

/**
 * returns a rhizo.meta.Kind instance, building it if necessary.
 *
 * @param {function()|*} kind Either a rhizo.meta.Kind instance or a no-arg
 *     function that can instantiate it.
 */
rhizo.meta.objectify = function(kind) {
  if (typeof(kind) == 'function') {
    return kind();
  } else {  // assume 'object'
    return kind;
  }
};

rhizo.meta.Kind = {
  STRING: function() { return new rhizo.meta.StringKind(); },
  NUMBER: function() { return new rhizo.meta.NumberKind(); },
  DATE: function() { return new rhizo.meta.DateKind(); },
  RANGE: function() { return new rhizo.meta.RangeKind(); },
  BOOLEAN: function() { return new rhizo.meta.BooleanKind(); },
  CATEGORY: function() { return new rhizo.meta.CategoryKind(); }
};
/* ./src/js/rhizo.state.js */
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

/**
 * === Support classes for state management.
 *
 * The global, document-wide state is the composition of the states of each
 * single Rhizosphere visualization present in the document.
 *
 * Each visualization manages its state as a set of Facets. A Facet is a single
 * aspect of a visualization whose state can be tracked (such as the layout
 * algorithm the visualization is currently using).
 *
 * Each visualization state can be shared among different components that might
 * both be notified of state changes:
 * - the rhizo.Project instance that manages the visualization
 * - HTML5 window.history (for browser navigation)
 * - document location hash (for browser navigation and bookmarking)
 * - HTML5 storage (for persistence across browser restarts)
 * - etc ...
 *
 * Components might also originate state change events, which are then
 * broadcast to all the other components to keep them in sync.
 *
 * To support such model, the following infrastructure is defined:
 * - rhizo.state.MasterOverlord: Maintains the global, document-wide state
 *   and is aware of all the visualizations within the document that might
 *   affect such state.
 *
 * - rhizo.state.ProjectOverlord: There is one ProjectOverlord for every
 *   visualization present in the document. Maintains the set of all
 *   components that track visualization state and broadcast state changes
 *   among those. It's also responsible for propagating per-visualization
 *   state changes upstream to the global state.
 *
 * - rhizo.state.StateBinder: An abstract class, that defines a bi-directional
 *   notification channel for state-changes between a visualization and a single
 *   component.
 *
 * Additional support classes exist:
 * - rhizo.state.HistoryHelper: bi-directional HTML5 History wrapper, to persist
 *   state changes and broadcast history events.
 *
 * === A brief note on HTML5 History.
 * HTML5 history is a sequence of document-wide state. PopStateEvent events are
 * fired whenever the document state should be updated as a consequence of the
 * user hitting the back/forward button (either to arrive in the current page,
 * return to the current page or move within current page states).
 *
 * Because of differences in browsers implementations:
 * - a PopStateEvent might fire or not when we arrive directly on a page
 *   (without using the back/forward buttons).
 * - the initial PopStateEvent that fires when we arrive on a page using the
 *   back/forward buttons might occur before or after Rhizosphere visualizations
 *   bootstrap.
 *
 * For these reasons, we have to take care of both these scenarios:
 * - the initial PopStateEvent event occurs after a rhizosphere visualization
 *   has initialized (see MasterOverlord.setInitialState).
 * - the initial PopStateEvent event occurs before a rhizosphere visualization
 *   has initialized (see MasterOverlord.attachProject).
 *
 * Also, since history state is document-wide:
 * - We need to differentiate between states pushed by different Rhizosphere
 *   visualizations living in the same page.
 * - We need to exclude states pushed by third-party components living in the
 *   same page.
 */

// RHIZODEP=rhizo
namespace("rhizo.state");

/**
 * Constant tag attached to HTML5 history states, to separate Rhizosphere states
 * from other history states generated outside of the visualization.
 * @type {string}
 * @const
 */
rhizo.state.TYPE = '__rhizo_state__';


/**
 * Enumeration of the different aspects of a Rhizosphere visualization whose
 * state can be tracked.
 * @enum {string}
 */
rhizo.state.Facets = {
  LAYOUT: 'layout',
  SELECTION_FILTER: 'selection',
  FILTER_PREFIX: 'filter_'
};


/**
 * Enumeration of the different components that might be interested in state
 * changes of a Rhizosphere visualization.
 * @enum {string}
 */
rhizo.state.Bindings = {
  PROJECT: 'project',
  HISTORY: 'history'
};


/**
 * The global state overlord, that oversees state changes for all the
 * visualizations present in a page.
 * @constructor
 */
rhizo.state.MasterOverlord = function() {
  // Plain JS object that describes the global state. Initially empty.
  this.state_ = {
    type: rhizo.state.TYPE,  // Watermarking
    uuids: {},  // per-visualization state. Each entry has the visualization
                // uuid as its key and the visualization state as the value.
                //
                // The visualization state is represented as facet-facetState
                // pairs.
    delta: {  // last state change that was applied.
      ts: null,  // timestamp
      uuid: null,  // uuid of the affected visualization
      facet: null,  // affected facet
      facetState: null  // associated facet state.
    }
  };

  /**
   * Collection of all project overlords, keyed by project uuid.
   * @type {Object.<string, rhizo.state.ProjectOverlord>}
   * @private
   */
  this.projectOverlords_ = {};

  /**
   * The component that was responsible for setting the initial state.
   * For example, it may indicate that visualization state was initially rebuilt
   * from HTML5 History.
   * @type {rhizo.state.Bindings}
   * @private
   */
  this.initialStateOwner_ = null;
};

/**
 * Enables state management for this project.
 * @param {rhizo.Project} project
 * @param {Array.<rhizo.state.Bindings>} The set of components that will track
 *     state changes for this project. The rhizo.state.Bindings.PROJECT
 *     component (binding for the project itself) it's always automatically
 *     included.
 * @return {boolean} Whether an initial state existed for the project (and was
 *     notified to it) or not (and the project should configure its state
 *     via other defaults).
 */
rhizo.state.MasterOverlord.prototype.attachProject = function(project,
                                                              bindings) {
  var uuid = project.uuid();
  var projectOverlord = new rhizo.state.ProjectOverlord(
      this, project, bindings);
  this.projectOverlords_[uuid] = projectOverlord;

  // Broadcasts the current project state (if already defined) to all the
  // bindings (including the project itself), for them to sync to the current
  // state.
  if (uuid in this.state_.uuids) {
    if (!this.initialStateOwner_) {
      throw('Initial state owner is unknown, ' +
            'even though an initial state exists for: ' + uuid);
    }
    projectOverlord.broadcast(this.initialStateOwner_, null);
    return true;
  }
  return false;
};

/**
 * Returns the project overlord assigned to the given project.
 * @param {rhizo.Project} project
 * @return {rhizo.state.ProjectOverlord}
 */
rhizo.state.MasterOverlord.prototype.projectOverlord = function(project) {
  return this.projectOverlords_[project.uuid()];
};

/**
 * @param {rhizo.Project} project
 * @return {rhizo.state.ProjectStateBinder} The binding object that expose the
 *     state management interface for the project.
 */
rhizo.state.MasterOverlord.prototype.projectBinder = function(project) {
  return this.projectOverlords_[project.uuid()].getProjectBinder();
};

/**
 * @return {*} The current state.
 */
rhizo.state.MasterOverlord.prototype.state = function() {
  return this.state_;
};

/**
 * Replaces the current state with a new one. Does not trigger any sync.
 * @param {*} state The new state.
 */
rhizo.state.MasterOverlord.prototype.setState = function(state) {
  this.state_ = state;
};

/**
 * Sets the inital document-wide state, and broadcasts it to all the affected
 * components for them to sync.
 *
 * @param {rhizo.state.Bindings} ownerKey The component which is setting the
 *     initial state.
 * @param {*} state The initial state.
 * @param {?boolean} opt_replace Whether the given state should replace a
 *     previous initial state (if defined) or not.
 */
rhizo.state.MasterOverlord.prototype.setInitialState = function(ownerKey,
                                                                state,
                                                                opt_replace) {
  var replace = !!opt_replace;
  if (!replace) {
    // We are trying to set the initial state without forcing a replace.
    // If an initial state already exists, don't change anything.
    var numProjectStates = 0;  // projects that have already set their state.
    for (var uuid in this.state_.uuids) {
      numProjectStates++;
    }
    if (numProjectStates > 0) {
      return;
    }
  }
  this.initialStateOwner_ = ownerKey;
  this.setState(state);

  // Broadcast the initial state to all projects that have already enabled
  // state management.
  for (var uuid in this.state_.uuids) {
    if (uuid in this.projectOverlords_) {
      this.projectOverlords_[uuid].broadcast(ownerKey, null, opt_replace);
    }
  }
};

/**
 * Pushes a delta change of the global state.
 * @param {*} delta A key-value map that describes the delta change to apply.
 *     Must contain the following properties:
 *     - uuid: The id of the affected visualization
 *     - facet: The affected facet
 *     - facetState: The target facetState
 *     - ts: The timestamp at which the change occurred.
 */
rhizo.state.MasterOverlord.prototype.pushDelta = function(delta) {
  this.state_.delta  = delta;
  if (!(delta.uuid in this.state_.uuids)) {
    this.state_.uuids[delta.uuid] = {};
  }
  this.state_.uuids[delta.uuid][delta.facet] = delta.facetState;
};


/**
 * Oversees all the changes that occur in a single Rhizosphere visualization.
 * Maintains all the bi-directional channels to the registered components that
 * are tracking changes on this visualization and keeps them in sync.
 *
 * @param {rhizo.state.MasterOverlord} masterOverlord The global state manager.
 * @param {rhizo.Project} project The project that manages the visualization.
 * @param {Array.<rhizo.state.Bindings>} The set of components that will track
 *     state changes for this project. The rhizo.state.Bindings.PROJECT
 *     component (binding for the project itself) it's always automatically
 *     included.
 * @constructor
 */
rhizo.state.ProjectOverlord = function(masterOverlord, project, bindings) {
  this.master_ = masterOverlord;
  this.uuid_ = project.uuid();
  this.bindings_ = {};

  bindings.push(rhizo.state.Bindings.PROJECT);
  var binder;
  for (var i = 0; i < bindings.length; i++) {
    var binding = bindings[i];
    switch(binding) {
      case rhizo.state.Bindings.PROJECT:
        binder = new rhizo.state.ProjectStateBinder(this, project);
        this.bindings_[binding] = binder;
        break;
      case rhizo.state.Bindings.HISTORY:
        if (rhizo.state.getHistoryHelper()) {  // HTML5 history supported.
          binder = new rhizo.state.HistoryStateBinder(this);
          this.bindings_[binding] = binder;
        }
        break;
      default:
        throw('Unknown binding: ' + binding);
    }
  }
};

/**
 * @return {rhizo.state.ProjectStateBinder} The binding object that expose the
 *     state management interface for the project.
 */
rhizo.state.ProjectOverlord.prototype.getProjectBinder = function() {
  return this.bindings_[rhizo.state.Bindings.PROJECT];
};

/**
 * @return {string} The unique id of the visualization managed by this
 *     overlord.
 */
rhizo.state.ProjectOverlord.prototype.uuid = function() {
  return this.uuid_;
};

/**
 * @return {rhizo.state.MasterOverlord} Returns the master state overlord.
 */
rhizo.state.ProjectOverlord.prototype.master = function() {
  return this.master_;
};

/**
 * Adds a new binder to the list of bindings attached to this overlord.
 * Upon attachment, the binder receives the full state to be able to sync itself
 * to the current visualization state.
 *
 * @param {rhizo.state.StateBinder} binder The StateBinder to add.
 */
rhizo.state.ProjectOverlord.prototype.addBinding = function(binder) {
  if (!(binder.key() in this.bindings_)) {
    this.bindings_[binder.key()] = binder;
  }
  if (this.uuid_ in this.master_.state().uuids) {
    binder.onTransition(null, this.master_.state());
  }
};

/**
 * Removes a binding from the list of bindings this overlord is serving.
 * @param {string} binder_key The key of the binder to remove.
 */
rhizo.state.ProjectOverlord.prototype.removeBinding = function(binder_key) {
  var binder = this.bindings_[binder_key];
  delete this.bindings_[binder_key];
  return binder;
};

/**
 * Applies a state transition requested by one binder and broadcast the changes
 * to all the other binders.
 *
 * The transition is described as a 'delta' that describes the change from
 * the current state to the target state and, optionally, a target state.
 *
 * Deltas can describe both forward changes (moving from the current state to
 * a future one) and backward changes (rolling back to a previous state).
 *
 * If the target state is missing, the 'delta' is assumed to be a forward change
 * and therefore the target state will be computed from the current one.
 *
 * Deltas can only change one state facet at a time, for one visualization at
 * a time.
 *
 * @param {rhizo.state.Bindings} sourceKey The key that identifies the binder
 *     where the last state change originated from.
 * @param {*} delta A key-value map that describes the delta change to apply.
 *     Must contain the following properties:
 *     - uuid: The id of the affected visualization
 *     - facet: The affected facet
 *     - facetState: The target facetState
 *     - ts: The timestamp at which the change occurred (can be in the past
 *       if we are rolling back to a previous state).
 * @param {*} opt_target_state Optional target state. Can be omitted if the
 *     change is a forward change.
 * @param {boolean} opt_replace Hints that the target state reached by this
 *     delta transition should replace the current one, instead of being a
 *     transition from it.
 */
rhizo.state.ProjectOverlord.prototype.transition = function(sourceKey,
                                                            delta,
                                                            opt_target_state,
                                                            opt_replace) {
  if (opt_target_state) {
    this.master_.setState(opt_target_state);
  } else {
    this.master_.pushDelta(delta);
  }
  this.broadcast(sourceKey, delta, opt_replace);
};

/**
 * Broadcasts a state change from the originating component to all the other
 * interested parties. Each component receives the full target state and, if
 * the transition to the target state affected a single facet, a delta object
 * as well.
 *
 * @param {rhizo.state.Bindings} sourceKey The key that identifies the binder
 *     where the last state change originated from.
 * @param {*} opt_delta An optional key-value map that describes a delta change
 *     that occurred. See transition() for this object attributes.
 * @param {boolean} opt_replace Hints that the target state reached by this
 *     delta transition should replace the current one, instead of being a
 *     transition from it.
 */
rhizo.state.ProjectOverlord.prototype.broadcast = function(sourceKey,
                                                           opt_delta,
                                                           opt_replace) {
  // Propagate the change to all the other binders to keep them in sync.
  for (var binderKey in this.bindings_) {
    if (binderKey != sourceKey) {
      this.bindings_[binderKey].onTransition(
          opt_delta, this.master_.state(), opt_replace);
    }
  }
};


/**
 * Abstract class that defines the interface to notify/listen to state changes.
 * @param {rhizo.state.ProjectOverlord} overlord
 * @param {rhizo.state.Bindings} binderKey
 * @constructor
 */
rhizo.state.StateBinder = function(overlord, binderKey) {
  this.overlord_ = overlord;
  this.binderKey_ = binderKey;
};

/**
 * @return {rhizo.state.Bindings}
 */
rhizo.state.StateBinder.prototype.key = function() {
  return this.binderKey_;
};

/**
 * Callback to notify this binder that a state transition occurred elsewhere.
 * @param {*} opt_delta Defines that facet that changed state and its associated
 *     changes. See the parameter documentation for
 *     rhizo.state.ProjectOverlord.prototype.transition. null if the change
 *     affected multiple facets at the same time.
 * @param {*} state The target state at the end of the transition.
 * @param {boolean} opt_replace Hints that the target state reached by this
 *     delta transition should replace the current one, instead of being a
 *     transition from it.
 */
rhizo.state.StateBinder.prototype.onTransition = function(opt_delta,
                                                          state,
                                                          opt_replace) {
  throw("Unimplemented StateBinder.onTransition");
};

/**
 * Creates a delta object from a facet change.
 * @param {rhizo.state.Facets} facet The facet that change.
 * @param {*} facetState The facet target state.
 * @return {*} An object that describes the change, suitable for passing to
 *     rhizo.state.ProjectOverlord.prototype.transition.
 */
rhizo.state.StateBinder.prototype.makeDelta = function(facet, facetState) {
  return {
    ts: new Date().getTime(),
    uuid: this.overlord_.uuid(),
    facet: facet,
    facetState: facetState
  };
};


/**
 * Binds the visualization state to the rhizo.Project that manages the
 * visualization itself.
 * @param {rhizo.state.StateOverlord} overlord
 * @param {rhizo.Project} project
 * @constructor
 */
rhizo.state.ProjectStateBinder = function(overlord, project) {
  rhizo.state.StateBinder.call(this, overlord, rhizo.state.Bindings.PROJECT);
  this.project_ = project;
};
rhizo.inherits(rhizo.state.ProjectStateBinder, rhizo.state.StateBinder);

rhizo.state.ProjectStateBinder.prototype.onTransition = function(opt_delta,
                                                                 state) {
  if (opt_delta) {
    // If we know exactly what changed to get to the target state, then
    // just apply the delta.
    this.project_.stateChanged(opt_delta.facet, opt_delta.facetState);
  } else {
    // Otherwise rebuild the full state.
    this.project_.setState(state.uuids[this.overlord_.uuid()]);
  }
};

/**
 * Utility method to change the visualization state because of a change in
 * the visualization layout algorithm.
 *
 * @param {string} layoutName The name of the layout engine that was applied.
 * @param {*} layoutState Layout engine state (see getState() in the layout
 *     documentation.
 * @param {Array.<*>} opt_positions An optional array of all model that have
 *     a custom position, other than the one the layout mandates.
 *     Each entry is a key-value map with the following properties: 'id', the
 *     id of the model that moved, 'top': the ending top coordinate of the
 *     top-left model corner with respect to the visualization universe,
 *     'left', the ending left coordinate of the top-left model corner with
 *     respect to the visualization universe.
 */
rhizo.state.ProjectStateBinder.prototype.pushLayoutChange = function(
    layoutName, layoutState, opt_positions) {
  var facetState = jQuery.extend({layoutName: layoutName}, layoutState);
  var replace = !!opt_positions && this.curLayoutHasPositions_();
  if (opt_positions) {
    facetState.positions = this.mergePositions_(opt_positions);
  }
  var delta = this.makeDelta(rhizo.state.Facets.LAYOUT, facetState);
  this.overlord_.transition(this.key(), delta, null, replace);
};

/**
 * @return {boolean} Whether the current state, and the current layout in
 *     particular, is storing custom model positions or not.
 * @private
 */
rhizo.state.ProjectStateBinder.prototype.curLayoutHasPositions_ = function() {
  var state = this.overlord_.master().state();
  var uuid = this.overlord_.uuid();
  return uuid in state.uuids &&
      rhizo.state.Facets.LAYOUT in state.uuids[uuid] &&
      !!state.uuids[uuid][rhizo.state.Facets.LAYOUT].positions;
};

/**
 * Merges all the custom layout positions currently stored in the visualization
 * state with new custom model positions defined in the current transition.
 *
 * @param {Array.<*>} positions An array of all model that have moved to a
 *     custom position as part of the current state transition.
 * @return {Array.<*>} An array of the same format of the input one, that
 *     contains all known custom model positions (current and historical).
 * @private
 */
rhizo.state.ProjectStateBinder.prototype.mergePositions_ = function(positions) {
  var positions_map = {};
  for (var i = positions.length-1; i >= 0; i--) {
    positions_map[positions[i].id] = true;
  }

  if (this.curLayoutHasPositions_()) {
    var cur_positions =
        this.overlord_.master().state().uuids[this.overlord_.uuid()][
            rhizo.state.Facets.LAYOUT].positions || [];
    for (var i = cur_positions.length-1; i >= 0; i--) {
      if (!(cur_positions[i].id in positions_map)) {
        positions.push(cur_positions[i]);
      }
    }
  }
  return positions;
};

/**
 * Utility method to change the visualization state because of a change in
 * the set of filtered models via selection.
 * @param {Array.<*>} filteredModels Array of model ids, for all the models
 *     that should be filtered out. null if no model should be filtered out.
 */
rhizo.state.ProjectStateBinder.prototype.pushFilterSelectionChange = function(
    filteredModels) {
  var delta = this.makeDelta(rhizo.state.Facets.SELECTION_FILTER,
                             filteredModels);
  this.overlord_.transition(this.key(), delta);
};

/**
 * Utility method to change the visualization state because of a change in the
 * set of metamodel filters.
 * @param {string} key The key of the metamodel filter that changed.
 * @param {*} value The target value of the metamodel filter.
 */
rhizo.state.ProjectStateBinder.prototype.pushFilterChange = function(key,
                                                                     value) {
  var delta = this.makeDelta(rhizo.state.Facets.FILTER_PREFIX + key,
                             value);
  this.overlord_.transition(this.key(), delta);
};


/**
 * Binds the visualization state to the browser HTML5 history.
 * @param {rhizo.state.StateOverlord} overlord
 * @constructor
 */
rhizo.state.HistoryStateBinder = function(overlord) {
  rhizo.state.StateBinder.call(this, overlord, rhizo.state.Bindings.HISTORY);
  rhizo.state.getHistoryHelper().addListener(
      this.overlord_.uuid(),
      jQuery.proxy(function(delta, target_state) {
        this.overlord_.transition(this.key(), delta, target_state);
      }, this));
};
rhizo.inherits(rhizo.state.HistoryStateBinder, rhizo.state.StateBinder);

rhizo.state.HistoryStateBinder.prototype.onTransition = function(opt_delta,
                                                                 state,
                                                                 opt_replace) {
  rhizo.state.getHistoryHelper().sync(state, opt_replace);
};


/**
 * Helper that manages all interactions with HTML5 History for all the
 * HistoryBinder instances that exist.
 * @param {rhizo.state.MasterOverlord} masterOverlord
 * @constructor
 */
rhizo.state.HistoryHelper = function(masterOverlord) {
  this.master_ = masterOverlord;
  this.listeners_ = {};
  this.initialStateReceived_ = false;

  $(window).bind('popstate', jQuery.proxy(this.historyChange_, this));
};



/**
 * Registers a callback to be invoked whenever an history-originated change
 * affecting a given visualization occurs.
 * @param {string} uuid The id of the visualization to track.
 * @param {function(rhizo.state.Facets, *, number)} callback Callback function.
 *   Receives as parameters: the facet that changed, the associated facet state
 *   and the timestamp when the change originally occurred.
 */
rhizo.state.HistoryHelper.prototype.addListener = function(uuid, callback) {
  this.listeners_[uuid] = callback;
};

/**
 * Pushes the current master state to HTML5 history.
 */
rhizo.state.HistoryHelper.prototype.sync = function(state, opt_replace) {
  // Stop listening for initial events after the first push.
  // We assume the initial state was never fired during the init process,
  // as is the case of Safari/MacOs when we are landing directly on the
  // visualization page (not arriving from history browse).
  this.initialStateReceived_ = true;
  if (opt_replace) {
    window.history.replaceState(state, /* empty title */ '');
  } else {
    window.history.pushState(state, /* empty title */ '');
  }
};

/**
 * Callback invoked whenever an history event occurs (forward / back navigation)
 * @param {PopStateEvent} evt
 * @private
 */
rhizo.state.HistoryHelper.prototype.historyChange_ = function(evt) {
  if (!this.initialStateReceived_) {
    // A PopStateEvent is fired on page load when we are arriving on the page
    // as a consequence of browser back/forward navigation. The event contains
    // the initial state Rhizosphere visualizations should be restored to.
    this.initialStateReceived_ = true;
    var initial_state = evt.originalEvent.state;

    // A null PopStateEvent is fired by Chrome (on Linux, Win) and FF4 when
    // we are landing directly on the page that contains the visualization
    // (i.e.: no back/forward buttons were used).
    if (initial_state) {

      // Verify whether the state we received belongs to Rhizosphere.
      if (this.isRhizoState_(initial_state)) {
        this.master_.setInitialState(rhizo.state.Bindings.HISTORY,
                                     initial_state);
      }
    }
    return;
  }

  var delta;
  var target_state = evt.originalEvent.state;
  if (!target_state) {
    // A null target state implies we are moving backward to the initial state
    // the page has when we land on it directly (not coming from an history
    // event).
    //
    // Prepare a suitable delta to revert the facet to its initial (default)
    // state.
    delta = {
      ts: new Date().getTime(),
      uuid: this.master_.state().delta.uuid,
      facet: this.master_.state().delta.facet,
      facetState: null
    };
  } else {
    if (!this.isRhizoState_(target_state)) {
      // Notified of an HTML5 history state change that was not set by
      // Rhizosphere.
      return;
    }

    if (this.master_.state().delta.ts == target_state.delta.ts) {
      // We are receiving the same state twice (assuming timestamp measurement
      // is granular enough).
      // This can happen in some weird cases. For example:
      // - if we are on Chrome/Linux,
      // - and we set an initial state with replacement (as when resuming the
      //   the initial following of a remove visualization)
      // Then:
      // - a popState event will be fired _after_ the initial state was set.
      // Since we performed a state replace, the popstate event will contain
      // the exact state currently in the master.
      return;
    }

    // Compute the transition required to reach the target state.
    delta = this.diff_(this.master_.state(), target_state);
  }

  // Notify the listener that is responsible for the affected visualization.
  this.listeners_[delta.uuid](delta, target_state);
};

/**
 * Defines whether the history state belongs to Rhizosphere or was defined by
 * someone else living in the same page as the visualization.
 * @private
 */
rhizo.state.HistoryHelper.prototype.isRhizoState_ = function(state) {
  return state.type == rhizo.state.TYPE;
};

/**
 * Computes the delta state change that occurred between two consecutive
 * global states. It distinguishes between forward changes (the state we
 * diff against occurred after the current one) and backward ones (viceversa).
 *
 * @param {*} current_state The current state.
 * @param {*} target_state The target state, as received from history.
 * @return {*} An object describing the delta change with the following
 *    properties:
 *    - uuid: uuid of the visualization that changed.
 *    - facet: changed facet
 *    - facetState: facet state as it was after the state change.
 *    - ts: The timestamp at which the change occurred.
 */
rhizo.state.HistoryHelper.prototype.diff_ = function(current_state,
                                                     target_state) {
  if (target_state.delta.ts > current_state.delta.ts) {
    // Moving forward through the history
    return target_state.delta;
  } else {
    // Moving backward through the history
    var facetToRollback = current_state.delta.facet;
    var uuidToRollback = current_state.delta.uuid;
    if (uuidToRollback in target_state.uuids &&
        facetToRollback in target_state.uuids[uuidToRollback]) {
      return {
        ts: target_state.delta.ts,
        uuid: uuidToRollback,
        facet: facetToRollback,
        facetState: target_state.uuids[uuidToRollback][facetToRollback]
      }
    } else {
      // Either the uuid or the affected facet is missing in the target state.
      // We are rolling back to a state where either the entire project
      // associated to this uuid, or just one of its facets, was in its
      // default (unconfigured) state.
      // Examples:
      // - missing uuid: null initial state (direct landing on the page),
      //     apply a change and then roll it back.
      // - missing facet: null initial state (direct landing on the page),
      //     apply a change to 2 different facets, then rollback the latter.
      return {
        ts: target_state.delta.ts,
        uuid: uuidToRollback,
        facet: facetToRollback,
        facetState: null
      };
    }
  }
};


/**
 * The singleton master state manager.
 * @type {rhizo.state.MasterOverlord}
 * @private
 */
rhizo.state.overlord_ = new rhizo.state.MasterOverlord();


/**
 * @return {rhizo.state.MasterOverlord} The global state manager.
 */
rhizo.state.getMasterOverlord = function() {
  return rhizo.state.overlord_;
};


/**
 * The singleton helper that manages all interactions with HTML5 History.
 * @type {rhizo.state.HistoryHelper}
 * @private
 */
rhizo.state.history_ = null;
if (window.history && typeof(window.history.pushState) == 'function') {
  rhizo.state.history_ = new rhizo.state.HistoryHelper(
      rhizo.state.getMasterOverlord());
}


/**
 * @return {rhizo.state.HistoryHelper} the singleton helper that manages all
 *   interactions with HTML5 History.
 */
rhizo.state.getHistoryHelper = function() {
  return rhizo.state.history_;
};/* ./src/js/rhizo.log.js */
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

// RHIZODEP=rhizo
namespace("rhizo");

rhizo.nativeConsoleExists = function() {
  return typeof(console) !== 'undefined' && console != null;
};

rhizo.NoOpLogger = function() {};
rhizo.NoOpLogger.prototype.info = function() {};
rhizo.NoOpLogger.prototype.error = function() {};
rhizo.NoOpLogger.prototype.warn = function() {};

rhizo.NativeLogger = function() {};

rhizo.NativeLogger.prototype.info = function(message) {
  console.info(message);
};

rhizo.NativeLogger.prototype.error = function(message) {
  console.error(message);
};

rhizo.NativeLogger.prototype.warn = function(message) {
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
    case "warn":
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
    if (this.rightBar_ && !this.rightBar_.isCollapsed()) {
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

rhizo.Logger.prototype.warn = function(message) {
  this.log_(message, "warn");
};
/* ./src/js/extra/rhizo.meta.extra.js */
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
  rhizo.meta.NumberKind.call(this);
  this.precision_ = opt_precision || 2;
  this.input_ = null;
};
rhizo.inherits(rhizo.meta.DecimalKind, rhizo.meta.NumberKind);

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
};

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
  rhizo.meta.RangeKind.call(this);
  this.precision_ = typeof(opt_precision) == 'number' ? opt_precision : 2;
  this.scale_ = Math.pow(10, this.precision_);
};
rhizo.inherits(rhizo.meta.DecimalRangeKind, rhizo.meta.RangeKind);

rhizo.meta.DecimalRangeKind.prototype.compare =
    rhizo.meta.DecimalKind.prototype.compare;

rhizo.meta.DecimalRangeKind.prototype.cluster =
    rhizo.meta.DecimalKind.prototype.cluster;

rhizo.meta.DecimalRangeKind.prototype.toModelScale = function(filterValue) {
  // toFixed() returns a string, hence the need to parseFloat()
  return parseFloat((filterValue / this.scale_).toFixed(this.precision_));
};

rhizo.meta.DecimalRangeKind.prototype.toFilterScale = function(modelValue) {
  return Math.round(modelValue * this.scale_);
};


/**
 *  LogarithmRangeKind meta: A specialized filter that can render range sliders
 *  according to a Log10 scale.
 *  This filter reuses what provided by the DecimalRangeKind filter.
 *  
 *  If opt_oneplus is true, then the transformation it applies is Log10(1+x) 
 *  rather than Log10(x) (useful if your dataset has values that start from 0).
 */
rhizo.meta.LogarithmRangeKind = function(opt_precision, opt_oneplus) {
  rhizo.meta.DecimalRangeKind.call(this, opt_precision);
  this.oneplus_ = !!opt_oneplus;
};
rhizo.inherits(rhizo.meta.LogarithmRangeKind, rhizo.meta.DecimalRangeKind);

rhizo.meta.LogarithmRangeKind.prototype.toModelScale = function(filterValue) {
  // toFixed() returns a string, hence the need to parseFloat()
  var delta = this.oneplus_ ? -1 : 0;
  return parseFloat(
    Math.pow(10, filterValue / this.scale_).toFixed(this.precision_)) +  delta;
};

rhizo.meta.LogarithmRangeKind.prototype.toFilterScale = function(modelValue) {
  modelValue = this.oneplus_ ? modelValue+1 : modelValue;
  return Math.round(rhizo.util.log10_(modelValue) * this.scale_);
};


/**
  StringArrayKind meta: A filter that behaves exactly like a String meta but
  expects the model to be an array of strings.

  TODO(battlehorse): This is still very temporary, since a) it doesn't support
  clustering and b) it could be made a lot more generic (create array filters
  out of normal filters by wrapping them).
*/
rhizo.meta.StringArrayKind = function() {
  rhizo.meta.StringKind.call(this);
};
rhizo.inherits(rhizo.meta.StringArrayKind, rhizo.meta.StringKind);

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


// Register the extra filters
rhizo.meta.Kind.DECIMAL = function() { return new rhizo.meta.DecimalKind(); };
rhizo.meta.Kind.DECIMALRANGE = function() {
    return new rhizo.meta.DecimalRangeKind();
};
rhizo.meta.Kind.LOGARITHMRANGE = function() {
    return new rhizo.meta.LogarithmRangeKind();
};
rhizo.meta.Kind.STRINGARRAY = function() {
   return new rhizo.meta.StringArrayKind();
};
/* ./src/js/rhizo.layout.shared.js */
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
 * Returns the first key of the project metamodel, optionally satisfying a
 * required constraint.
 * @param {rhizo.Project} project
 * @param {function(string, Object):boolean} opt_matcher Optional function to
 *     decide whether to the given metaModel key is acceptable or not.
 *     Receives as parametes the key itself and the associated metamodel entry.
 * @return {string} The metamodel key, or null if no acceptable key could be
 *     found.
 */
rhizo.layout.firstMetamodelKey = function(project, opt_matcher) {
  for (var key in project.metaModel()) {
    if (!opt_matcher || opt_matcher(key, project.metaModel()[key])) {
      return key;
    }
  }
  return null;
};

/**
 * A function that matches metamodel keys that identify parent-child
 * relationships between models (specifically, a key whose value points to
 * parent model of a given one).
 * @param {string} key The key to check.
 * @param {*} meta The metamodel entry associated to this key.
 */
rhizo.layout.parentMatcher = function(key, meta) {
  return !!meta.isParent;
};

/**
 * A function that matches metamodel keys that identify numeric model
 * attributes.
 * @param {string} key The key to check.
 * @param {*} meta The metamodel entry associated to this key.
 */
rhizo.layout.numericMatcher = function(key, meta) {
  return meta.kind.isNumeric();
};


/**
 * Defines the bounding rectangle inside which models' layout should occur.
 * The bounding rectangle is guaranteed to remain within the container limits.
 *
 * @param {HTMLElement} container The HTML element whose width and height define
 *     the maximum width and height of the layout rectangle. This will typically
 *     be the visualization viewport.
 * @param {*} opt_layoutConstraints An optional map of constraints for the
 *     layout bounding rectangle. The following keys are accepted: top, bottom,
 *     left, right, width and height. Each value in the [0.0,1.0) range is
 *     considered relative to the container width and height, and assumed to
 *     be absolute values otherwise. 'width' and 'height' takes precedence
 *     respectively over 'right' and 'bottom'.
 * @constructor
 */
rhizo.layout.LayoutBox = function(container, opt_layoutConstraints) {
  /**
   * The distance (in pixels) of the layout rectangle from the container top
   * border.
   * @type {number}
   */
  this.top = 0;

  /**
   * The distance (in pixels) of the layout rectangle from the container bottom
   * border.
   * @type {number}
   */
  this.bottom = 0;

  /**
   * The distance (in pixels) of the layout rectangle from the container left
   * border.
   * @type {number}
   */
  this.left = 0;

  /**
   * The distance (in pixels) of the layout rectangle from the container right
   * border.
   * @type {number}
   */
  this.right = 0;

  /**
   * The layout rectangle width (in pixels).
   * @type {number}
   */
  this.width = 0;

  /**
   * The layout rectangle height (in pixels).
   * @type {number}
   */
  this.height = 0;

  this.maxWidth_ = $(container).width();
  this.maxHeight_ = $(container).height();
  this.computeLayoutBox_(opt_layoutConstraints || {});
};

/**
 * Computes the top,bottom,left,right,width and height attributes of the layout
 * rectangle, given the surrounding container size and any externally provided
 * constraints.
 *
 * @param {*} layoutConstraints Map of constraints for the layout bounding
 *     rectangle.
 * @private
 */
rhizo.layout.LayoutBox.prototype.computeLayoutBox_ = function(
    layoutConstraints) {
  this.top = this.getAbsoluteDimension_(layoutConstraints.top,
                                        this.maxHeight_);
  if (layoutConstraints.height) {
    this.height = this.getAbsoluteDimension_(layoutConstraints.height,
                                             this.maxHeight_);
    this.bottom = this.maxHeight_ - this.top - this.height;
  } else {
    this.bottom = this.clamp_(
        this.getAbsoluteDimension_(layoutConstraints.bottom, this.maxHeight_),
        this.top, this.maxHeight_);
    this.height = this.maxHeight_ - this.top - this.bottom;
  }

  this.left = this.getAbsoluteDimension_(layoutConstraints.left,
                                         this.maxWidth_);
  if (layoutConstraints.width) {
    this.width = this.getAbsoluteDimension_(layoutConstraints.width,
                                            this.maxWidth_);
    this.right = this.maxWidth_ - this.left - this.width;
  } else {
    this.right = this.clamp_(
        this.getAbsoluteDimension_(layoutConstraints.right, this.maxWidth_),
        this.left, this.maxWidth_);
    this.width = this.maxWidth_ - this.left - this.right;
  }
};

/**
 * Converts a value relative to the container size into an absolute value (in
 * pixels).
 * @param {number} value The value to convert.
 * @param {number} maxValue The maximum acceptable value.
 * @return {number} An absolute number (in pixel units) that is guaranteed to
 *     be in the [0, maxValue] range.
 * @private
 */
rhizo.layout.LayoutBox.prototype.getAbsoluteDimension_ = function(value, maxValue) {
  value = value || 0;
  var multiplier = value < 1.0 ? maxValue : 1;
  return this.clamp_(Math.round(value * multiplier), 0, maxValue);
};

/**
 * Clamps the given value between the minimum and maximum range limits.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @private
 */
rhizo.layout.LayoutBox.prototype.clamp_ = function(val, min, max) {
  return Math.min(max, Math.max(min, val));
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
 * if cycles are found within the tree. Deals automatically with "unavailable"
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

  // supermodels contains only the models that can be laid out, while allmodels
  // contains all the known models.
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

        var parentSuperModel = this.findFirstAvailableParent_(
            allmodels,
            allmodels[model[this.parentKey_]]);
        if (parentSuperModel && parentSuperModel.id != model.id) {
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
 * From a given model, returns the first model in the tree hierarchy defined
 * according to parentKey which is available for layout. Models can be
 * unavailable for various reasons, such as being filtered or pinned.
 * If the given model itself is available, it is returned without further
 * search. If a cycle is detected while traversing unavailable parents,
 * an exception is raised.
 *
 * @param {Object.<string, rhizo.model.SuperModel>} allmodels a map associating
 *     model ids to SuperModel instances, for all models currently known to the
 *     project.
 * @param {rhizo.model.SuperModel} superParent the model to start the search from.
 * @private
 */
rhizo.layout.Treeifier.prototype.findFirstAvailableParent_ = function(
    allmodels, superParent) {
  if (!superParent) {
    return null;
  }

  var localNodesMap = {};
  while (!superParent.isAvailableForLayout()) {
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
 * @return {Object.<string, number>} The dimensions of the rendering bound to
 *     this node.
 */
rhizo.layout.TreeNode.prototype.renderingDimensions = function() {
  return this.superModel.rendering().getDimensions();
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

// RHIZODEP=rhizo.ui
namespace("rhizo.model");

/**
 * Wraps a 'naked' model with additional functionalities and goodness required
 * by Rhizosphere to manage it.
 *
 * @param {*} model The model to wrap.
 * @constructor
 */
rhizo.model.SuperModel = function(model) {
  this.model = model;
  this.id = model.id;
  this.filters_ = {}; // a map of filter status, one for each model key
  this.rendering_ = null;
  this.selected_ = false;
  this.pinned_ = false;
};

/**
 * @param {rhizo.ui.Rendering} rendering
 */
rhizo.model.SuperModel.prototype.setRendering = function(rendering) {
  this.rendering_ = rendering;
};

/**
 * @return {rhizo.ui.Rendering}
 */
rhizo.model.SuperModel.prototype.rendering = function() {
  return this.rendering_;
};

/**
 * @return {*} the naked model wrapped by this SuperModel.
 */
rhizo.model.SuperModel.prototype.unwrap = function() {
  return this.model;
};

/**
 * @return {boolean} Whether this model participates in layout operations.
 *     A model won't respond to layouts if it's filtered or pinned.
 */
rhizo.model.SuperModel.prototype.isAvailableForLayout = function() {
  return !this.isFiltered() && !this.isPinned();
};

/**
 * Sets the selection status for this model. Propagates to its rendering.
 * @param {boolean} selected
 */
rhizo.model.SuperModel.prototype.setSelected = function(selected) {
  this.selected_ = !!selected;
  this.rendering_.setSelected(this.selected_);
};

/**
 * Pins the model. The model rendering will remain at a fixed position in
 * the visualization universe and won't respond to layout operations. Users
 * can still move the model by manually dragging it.
 */
rhizo.model.SuperModel.prototype.pin = function() {
  this.pinned_ = true;
};

/**
 * Unpins the model.
 */
rhizo.model.SuperModel.prototype.unpin = function() {
  this.pinned_ = false;
};

/**
 * @return {boolean} Whether the model is pinned or not.
 */
rhizo.model.SuperModel.prototype.isPinned = function() {
  return this.pinned_;
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

/**
 * Removes the given filter from this model.
 * @param {string} key The key of the filter to remove.
 * @return {boolean} Whether the filter existed on tihs model (and was
 *     therefore removed) or not.
 */
rhizo.model.SuperModel.prototype.resetFilter = function(key) {
  if (key in this.filters_) {
    delete this.filters_[key];
    return true;
  } else {
    return false;
  }
};

/**
 * Notifies the supermodel that the underlying naked model has changed, forcing
 * it to update the rendering.
 */
rhizo.model.SuperModel.prototype.modelChanged = function() {
  this.rendering_.modelChanged();
};/* ./src/js/rhizo.autorender.js */
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
  for (var key in this.metamodel_) {
    // master Field is by default the first one
    if (!this.masterField_) {
      this.masterField_ = key;
    }

    if (!this.fallbackToDefaults_) {
      break;
    }

    // size Field is the first numeric field
    var kind = rhizo.meta.objectify(this.metamodel_[key].kind);
    if (!this.sizeField_ && kind.isNumeric()) {
      this.sizeField_ = key;
      continue;
    }

    // color Field is the next numeric field, or the first one if
    // size is explicitly bound
    if (this.sizeField_) {
      if (!this.colorField_ && kind.isNumeric()) {
        this.colorField_ = key;
      }
    }
  }
};

rhizo.autorender.AR.prototype.locateMinMax_ = function(models, key) {
  var kind = rhizo.meta.objectify(this.metamodel_[key].kind);
  if (kind.isNumeric() &&
      typeof(this.metamodel_[key].min) != 'undefined' &&
      typeof(this.metamodel_[key].max) != 'undefined') {
    // Numeric field with 'min' and 'max' attributes. Looks range-y.
    return { min: this.metamodel_[key].min ,
             max: this.metamodel_[key].max ,
             label: this.metamodel_[key].label };
  } else {
    // simple numeric field. Iterate over models to figure out min and max.
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

// RHIZODEP=rhizo.meta,rhizo.autorender
namespace("rhizo.gviz");

rhizo.gviz.Initializer = function(dataTable,
                                  logger,
                                  opt_options,
                                  opt_customRenderer) {
  this.dt_ = dataTable;
  this.logger_ = logger;
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
        this.logger_.warn(
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
};

rhizo.gviz.DebugRenderer.prototype.render = function(model) {
  var div = $("<div />");
  for (var j = 0, clen = this.dt_.getNumberOfColumns(); j < clen; j++) {
    div.append("<p>" + model[this.dt_.getColumnId(j)] + "</p>");
  }
  return div;
};
/* ./src/js/rhizo.layout.js */
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

- implement the layoutUIControls() function (optional)
  This renders a piece of UI you can use to collect extra options
  for your layout.

- implement a getState()/setState() function pair (optional).
  Handle state management for the layout. The former returns a plain js object
  with the layout state information, the latter receives back an object in the
  same format, for the layout to restore itself to a given state.

  The layout can use state information to tweak and let the user customize
  its behavior.

  It is the layout responsibility to validate any received state. A boolean
  should be returned from setState() to declare whether the received state
  is well formed or not.

  The rhizo.layout.StatefulLayout helper class can be used to simplify state
  management.

  If the layout makes use of UI controls (via layoutUIControls()), it is the
  layout responsibility to keep its own internal state and the UI controls in
  sync.

  The rhizo.layout.GUILayout helper class can be used to simplify state
  management when UI controls are present.

  setState() will receive a null state if the layout should be restored to its
  'default' (or initial) state.

- implement the cleanup() function (optional)
  If your layout creates data structures or UI components that
  have to be cleaned up once the layout is dismissed.

- implement the dependentModels() function (optional)
  If your layout establish specific relationships between models (this may be
  the case, for example, of hierarchical layouts that define parent-child
  relationships between models). Rhizosphere may use the information about
  dependent models to tweak the way other aspects work, such as selection
  management.

- register the newly created layout in the rhizo.layout.layouts structure.
*/

// RHIZODEP=rhizo.log,rhizo.meta,rhizo.layout.shared
namespace("rhizo.layout");


/**
 * Helper superclass to simplify state management for stateful layouts.
 *
 * @param {rhizo.Project} project
 * @constructor
 */
rhizo.layout.StatefulLayout = function(project) {
  this.project_ = project;
  this.state_ = this.defaultState_();
};

/**
 * @return {*} The current layout state.
 */
rhizo.layout.StatefulLayout.prototype.getState = function() {
  return this.state_;
};

/**
 * Transitions the layout to a new state. The received state will be validated
 * before setting it on the layout.
 *
 * @param {*} otherState The state the layout should transition to. If null,
 *     the layout will transition back to its default state.
 * @return {boolean} Whether the state was successfully set or not (for example
 *     because it didn't pass validation checks).
 */
rhizo.layout.StatefulLayout.prototype.setState = function(otherState) {
  if (!otherState) {
    this.state_ = this.defaultState_();
    return true;
  }

  if (!this.validateState_(otherState)) {
    return false;
  } else {
    this.state_ = this.cloneState_(otherState);
    return true;
  }
};

/**
 * Subclasses to override to define default layout state.
 * @return {*} The default, or initial, layout state.
 */
rhizo.layout.StatefulLayout.prototype.defaultState_ = function() {
  return null;
};

/**
 * Subclasses to override to perform layout state validation.
 * @param {*} otherState The state the layout is asked to transition to.
 * @return {boolean} Whether the received state is well formed.
 */
rhizo.layout.StatefulLayout.prototype.validateState_ = function(otherState) {
  return true;
};

/**
 * Helper validation function that checks whether the received state contains
 * a given key.
 * @param {*} otherState The state to validate.
 * @param {string} key The key to find in otherState.
 * @return {boolean} Whether the state satisfies the validation rule.
 */
rhizo.layout.StatefulLayout.prototype.validateStateAttributePresence_ =
    function(otherState, key) {
  if (!(key in otherState)) {
    this.project_.logger().error(
        'State must specify a ' + key + ' attribute');
    return false;
  }
  return true;
};

/**
 * Helper validation function that checks whether a given key (found inside
 * a layout state) is present in the project metamodel and (optionally) whether
 * the key kind satisfies additional constraints.
 *
 * @param {string} key The key to find in the project metamodel.
 * @param {function(string, Object):boolean} opt_matcher Optional function to
 *     decide whether the received key is acceptable, given its associated
 *     metamodel information.
 *     Receives as parametes the key itself and the associated metamodel entry.
 */
rhizo.layout.StatefulLayout.prototype.validateMetamodelPresence_ = function(
    key, opt_matcher) {
  if (!(key in this.project_.metaModel())) {
    this.project_.logger().error(key + ' is not part of the metamodel.');
    return false;
  }
  if (opt_matcher && (!opt_matcher(key, this.project_.metaModel()[key]))) {
    this.project_.logger().error(
        key + ' does not match the required constraints');
    return false;
  }
  return true;
};

/**
 * Clones an externally received state.
 * Subclasses to override to customize the cloning policy, for example to
 * enforce specific casts or type conversion when an external state is set on
 * the layout.
 *
 * @param {*} otherState
 */
rhizo.layout.StatefulLayout.prototype.cloneState_ = function(otherState) {
  return $.extend({}, otherState);
};


/**
 * Helper superclass to simplify state management for stateful layouts that have
 * associated UI controls.
 *
 * @param {rhizo.Project} project
 * @param {*} ui An object that abstracts access to the layout UI controls. Must
 *     expose 2 methods: renderControls() which returns the UI controls either
 *     in the form of a jQuery object pointing to them or a plain HTML node, and
 *     setState() which will be invoked when the UI controls must update their
 *     state.
 * @constructor
 */
rhizo.layout.GUILayout = function(project, ui) {
  rhizo.layout.StatefulLayout.call(this, project);
  this.ui_ = ui;
  this.ui_controls_ = null;
};
rhizo.inherits(rhizo.layout.GUILayout, rhizo.layout.StatefulLayout);

/**
 * Returns the UI controls associated to this layout. Controls are rendered
 * only once, so this method can be invoked multiple times with no side
 * effects.
 *
 * @return {*} Either an HTML node or a jQuery object pointing to it,
 *     collecting the UI controls for this layout.
 */
rhizo.layout.GUILayout.prototype.layoutUIControls = function() {
  if (!this.ui_controls_) {
    this.ui_controls_ = this.ui_.renderControls();
    this.ui_.setState(this.getState());
  }
  return this.ui_controls_;
};

/**
 * Transitions the layout to a new state and updates the layout UI controls.
 * See rhizo.layout.StatefulLayout.prototype.setState for further info.
 * @param {*} state The new layout state.
 */
rhizo.layout.GUILayout.prototype.setState = function(state) {
  var success = rhizo.layout.StatefulLayout.prototype.setState.call(this,
                                                                    state);
  if (success && this.ui_controls_) {
    this.ui_.setState(this.getState());
  }
  return success;
};

/**
 * Helper function that layout UI controls should invoke whenever the layout
 * state changes because of user action on the controls.
 *
 * @param {*} state The new layout state.
 */
rhizo.layout.GUILayout.prototype.setStateFromUI = function(state) {
  return rhizo.layout.StatefulLayout.prototype.setState.call(this, state);
};


/**
 * A no-op layout.
 * @param {rhizo.Project} unused_project
 * @constructor
 */
rhizo.layout.NoLayout = function(unused_project) {};

rhizo.layout.NoLayout.prototype.layout = function() {
  return false;
};

rhizo.layout.NoLayout.prototype.toString = function() {
  return "-";
};


/**
 * A layout that re-arranges models in random positions within the visible
 * viewport.
 * @param {rhizo.Project} unused_project
 * @constructor
 */
rhizo.layout.ScrambleLayout = function(unused_project) {};

/**
 * Lays out models.
 *
 * @param {rhizo.ui.RenderingPipeline} pipeline The pipeline that
 *     accumulates all the layout operations to perform as part of this layout
 *     request.
 * @param {rhizo.layout.LayoutBox} layoutBox The bounding rectangle inside which
 *     the layout should occur.
 * @param {Array.<rhizo.model.SuperModel>} supermodels List of the SuperModels
 *     that will participate in the layout.
 * @param {Object.<*, rhizo.model.SuperModel>} allmodels A map of all
 *     visualization models, mapping from the model id the associated SuperModel
 *     instance.
 * @param {*} meta The project metamodel.
 * @param {*} options The composition of project-wide configuration options and
 *     layout-specific ones.
 */
rhizo.layout.ScrambleLayout.prototype.layout = function(pipeline,
                                                        layoutBox,
                                                        supermodels,
                                                        allmodels,
                                                        meta,
                                                        options) {
  if (options.filter) {
    return false; // re-layouting because of filtering doesn't affect the layout
  }

  // Randomly distributing models leaving a 5%-wide margin between the models
  // and the container.
  for (var i = 0, len = supermodels.length; i < len; i++) {
    var top = Math.round(layoutBox.height*0.05 +
                         Math.random()*0.85*layoutBox.height);
    var left = Math.round(layoutBox.width*0.05 +
                          Math.random()*0.85*layoutBox.width);

    pipeline.move(supermodels[i].id, top, left);
  }
  return false;
};

rhizo.layout.ScrambleLayout.prototype.toString = function() {
  return "Random";
};


/**
 * A layout that positions models sequentially, left to right, top to bottom.
 *
 * @param {rhizo.Project} project
 * @param {?number} opt_top Optional vertical separation (in px) to use between
 *     rows of models.
 * @param {?number} opt_left Optional horizontal separation (in px) to use
 *     between models next to each other.
 * @constructor
 */
rhizo.layout.FlowLayout = function(project, opt_top, opt_left) {
  this.project_ = project;
  this.top = opt_top || 5;
  this.left = opt_left || 5;
  rhizo.layout.GUILayout.call(this, project,
                              new rhizo.layout.FlowLayoutUI(this, project));
};
rhizo.inherits(rhizo.layout.FlowLayout, rhizo.layout.GUILayout);

/**
 * @private
 */
rhizo.layout.FlowLayout.prototype.defaultState_ = function() {
  return {
    order: rhizo.layout.firstMetamodelKey(this.project_),
    reverse: false
  };
};

/**
 * Validates a layout state. A valid state must have an 'order' property
 * pointing to the metamodel key that will be used as sorting criteria when
 * laying out models.
 *
 * @param {*} otherState
 * @private
 */
rhizo.layout.FlowLayout.prototype.validateState_ = function(otherState) {
  return this.validateStateAttributePresence_(otherState, 'order') &&
      this.validateMetamodelPresence_(otherState.order);
};

/**
 * Lays out models.
 *
 * @param {rhizo.ui.RenderingPipeline} pipeline The pipeline that
 *     accumulates all the layout operations to perform as part of this layout
 *     request.
 * @param {rhizo.layout.LayoutBox} layoutBox The bounding rectangle inside which
 *     the layout should occur.
 * @param {Array.<rhizo.model.SuperModel>} supermodels List of the SuperModels
 *     that will participate in the layout.
 * @param {Object.<*, rhizo.model.SuperModel>} allmodels A map of all
 *     visualization models, mapping from the model id the associated SuperModel
 *     instance.
 * @param {*} meta The project metamodel.
 * @param {*} options The composition of project-wide configuration options and
 *     layout-specific ones.
 */
rhizo.layout.FlowLayout.prototype.layout = function(pipeline,
                                                    layoutBox,
                                                    supermodels,
                                                    allmodels,
                                                    meta,
                                                    options) {
  var order = this.getState().order;
  var reverse = !!this.getState().reverse;
  var maxWidth = layoutBox.width;
  var lineHeight = 0;

  // reorder supermodels
  this.project_.logger().info("Sorting by " + order);
  supermodels.sort(rhizo.meta.sortBy(order, meta[order].kind, reverse));

  // layout supermodels
  for (var i = 0, len = supermodels.length; i < len; i++) {
    var modelDims = supermodels[i].rendering().getDimensions();
    lineHeight = Math.max(lineHeight, modelDims.height);

    if (this.left + modelDims.width > maxWidth) {
      this.left = 5;
      this.top += lineHeight + 5;
      lineHeight = modelDims.height;
    }

    pipeline.move(supermodels[i].id, this.top, this.left);
    this.left += modelDims.width + 5;
  }
  // adjust top after last line
  this.top += lineHeight;
  return false;
};

rhizo.layout.FlowLayout.prototype.cleanup = function(sameEngine, options) {
  this.top = this.left = 5;
  return false;
};

rhizo.layout.FlowLayout.prototype.toString = function() {
  return "List";
};


/**
 * Helper class that handles FlowLayout ui controls.
 * @param {rhizo.layout.FlowLayout} layout
 * @param {rhizo.Project} project
 * @constructor
 */
rhizo.layout.FlowLayoutUI = function(layout, project) {
  this.layout_ = layout;
  this.project_ = project;
  this.orderSelector_ = null;
  this.reverseCheckbox_ = null;
};

rhizo.layout.FlowLayoutUI.prototype.renderControls = function() {
  this.orderSelector_ =  rhizo.layout.metaModelKeySelector(
    this.project_, 'rhizo-flowlayout-order').
      change(jQuery.proxy(this.updateState_, this));
  this.reverseCheckbox_ = $(
    '<input type="checkbox" class="rhizo-flowlayout-desc" />').
      click(jQuery.proxy(this.updateState_, this));

  return $("<div />").
           append("Ordered by: ").
           append(this.orderSelector_).
           append(" desc?").
           append(this.reverseCheckbox_);
};

rhizo.layout.FlowLayoutUI.prototype.setState = function(state) {
  this.orderSelector_.val(state.order);
  if (state.reverse) {
    this.reverseCheckbox_.attr('checked', 'checked');
  } else {
    this.reverseCheckbox_.removeAttr('checked');
  }
};

/**
 * Updates the layout state whenever the user modifies the controls.
 * @private
 */
rhizo.layout.FlowLayoutUI.prototype.updateState_ = function() {
  this.layout_.setStateFromUI({
    order: this.orderSelector_.val(),
    reverse: this.reverseCheckbox_.is(':checked')
  });
};


/**
 * A layout that arranges models in buckets.
 * @param {rhizo.Project} project
 * @constructor
 */
rhizo.layout.BucketLayout = function(project) {
  this.project_ = project;
  this.internalFlowLayout_ = new rhizo.layout.FlowLayout(project);
  rhizo.layout.GUILayout.call(this, project,
                              new rhizo.layout.BucketLayoutUI(this, project));
};
rhizo.inherits(rhizo.layout.BucketLayout, rhizo.layout.GUILayout);

/**
 * @private
 */
rhizo.layout.BucketLayout.prototype.defaultState_ = function() {
  return {
    bucketBy: rhizo.layout.firstMetamodelKey(this.project_),
    reverse: false
  };
};

/**
 * Validates a layout state. A valid state must have a 'bucketBy' property
 * pointing to the metamodel key that will be used as grouping criteria when
 * laying out models.
 *
 * @param {*} otherState
 * @private
 */
rhizo.layout.BucketLayout.prototype.validateState_ = function(otherState) {
  return this.validateStateAttributePresence_(otherState, 'bucketBy') &&
      this.validateMetamodelPresence_(otherState.bucketBy);
};

/**
 * Lays out models.
 *
 * @param {rhizo.ui.RenderingPipeline} pipeline The pipeline that
 *     accumulates all the layout operations to perform as part of this layout
 *     request.
 * @param {rhizo.layout.LayoutBox} layoutBox The bounding rectangle inside which
 *     the layout should occur.
 * @param {Array.<rhizo.model.SuperModel>} supermodels List of the SuperModels
 *     that will participate in the layout.
 * @param {Object.<*, rhizo.model.SuperModel>} allmodels A map of all
 *     visualization models, mapping from the model id the associated SuperModel
 *     instance.
 * @param {*} meta The project metamodel.
 * @param {*} options The composition of project-wide configuration options and
 *     layout-specific ones.
 */
rhizo.layout.BucketLayout.prototype.layout = function(pipeline,
                                                      layoutBox,
                                                      supermodels,
                                                      allmodels,
                                                      meta,
                                                      options) {
  var reverse = !!this.getState().reverse;
  var bucketBy = this.getState().bucketBy;
  this.project_.logger().info("Bucketing by " + bucketBy);

  this.internalFlowLayout_.setState({order: bucketBy, reverse: reverse});

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
  var firstBucket = true;
  for (var i = 0; i < bucketKeys.length; i++) {
    var bucketKey = bucketKeys[i];
    this.renderBucketHeader_(pipeline,
                             bucketsLabels[bucketKey],
                             buckets[bucketKey],
                             firstBucket);
    dirty = this.internalFlowLayout_.layout(pipeline,
                                            layoutBox,
                                            buckets[bucketKey],
                                            allmodels,
                                            meta,
                                            options) || dirty;

    // re-position for next bucket
    this.internalFlowLayout_.top += 10;
    this.internalFlowLayout_.left = 5;
    firstBucket = false;
  }
  return dirty;
};

/**
 * Renders a bucket header.
 *
 * @param {rhizo.ui.RenderingPipeline} pipeline The pipeline that
 *     accumulates all the layout operations to perform as part of this layout
 *     request.
 * @param {string} header The bucket label.
 * @param {Array.<rhizo.model.SuperModel>} supermodels The supermodels that are
 *     clustered within this bucket.
 * @param {boolean} firstBucket Whether the bucket header being rendered is the
 *     first one or not.
 * @private
 */
rhizo.layout.BucketLayout.prototype.renderBucketHeader_ =
    function(pipeline, header, supermodels, firstBucket) {
  var bucketHeader = $('<div />', {
      'class': firstBucket ? 'rhizo-bucket-header rhizo-bucket-first' :
                             'rhizo-bucket-header'});
  bucketHeader.text(header).
               css('position', 'absolute').
               css('left', 5).
               css('top', this.internalFlowLayout_.top).
               click(jQuery.proxy(function() {
                 var allSelected = true;
                 for (var i = supermodels.length - 1; i >= 0; i--) {
                   if (!this.project_.isSelected(supermodels[i].id)) {
                    allSelected = false;
                    break;
                   }
                 }
                 for (var i = supermodels.length - 1; i >= 0; i--) {
                   if (allSelected) {
                     this.project_.unselect(supermodels[i].id);
                   } else {
                     this.project_.select(supermodels[i].id);
                   }
                 }    
               }, this));
  pipeline.artifact(bucketHeader);
  this.internalFlowLayout_.top += bucketHeader.height() + 5;
};

rhizo.layout.BucketLayout.prototype.cleanup = function(sameEngine, options) {
  this.internalFlowLayout_.cleanup(sameEngine, options);
  return false;
};

rhizo.layout.BucketLayout.prototype.toString = function() {
  return "Buckets";
};


/**
 * Helper class that handles BucketLayout ui controls.
 * @param {rhizo.layout.BucketLayout} layout
 * @param {rhizo.Project} project
 */
rhizo.layout.BucketLayoutUI = function(layout, project) {
  this.layout_ = layout;
  this.project_ = project;
  this.bucketSelector_ = null;
  this.reverseCheckbox_ = null;
};

rhizo.layout.BucketLayoutUI.prototype.renderControls = function() {
  this.bucketSelector_ = rhizo.layout.metaModelKeySelector(
      this.project_, 'rhizo-bucketlayout-bucket').
      change(jQuery.proxy(this.updateState_, this));
  this.reverseCheckbox_ = $('<input type="checkbox" ' +
                            'class="rhizo-bucketlayout-desc" />').
      click(jQuery.proxy(this.updateState_, this));
  return $("<div />").
           append("Group by: ").
           append(this.bucketSelector_).
           append(" desc?").
           append(this.reverseCheckbox_);
};

rhizo.layout.BucketLayoutUI.prototype.setState = function(state) {
  this.bucketSelector_.val(state.bucketBy);
  if (state.reverse) {
    this.reverseCheckbox_.attr('checked', 'checked');
  } else {
    this.reverseCheckbox_.removeAttr('checked');
  }
};

/**
 * Updates the layout state whenever the user modifies the controls.
 * @private
 */
rhizo.layout.BucketLayoutUI.prototype.updateState_ = function() {
  this.layout_.setStateFromUI({
    bucketBy: this.bucketSelector_.val(),
    reverse: this.reverseCheckbox_.is(':checked')
  });
};


/**
 * Enumeration of all available layouts. New layouts should be registered in
 * this enum for Rhizosphere to pick them up.
 */
rhizo.layout.layouts = {
  no: rhizo.layout.NoLayout,
  flow: rhizo.layout.FlowLayout,
  scramble: rhizo.layout.ScrambleLayout,
  bucket: rhizo.layout.BucketLayout
};
/* ./src/js/rhizo.base.js */
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
  if (!this.checkMetaModel_()) {
    return false;
  }
  this.initializeLayoutEngines_();
  return true;
};

rhizo.Project.prototype.initializeLayoutEngines_ = function() {
  this.curLayoutName_ = 'flow'; // default layout engine
  this.layoutEngines_ = {};
  this.renderingPipeline_ = new rhizo.ui.RenderingPipeline(
      this, this.gui_.universe);
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

  // Enable HTML5 history (if requested) and rebuild visualization state
  // (either from defaults or from HTML5 history itself).
  var bindings = [];
  if (this.options_.enableHTML5History) {
    bindings.push(rhizo.state.Bindings.HISTORY);
  }
  var initialStateRebuilt = rhizo.state.getMasterOverlord().attachProject(
      this, bindings);
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

  // Convert all 'kind' specifications that are specified as factories into
  // single instances.
  for (var key in this.metaModel_) {
    var obj_kind = rhizo.meta.objectify(this.metaModel_[key].kind);
    this.metaModel_[key].kind = obj_kind;
  }
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

/**
 * Removes all the unselected models from user view, filtering them out.
 * @return {number} The number of models that have been hidden from view.
 */
rhizo.Project.prototype.filterUnselected = function() {
  var countSelected = 0;
  for (var id in this.selectionMap_) { countSelected++; }
  if (countSelected == 0) {
    this.logger_.error("No items selected");
    return 0;
  }

  var modelsToFilter = [];
  for (var id in this.modelsMap_) {
    if (!(id in this.selectionMap_)) {
      modelsToFilter.push(id);
    }
  }

  this.state_.pushFilterSelectionChange(modelsToFilter);
  this.updateSelectionFilter_(modelsToFilter);
  this.layoutInternal_(this.curLayoutName_, {filter: true, forcealign: true});

  return modelsToFilter.length;
};

/**
 * Restores any models that were filtered out via selection.
 */
rhizo.Project.prototype.resetUnselected = function() {
  var countFiltered = 0;
  for (var i = this.models_.length - 1; i >= 0; i--) {
    if (this.models_[i].isFiltered('__selection__')) {
      countFiltered++;
    }
  }
  if (countFiltered == 0) {
    return;  // Nothing is filtered out because of previous selections.
  }
  this.state_.pushFilterSelectionChange(null);
  this.updateSelectionFilter_(null);
  this.layoutInternal_(this.curLayoutName_, {filter: true, forcealign: true});
};

/**
 * Assigns or removes the selection filter from a set of models.
 *
 * Note that the modelsToFilter set may come from historical visualization
 * state, so it may contain references to model ids that are no longer part of
 * the current visualization.
 *
 * @param {Array.<*>} modelsToFilter Array of ids for all the models that should
 *     be filtered out. If null, no model should be filtered out.
 * @private
 */
rhizo.Project.prototype.updateSelectionFilter_ = function(modelsToFilter) {
  modelsToFilter = modelsToFilter || [];
  if (modelsToFilter.length > 0) {
    var modelsToFilterMap = {}; 
    for (var i = modelsToFilter.length-1; i >= 0; i--) {
      modelsToFilterMap[modelsToFilter[i]] = true;
    }

    // Transfer selection status to a filter.
    for (var i = this.models_.length-1; i >= 0; i--) {
     if (this.models_[i].id in modelsToFilterMap) {
      this.models_[i].filter('__selection__');  // hard-coded filter key.
     } else {
       this.models_[i].resetFilter('__selection__');
     }
    }
    this.unselectAll();
  } else {
    this.resetAllFilter('__selection__');
  }
  // after changing the filter status of some elements, recompute fx settings.
  this.alignFx();
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

/**
 * Verify the models formal correctness, by checking that all the models have
 * an assigned id and no duplicate ids exist.
 * @private
 */
rhizo.Project.prototype.checkModels_ = function() {
  this.logger_.info("Checking models...");
  var uniqueIds = {};
  var missingIds = false;
  var duplicateIds = [];
  for (var i = this.models_.length-1; i >= 0; i--) {
    var id = this.models_[i].id;
    if (!id) {
      missingIds = true;
    } else {
      if (id in uniqueIds) {
        duplicateIds.push(id);
      } else {
        uniqueIds[id] = true;
      }
    }
  }

  if (missingIds) {
    this.logger_.error('Verify your models: missing ids.');
  }
  if (duplicateIds.length > 0) {
    this.logger_.error('Verify your models: duplicate ids (' +
                       duplicateIds.join(',') +
                       ')');
  }

  return !missingIds && duplicateIds.length == 0;
};

/**
 * Verify the metaModel formal correctness, by checking that every metaModel
 * entry has a separate kind instance. MetaModels are stateful, so kinds cannot
 * be shared.
 * @private
 */
rhizo.Project.prototype.checkMetaModel_ = function() {
  var allKinds = [];
  for (var key in this.metaModel_) {
    allKinds.push(this.metaModel_[key].kind);
  }

  // Ensure that there are no share meta instances in the metaModel.
  for (var i = 0; i < allKinds.length; i++) {
    for (var j = i+1; j < allKinds.length; j++) {
      if (allKinds[i] === allKinds[j]) {
        this.logger_.error('Verify your metaModel: shared kind instances.');
        return false;
      }
    }
  }
  return true;
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
  var layoutName = this.curLayoutName_;
  var filter = false;
  var customModelPositions = null;

  // When restoring a full state, all facets should be reverted to their default
  // value. Here we set correct defaults for any facet which might be missing
  // from the full state specification.
  if (!(rhizo.state.Facets.SELECTION_FILTER in state)) {
    state[rhizo.state.Facets.SELECTION_FILTER] = [];
  }
  for (var key in this.metaModel_) {
    var facet = rhizo.state.Facets.FILTER_PREFIX + key;
    if (!(facet in state)) {
      state[facet] = null;
    }
  }

  for (var facet in state) {
    if (facet == rhizo.state.Facets.SELECTION_FILTER) {
      filter = true;
      var filteredModels = state[facet] || [];
      this.updateSelectionFilter_(filteredModels);
      this.alignSelectionUI_(filteredModels.length);
    } else if (facet == rhizo.state.Facets.LAYOUT) {
      var layoutState = state[facet];
      layoutName = layoutState ? layoutState.layoutName : 'flow';
      this.alignLayout_(layoutName, layoutState);
      customModelPositions = layoutState.positions;
    } else if (facet.indexOf(rhizo.state.Facets.FILTER_PREFIX) == 0) {
      filter = true;
      var key = facet.substring(rhizo.state.Facets.FILTER_PREFIX.length);
      var value = state[facet];
      this.alignFilterUI_(key, value);

      // We do not care whether the filter requires a re-layout or not, since
      // layout will happen anyway. This will also purge any greyed-out models.
      this.filterInternal_(key, value);
    }
  }
  this.layoutInternal_(layoutName, {filter: filter, forcealign: true});
  // If the state contained custom model positions, restore them _after_
  // having performed layout.
  if (customModelPositions) {
    this.moveModels_(customModelPositions);
  }
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
  if (facet == rhizo.state.Facets.SELECTION_FILTER) {
    var filteredModels = facetState || [];
    this.updateSelectionFilter_(filteredModels);
    this.alignSelectionUI_(filteredModels.length);
    this.layoutInternal_(this.curLayoutName_,
                         {filter: true, forcealign: true});
  } else if (facet == rhizo.state.Facets.LAYOUT) {
    var layoutName = facetState ? facetState.layoutName : 'flow';
    this.alignLayout_(layoutName, facetState);
    this.layoutInternal_(layoutName);
    if (facetState && facetState.positions) {
      this.moveModels_(facetState.positions);
    }
  } else if (facet.indexOf(rhizo.state.Facets.FILTER_PREFIX) == 0) {
    var key = facet.substring(rhizo.state.Facets.FILTER_PREFIX.length);
    this.alignFilterUI_ (key, facetState);
    if (this.filterInternal_(key, facetState)) {
      // The filtering status of some models was affected by the filter.
      // Decide whether we need to reposition all models, or we can just grey
      // out the affected ones, without affecting layout.
      if (this.mustLayoutAfterFilter_()) {
        this.commitFilter();
      } else {
        this.alignVisibility_(rhizo.ui.Visibility.GREY);
      }
    }
  }
};

/**
 * Notifies the project that a set of models has been explicitly moved by the
 * user to a different position.
 *
 * @param {Array.<*>} positions An array of all model positions that changed.
 *     Each entry is a key-value map with the following properties: 'id', the
 *     id of the model that moved, 'top': the ending top coordinate of the
 *     top-left model corner with respect to the visualization universe,
 *     'left', the ending left coordinate of the top-left model corner with
 *     respect to the visualization universe.
 */
rhizo.Project.prototype.modelsMoved = function(positions) {
  var layoutState = null;
  if (this.layoutEngines_[this.curLayoutName_].getState) {
    layoutState = this.layoutEngines_[this.curLayoutName_].getState();
  }
  this.state_.pushLayoutChange(this.curLayoutName_, layoutState, positions);
};

/**
 * Moves a set of models to the requested positions.
 *
 * @param {Array.<*>} positions An array of all model positions that changed.
 *     See modelsMoved() for the expected format of the array entries.
 * @private
 */
rhizo.Project.prototype.moveModels_ = function(positions) {
  for (var i = positions.length-1; i >= 0; i--) {
    if (positions[i].id in this.modelsMap_) {
      this.modelsMap_[positions[i].id].rendering().move(
          positions[i].top, positions[i].left);
    }
  }
};

/**
 * Re-arranges the disposition of the project models according to the
 * requested layout algorithm.
 *
 * @param {?string} opt_layoutEngineName The name of the layout engine to use.
 *     If undefined, the last known engine will be used.
 * @param {*} opt_state The state the layout should be set to. The layout state
 *     describes the set of layout-specific parameters. If undefined, the
 *     current (possibly default) state the layout has will be used.
 * @param {*} opt_options An optional key-value map of layout directives.
 *    Currently supported ones include:
 *    - 'filter' (boolean): Whether this layout operation is invoked as a result
 *      of a filter being applied.
 *    - 'forcealign' (boolean): Whether models' visibility should be synced at
 *      the end of the layout operation.
 * @return {boolean} Whether the layout operation completed successfully.
 */
rhizo.Project.prototype.layout = function(opt_layoutEngineName,
                                          opt_state,
                                          opt_options) {
  if (opt_layoutEngineName) {
    if (!(opt_layoutEngineName in this.layoutEngines_)) {
      this.logger_.error("Invalid layout engine:" + opt_layoutEngineName);
      return false;
    }
  }

  var layoutName = opt_layoutEngineName || this.curLayoutName_;
  var layoutEngine = this.layoutEngines_[layoutName];

  var layoutState = null;
  if (opt_state) {
    if (!this.alignLayout_(layoutName, opt_state)) {
      this.logger_.error('Received invalid layout state');
      return false;
    }
    layoutState = opt_state;
  } else if (layoutEngine.getState) {
    layoutState = layoutEngine.getState();
  }
  this.state_.pushLayoutChange(layoutName, layoutState);
  this.layoutInternal_(opt_layoutEngineName || this.curLayoutName_,
                       opt_options);
  return true;
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

  this.renderingPipeline_.cleanup();
  if (lastLayoutEngine != layoutEngine) {
    // Restore all models to their original sizes and styles, if we are moving
    // to a different layout engine.
    this.renderingPipeline_.backupManager().restoreAll();
  }

  this.logger_.info('laying out...');

  // reset panning
  this.gui_.universe.move(0, 0, {'bottom': 0, 'right': 0});

  // layout only non filtered models
  var freeModels = jQuery.grep(this.models_, function(model) {
    return model.isAvailableForLayout();
  });

  var boundingLayoutBox = new rhizo.layout.LayoutBox(
      this.gui_.viewport, this.options_.layoutConstraints);
  dirty = layoutEngine.layout(this.renderingPipeline_,
                              boundingLayoutBox,
                              freeModels,
                              this.modelsMap_,
                              this.metaModel_,
                              options) || dirty;
  var resultLayoutBox = this.renderingPipeline_.apply();
  this.gui_.universe.css({
      'width': Math.max(resultLayoutBox.width + resultLayoutBox.left,
                        this.gui_.viewport.width()),
      'height': Math.max(resultLayoutBox.height + resultLayoutBox.top,
                         this.gui_.viewport.height())}).
      move(0, 0);
  if (dirty || options.forcealign) {
    this.alignVisibility_();
  }
};

/**
 * Applies or removes a filter to the visualization, removing from view (or
 * restoring) all the models that do not survive the filter.
 *
 * @param {string} key The metamodel key for the model attribute that is to
 *     filter.
 * @param {*} value The value that each model must have on the attribute
 *     specified by 'key' in order not to be removed. To remove a previously
 *     set filter, set value to null or undefined.
 */
rhizo.Project.prototype.filter = function(key, value) {
  if (this.filterInternal_(key, value)) {
    this.state_.pushFilterChange(key, value);
    // The filtering status of some models was affected by the filter.
    // Decide whether we need to reposition all models, or we can just grey
    // out the affected ones, without affecting layout.
    if (this.mustLayoutAfterFilter_()) {
      this.commitFilter();
    } else {
      this.alignVisibility_(rhizo.ui.Visibility.GREY);
    }
  }
};

/**
 * Changes the filtering status of models because of a change in a filter
 * value.
 * @param {string} key The metamodel key for the model attribute that was
 *     filtered.
 * @param {*} value The filter value. Should be null or undefined when the
 *     filter is to be removed.
 * @return {boolean} Whether the filter status of some models was affected by
 *     this new filter value.
 * @private
 */
rhizo.Project.prototype.filterInternal_ = function(key, value) {
  if (!(key in this.metaModel_)) {
    // This may occur whenever we are applying a filter loaded from an
    // historical state, but which no longer exists in the current
    // visualization.
    return false;
  }
  if (value) {
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
      return false;  // no models had the filter, nothing to re-align, return early.
    }
  }
  this.alignFx();
  return true;
};

/**
 * Decides whether models should be repositioned after a filter was applied.
 * This may be necessary either because the filters are in autocommit mode, or
 * because the filter change caused some models that were completely hidden
 * to become visible (hence all the models must be repositioned to accomodate
 * these ones).
 *
 * @return {boolean} Whether models should be repositioned after a filter was
 *     applied, or it's enough to align their visibility.
 * @private
 */
rhizo.Project.prototype.mustLayoutAfterFilter_ = function() {
  if (this.filterAutocommit_) {
    return true;
  } else {
    for (var i = this.models_.length-1; i >=0; i--) {
      if (!this.models_[i].isFiltered() &&
          this.models_[i].rendering().visibility ==
              rhizo.ui.Visibility.HIDDEN) {
        return true;
      }
    }
    return false;
  }
};

rhizo.Project.prototype.commitFilter = function() {
  this.layoutInternal_(this.curLayoutName_, {filter: true, forcealign: true});
};

/**
 * Updates the UI and state of the layout engine to match the requested one.
 *
 * The layout selector component, if available, is updated to match the
 * currently selected layout engine. The layout engine itself receives the
 * updated state (which in turn triggers the update of layout UI controls).
 *
 * @param {string} layoutName The currently selected layout engine.
 * @param {*} layoutState The layout state, as returned from its getState()
 *     method.
 * @return {boolean} Whether the operation was successful or errors occurred
 *     because of a malformed input layoutState.
 * @private
 */
rhizo.Project.prototype.alignLayout_ = function(layoutName, layoutState) {
  var success = true;
  if (this.layoutEngines_[layoutName].setState) {
    success = this.layoutEngines_[layoutName].setState(layoutState);
  }
  if (success) {
    var ui = this.gui_.getComponent('rhizo.ui.component.Layout');
    if (ui) {
      ui.setEngine(layoutName);
    }
  }
  return success;
};

/**
 * Updates the visualization UI to match the current selection status.
 * @param {number} numFilteredModels The number of models that have been
 *     filtered out as a result of selection operations.
 * @private
 */
rhizo.Project.prototype.alignSelectionUI_ = function(numFilteredModels) {
  var ui = this.gui_.getComponent('rhizo.ui.component.SelectionManager');
  if (ui) {
    ui.setNumFilteredModels(numFilteredModels);
  }
};

/**
 * Updates the visualization UI to match the a given filter status.
 * @param {string} key The metamodel key whose associated filter is to restore
 *     to a given value.
 * @param {*} value The value the filter should be set to. The actual value type
 *     matches what the filter itself initially provided to the Project when
 *     project.filter() was called.
 * @private
 */
rhizo.Project.prototype.alignFilterUI_ = function(key, value) {
  // Verify whether the filter key (which may come from an historical state)
  // still exists in the metaModel.
  if (key in this.metaModel_) {
    var filterUiExists = true;

    // Rebuild and show the affected filter, if needed.
    var ui = this.gui_.getComponent('rhizo.ui.component.FilterStackContainer');
    if (ui) {
      // A filter is explicitly made visible only if it's not in its default
      // non-filtering state (i.e., it has a non-null value).
      if (value) {
        ui.showFilter(key);
      }
      filterUiExists = ui.isFilterActive(key);
    }

    // Restore the filter value, if the filter currently has an UI
    // representation.
    if (filterUiExists) {
      this.metaModel_[key].kind.setFilterValue(value);
    }
  }
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
  this.gui_.disableFx(!this.options_.enableAnims ||
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
/* ./src/js/rhizo.layout.tree.js */
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

/*
  The whole TreeLayout depends on the following classes:
  - TreeLayout: the layout itself. It builds the tree structure out of the
    supermodels and, for every root found, draws a tree. Trees are stacked from
    left to right, top to bottom, hence this class uses the 'traditional' set of
    positioning coordinates (top, left, width, height).

  - TreeLayoutUI: Helper class to manage layout UI controls.

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
 * Helper class that handles TreeLayout ui controls.
 * @param {rhizo.layout.TReeLayout} layout
 * @param {rhizo.Project} project
 */
rhizo.layout.TreeLayoutUI = function(layout, project) {
  this.layout_ = layout;
  this.project_ = project;

  this.directionSelector_ = null;
  this.metaModelKeySelector_ = null;
};

rhizo.layout.TreeLayoutUI.prototype.renderControls = function() {
  var parentKeys = this.getParentKeys_();
  var details = $("<div />");
  if (parentKeys.length == 0) {
    // should never happen because of verifyMetaModel
    details.append("No parent-child relationships exist");
    return details;
  }

  details.append(" arrange ");
  this.directionSelector_ = $("<select class='rhizo-treelayout-direction' />");
  this.directionSelector_.append("<option value='hor'>Horizontally</option>");
  this.directionSelector_.append("<option value='ver'>Vertically</option>");
  this.directionSelector_.change(jQuery.proxy(this.updateState_, this));
  details.append(this.directionSelector_);

  if (parentKeys.length > 1) {
    this.metaModelKeySelector_ = rhizo.layout.metaModelKeySelector(
        this.project_,
        'rhizo-treelayout-parentKey',
        rhizo.layout.parentMatcher);
    this.metaModelKeySelector_.change(jQuery.proxy(this.updateState_, this));
    details.append(" by ").append(this.metaModelKeySelector_);
  } else if (parentKeys.length == 1) {
    this.metaModelKeySelector_ =
        $("<input type='hidden' />").val(parentKeys[0]);
  }
  return details;
};

/**
 * @return {Array.<string>} The list of all metamodel keys which can be used
 *     to arrange models in a tree structure (i.e., the point to parent-child
 *     relationships).
 * @private
 */
rhizo.layout.TreeLayoutUI.prototype.getParentKeys_ = function() {
  var parentKeys = [];
  for (var key in this.project_.metaModel()) {
    if (rhizo.layout.parentMatcher(key, this.project_.metaModel()[key])) {
      parentKeys.push(key);
    }
  }
  return parentKeys;
};

rhizo.layout.TreeLayoutUI.prototype.setState = function(state) {
  this.directionSelector_.val(state.direction);
  if (this.metaModelKeySelector_) {
    this.metaModelKeySelector_.val(state.parentKey);
  }
};

/**
 * Updates the layout state whenever the user modifies the controls.
 * @private
 */
rhizo.layout.TreeLayoutUI.prototype.updateState_ = function() {
  var state = {
    direction: this.directionSelector_.val()
  };
  if (this.metaModelKeySelector_) {
    state.parentKey = this.metaModelKeySelector_.val();
  }
  this.layout_.setStateFromUI(state);
};


/**
 * A layout that arranges models in a tree structure.
 *
 * @param {rhizo.Project} project
 * @constructor
 */
rhizo.layout.TreeLayout = function(project) {
  this.project_ = project;

  /**
   * Map that accumulates all the nodes matching the models being laid out.
   * @type {Object.<string, rhizo.layout.TreeNode>}
   * @private
   */
  this.globalNodesMap_ = null;
  rhizo.layout.GUILayout.call(this, project,
                              new rhizo.layout.TreeLayoutUI(this, project));
};
rhizo.inherits(rhizo.layout.TreeLayout, rhizo.layout.GUILayout);


/**
 * Verifies whether this layout can be used, given the project metamodel.
 * The project metamodel must define at least one model attribute that specifies
 * parent-child relationships, so that trees can be built.
 *
 * @param {*} meta The project metamodel.
 */
rhizo.layout.TreeLayout.prototype.verifyMetaModel = function(meta) {
  for (var key in meta) {
    if (rhizo.layout.parentMatcher(key, meta[key])) {
      return true;
    }
  }
  return false;
};

/**
 * @private
 */
rhizo.layout.TreeLayout.prototype.defaultState_ = function() {
  return {
    direction: 'ver',
    parentKey : rhizo.layout.firstMetamodelKey(
        this.project_, rhizo.layout.parentMatcher)
  };
};

/**
 * Validates a layout state. A valid state must have a 'parentKey' property
 * pointing to the metamodel key that contains parent-child relationships to
 * create the layout tree.
 *
 * @param {*} otherState
 * @private
 */
rhizo.layout.TreeLayout.prototype.validateState_ = function(otherState) {
  return this.validateStateAttributePresence_(otherState, 'parentKey') &&
         this.validateMetamodelPresence_(
             otherState.parentKey, rhizo.layout.parentMatcher);
};

/**
 * Lays out models.
 *
 * @param {rhizo.ui.RenderingPipeline} pipeline The pipeline that
 *     accumulates all the layout operations to perform as part of this layout
 *     request.
 * @param {rhizo.layout.LayoutBox} layoutBox The bounding rectangle inside which
 *     the layout should occur.
 * @param {Array.<rhizo.model.SuperModel>} supermodels List of the SuperModels
 *     that will participate in the layout.
 * @param {Object.<*, rhizo.model.SuperModel>} allmodels A map of all
 *     visualization models, mapping from the model id the associated SuperModel
 *     instance.
 * @param {*} meta The project metamodel.
 * @param {*} options The composition of project-wide configuration options and
 *     layout-specific ones.
 */
rhizo.layout.TreeLayout.prototype.layout = function(pipeline,
                                                    layoutBox,
                                                    supermodels,
                                                    allmodels,
                                                    meta,
                                                    options) {
  var parentKey = this.getState().parentKey;
  this.project_.logger().info("Creating tree by " + parentKey);

  // detect rendering direction
  var vertical = this.getState().direction == 'ver';
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
      if (drawingOffset.left + boundingRect.w > layoutBox.width) {
        drawingOffset.left = 0;
        drawingOffset.top += maxHeight + (maxHeight > 0 ? 5 : 0);
      }

      // Flip the drawing offset back into the gd-od coordinate set
      // and draw the tree.
      this.treePainter_.draw_(
          pipeline, roots[id],
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

rhizo.layout.TreeLayout.prototype.toString = function() {
  return "Tree";
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
};

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

  var dims = treenode.renderingDimensions();

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
rhizo.layout.TreePainter.prototype.draw_ = function(pipeline,
                                                    treenode,
                                                    offset,
                                                    parentOffset,
                                                    parentNode) {
  var dims = treenode.renderingDimensions();

  // vertical layout stacks items from the top, while the horizontal layout
  // keeps the tree center aligned.
  if (this.vertical_) {
    pipeline.move(treenode.superModel.id, offset.gd + 5, offset.od);

    // draw connector if needed
    if (parentOffset != null) {
      this.drawConnector_(pipeline,
        this.packedCenter_(offset, dims),
        this.packedCenter_(parentOffset,
                           parentNode.renderingDimensions()));
    }
  } else {
    pipeline.move(
        treenode.superModel.id,
        offset.od + 5,
        offset.gd + (treenode.boundingRect.gd - this.gd_(dims))/2);

    // draw connector if needed
    if (parentOffset != null) {
      this.drawConnector_(pipeline,
        this.evenCenter_(offset, dims, treenode.boundingRect),
        this.evenCenter_(parentOffset,
                         parentNode.renderingDimensions(),
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
    this.draw_(pipeline, childNode, childOffset, offset, treenode);
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
rhizo.layout.TreePainter.prototype.drawConnector_ = function(pipeline,
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

  pipeline.artifact(gdconnector);
  pipeline.artifact(odconnector);
};


// register the treelayout in the global layouts list
rhizo.layout.layouts.tree = rhizo.layout.TreeLayout;
/* ./src/js/rhizo.ui.component.js */
/*
  Copyright 2009 The Rhizosphere Authors. All Rights Reserved.

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

/**
 * === Components and Templates
 *
 * This file contains the building blocks of the Rhizosphere UI:
 *
 * = Components:
 *   a Component is a single UI control (e.g. the layout selector or the filters
 *   container) that can be plugged into the Rhizosphere UI.
 *
 *   Components follow a simple lifecycle that mimics the loading phase of a
 *   Rhizosphere visualization:
 *   - initialization
 *   - render: Only the static aspects of the visualization are available at
 *     this point. The component defines its html skeleton.
 *   - metaReady: The component can use information about the visualization
 *     metamodel and renderer.
 *   - ready: The visualization is fully loaded, including models, and ready
 *     to use.
 *
 *   The lifecycle can terminate early if the visualization input is malformed.
 *   Components should provide an interface as functional as possible for
 *   each lifecycle state.
 *
 * = Containers:
 *   an extension of Component that allows the container to include other
 *   components within itself.
 *
 * = Templates
 *   a Template is a specialized Container that defines an entire Rhizosphere
 *   UI. It extends Container by ensuring that the visualization has a Viewport
 *   (which is the only mandatory part of a visualization) and includes extra
 *   features like UI feedback of the loading sequence.
 *
 *   Every visualization has a template attached to it. Every template should
 *   inherit from the rhizo.ui.component.Template base class.
 *
 * New templates can be registered by adding a factory method to the
 * rhizo.ui.component.templates enumeration.
 */

// RHIZODEP=rhizo.ui,rhizo.layout
// Components Namespace
namespace("rhizo.ui.component");


/**
 * Progress-bar to handle visualization startup feedback.
 * @constructor
 */
rhizo.ui.component.Progress = function() {};

/**
 * Initializes and renders the progress bar.
 * @param {*} container jQuery object pointing to the element to which add the
 *   progress bar.
 */
rhizo.ui.component.Progress.prototype.render = function(container) {
  this.pbarPanel_ = $('<div/>', {'class': 'rhizo-progressbar-panel'}).
      appendTo(container);

  // center the progress bar.
  this.pbarPanel_.css({
    'top': Math.round((container.height() - this.pbarPanel_.height()) / 2),
    'left': Math.round((container.width() - this.pbarPanel_.width()) / 2)
  });
  var pbar = $('<div/>', {'class': 'rhizo-progressbar'}).
      appendTo(this.pbarPanel_);
  this.pbar_ = pbar.progressbar({value: 1});
  this.pbarText_ = $('<div/>', {'class': 'rhizo-progressbar-text'}).
      text('Loading...').
      appendTo(this.pbarPanel_);
};

/**
 * Updates the progress bar to a new value.
 * @param {number} value The new value to set. If greater or equal than 100, the
 *     task is assumed to be completed and the progressbar is removed.
 * @param {?string} opt_text An optional descriptive text to describe the
 *     current status.
 */
rhizo.ui.component.Progress.prototype.update = function(value, opt_text) {
  this.pbar_.progressbar('value', value);
  if (opt_text) {
    this.pbarText_.text(opt_text);
  }
  if (value >= 100) {
    this.destroy_();
  }
};

/**
 * Destroys the progress bar.
 * @private
 */
rhizo.ui.component.Progress.prototype.destroy_ = function() {
  if (this.pbarPanel_.is(':visible')) {
    setTimeout(jQuery.proxy(function() {
      this.pbarPanel_.fadeOut(function() {
        $(this).remove();
      });
    }, this), 1000);
  } else {
    this.pbarPanel_.remove();
  }
};


/* ==== Events and other enums ==== */

/**
 * Enumeration of the types of events that components can fire to each other.
 * @enum {string}
 */
rhizo.ui.component.EventType = {
  ACTIVATE: 'activate',  // the component has been activated.
  DEACTIVATE: 'deactivate'  // the component has been deactivated.
};


/**
 * Enumeration of the phases of a component lifecycle.
 * @enum {number}
 */
rhizo.ui.component.Phase = {
  INIT: 0,
  RENDER: 1,
  METAREADY: 2,
  READY: 3
};


/* ==== Component, Container, Template definition ==== */


/**
 * Defines a Component, the basic building block of the Rhizosphere UI.
 *
 * @param {rhizo.Project} project The project this component belongs to.
 * @param {*} options Project-wide configuration options
 * @param {?string} opt_key Optional key the component will use to register
 *     itself with the project GUI.
 * @constructor
 */
rhizo.ui.component.Component = function(project, options, opt_key) {
  this.project_ = project;
  this.gui_ = project.gui();
  this.options_ = options;

  this.key_ = opt_key;
  if (opt_key) {
    this.gui_.addComponent(opt_key, this);
  }
};

/**
 * @return {?string} The registration key of this component, if any. The
 *     registration key can be used to uniquely identify this component
 *     among all the ones registered with the project GUI.
 */
rhizo.ui.component.Component.prototype.key = function() {
  return this.key_;
};

/**
 * @return {?string} The component title, if defined. Subclasses should
 *     override. The containing template or container can use this information
 *     to visually separate this component from others.
 */
rhizo.ui.component.Component.prototype.title = function() {
  return null;
};

/**
 * @return {?string} The CSS class to assign to the component title. Subclasses
 *     should override.
 */
rhizo.ui.component.Component.prototype.titleClass = function() {
  return null;
};

/**
 * Callback method whenever an event that affects the component occurs.
 * Subclasses should override.
 * @param {rhizo.ui.component.EventType} evt The type of event that occurred.
 */
rhizo.ui.component.Component.prototype.onEvent = function(evt) {};

/**
 * Renders the component. Subclasses should override to define the HTML
 * skeleton of the component.
 *
 * When this method is invoked, only static information about the visualization
 * are known. The project models, metamodel and renderer are not defined yet.
 *
 * Components should define their entire HTML structure here, and activate it
 * in later phases (metaReady, ready) depending on the minimum information
 * needed to proceed.
 *
 * @return {Array.<HTMLElement>|HTMLElement} The set of elements (can be one
 *     or more) that define the component structure.
 */
rhizo.ui.component.Component.prototype.render = function() {
  return $('<div />').get(0);
};

/**
 * Callback method that notifies that the project metamodel and renderer are
 * now known. Subclasses should extend to enrich the component with
 * functionality that depends on the metamodel and renderer presence.
 */
rhizo.ui.component.Component.prototype.metaReady = function() {};

/**
 * Callback method that notifies that the visualization this component belongs
 * to is now ready and fully usable.
 * Subclasses should extend to fully activate the component UI and/or to
 * trigger functionality that requires the visualization to be fully loaded.
 */
rhizo.ui.component.Component.prototype.ready = function() {};


/**
 * A Container is a specialized component that can contain other components
 * within itself.
 *
 * @param {rhizo.Project} project The project this container belongs to.
 * @param {*} options Project-wide configuration options
 * @param {?string} opt_key Optional key the container will use to register
 *     itself with the project GUI.
 * @constructor
 */
rhizo.ui.component.Container = function(project, options, opt_key) {
  rhizo.ui.component.Component.call(this, project, options, opt_key);
  this.components_ = [];
  this.phase_ = rhizo.ui.component.Phase.INIT;
};
rhizo.inherits(rhizo.ui.component.Container, rhizo.ui.component.Component);

/**
 * Adds a component to this container. A component can be added to the container
 * during any phase of the container lifecycle (even when the container has been
 * made ready and the visualization is fully usable).
 *
 * @param {rhizo.ui.component.Component} component The component to add.
 * @param {number} opt_position The optional position in the sequence of
 *     components where the new one should be inserted. Follows the same rules
 *     as Array.prototype.splice.
 * @return {Array.<HTMLElement>|HTMLElement} The set of elements (can be one or
 *     more) that the newly added component generated. This is not null only if
 *     the component was added after the container already rendered its
 *     contents.
 */
rhizo.ui.component.Container.prototype.addComponent = function(component,
                                                               opt_position) {
  if (opt_position) {
    this.components_.splice(opt_position, 0, component);
  } else {
    this.components_.push(component);    
  }

  if (opt_position < 0) {
    opt_position = this.components_.length - 1 + opt_position;
  }

  // Catch up with the missing lifecycle steps if the component is added late
  // in the game.
  var new_renderings = null;
  switch(this.phase_) {
    case rhizo.ui.component.Phase.INIT:
      break;
    case rhizo.ui.component.Phase.RENDER:
      new_renderings = this.renderSingleComponent(component, opt_position);
      break;
    case rhizo.ui.component.Phase.METAREADY:
      new_renderings = this.renderSingleComponent(component, opt_position);
      component.metaReady();
      break;
    case rhizo.ui.component.Phase.READY:
      new_renderings = this.renderSingleComponent(component, opt_position);
      component.metaReady();
      component.ready();
    default:
      break;
  }

  // Return any new HTML elements that were created, for the upstream container
  // to properly attach them to the visualization.
  return new_renderings;
};

/**
 * @return {Array.<rhizo.ui.component.Component>} Returns the list of components
 *     that are contained within this container.
 */
rhizo.ui.component.Container.prototype.getComponents = function() {
  return this.components_;
};

/**
 * @return {rihzo.ui.component.Phase} The lifecycle phase the container is
 *     currently in.
 */
rhizo.ui.component.Container.prototype.phase = function() {
  return this.phase_;
};

/**
 * Renders the container and iteratively renders all the components contained
 * within. Deletages to renderContainer() and renderSingleComponent() methods
 * that subclasses should implement.
 *
 * @return {Array.<HTMLElement>|HTMLElement} The set of elements (can be one
 *     or more) that define the container structure.
 */
rhizo.ui.component.Container.prototype.render = function() {
  this.phase_ = rhizo.ui.component.Phase.RENDER;
  var all_renderings = [];
  this.appendRendering_(this.renderContainer(), all_renderings);
  for (var i = 0; i < this.components_.length; i++) {
    this.appendRendering_(this.renderSingleComponent(this.components_[i], i),
                          all_renderings);
  }
  return all_renderings;
};

/**
 * Adds a single rendering to the list of all renderings that will be returned
 * by render().
 * 
 * @param {?Array.<HTMLElement>|HTMLElement} rendering
 * @param {Array.<HTMLElement>} all_renderings
 * @private
 */
rhizo.ui.component.Container.prototype.appendRendering_ = function(
    rendering, all_renderings) {
  if (!rendering) {
    return;
  }
  if (jQuery.isArray(rendering)) {
    Array.prototype.push.apply(all_renderings, rendering);
  } else {
    all_renderings.push(rendering);
  }
};

/**
 * Renders the container itself. Subclasses should override this method.
 * @return {Array.<HTMLElement>|HTMLElement} The set of elements (can be one
 *     or more) that define the container itself.
 */
rhizo.ui.component.Container.prototype.renderContainer = function() {
  return null;
};

/**
 * Renders a single component within the container.
 * @param {rhizo.ui.component.Component} component The component to render.
 * @param {?number} opt_position The position of the component being rendered
 *     in the sequence of components part of this container. Guaranteed to be
 *     greater or equal to 0.
 * @return {Array.<HTMLElement>|HTMLElement} The set of elements (can be one
 *     or more) that define the given component and should be attached to the
 *     visualization DOM, unless they're explicity attached within this method.
 */
rhizo.ui.component.Container.prototype.renderSingleComponent = function(
    component, opt_position) {
  return null;
};

/**
 * Dispatches the notification that the project metamodel and renderer are now
 * known to all the components managed by this container.
 */
rhizo.ui.component.Container.prototype.metaReady = function() {
  this.phase_ = rhizo.ui.component.Phase.METAREADY;
  var components = this.getComponents();
  for (var i = 0; i < components.length; i++) {
    components[i].metaReady();
  }
};

/**
 * Dispatches the notification the visualization is now ready to all the
 * components managed by this container.
 */
rhizo.ui.component.Container.prototype.ready = function() {
  this.phase_ = rhizo.ui.component.Phase.READY;
  var components = this.getComponents();
  for (var i = 0; i < components.length; i++) {
    components[i].ready();
  }
};


/**
 * Base class to define Rhizosphere UI templates. A Template is a specialized
 * Container with the additional knowledge of the project Viewport (the only
 * mandatory part of a Rhizosphere visualization).
 *
 * A template will always include a rhizo.ui.component.Viewport instance.
 *
 * A template follows the same rendering sequence of containers and components.
 * Additional components can be added to the template, even after it has been
 * made live, via the addComponent() method.
 *
 * A template can notify an external component about the state of the
 * initialization process. By default a rhizo.ui.component.Progress progressbar
 * is used, but it can be customized via setProgressHandler().
 *
 * @param {rhizo.Project} project The project this template belongs to.
 * @param {*} options Project-wide configuration options
 * @param {?string} template_key A unique key that identifies the template.
 *     Generates a CSS class name that can be used for template-specific UI
 *     skinning.
 * @constructor
 */
rhizo.ui.component.Template = function(project, options, template_key) {
  rhizo.ui.component.Container.call(this, project, options, template_key);

  this.viewport_ = new rhizo.ui.component.Viewport(project, options);
  this.progress_ = new rhizo.ui.component.Progress();
};
rhizo.inherits(rhizo.ui.component.Template, rhizo.ui.component.Container);

/**
 * Sets the progress handler, that will receive notifications about the
 * template initialization sequence.
 *
 * @param {*} progress An object that responds to the render(container) and
 *     update(value, message) functions. See rhizo.ui.component.Progress for
 *     an example on how to create a progress handler.
 *     Set to null to disable progress reporting altogether.
 */
rhizo.ui.component.Template.prototype.setProgressHandler = function(progress) {
  this.progress_ = progress;
};

/**
 * Adds a component to this template.
 * @param {rhizo.ui.component.Component} component The component to add
 */
rhizo.ui.component.Template.prototype.addComponent = function(component) {
  var new_renderings = rhizo.ui.component.Container.prototype.addComponent.call(
      this, component);
  if (new_renderings) {
    this.gui_.container.append(new_renderings);
  }
};

/**
 * Renders the template. Unlike the vanilla container rendering, the template
 * does not create its containing HTML element, but instead it populates the
 * project GUI container.
 *
 * @return {HTMLElement} The project GUI container, filled with the template
 *     contents.
 */
rhizo.ui.component.Template.prototype.render = function() {
  var all_renderings = rhizo.ui.component.Container.prototype.render.call(this);
  if (this.progress_) {
    this.progress_.update(20, 'Chrome created. Loading metadata...');
  }
  return all_renderings;
};

rhizo.ui.component.Template.prototype.renderContainer = function() {
  this.gui_.container.addClass('rhizo-template-' + this.key());
  this.gui_.container.append(this.viewport_.render());
  if (this.progress_) {
    this.progress_.render(this.gui_.viewport);
  }
  return this.gui_.container.get(0);
};

rhizo.ui.component.Template.prototype.renderSingleComponent = function(
    component) {
  this.gui_.container.append(component.render());
  return null;  // The rendering has already been appened to the container.
};

rhizo.ui.component.Template.prototype.metaReady = function() {
  if (this.progress_) {
    this.progress_.update(40, 'Metadata loaded. Updating components...');
  }
  this.viewport_.metaReady();
  rhizo.ui.component.Container.prototype.metaReady.call(this);
  if (this.progress_) {
    this.progress_.update(60, 'Components updated. Loading models...');
  }
};

rhizo.ui.component.Template.prototype.ready = function() {
  if (this.progress_) {
    this.progress_.update(80, 'Models loaded. Activating UI...');
  }
  this.viewport_.ready();
  rhizo.ui.component.Container.prototype.ready.call(this);
  if (this.progress_) {
    this.progress_.update(100, 'Rhizosphere ready!');
  }
};


/* ==== Specialized containers ==== */

/**
 * A vertical box container. It renders all the components contained within in
 * a linear fashion, prepending each component with an header containing its
 * title (if the component defined one).
 *
 * @param {rhizo.Project} project The project this box belongs to.
 * @param {*} options Project-wide configuration options
 * @param {?string} opt_key Optional key the box will use to register
 *     itself with the project GUI.
 * @param {string} boxclass The CSS class assigned to the box.
 * @constructor
 */
rhizo.ui.component.VBox = function(project, options, opt_key, boxclass) {
  rhizo.ui.component.Container.call(this, project, options, opt_key);
  this.boxclass_ = boxclass;
  this.panel_ = null;
};
rhizo.inherits(rhizo.ui.component.VBox, rhizo.ui.component.Container);

rhizo.ui.component.VBox.prototype.renderContainer = function() {
  this.panel_ = $('<div />', {'class': this.boxclass_});
  return this.panel_.get(0);
};

rhizo.ui.component.VBox.prototype.renderSingleComponent = function(component) {
  var title = component.title();
  if (title) {
    var titleClass = 'rhizo-section-header';
    if (component.titleClass()) {
      titleClass += ' ' + component.titleClass();
    }
    var titleEl = $('<div />', {'class': titleClass}).
      text(title).
      appendTo(this.panel_);
  }
  this.panel_.append(component.render());
  return null;  // rendering has been appended to the panel itself.
};


/**
 * A collapsible box sitting on the right of the viewport.
 *
 * @param {rhizo.Project} project The project this box belongs to.
 * @param {*} options Project-wide configuration options
 * @param {?string} opt_key Optional key the box will use to register
 *     itself with the project GUI.
 * @param {string} boxclass The CSS class assigned to the box.
 * @constructor
 */
rhizo.ui.component.RightBar = function(project, options, opt_key, boxclass) {
  rhizo.ui.component.Container.call(this, project, options, opt_key);
  this.boxclass_ = boxclass;
};
rhizo.inherits(rhizo.ui.component.RightBar, rhizo.ui.component.Container);

rhizo.ui.component.RightBar.prototype.renderContainer = function() {
  this.toggle_ = $('<div />', {'class': 'rhizo-right-pop'}).html('&#x25c2;');
  this.rightBar_ = $('<div />', {'class': this.boxclass_}).
      css('display', 'none');
  this.activateToggle_();
  return [this.rightBar_.get(0), this.toggle_.get(0)];
};

rhizo.ui.component.RightBar.prototype.renderSingleComponent = function(
    component) {
  var title = component.title();
  if (title) {
    var titleClass = 'rhizo-section-header';
    if (component.titleClass()) {
      titleClass += ' ' + component.titleClass();
    }
    var titleEl = $('<div />', {'class': titleClass}).
      text(title).
      appendTo(this.rightBar_);
  }
  this.rightBar_.append(component.render());  
  return null;  // rendering has been appended to the rightBar directly.
};

/**
 * Activates the controls that toggles the collapsed status of the box.
 * @private
 */
rhizo.ui.component.RightBar.prototype.activateToggle_ = function() {
  this.toggle_.click(jQuery.proxy(function() {
    if (this.rightBar_.is(":visible")) {
      this.toggle_.css('right', 0).html('&#x25c2;');
      this.gui_.viewport.css('right', 5);
      this.rightBar_.css('display', 'none');
    } else {
      this.gui_.viewport.css('right', 135);
      this.toggle_.css('right', 130).html('&#x25b8;');
      this.rightBar_.css('display', '');
    }
  }, this));
};

/**
 * @return {*} The jQuery object pointing to the control that toggles the
 *     collapsed status of the box.
 */
rhizo.ui.component.RightBar.prototype.getToggle = function() {
  return this.toggle_;
};

/**
 * @return {boolean} Whether the box is currently in its collapsed status or
 *     not.
 */
rhizo.ui.component.RightBar.prototype.isCollapsed = function() {
  return this.rightBar_.is(':visible');
};


/**
 * An horizontal bar that cointains links to activate other components, which
 * will be displayed as floating panels above the links bar.
 * 
 * @param {rhizo.Project} project The project this box belongs to.
 * @param {*} options Project-wide configuration options
 * @param {?string} opt_key Optional key the box will use to register
 *     itself with the project GUI.
 * @param {string} boxclass The CSS class assigned to the box.
 * @constructor
 */
rhizo.ui.component.HBox = function(project, options, opt_key, boxclass) {
  rhizo.ui.component.Container.call(this, project, options, opt_key, boxclass);
  this.toggles_ = [];
  this.boxclass_ = boxclass;
};
rhizo.inherits(rhizo.ui.component.HBox, rhizo.ui.component.Container);

rhizo.ui.component.HBox.prototype.renderContainer = function() {
  this.bar_ = $('<div />', {'class': this.boxclass_});
  return this.bar_.get(0);
};

rhizo.ui.component.HBox.prototype.renderSingleComponent = function(
    component, opt_position) {
  var toggle = {
    component: component,
    key: component.key(),
    clickable: this.renderClickable_(component.title(),
                                     component.titleClass()),
    renderings: component.render()
  };
  this.toggles_.push(toggle);  
  if (opt_position) {
    if (opt_position > 0) {
      toggle.clickable.insertAfter(
        this.bar_.find('.rhizo-section-header:eq(' + (opt_position-1) + ')'));
    } else {  // opt_position == 0
      this.bar_.prepend(toggle.clickable);
    }
  } else {
    this.bar_.append(toggle.clickable);    
  }
  $(toggle.renderings).addClass('rhizo-floating-panel').css('display', 'none');
  this.activateToggle_(toggle);
  return $(toggle.renderings).get();
};

/**
 * Renders a single clickable link in the links bar.
 * 
 * @param {string} title The link label.
 * @param {?string} opt_className Optional CSS class to assign to the link.
 * @return {*} jQuery object pointing to the clickable link.
 * @private
 */
rhizo.ui.component.HBox.prototype.renderClickable_ = function(title, 
                                                              opt_className) {
  var titleClass = 'rhizo-section-header';
  if (opt_className) {
    titleClass += ' ' + opt_className;
  }
  var div = $('<div />', {'class': titleClass}).appendTo(this.bar_);
  $('<a />', {href: 'javascript:;', title: title}).
      text(title).
      appendTo(div);
  return div;
};

/**
 * Enables the toggling of a component. When a component is toggled, by clicking
 * the correspondent link in the links bar, any other open component is closed,
 * so that only one component at a time is always visible.
 * 
 * @param {*} The object describing the toggle-able component.
 * @private
 */
rhizo.ui.component.HBox.prototype.activateToggle_ = function(curToggle) {
  curToggle.clickable.click(jQuery.proxy(function() {
    jQuery.each(this.toggles_, jQuery.proxy(function(j, toggle) {
      if (toggle == curToggle) {
        $(toggle.renderings).toggle();
        $(toggle.clickable).toggleClass('rhizo-section-open');
      } else {
        $(toggle.renderings).css('display', 'none');
        $(toggle.clickable).removeClass('rhizo-section-open');
      }
      if (this.phase() == rhizo.ui.component.Phase.READY)  {
        toggle.component.onEvent(
            $(toggle.clickable).hasClass('rhizo-section-open') ?
              rhizo.ui.component.EventType.ACTIVATE :
              rhizo.ui.component.EventType.DEACTIVATE);
      }
    }, this));
  }, this));
};

/**
 * Toggles the visibility of the component identified by the given key.
 * 
 * @param {string} key The key of the component to toggle.
 * @param {boolean} active Whether the component should be activated (made
 *     visible) or deactivated.
 */
rhizo.ui.component.HBox.prototype.toggleComponent = function(key,
                                                             active) {
  for (var i = 0; i < this.toggles_.length; i++) {
    if (this.toggles_[i].key == key) {
      var currentActive = this.toggles_[i].clickable.
          hasClass('rhizo-section-open');
      if (currentActive != active) {
        this.toggles_[i].clickable.click();
      }
      break;
    }
  }
};


/* ==== Viewport ==== */

/**
 * The Viewport is the core of the visualization, where all models renderings
 * are displayed and laid out.
 *
 * @param {rhizo.Project} project The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @constructor
 */
rhizo.ui.component.Viewport = function(project, options) {
  rhizo.ui.component.Component.call(this, project, options);
  this.universeTargetPosition_ = {top: 0, left: 0};
};
rhizo.inherits(rhizo.ui.component.Viewport, rhizo.ui.component.Component);

rhizo.ui.component.Viewport.prototype.render = function() {
  this.viewport_ = $('<div/>', {'class': 'rhizo-viewport'});
  this.universe_ = $('<div/>', {'class': 'rhizo-universe'}).
      appendTo(this.viewport_);

  // Update the GUI object.
  this.gui_.setViewport(this.viewport_);
  this.gui_.setUniverse(this.universe_);

  return this.viewport_.get(0);
};

rhizo.ui.component.Viewport.prototype.ready = function() {
  this.viewport_.draggable({
    helper: jQuery.proxy(function() {
      return $("<div />").appendTo(this.viewport_);
    }, this),
    start: jQuery.proxy(function(ev, ui) {
      var position = this.universe_.position();
      this.universe_.data("top0", position.top).data("left0", position.left);
    }, this),
    drag: jQuery.proxy(function(ev, ui) {
      // Computes where to reposition the universe pane from the delta movement
      // of the drag helper.
      //
      // - gui.universe.data({top0, left0}) points to the relative position of
      //   the universe (in respect to the viewport) at the start of the drag
      //   movement.
      // - ui.position.{top,left} points to the relative position of the drag
      //   helper (in respect to the viewport) at the current instant.
      var dragTop = ui.position.top + this.universe_.data("top0");
      var dragLeft = ui.position.left + this.universe_.data("left0");

      var snapDistance = 15;
      if (Math.abs(ui.position.left) <= snapDistance) {
        dragLeft = this.universe_.data("left0");
      }
      if (Math.abs(dragLeft) <= 15) {
        dragLeft = 0;
      }

      this.moveUniverse_({top: dragTop, left: dragLeft});
    }, this),
    refreshPositions: false
  });

  // Mousewheel (or trackpad) based panning.
  if ($.support.mouseWheel) {
    this.viewport_.mousewheel(jQuery.proxy(function (evt, deltaX, deltaY) {
        this.panUniverse_(deltaX, deltaY);
    }, this));
  }
};

/**
 * Moves the universe relatively to the viewport.
 * 
 * @param {*} position An object exposing the 'top' and 'left' properties (both
 *     numbers) that define where the universe should be moved to. The
 *     coordinates define the position of the universe top-left corner with
 *     respect to the viewport top-left corner.
 * @private
 */
rhizo.ui.component.Viewport.prototype.moveUniverse_ = function(position) {
  this.universeTargetPosition_ = {top: position.top, left: position.left};
  this.universe_.stop().css(this.universeTargetPosition_);
};

/**
 * Pans the universe with a smooth scrolling along the requested direction(s).
 * @param {number} deltaX {-1,0,+1} to define that the universe was respectively
 *     panned right, not panned horizontally or panned left.
 * @param {number} deltaY {-1,0,+1} to define that the universe was respectively
 *     panned down, not panned vertically or panned up.
 * @private
 */
rhizo.ui.component.Viewport.prototype.panUniverse_ = function(deltaX,
                                                              deltaY) {
  var scale = Math.round(this.viewport_.get(0).offsetHeight / 10);
  this.universeTargetPosition_ = {
    top: deltaY*scale + this.universeTargetPosition_.top,
    left: deltaX*scale + this.universeTargetPosition_.left
  };
  this.universe_.stop().animate(this.universeTargetPosition_);
};


/* ==== Component specializations ==== */

/**
 * The visualization logo.
 * @param {rhizo.Project} project The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @param {boolean} titleless Whether this component should have a title or not.
 * @param {boolean} sliding Whether the link section should be hidden by default
 *     and slide into view only when requested.
 * @constructor
 */
rhizo.ui.component.Logo = function(project, options, titleless, sliding) {
  rhizo.ui.component.Component.call(this, project, options, 'rhizo.ui.component.Logo');
  this.titleless_ = titleless;
  this.sliding_ = sliding;
};
rhizo.inherits(rhizo.ui.component.Logo, rhizo.ui.component.Component);

rhizo.ui.component.Logo.prototype.title = function() {
  return this.titleless_ ? null : '?';
};

rhizo.ui.component.Logo.prototype.render = function() {
  var panel = $('<div />', {'class': 'rhizo-logo'});
  var header = $('<h1>Rhizosphere</h1>').appendTo(panel);
  var links = $('<p />').appendTo(panel);

  links.append(
      $('<a />', {
        'href': 'http://www.rhizospherejs.com/doc',
        'target': '_blank'}).
          text('Help'));

  links.append('&nbsp;').append(
      $('<a />', {
        'href': 'http://sites.google.com/site/rhizosphereui/',
        'target': '_blank'}).
          text('Project Info'));

  links.append('&nbsp;').append(
      $('<a />', {
        'href': 'http://rhizosphere.googlecode.com/hg/AUTHORS.txt',
        'target': '_blank'}).
          text('Authors'));

  links.append('&nbsp;').append(
      $('<a />', {
        'href': 'http://rhizosphere.googlecode.com/hg/COPYING.txt',
        'target': '_blank'}).
          text('License'));

  if (this.sliding_) {
    header.click(function() {
      links.slideToggle('fast');
    });
  }

  return panel.get(0);
};


/**
 * A logging console that collects messages and notifications.
 * @param {rhizo.Project} project The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @constructor
 */
rhizo.ui.component.Console = function(project, options) {
  rhizo.ui.component.Component.call(this, project, options,
                                    'rhizo.ui.component.Console');
};
rhizo.inherits(rhizo.ui.component.Console, rhizo.ui.component.Component);

rhizo.ui.component.Console.prototype.render = function() {
  this.toggleButton_ = $('<div />', {'class': 'rhizo-console-close'}).
      html('&#8659;');

  this.consoleHeader_ = $('<div />', {'class': 'rhizo-console-header'});
  this.consoleHeader_.append(this.toggleButton_).append('Log Console');

  this.consoleContents_ = $('<div />', {'class': 'rhizo-console-contents'});

  this.activate_();
  return [this.consoleHeader_.get(0), this.consoleContents_.get(0)];
};

/**
 * @private
 */
rhizo.ui.component.Console.prototype.activate_ = function() {
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

/**
 * @return {*} The jQuery object pointing to the element containing all the
 *     console messages accumulated so far.
 */
rhizo.ui.component.Console.prototype.getContents = function() {
  return this.consoleContents_;
};


/**
 * @return {*} The jQuery object pointing to the console header.
 */
rhizo.ui.component.Console.prototype.getHeader = function() {
  return this.consoleHeader_;
};


/**
 * The layout selector component.
 * @param {rhizo.Project} project The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @constructor
 */
rhizo.ui.component.Layout = function(project, options) {
  rhizo.ui.component.Component.call(this, project, options,
                                    'rhizo.ui.component.Layout');
};
rhizo.inherits(rhizo.ui.component.Layout, rhizo.ui.component.Component);

rhizo.ui.component.Layout.prototype.title = function() {
  return 'Display';
};

rhizo.ui.component.Layout.prototype.render = function() {
  this.layoutPanel_ = $('<div />');
  this.layoutOptions_ = $('<div />', {'class': 'rhizo-layout-extra-options'}).
      appendTo(this.layoutPanel_);

  this.layoutSelector_ = $("<select />", {disabled: 'disabled'});
  this.layoutSelector_.append($("<option value=''>No layout engines</option>"));

  this.submit_ = $('<button />', {disabled: 'disabled'}).text('Update');
  this.layoutPanel_.prepend(this.submit_).
      prepend(this.layoutSelector_).
      prepend("Keep items ordered by: ");

  return this.layoutPanel_.get(0);
};

rhizo.ui.component.Layout.prototype.metaReady = function() {
  this.layoutSelector_.children().remove();
  var layoutControlsMap = {};
  var layoutEngines = this.project_.layoutEngines();
  for (var layoutEngineName in layoutEngines) {
    var layoutEngine = layoutEngines[layoutEngineName];
    this.layoutSelector_.append(
      $("<option value='" + layoutEngineName + "' " +
        (this.project_.currentLayoutEngineName() == layoutEngineName ?
             "selected" : "") +
        ">" + layoutEngine  + "</option>"));
    if (layoutEngine.layoutUIControls) {
      var layoutControls = layoutEngine.layoutUIControls();
      layoutControlsMap[layoutEngineName] = $(layoutControls);
      if (this.project_.currentLayoutEngineName() != layoutEngineName) {
        layoutControls.css("display","none");
      }
      this.layoutOptions_.append(layoutControls);
    }
  }

  this.layoutSelector_.removeAttr('disabled').change(function(ev) {
    for (var layout in layoutControlsMap) {
      if (layout == $(this).val()) {
        layoutControlsMap[layout].show("fast");
      } else {
        layoutControlsMap[layout].hide("fast");
      }
    }
  });
};

rhizo.ui.component.Layout.prototype.ready = function() {
  this.submit_.removeAttr('disabled').click(jQuery.proxy(function() {
    // TODO(battlehorse): forcealign should be true only if there are
    // uncommitted filters (i.e. GREY models).
    this.project_.layout(this.layoutSelector_.val(), null, {forcealign:true});
  }, this));
};

/**
 * Selects the given layout engine.
 * @param {string} layoutEngineName The name of the layout engine to select.
 */
rhizo.ui.component.Layout.prototype.setEngine = function(layoutEngineName) {
  this.layoutSelector_.val(layoutEngineName).change();
};


/**
 * Handles selections and selection-based filtering.
 * @param {rhizo.Project} project The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @constructor
 */
rhizo.ui.component.SelectionManager = function(project, options) {
  rhizo.ui.component.Component.call(this, project, options,
                                    'rhizo.ui.component.SelectionManager');
};
rhizo.inherits(rhizo.ui.component.SelectionManager,
               rhizo.ui.component.Component);

rhizo.ui.component.SelectionManager.prototype.title = function() {
  return 'Selection';
};

rhizo.ui.component.SelectionManager.prototype.onEvent = function(evt) {
  var isActive = evt == rhizo.ui.component.EventType.ACTIVATE;
  if (this.gui_.isSelectionModeOn() != isActive) {
    // Selection mode is not enabled, but the selection panel is active,
    // or viceversa.
    this.gui_.toggleSelectionMode();
  }
};

rhizo.ui.component.SelectionManager.prototype.render = function() {
  var selectionPanel = $('<div />', {'class': 'rhizo-selection'});

  this.selection_trigger_ = $('<div />', {
      'class': 'rhizo-selection-trigger',
      'title': 'Start selecting items'}).appendTo(this.gui_.viewport);

  this.selectButton_ = $('<button />', {disabled: 'disabled'}).
      text('Work on selected items only');
  this.resetButton_ = $('<button />', {disabled: 'disabled'}).text('Reset');
  selectionPanel.append(this.selectButton_).append(this.resetButton_);

  return selectionPanel.get(0);
};

rhizo.ui.component.SelectionManager.prototype.ready = function() {
  this.activateSelectableViewport_();
  this.activateButtons_();
};

/**
 * @private
 */
rhizo.ui.component.SelectionManager.prototype.activateButtons_ = function() {
  this.selectButton_.removeAttr('disabled').click(jQuery.proxy(function() {
    var countFiltered =  this.project_.filterUnselected();
    this.setNumFilteredModels(countFiltered);
  }, this));


  // Reset button remains disabled until the first selection is performed.
  this.resetButton_.click(jQuery.proxy(function() {
    this.project_.resetUnselected();
    this.setNumFilteredModels(0);
  }, this));
};

/**
 * Checks whether an event was raised on empty space, i.e. somewhere in the
 * viewport, but not on top of any models or any other elements.
 *
 * Since the viewport and the universe may be not on top of each other, the
 * method checks whether any of the two is the original target of the event.
 *
 * @param {Event} evt the event to inspect.
 * @returns {boolean} true if the click occurred on the viewport, false
 *   otherwise.
 * @private
 */
rhizo.ui.component.SelectionManager.prototype.isOnEmptySpace_ = function(evt) {
  return $(evt.target).hasClass('rhizo-viewport') ||
         $(evt.target).hasClass('rhizo-universe');
};

/**
 * @private
 */
rhizo.ui.component.SelectionManager.prototype.activateSelectableViewport_ =
    function() {
  var project = this.project_;
  this.selection_trigger_.click(function() {
    project.gui().toggleSelectionMode();
  });

  this.gui_.viewport.selectable({
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
    filter: this.options_.selectfilter,
    tolerance: 'touch',
    distance: 1
  });

  this.gui_.viewport.click(jQuery.proxy(function(ev, ui) {
    if (this.isOnEmptySpace_(ev)) {
      project.unselectAll();
    }
  }, this));
};

/**
 * Toggles the title of the selection trigger depending on the status of the
 * viewport.
 * 
 * @param {boolean} selectionModeOn Whether the viewport is currently in
 *     selection mode or not.
 */
rhizo.ui.component.SelectionManager.prototype.toggleSelectionTrigger =
    function(selectionModeOn) {
 this.selection_trigger_.attr(
     'title',
     selectionModeOn ? 'Stop selecting items' : 'Start selecting items');
};

/**
 * Sets the number of models that have been filtered out via selections.
 * @param {number} numFilteredModels The number of models that are currently
 *     filtered because of selection choices.
 */
rhizo.ui.component.SelectionManager.prototype.setNumFilteredModels =
    function(numFilteredModels) {
  if (numFilteredModels > 0) {
    this.resetButton_.
        removeAttr("disabled").
        text("Reset (" + numFilteredModels + " filtered)");
  } else {
    this.resetButton_.attr('disabled', 'disabled').text('Reset');
  }
};


/**
 * A panel that enables/disables filters autocommit functionality.
 * 
 * @param {rhizo.Project} project The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @constructor
 */
rhizo.ui.component.AutocommitPanel = function(project, options) {
  rhizo.ui.component.Component.call(this, project, options,
                                    'rhizo.ui.component.AutocommitPanel');
  this.callback_ = null;
};
rhizo.inherits(rhizo.ui.component.AutocommitPanel,
               rhizo.ui.component.Component);

/**
 * Registers a callback to be invoked anytime the autocommit setting is toggled.
 * @param {function(boolean)} callback The callback to invoke. It receives one
 *     parameter that defines whether autocommit is enabled or not.
 */
rhizo.ui.component.AutocommitPanel.prototype.registerCallback = function(
    callback) {
  this.callback_ = callback;
};

rhizo.ui.component.AutocommitPanel.prototype.render = function() {
  var autocommitPanel =
      $('<div />', {'class': 'rhizo-filter rhizo-autocommit-panel'});
  this.autocommit_ =
      $('<input />', {type: 'checkbox',
                      checked: this.project_.isFilterAutocommit(),
                      disabled: 'disabled'}).
      appendTo(autocommitPanel);
  this.autocommitLabel_ =
      $('<span>Autocommit</span>').appendTo(autocommitPanel);
  this.hideButton_ =
      $('<button />', {disabled: 'disabled'}).
      text('Apply filters').
      appendTo(autocommitPanel);
  return autocommitPanel;
};

rhizo.ui.component.AutocommitPanel.prototype.ready = function() {
  this.autocommit_.removeAttr('disabled').click(jQuery.proxy(function(ev) {
    this.setAutocommit_(this.autocommit_.is(':checked'));
  }, this));

  this.autocommitLabel_.click(jQuery.proxy(function() {
    // Can't delegate the click directly to the checkbox, because the event
    // handler is triggered _before_ the checkbox state changes.
    if (this.autocommit_.is(':checked')) {
      this.autocommit_.removeAttr('checked');
      this.setAutocommit_(false);
    } else {
      this.autocommit_.attr('checked', 'checked');
      this.setAutocommit_(true);
    }
  }, this));

  this.hideButton_.
      attr('disabled', this.project_.isFilterAutocommit()).
      click(jQuery.proxy(function() {
        this.project_.commitFilter();
  }, this));
};

/**
 * Callback invoked whenever the autocommit status changes.
 * @param {boolean} autocommit Whether to enable autocommit or not.
 * @private
 */
rhizo.ui.component.AutocommitPanel.prototype.setAutocommit_ = function(
    autocommit) {
  if (autocommit) {
    this.hideButton_.attr('disabled', 'disabled');
  } else {
    this.hideButton_.removeAttr('disabled');
  }
  if (this.callback_) {
    this.callback_(autocommit);
  }
  this.project_.enableFilterAutocommit(autocommit);
};


/**
 * Renders a series of filters as a stack, with all filters showing one on
 * top of the other.
 * @param {rhizo.Project} project The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @constructor
 */
rhizo.ui.component.FilterStackContainer = function(project, options) {
  rhizo.ui.component.Component.call(this, project, options,
                                    'rhizo.ui.component.FilterStackContainer');
  this.autocommitPanel_ = new rhizo.ui.component.AutocommitPanel(project,
                                                                 options);

  /**
   * Number of metaModel keys that will trigger filter selection (instead of
   * just showing all the available filters).
   * @type {number}
   * @private
   */
  this.filterSelectorThreshold_ = 5;

  /**
   * Defines which filters are currently visible. This set is only meaningful
   * when filter selection is active, otherwise all filters are always visible.
   * @type {Object.<string, boolean>}
   * @private
   */
  this.activeFilters_ = {};
};
rhizo.inherits(rhizo.ui.component.FilterStackContainer,
               rhizo.ui.component.Component);

rhizo.ui.component.FilterStackContainer.prototype.title = function() {
  return 'Filters';
};

rhizo.ui.component.FilterStackContainer.prototype.render = function() {
  this.filterPanel_ = $('<div />', {'class': 'rhizo-filter-container'});
  this.filterPanel_.append(this.autocommitPanel_.render());

  this.noFilterNotice_ = $('<p />').text('No filters available.');
  this.filterPanel_.append(this.noFilterNotice_);

  return this.filterPanel_.get(0);
};

rhizo.ui.component.FilterStackContainer.prototype.metaReady = function() {
  var metaModel = this.project_.metaModel();
  var filtersNum = 0;
  for (var key in metaModel) {
    filtersNum++;
  }

  if (filtersNum > 0) {
    this.noFilterNotice_.remove();
  }

  if (filtersNum <= this.filterSelectorThreshold_) {
    for (key in metaModel) {
      var filter = metaModel[key].kind.renderFilter(this.project_,
                                                    metaModel[key],
                                                    key);
      this.filterPanel_.append(filter);
    }
  } else {
    this.renderFilterSelector_();
  }
};

/**
 * Renders the filter selector, and an initial selection of filters up to
 * the selector threshold.
 * @private
 */
rhizo.ui.component.FilterStackContainer.prototype.renderFilterSelector_ =
    function() {
  var metaModel = this.project_.metaModel();
  this.filterSelector_ = $('<select />',
                           {'class': 'rhizo-filter-selector',
                            disabled: 'disabled'});
  $('<option />').attr('value', '').text('More filters...').
      appendTo(this.filterSelector_);
  for (var key in metaModel) {
    var option = $('<option />').attr('value', key).text(metaModel[key].label);
    this.filterSelector_.append(option);
  }
  this.filterPanel_.append(this.filterSelector_);
  var visibleFilterCount = 0;
  for (key in metaModel) {
    this.activateFilter_(key);
    if (++visibleFilterCount == this.filterSelectorThreshold_) {
      break;
    }
  }
};

rhizo.ui.component.FilterStackContainer.prototype.ready = function() {
  // Every single filter implementation auto-activates itself when created.
  // Here we only need to activate the navigation between filters.
  //
  // TODO(battlehorse): Extend filters so that they can be properly
  // disabled/enabled when needed.
  this.autocommitPanel_.ready();
  if (this.filterSelector_) {
    this.activateFilterSelector_();
  }
};

/**
 * @private
 */
rhizo.ui.component.FilterStackContainer.prototype.activateFilterSelector_ =
    function() {
  this.filterSelector_.removeAttr('disabled').change(jQuery.proxy(function() {
    var key = this.filterSelector_.val();
    if (!(key in this.project_.metaModel())) {
      return;
    }
    this.activateFilter_(key, this.project_);

    // re-select the first (default) option.
    this.filterSelector_.find('option').eq(0).attr('selected', 'selected');
  }, this));
};

/**
 * @param {string} key
 * @private
 */
rhizo.ui.component.FilterStackContainer.prototype.activateFilter_ =
    function(key) {
  var metaModel = this.project_.metaModel();
  var filter = metaModel[key].kind.renderFilter(this.project_, 
                                                metaModel[key],
                                                key);
  this.activeFilters_[key] = true;
  var filterCloseIcon =
      $('<div />', {'class': 'rhizo-icon rhizo-close-icon'}).
          text('x').
          prependTo(filter);
  filterCloseIcon.click(jQuery.proxy(function() {
    // remove the filter
    filter.remove();
    delete this.activeFilters_[key];

    // re-align the visualization.
    this.project_.filter(key, null);

    // re-enable the filter among the selectable ones.
    this.filterSelector_.
        find('option[value=' + key + ']').
        removeAttr('disabled');
  }, this));

  filter.appendTo(this.filterPanel_);
  this.filterSelector_.
      find('option[value=' + key + ']').
      attr('disabled', 'disabled');
};

/**
 * Checks whether the given filter is active (i.e., its UI is showing).
 * @param {string} key The metamodel key of the filter to inspect.
 * @return {boolean} Whether the filter is active (its UI is showing) or not.
 */
rhizo.ui.component.FilterStackContainer.prototype.isFilterActive =
    function(key) {
  return key in this.activeFilters_;
};

/**
 * Ensures that the UI for the given filter key is visible to the user. This is
 * only relevant when filter selection is active, otherwise all filters are
 * always visible.
 * @param {string} key The metamodel key of the filter to show.
 */
rhizo.ui.component.FilterStackContainer.prototype.showFilter = function(key) {
  if (!this.filterSelector_) {
    // The filter selector is not in use. This means that all filters are
    // always visible.
    return;
  }
  if (!(key in this.activeFilters_)) {
    this.activateFilter_(key);
  }
};


/**
 * Renders a series of filters as a 'book', with only filter showing at any
 * time, and additional controls to flip between one filter and the next.
 * 
 * @param {rhizo.Project} project The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @constructor
 */
rhizo.ui.component.FilterBookContainer = function(project, options) {
  rhizo.ui.component.Component.call(this, project, options,
                                    'rhizo.ui.component.FilterBookContainer');
  this.autocommitPanel_ = new rhizo.ui.component.AutocommitPanel(project,
                                                                 options);
};
rhizo.inherits(rhizo.ui.component.FilterBookContainer,
               rhizo.ui.component.Component);

rhizo.ui.component.FilterBookContainer.prototype.title = function() {
  return 'Filters';
};

rhizo.ui.component.FilterBookContainer.prototype.render = function() {
  this.filterPanel_ = $('<div />', {'class': 'rhizo-filter-container'});

  this.nextFilter_ =
      $('<div />', {'class': 'rhizo-next-filter', title: 'Next filter'}).
      text('>').
      appendTo(this.filterPanel_);
  this.prevFilter_ =
      $('<div />', {'class': 'rhizo-prev-filter', title: 'Previous filter'}).
      text('<').
      appendTo(this.filterPanel_);
  this.commitFilterLink_ =
      $('<a />', {'href': 'javascript:;', 'class': 'rhizo-autocommit-link'}).
      text('Apply').
      appendTo(this.filterPanel_);

  this.filterPanel_.append(this.autocommitPanel_.render());
  return this.filterPanel_.get(0);
};

rhizo.ui.component.FilterBookContainer.prototype.metaReady = function() {
  if (this.project_.isFilterAutocommit()) {
    this.commitFilterLink_.css('display', 'none');
  }
  this.autocommitPanel_.registerCallback(jQuery.proxy(function(isAutocommit) {
    this.commitFilterLink_.css('display', isAutocommit ? 'none' : '');
  }, this));

  var metaModel = this.project_.metaModel();
  for (var key in metaModel) {
    var filter = metaModel[key].kind.renderFilter(this.project_,
                                                  metaModel[key],
                                                  key);
    filter.css('display', 'none');
    this.filterPanel_.append(filter);
  }
};

rhizo.ui.component.FilterBookContainer.prototype.ready = function() {
  this.autocommitPanel_.ready();
  this.commitFilterLink_.click(jQuery.proxy(function() {
    this.project_.commitFilter();
  }, this));

  // Every single filter implementation auto-activates itself when created.
  // Here we only need to activate the navigation between filters.
  var gui = this.gui_;
  this.nextFilter_.click(function() {
    var current = $('.rhizo-filter:visible', gui.container);
    var next = current.next('.rhizo-filter:hidden').eq(0);
    if (next.length > 0) {
      // cannot use hide/show otherwise safari clips rendering
      current.css('display', 'none');
      next.css('display', '');
    }
  });

  this.prevFilter_.click(function() {
    var current = $('.rhizo-filter:visible', gui.container);
    var prev = current.prev('.rhizo-filter:hidden').eq(0);
    if (prev.length > 0) {
      // cannot use hide/show otherwise safari clips rendering
      current.css('display', 'none');
      prev.css('display', '');
    }
  });
};


/**
 * A legend to describes model color and size coding.
 * @param {rhizo.Project} project The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @constructor
 */
rhizo.ui.component.Legend = function(project, options) {
  rhizo.ui.component.Component.call(this, project, options,
                                    'rhizo.ui.component.Legend');
  this.legendPanel_ = null;
};
rhizo.inherits(rhizo.ui.component.Legend, rhizo.ui.component.Component);

rhizo.ui.component.Legend.prototype.title = function() {
  return 'Legend';
};

rhizo.ui.component.Legend.prototype.render = function() {
  this.legendPanel_ = $('<div />', {'class': "rhizo-legend-panel"});
  $('<p />').text('Legend is not available yet.').appendTo(this.legendPanel_);
  return this.legendPanel_.get(0);
};

rhizo.ui.component.Legend.prototype.metaReady = function() {
  // Currently only works in tandem with rhizo.autorender.AR
  if (!this.project_.renderer().getSizeRange &&
      !this.project_.renderer().getColorRange) {
    return;
  }
  this.legendPanel_.children().remove();

  var sizeRange = null;
  if (this.project_.renderer().getSizeRange) {
    sizeRange = this.project_.renderer().getSizeRange();
  }
  var colorRange = null;
  if (this.project_.renderer().getColorRange) {
    colorRange = this.project_.renderer().getColorRange();
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


/**
 * Experimental component to handle user-specified actions on models.
 * @param {rhizo.Project} project The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @constructor
 */
rhizo.ui.component.Actions = function(project, options) {
  rhizo.ui.component.Component.call(this, project, options);
};
rhizo.inherits(rhizo.ui.component.Actions, rhizo.ui.component.Component);

rhizo.ui.component.Actions.prototype.title = function() {
  return 'Actions';
};

rhizo.ui.component.Actions.prototype.render = function() {
  var actionsContainer = $('<div />', {'class': 'rhizo-actions'});

  // Create 2 sample actions
  for (var i = 0; i < 2; i++) {
    $('<div />', {'class': 'rhizo-action'}).
        text('Sample Action ' + (i+1)).
        appendTo(actionsContainer);
  }
  return actionsContainer.get(0);
};

rhizo.ui.component.Actions.prototype.ready = function() {
  if ($('.rhizo-action', this.gui_.container).length > 0) {
    var gui = this.gui_;
    var project = this.project_;
    $('.rhizo-action', this.gui_.container).draggable({helper: 'clone'});
    this.gui_.universe.droppable({
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
              project.model(id).rendering().moveToMark().unmarkPosition();
            } else {
              var countSelected = 0;
              var all_selected = project.allSelected();
              for (var id in all_selected) { countSelected++;}
              alert("Action applied on " + countSelected + " elements");

              for (var id in all_selected) {
                all_selected[id].rendering().moveToMark().unmarkPosition();
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

/* ==== Templates ==== */

/**
 * Template used when Rhizosphere is accessed via a mobile device, or when
 * the available screen estate is reduced (such as in gadgets). Collects all
 * the visualization controls in a links bar at the bottom of the screen.
 * 
 * @param {rhizo.Project} project The project this template belongs to.
 * @param {*} options Project-wide configuration options
 * @param {?string} template_key A unique key that identifies the template.
 *     Generates a CSS class name that can be used for template-specific UI
 *     skinning.
 * @constructor
 */
rhizo.ui.component.BottomTemplate = function(project, options, template_key) {
  rhizo.ui.component.Template.call(this, project, options, template_key);
  this.initComponents_(project, options);
};
rhizo.inherits(rhizo.ui.component.BottomTemplate, rhizo.ui.component.Template);

rhizo.ui.component.BottomTemplate.prototype.initComponents_ = function(
    project, options) {
  this.hbox_ = new rhizo.ui.component.HBox(project, options,
      'rhizo.ui.component.BottomBar', 'rhizo-bottom-bar');

  var default_components = this.defaultComponents(project, options);
  for (var i = 0; i < default_components.length; i++) {
    this.hbox_.addComponent(default_components[i]);
  }

  rhizo.ui.component.Template.prototype.addComponent.call(this, this.hbox_);
};

/**
 * Returns the list of default template components. Subclasses can override.
 * @param {rhizo.Project} project The project this template belongs to.
 * @param {*} options Project-wide configuration options 
 * @return {Array.<rhizo.ui.component.Component>} The list of default
 *     components that will be part of the template.
 */
rhizo.ui.component.BottomTemplate.prototype.defaultComponents = function(
    project, options) {
  return [
      new rhizo.ui.component.Layout(project, options),
      new rhizo.ui.component.SelectionManager(project, options),
      new rhizo.ui.component.FilterBookContainer(project, options),
      new rhizo.ui.component.Logo(project, options, false, false)
  ];
};

/**
 * Overrides the default addComponent() implementation to explicitly assign
 * newly added components to the template bottom links bar.
 * 
 * @param {rhizo.ui.component.Component} component The component to add.
 */
rhizo.ui.component.BottomTemplate.prototype.addComponent = function(component) {
  this.addtoBottomBar(component);
  return null;
};

/**
 * Adds the component to the template's bottom controls bar.
 * 
 * @param {rhizo.ui.component.Component} component The component to add.
 */
rhizo.ui.component.BottomTemplate.prototype.addtoBottomBar = function(
    component) {
  // Keep the Logo always as the last component. Add new components just before
  // that.
  var renderings = this.hbox_.addComponent(component, -1);
  if (renderings) {
    this.gui_.container.append(renderings);
  }
};


/**
 * Default Rhizosphere UI template.
 * @param {rhizo.Project} project The project this template belongs to.
 * @param {*} options Project-wide configuration options
 * @param {?string} template_key A unique key that identifies the template.
 *     Generates a CSS class name that can be used for template-specific UI
 *     skinning.
 * @constructor
 */
rhizo.ui.component.StandardTemplate = function(project, options, template_key) {
  rhizo.ui.component.Template.call(this, project, options, template_key);
  this.initComponents_(project, options);
};
rhizo.inherits(rhizo.ui.component.StandardTemplate,
               rhizo.ui.component.Template);

rhizo.ui.component.StandardTemplate.prototype.initComponents_ = function(
    project, options) {
  this.leftbox_ = new rhizo.ui.component.VBox(project, options, /* key */ null,
                                              'rhizo-left');
  this.rightbox_ = new rhizo.ui.component.RightBar(
      project, options, 'rhizo.ui.component.RightBar', 'rhizo-right');

  var left_components = this.defaultLeftComponents(project, options);
  for (var i = 0; i < left_components.length; i++) {
    this.leftbox_.addComponent(left_components[i]);
  }

  var right_components = this.defaultRightComponents(project, options);
  for (var i = 0; i < right_components.length; i++) {
    this.rightbox_.addComponent(right_components[i]);
  }

  rhizo.ui.component.Template.prototype.addComponent.call(this, this.leftbox_);
  rhizo.ui.component.Template.prototype.addComponent.call(this, this.rightbox_);
};

/**
 * Returns the list of default template components that will be added to the
 * left bar. Subclasses can override.
 * @param {rhizo.Project} project The project this template belongs to.
 * @param {*} options Project-wide configuration options
 * @return {Array.<rhizo.ui.component.Component>} The list of default
 *     components that will be part of the template.
 */
rhizo.ui.component.StandardTemplate.prototype.defaultLeftComponents = function(
    project, options) {
  return [
      new rhizo.ui.component.Logo(project, options, true, true),
      new rhizo.ui.component.Layout(project, options),
      new rhizo.ui.component.SelectionManager(project, options),
      new rhizo.ui.component.FilterStackContainer(project, options)
  ];
};

/**
 * Returns the list of default template components that will be added to the
 * right bar. Subclasses can override.
 * @param {rhizo.Project} project The project this template belongs to.
 * @param {*} options Project-wide configuration options
 * @return {Array.<rhizo.ui.component.Component>} The list of default
 *     components that will be part of the template.
 */
rhizo.ui.component.StandardTemplate.prototype.defaultRightComponents =
    function(project, options) {
  return [
      new rhizo.ui.component.Console(project, options),
      new rhizo.ui.component.Actions(project, options)
  ];
};

/**
 * Overrides the default addComponent() implementation to explicitly assign
 * newly added components to the template left controls bar.
 * 
 * @param {rhizo.ui.component.Component} component The component to add.
 */
rhizo.ui.component.StandardTemplate.prototype.addComponent = function(
    component)  {
  this.addtoLeftBar(component);
  return null;
};

/**
 * Adds the component to the template's left controls bar.
 * 
 * @param {rhizo.ui.component.Component} component The component to add.
 */
rhizo.ui.component.StandardTemplate.prototype.addtoLeftBar = function(
    component) {
  var renderings = this.leftbox_.addComponent(component);
  if (renderings) {
    this.gui_.container.append(renderings);
  }
};

/**
 * Adds the component to the template's right controls bar.
 * 
 * @param {rhizo.ui.component.Component} component The component to add.
 */
rhizo.ui.component.StandardTemplate.prototype.addToRightBar = function(
    component) {
  var renderings = this.rightbox_.addComponent(component);
  if (renderings) {
    this.gui_.container.append(renderings);
  }
};


/**
 * Enumerates available template factories. A template factory is a function
 * that receives a rhizo.Project as input and returns a template instance.
 *
 * New templates can be registered by adding a factory to this enum.
 *
 * @enum {string} Enumeration of available template factories.
 */
rhizo.ui.component.templates = {
  'bottom': function(project, options) {
    return new rhizo.ui.component.BottomTemplate(
        project, options, 'bottom');
  },
  'default': function(project, options) {
    return new rhizo.ui.component.StandardTemplate(
        project, options, 'default');
  }
};
/* ./src/js/rhizo.layout.treemap.js */
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

// RHIZODEP=rhizo.layout

namespace("rhizo.layout");
namespace("rhizo.layout.treemap");

// TreeMap Layout.
// Based on the "Squarified Treemaps" algorithm, by Mark Bruls, Kees Huizing,
// and Jarke J. van Wijk (http://tinyurl.com/2eey2zn).
//
// TODO(battlehorse): When expanding and unexpanding a model in this layout, the
// model is re-rendered with its original size, not the one the treemap expects.
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
 * @param {rhizo.ui.RenderingPipeline} pipeline The pipeline that
 *     accumulates all the layout operations to perform as part of this layout
 *     request.
 * @param {number} areaRatio The squared-pixel to area ratio, to map between
 *     area values as extracted from models and associated pixel dimensions in
 *     the layout representation.
 */
rhizo.layout.treemap.TreeMapNode = function(treenode, pipeline, areaRatio) {
  this.id = treenode.id;
  this.pipeline_ = pipeline;
  this.model_ = treenode.superModel;
  this.area_ = treenode.area * areaRatio;
  if (isNaN(this.area_) || this.area_ < 0) {
    this.area_ = 0.0;
  }
  this.top_ = 0;
  this.left_ = 0;
  this.width_ = 0;
  this.height_ = 0;
};

rhizo.layout.treemap.TreeMapNode.prototype.area = function() {
  return this.area_;
};

rhizo.layout.treemap.TreeMapNode.prototype.rendering = function() {
  return this.model_.rendering();
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
  this.pipeline_.move(this.id, this.top_, this.left_, '__treemap__', deepness);
};

/**
 * Resizes this node model rendering to the desired width and height.
 * @return {boolean} whether the resizing was successful.
 */
rhizo.layout.treemap.TreeMapNode.prototype.resize = function(width, height) {
  if (this.model_.rendering().canRescaleTo(width, height)) {
    this.pipeline_.resize(this.id, width, height);
    this.width_ = width;
    this.height_ = height;
    return true;
  }
  return false;
};

rhizo.layout.treemap.TreeMapNode.prototype.colorWeighted = function(colorRange) {
  var colorVal = parseFloat(this.model_.unwrap()[colorRange.meta]);
  if (!isNaN(colorVal)) {
    this.pipeline_.style(
        this.id,
        {backgroundColor: this.getBackgroundColor_(colorVal, colorRange)});
  }
};

rhizo.layout.treemap.TreeMapNode.prototype.color = function(color) {
  this.pipeline_.style(this.id, {backgroundColor: color});
};

rhizo.layout.treemap.TreeMapNode.prototype.updateColorRange = function(colorRange) {
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

  if (this.isHidden() || this.width_ < 24 || this.height_ < 39) {
    // Setting boundingRect dimensions to 0 will nullify areaRatio, which in turn
    // zeroes nodes' area, causing them to be hidden.
    return {width: 0, height: 0};
  } else {
    return {
      width: this.width_ - 4,  // 4px left and right padding
      height: this.height_ - 19  // 4px top/bottom padding + 15px header space
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
  var rescaler = colorRange.kind.toFilterScale ?
      jQuery.proxy(colorRange.kind.toFilterScale, colorRange.kind) :
      function(val) { return val; };
  var channels = ['r', 'g', 'b'];
  var outputColor = {};
  for (var i = 0; i < channels.length; i++) {
    var channel = channels[i];
    outputColor[channel] = colorRange.colorMin[channel] +
      (colorRange.colorMax[channel] - colorRange.colorMin[channel])*
      (rescaler(colorVal) - rescaler(colorRange.min))/(rescaler(colorRange.max) - rescaler(colorRange.min));
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
 * @param {Object?} anchorDelta The {x,y} position delta to convert node
 *     positioning relative to the slice anchorPoint into absolute positioning
 *     with respect to the overall container that contains the whole treemap
 *     layout.
 * @param {number} deepness The nesting deepness we are currently rendering at.
 * @return {number} The total number of hidden nodes in the slice.
 */
rhizo.layout.treemap.TreeMapSlice.prototype.draw = function(anchorDelta,
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
      if (!node.resize(renderingSize['width'], renderingSize['height'])) {
        node.hide();
        numHiddenModels++;
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
 * A layout that arranges models in treemaps, possibly hierarchical.
 *
 * @param {rhizo.Project} project
 * @constructor
 */
rhizo.layout.TreeMapLayout = function(project) {
  this.project_ = project;
  this.prevColorMeta_ = null;

  /**
   * Map that accumulates all the nodes matching the models being laid out.
   * @type {Object.<string, rhizo.layout.TreeNode>}
   * @private
   */
  this.globalNodesMap_ = {};

  // Number of models that have been hidden specifically by this layout because
  // their area would be too small for display.
  this.numHiddenModels_ = 0;

  rhizo.layout.GUILayout.call(this, project,
                              new rhizo.layout.TreeMapLayoutUI(this, project));
};
rhizo.inherits(rhizo.layout.TreeMapLayout, rhizo.layout.GUILayout);

/**
 * Verifies whether this layout can be used, given the project metamodel.
 * The project metamodel must define at least one numeric model attribute that
 * will be used to compute treemap areas.
 *
 * @param {*} meta The project metamodel.
 */
rhizo.layout.TreeMapLayout.prototype.verifyMetaModel = function(meta) {
  for (var key in meta) {
    if (rhizo.layout.numericMatcher(key, meta[key])) {
      return true;
    }
  }
  return false;
};

/**
 * @private
 */
rhizo.layout.TreeMapLayout.prototype.defaultState_ = function() {
  return {
    area: rhizo.layout.firstMetamodelKey(this.project_,
                                         rhizo.layout.numericMatcher),
    color: null,
    parentKey: null
  };
};

/**
 * Validates a layout state. A valid state must have an 'area' property
 * pointing to the numeric metamodel key that will be used to compute treemap
 * areas.
 *
 * It might contain a 'color' property, which must be numeric, that will be
 * used to assign colors to each treemap element.
 *
 * It might contain a 'parentKey' property, which must define parent-child
 * relationships between models, that will be used to create hierarchical
 * nesting in the treemap.
 *
 * @param {*} otherState
 * @private
 */
rhizo.layout.TreeMapLayout.prototype.validateState_ = function(otherState) {
  if (!this.validateStateAttributePresence_(otherState, 'area')) {
    return false;
  }

  if (!this.validateMetamodelPresence_(otherState.area,
                                       rhizo.layout.numericMatcher)) {
    return false;
  }
  if (otherState.color &&
      !(this.validateMetamodelPresence_(otherState.color,
                                        rhizo.layout.numericMatcher))) {
    return false;
  }
  if (otherState.parentKey &&
      !(this.validateMetamodelPresence_(otherState.parentKey,
                                        rhizo.layout.parentMatcher))) {
    return false;
  }
  return true;
};

/**
 * Lays out models.
 *
 * @param {rhizo.ui.RenderingPipeline} pipeline The pipeline that
 *     accumulates all the layout operations to perform as part of this layout
 *     request.
 * @param {rhizo.layout.LayoutBox} layoutBox The bounding rectangle inside which
 *     the layout should occur.
 * @param {Array.<rhizo.model.SuperModel>} supermodels List of the SuperModels
 *     that will participate in the layout.
 * @param {Object.<*, rhizo.model.SuperModel>} allmodels A map of all
 *     visualization models, mapping from the model id the associated SuperModel
 *     instance.
 * @param {*} meta The project metamodel.
 * @param {*} options The composition of project-wide configuration options and
 *     layout-specific ones.
 */
rhizo.layout.TreeMapLayout.prototype.layout = function(pipeline,
                                                       layoutBox,
                                                       supermodels,
                                                       allmodels,
                                                       meta,
                                                       options) {
  var areaMeta = this.getState().area;
  var colorMeta = this.getState().color;
  var parentKey = this.getState().parentKey;

  // Restore models that are no longer part of the treemap.
  // Keep track of the last coloring key used, in case we have to restore remove
  // color coding at a later layout run.
  pipeline.backupManager().restore(supermodels,
                                   this.prevColorMeta_ && !colorMeta);
  this.prevColorMeta_ = colorMeta;

  // Revert expanded models, if needed.
  this.revertExpandedModels_(supermodels);

  // Identify whether we are rendering nested treemaps or just a flat one with
  // no hierarchy.
  var treeRoot;
  this.globalNodesMap_ = {};
  if (parentKey) {
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

  // Actual layout occurs here.
  this.numHiddenModels_ = this.layoutNestedMap_(
      pipeline,
      {width: layoutBox.width, height: layoutBox.height},
      treeRoot,
      {x:0, y:0},
      /* deepness */ 50);

  // Treemap coloring (if needed).
  // Color ranges are determined by sampling values from:
  // - all visible leaf nodes.
  // - all visible non-leaf nodes whose children are all hidden.
  if (colorMeta) {
    var colorRange = {
      min: Number.MAX_VALUE,
      max: Number.MIN_VALUE,
      meta: colorMeta,
      kind: this.project_.metaModel()[colorMeta].kind,
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
  if (this.numHiddenModels_ > 0) {
    // There were hidden models, reset their filter and mark visibility as
    // dirty to force visibility alignment.
    this.project_.resetAllFilter('__treemap__');
    this.numHiddenModels_ = 0;
    return true;
  }
  return false;
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
 * @param {rhizo.ui.RenderingPipeline} pipeline The pipeline that
 *     accumulates all the layout operations to perform as part of this layout
 *     request.
 * @param {*} boundingRect An object exposing 'width' and 'height' properties
 *     that define the area this treemap level should cover.
 * @param {rhizo.layout.TreeNode} treeRoot The tree node whose children are to
 *     be laid out, in breadth-first recursive fashion.
 * @param {*} anchorDelta An object exposing 'x' and 'y' properties identifying
 *     the position (with respect to the overall container that contains the
 *     whole treemap layout) to which the top-left corner of the nested bounding
 *     rectangle should be anchored to.
 * @param {number} deepness
 * @return {number} The number of models that this layout wants to hide because
 *     their pixel area is too small to properly display on screen.
 * @private
 */
rhizo.layout.TreeMapLayout.prototype.layoutNestedMap_ = function(
    pipeline, boundingRect, treeRoot, anchorDelta, deepness) {
  var numHiddenModels = 0;

  if (treeRoot.numChilds == 0) {
    return numHiddenModels;
  }

  // Layout all the models at the current hierarchy level.
  var slices = this.layoutFlatMap_(pipeline, boundingRect, treeRoot);
  for (var i = 0; i < slices.length; i++) {

    // Draw the slices at the current level.
    // This also ensures resizing of all the slice nodes, so nested
    // boundingRects can be computed accurately.
    numHiddenModels += slices[i].draw(anchorDelta, deepness);

    // Iterate all over the TreeMapNodes that have been created at this level.
    for (var j = 0; j < slices[i].nodes().length; j++) {
      var node = slices[i].nodes()[j];
      var treenode = treeRoot.childs[node.id];

      // Bind TreeNode and TreeMapNode together (used later for coloring).
      treenode.treemapnode = node;

      // Recurse
      numHiddenModels += this.layoutNestedMap_(pipeline,
                                               node.nestedBoundingRect(),
                                               treenode,
                                               node.nestedAnchor(),
                                               deepness+1,
                                               pipeline);
    }
  }
  return numHiddenModels;
};

/**
 * @private
 * @param {rhizo.layout.TreeNode} firstTreeNode
 * @param {rhizo.layout.TreeNode} secondTreeNode
 */
rhizo.layout.TreeMapLayout.prototype.sortByAreaDesc_ = function(firstTreeNode,
                                                                secondTreeNode) {
  return secondTreeNode.area - firstTreeNode.area;
};

/**
 * Lays out all the given models at the current hierachy according to the
 * treemap algorithm, with no nesting.
 *
 * @param {rhizo.ui.RenderingPipeline} pipeline The pipeline that
 *     accumulates all the layout operations to perform as part of this layout
 *     request.
 * @param {*} boundingRect An object exposing 'width' and 'height' properties
 *     that define the area this treemap level should cover.
 * @param {rhizo.layout.TreeNode} treeRoot The tree node whose children are to
 *     be laid out.
 * @return {Array.<rhizo.layout.treemap.TreeMapSlice>}
 * @private
 */
rhizo.layout.TreeMapLayout.prototype.layoutFlatMap_ = function(pipeline,
                                                               boundingRect,
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
                                                  pipeline,
                                                  areaRatio);
  if (node.area() <= 0.0) {
    node.hide();
  }
  currentSlice.addNode(node);

  while (modelsCount < treenodes.length) {
    node = new rhizo.layout.treemap.TreeMapNode(treenodes[modelsCount++],
                                                pipeline,
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
      if (!treeNode.is_root) {
        treeNode.treemapnode.updateColorRange(colorRange);
      }
    }
  } else if (!treeNode.is_root) {
    // visible leaf node.
    treeNode.treemapnode.updateColorRange(colorRange);
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
      supermodels) {
  for (var i = supermodels.length-1; i >= 0; i--) {
    supermodels[i].rendering().setExpanded(false);
  }
};


/**
 * Helper class that handles TreeMapLayout ui controls.
 * @param {rhizo.layout.TreeMapLayout} layout
 * @param {rhizo.Project} project
 * @constructor
 */
rhizo.layout.TreeMapLayoutUI = function(layout, project) {
  this.layout_ = layout;
  this.project_ = project;

  this.areaSelector_ = null;
  this.colorSelector_ = null;
  this.parentKeySelector_ = null;
};

rhizo.layout.TreeMapLayoutUI.prototype.renderControls = function() {
  var hasParentKeys = this.checkParentKeys_();
  var details = $('<div />');

  this.areaSelector_ = rhizo.layout.metaModelKeySelector(
      this.project_,
      'rhizo-treemaplayout-area',
      rhizo.layout.numericMatcher).
    change(jQuery.proxy(this.updateState_, this));
  this.colorSelector_ = rhizo.layout.metaModelKeySelector(
      this.project_,
      'rhizo-treemaplayout-color',
      rhizo.layout.numericMatcher).
    append("<option value=''>-</option>").
    change(jQuery.proxy(this.updateState_, this));
  details.
      append(this.renderSelector_('Area: ', this.areaSelector_)).
      append(this.renderSelector_('Color: ', this.colorSelector_));
  if (hasParentKeys) {
    this.parentKeySelector_ = rhizo.layout.metaModelKeySelector(
        this.project_,
        'rhizo-treemaplayout-parentKey',
        rhizo.layout.parentMatcher).
      append("<option value=''>-</option>").
      change(jQuery.proxy(this.updateState_, this));
    details.append(this.renderSelector_('Parent: ', this.parentKeySelector_));
  }
  return details;
};

/**
 * Renders an option selector, by grouping together a label and a combobox in
 * a single element.
 * @param {string} label Text label to associate to the SELECT element.
 * @param {*} selector jQuery object pointing to a SELECT element.
 * @return {*} JQuery object pointing to the grouped control.
 * @private
 */
rhizo.layout.TreeMapLayoutUI.prototype.renderSelector_ = function(
    label, selector) {
  return $('<div />', {'class': 'rhizo-layout-control'}).
      append($('<label />').text(label)).append(selector);
};

/**
 * Checks whether the project metamodel contains keys that define parent-child
 * relationships between models, so that hierarchical treemaps can be built.
 * @return {boolean} Whether the project allows hierarchical treemaps or not.
 * @private
 */
rhizo.layout.TreeMapLayoutUI.prototype.checkParentKeys_ = function() {
  for (var key in this.project_.metaModel()) {
    if (rhizo.layout.parentMatcher(key, this.project_.metaModel()[key])) {
      return true;
    }
  }
  return false;
};

rhizo.layout.TreeMapLayoutUI.prototype.setState = function(state) {
  this.areaSelector_.val(state.area);
  this.colorSelector_.val(state.color || '');  // color is optional
  if (this.parentKeySelector_) {
    this.parentKeySelector_.val(state.parentKey || '');  // parent is optional.
  }
};

/**
 * Updates the layout state whenever the user modifies the controls.
 * @private
 */
rhizo.layout.TreeMapLayoutUI.prototype.updateState_ = function() {
  var state = {
    area: this.areaSelector_.val(),
    color: this.colorSelector_.val()
  };
  if (this.parentKeySelector_) {
    state.parentKey = this.parentKeySelector_.val();
  }
  this.layout_.setStateFromUI(state);
};


// register the treemaplayout in global layout list
rhizo.layout.layouts.treemap = rhizo.layout.TreeMapLayout;
/* ./src/js/rhizo.model.loader.js */
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

/**
 * Definition of Rhizosphere loaders, and global functions to access the
 * registry of known loaders.
 *
 * A loader is responsible for loading the 3 main components a Rhizosphere
 * visualization needs to be properly displayed:
 *
 * - A list of models: This is the list of data items we want to visualize.
 * - A metamodel: A metamodel describes that attributes and properties that
 *     each model in the above list has.
 * - A renderer: A renderer creates HTML representations of models.
 *
 * A loader is a Javascript object that exposes the following constructor and
 * methods:
 * - A 1-arg constructor that receives the URI of the resource to load as a
 *     parameter.
 * - match():boolean: Decides whether the loader is capable of loading
 *     Rhizosphere models from the given resource URI.
 * - load(function callback, options, logger): Loads Rhizosphere models from the
 *     resource URI and invokes the callback once loading completes. The
 *     callback function accepts the metamodel, renderer and loaded models as
 *     parameters. 'options' contains visualization-wide configuration options
 *     that can be used to tune the loading. 'logger' is a generic logger that
 *     exposes error(), warn() and info() methods.
 *
 * Loaders should be registered in the rhizo.model.loader.loaders array.
 * When Rhizosphere is bootstrapped with a generic URI and an explicit loader is
 * not specified, it will scan such array to automatically find a suitable
 * loader to use among the known ones.
 */

// RHIZODEP=rhizo.gviz
namespace("rhizo.model.loader");

// Global registry of available loaders.
// Add elements to this array if you want Rhizosphere to be aware of your
// loader when it needs to load a new resource.
rhizo.model.loader.loaders = [];

// Global tracking of existing Javascript loaders, necessary to match the
// JSONP callbacks fired by included scripts to the right loader.
$globalJSONPLoaderCount = 0;
$globalJSONPLoaderMap = {};

// Plain Javascript file loader
rhizo.model.loader.JSONP = function(resource) {
  this.resource_ = resource;
  this.loaderCount_ = $globalJSONPLoaderCount++;
  $globalJSONPLoaderMap[this.loaderCount_] = this;
};
rhizo.model.loader.loaders.push(rhizo.model.loader.JSONP);

rhizo.model.loader.JSONP.prototype.match = function() {
  return /\.js$/.test(this.resource_);
};

rhizo.model.loader.JSONP.prototype.load = function(callback,
                                                   unused_options,
                                                   unused_logger) {
  this.callback_ = callback;
  var e = document.createElement("script");
  e.src = this.resource_ +
      '?jsonp=$globalJSONPLoaderMap[' +
      this.loaderCount_ +
      '].loadDone';
  e.type="text/javascript";
  document.getElementsByTagName("head")[0].appendChild(e);

  // we expect the script to contain the code the deploy the project,
  // in addition to just defining models and renderers.
};

rhizo.model.loader.JSONP.prototype.loadDone = function(payload) {
  this.callback_(payload.metamodel,
                 payload.renderer,
                 payload.models);
  $globalJSONPLoaderMap[this.loaderCount_] = null;
};

// Generic Google Visualization API (GViz) loader
rhizo.model.loader.GViz = function(resource) {
  this.resource_ = resource;
};
rhizo.model.loader.loaders.push(rhizo.model.loader.GViz);

rhizo.model.loader.GViz.prototype.match = function() {
  // Google Visualizations can be exposed under any URL. We leave to specific
  // implementations the task of matching against known GViz sources.
  return false;
};

rhizo.model.loader.GViz.prototype.load = function(callback, options, logger) {
  // The javascript http://www.google.com/jsapi and the visualization
  // package must be already included in the page and available at this point.
  if (typeof google == 'undefined' ||
      typeof google.visualization == 'undefined') {
    logger.error('Google Visualization APIs not available.');
  } else {
    var query = new google.visualization.Query(this.resource_);
    var that = this;  // needed to propagate this through the Gviz callback.
    query.send(function(response) {
      that.handleQueryResponse_(response, callback, options, logger);
    })
  }
};

rhizo.model.loader.GViz.prototype.handleQueryResponse_ =
    function(response, callback, options, logger) {
  if (response.isError()) {
    logger.error("GViz load failed: " + response.getMessage());
    return;
  }
  var initializer = new rhizo.gviz.Initializer(response.getDataTable(),
                                               logger, options);


  callback(initializer.metamodel,
           initializer.renderer,
           initializer.models);
};

// Google Spreadsheets loader (which follows the GViz spec).
rhizo.model.loader.GoogleSpreadsheets = function(resource) {
  rhizo.model.loader.GViz.call(this, resource);
};
rhizo.inherits(rhizo.model.loader.GoogleSpreadsheets, rhizo.model.loader.GViz);
rhizo.model.loader.loaders.push(rhizo.model.loader.GoogleSpreadsheets);

rhizo.model.loader.GoogleSpreadsheets.prototype.match = function() {
  return /spreadsheets\.google\.com/.test(this.resource_);
};

// Google Gadgets loader (which follows the GViz spec)
rhizo.model.loader.GoogleGadget = function(unused_resource) {
  rhizo.model.loader.GViz.call(this, unused_resource);
};
rhizo.inherits(rhizo.model.loader.GoogleGadget, rhizo.model.loader.GViz);
rhizo.model.loader.loaders.push(rhizo.model.loader.GoogleGadget);

rhizo.model.loader.GoogleGadget.prototype.match = function() {
  // Google Gadgets can load their data from any URL. This implementation
  // uses a google.visualization.GadgetHelper to extract the datasource URL
  // from the gadget prefs and therefore this loader must be explicitly
  // invoked.
  return false;
};

rhizo.model.loader.GoogleGadget.prototype.load = function(callback,
                                                          options,
                                                          logger) {
  if (typeof google == 'undefined' ||
      typeof google.visualization == 'undefined') {
    logger.error('Google Visualization APIs not available.');
    return;
  }

  if (typeof _IG_Prefs == 'undefined') {
    logger.error('Google Gadget APIs not available.');
    return;
  }

  var prefs = new _IG_Prefs();
  var gadgetHelper = new google.visualization.GadgetHelper();
  var query = gadgetHelper.createQueryFromPrefs(prefs);
  var that = this;  // needed to propagate this through the Gviz callback.
  query.send(function(response) {
    that.handleQueryResponse_(response, callback, options, logger);
  });
};


/**
 * Global function that load a resource containing a Rhizosphere
 * model and handle back the loaded models and associated meta information
 * to the given callback.
 *
 * This method is part of the default Rhizosphere bootstrap sequence (see
 * rhizo.bootstrap.Bootstrap), but can also be invoked explicitly if needed
 * by custom loaders.
 *
 * @param {string} resource the resource to load. Tipically this will be a URL.
 * @param {function(Array.<*>, *, *)} callback Callback function that will be
 *     invoked once the resource has been loaded and all data necessary for a
 *     Rhizosphere visualization (models, metamodel, renderer) are available.
 * @param {*} options Visualization-wide configuration options.
 * @param {*} logger A logger that exposes info(), error() and warn() logging
 *     functions.
 */
rhizo.model.loader.load = function(resource, callback, options, logger) {
  var loader_ctors = rhizo.model.loader.loaders;

  for (var i = 0; i < loader_ctors.length; i++) {
    var loader = new loader_ctors[i](resource);
    if (loader.match()) {
      loader.load(callback, options, logger);
      return;
    }
  }

  // TODO(battlehorse): The logger here might not be visible to the user
  // (e.g.: native console or NoOpLogger ), should we rely on alert() to
  // make sure the user receives the message?
  logger.error('No loader available for the resource: ' + resource);
};
/* ./src/js/extra/rhizo.broadcast.js */
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

// RHIZODEP=rhizo,rhizo.ui.component,rhizo.state
namespace("rhizo.broadcast");

/**
 * This file defines Rhizosphere broadcasting infrastructure. Visualizations
 * can publish their current state for other remote ones to follow.
 *
 * Broadcasting relies on existing Rhizosphere state management to distribute
 * the visualization state remotely:
 * - A 'broadcasting' visualization publishes its current state to a server.
 * - A 'follower' visualization receives notifications from the same server
 *   whenever state changes occur.
 *
 * Users can use this feature to enable a sort of 'presentation mode' for
 * visualizations.
 *
 * Broadcasting relies on AJAX and AppEngine Channel APIs respectively to send
 * and receive state changes. See appengine/src/py/handlers/broadcast.py for
 * details about the specific implementation.
 *
 * Broadcasting relies on 2 URL parameters which are shared from broadcasters to
 * all followers for them to identify and connect to the broadcasting
 * visualization:
 * - 'follow': An uuid to uniquely identify this visualization broadcasting
 *   session.
 * - 'pid': The project id of the broadcasting visualization. The following
 *   visualization must have the same pid for it to be able to follow the
 *   broadcaster.
 *
 * On the client side:
 * - both broadcasters and followers can stop/resume their activity. When
 *   following is resumed, the visualization state is updated to match the
 *   current state on the broadcasting side, reverting any local changes that
 *   may have been applied.
 * - A 'following' visualization does not explicitly disable its local controls.
 *   The follower state can therefore diverge from the broadcasting one if the
 *   user changes the local filters, selections, layout etc...
 *   It is up to the developer to roll out a restricted visualization whose UI
 *   does not permit this to happen, for example by using a custom template that
 *   disables layout, selection and filters (see rhizo.ui.component.js).
 *
 * Since broadcasting is built on top of Rhizosphere state managers, any local
 * state management feature works also for remote broadcasting. This implies,
 * for instance, that the local HTML5 history will record states received from
 * a remote broadcasting visualization. This allows a 'following' visualization
 * to replay all the operations performed remotely, even when the remote
 * broadcasting visualization is gone (or we have stopped following it).
 *
 * Broadcasting is an EXPERIMENTAL feature and as such is constrained and
 * limited in various ways:
 * - because of the use of Ajax and same-origin security policy, broadcasting
 *   will work only for visualizations that are served by the same server that
 *   is used to dispatch broadcast messages.
 *
 * - broadcasting relies on Google AppEngine Channel APIs. Any limitation that
 *   exists on the Channel API applies here too.
 *
 * - No notification exists about the number of remote users attending a given
 *   broadcasting visualization. No notification exists when new users join or
 *   leave a broadcasting visualization.
 *
 * - We do not deal with out-of-order messages.
 *
 * - Broadcasting is broken when multiple visualizations are present in a page.
 *   Since the broadcaster publishes the full state (including the state of
 *   other visualizations), this may interfere with the state of visualizations
 *   on the following side, even though they are not actively following
 *   anything.
 *
 * - Broadcasting uses unique URLs (to be shared with other participants) to
 *   let followers identify and connect to the visualization. As such,
 *   broadcasting may be impaired when the broadcaster or follower
 *   visualizations are in an embedded context, where the document URL may not
 *   be accessible / changeable.
 *
 * - Several other server-side limitations exist. See
 *   appengine/src/py/handlers/broadcast.py for details.
 */

// ToDO(battlehorse): Track the number of people attending.
// TODO(battlehorse): Detect channels closing/opening (both server and client).
// TODO(battlehorse): Handle receptoin of out-of-order states
// TODO(battlehorse): Do not broadcast the global state and/or only extract
//   the portion of state that affects the broadcast visualization, to avoid
//   corruption of other visualizations when multiple ones are present in a
//   page.

/**
 * A dual-purpose UI component to let the user start/stop broadcasting or
 * start/stop the remote following of a broadcasting visualization.
 *
 * @param {rhizo.Project} project  The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @constructor
 */
rhizo.broadcast.BaseComponent = function(project, options) {
  rhizo.ui.component.Component.call(this, project, options,
                                    'rhizo.broadcast.BaseComponent');
  this.specialized_component_ = null;
};
rhizo.inherits(rhizo.broadcast.BaseComponent, rhizo.ui.component.Component);

rhizo.broadcast.BaseComponent.prototype.title = function() {
  return 'Broadcast';
};

rhizo.broadcast.BaseComponent.prototype.render = function() {
  var broadcastPanel = $('<div />', {'class': 'rhizo-broadcast'});
  if (!rhizo.broadcast.globalTransmitter()) {
    this.project_.logger().warn(
        'Channels API not loaded. Broadcasting is disabled');
    return broadcastPanel.get(0);
  }

  // Decide whether we are following or not. If not, allow broadcasting.
  var urlParams = rhizo.util.urlParams();
  if ('follow' in urlParams && urlParams.pid == this.project_.uuid()) {
    // Start the component in following mode.
    this.specialized_component_ = new rhizo.broadcast.FollowComponent(
        this.project_, this.options_, urlParams['follow']);
  } else {
    // Start the component in broadcast mode.
    this.specialized_component_ = new rhizo.broadcast.BroadcastComponent(
        this.project_, this.options_);
  }

  broadcastPanel.append(this.specialized_component_.render());
  return broadcastPanel.get(0);
};

rhizo.broadcast.BaseComponent.prototype.metaReady = function() {
  this.specialized_component_.metaReady();
};

rhizo.broadcast.BaseComponent.prototype.ready = function() {
  this.specialized_component_.ready();
};


/**
 * A component specialed for following visualizations, that lets the user
 * stop/resume following. The componet tries to attach to the broadcasting
 * channel at startup.
 *
 * @param {rhizo.Project} project  The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @param {string} followed_channel_uuid The broadcasting channel uuid.
 * @constructor
 */
rhizo.broadcast.FollowComponent = function(project,
                                           options,
                                           followed_channel_uuid) {
  rhizo.ui.component.Component.call(this, project, options);
  this.followed_channel_uuid_ = followed_channel_uuid;
  this.following_ = false;
};
rhizo.inherits(rhizo.broadcast.FollowComponent, rhizo.ui.component.Component);

rhizo.broadcast.FollowComponent.prototype.render = function() {
  this.follow_ = $('<button />', {'disabled': 'disabled'}).text('Initializing');
  this.tip_ = $('<p />');
  return [this.follow_.get(0), this.tip_.get(0)];
};

rhizo.broadcast.FollowComponent.prototype.ready = function() {
  this.resumeFollowing_();
  this.follow_.removeAttr('disabled').click(jQuery.proxy(function() {
    if (this.following_) {
      this.stopFollowing_();
    } else {
      this.resumeFollowing_();
    }
  }, this));
};

/**
 * Resumes following the remote broadcasting visualization.
 * @private
 */
rhizo.broadcast.FollowComponent.prototype.resumeFollowing_ = function() {
  this.follow_.text('Wait ...');
  this.tip_.text('Connecting to the remote visualization...');
  rhizo.broadcast.globalTransmitter().follow(
      this.followed_channel_uuid_, true, jQuery.proxy(function(status,
                                                               text,
                                                               initial) {
    if (status) {
      // successfully following the channel.
      // The server will now send updates to us.

      // Start a binder to collect states received over the wire.
      // The project overlord is guaranteed to exist here, since the ready()
      // component phase occurs after its creation.
      var projectOverlord =
          rhizo.state.getMasterOverlord().projectOverlord(this.project_);
      var binder = new rhizo.broadcast.FollowStateBinder(
          projectOverlord, rhizo.broadcast.globalTransmitter());

      // Bind the project state to the states received over the wire.
      projectOverlord.addBinding(binder);

      if (initial && initial.state) {
        // If the broadcasting visualization is still in its initial state,
        // we won't receive any initial state here.
        rhizo.state.getMasterOverlord().setInitialState(
            rhizo.broadcast.BINDER_KEY, initial.state, true);
      }

      // Update UI.
      this.follow_.text('Stop');
      this.tip_.text('You are following a remote visualization.');

      // Flip switch.
      this.following_ = true;
    } else {
      this.follow_.text('Retry');
      this.tip_.text(text);
    }
  }, this));
};

/**
 * Stops following the remote broadcasting visualization
 * @private
 */
rhizo.broadcast.FollowComponent.prototype.stopFollowing_ = function() {
  this.follow_.text('Wait ...');
  this.tip_.text('Disconnecting from remote visualization...');
  rhizo.broadcast.globalTransmitter().follow(
      this.followed_channel_uuid_, false, jQuery.proxy(function(status, text) {
    if (status) {
      // successfully un-following the channel.
      // The server will no longer push updates to us.

      // Stop the project from receiving remote states.
      var projectOverlord =
          rhizo.state.getMasterOverlord().projectOverlord(this.project_);
      var binder = projectOverlord.removeBinding(rhizo.broadcast.BINDER_KEY);

      // Stop listening to states changes received by the transmitter.
      binder.unlisten();

      // Update UI.
      this.follow_.text('Resume');
      this.tip_.text('Resume following the visualization.');

      // Flip switch.
      this.following_ = false;
    } else {
      this.follow_.text('Retry');
      this.tip_.text(text);
    }
  }, this));
};


/**
 * A component specialed for broadcasting visualizations, that lets the user
 * start/stop broadcasting the visualization state.
 *
 * @param {rhizo.Project} project  The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @constructor
 */
rhizo.broadcast.BroadcastComponent = function(project, options) {
  rhizo.ui.component.Component.call(this, project, options);
  this.broadcasting_ = false;
};
rhizo.inherits(rhizo.broadcast.BroadcastComponent,
    rhizo.ui.component.Component);

rhizo.broadcast.BroadcastComponent.prototype.render = function() {
  this.share_ = $('<button />', {'disabled': 'disabled'}).text('Broadcast');
  this.tip_ = $('<p />').text('Let others follow this visualization.');
  this.shareUrl_ = $('<input />', {type: 'text',
                                   'class': 'rhizo-broadcast-url'});

  return [this.share_.get(0), this.tip_.get(0), this.shareUrl_.get(0)];
};

rhizo.broadcast.BroadcastComponent.prototype.ready = function() {
  this.share_.removeAttr('disabled').click(jQuery.proxy(function() {
    if (this.broadcasting_) {
      this.stopBroadcasting_();
    } else {
      this.startBroadcasting_();
    }
  }, this));
};

/**
 * Starts broadcasting.
 * @private
 */
rhizo.broadcast.BroadcastComponent.prototype.startBroadcasting_ = function() {
  this.share_.text('Wait ...');
  rhizo.broadcast.globalTransmitter().open(jQuery.proxy(function(status,
                                                                 text) {
    if (status) {  // broadcast channel successfully opened.

      // Start a binder to collect state changes that occur locally.
      var projectOverlord =
          rhizo.state.getMasterOverlord().projectOverlord(this.project_);
      var binder = new rhizo.broadcast.BroadcastStateBinder(
          projectOverlord, rhizo.broadcast.globalTransmitter());

      // Start publishing local state changes that we are notified of to the
      // transmitter.
      projectOverlord.addBinding(binder);

      // Update UI.
      // Give the user a URL that he can share with any other person that
      // wants to follow this visualization state.
      this.tip_.text('Share this URL for others to join.');
      this.share_.text('Stop');
      this.shareUrl_.
          val(rhizo.util.buildUrl(null,
                                  {follow: text, pid: this.project_.uuid()})).
          show('fast').
          focus().
          select();

      // Flip the switch.
      this.broadcasting_ = true;
    } else {  // broadcast channel couldn't be opened.
      this.tip_.text(text);
      this.share_.text('Broadcast');
    }
  }, this));
};

/**
 * Stops broadcasting.
 * @private
 */
rhizo.broadcast.BroadcastComponent.prototype.stopBroadcasting_ = function() {
  // Stop collecting local state changes.
  var projectOverlord =
      rhizo.state.getMasterOverlord().projectOverlord(this.project_);
  var binder = projectOverlord.removeBinding(rhizo.broadcast.BINDER_KEY);

  // Update UI.
  this.tip_.text('Let others follow this visualization.');
  this.share_.text('Broadcast');
  this.shareUrl_.hide().val('');

  // Flip the switch.
  this.broadcasting_ = false;
};

/**
 * Unique key that identifies that broadcasting binding among other state
 * management binders.
 * @type {string}
 */
rhizo.broadcast.BINDER_KEY = 'broadcast';

/**
 * A state manager binding that listens for state changes occurred to a
 * remote visualization and publishes them to the local state manager.
 *
 * @param {rhizo.state.ProjectOverlord} overlord The state manager for the
 *     project this binder is attached to.
 * @param {rhizo.broadcast.Transmitter} transmitter The transmitter that
 *     receives notifications of state changes occurred remotely.
 * @constructor
 */
rhizo.broadcast.FollowStateBinder = function(overlord, transmitter) {
  rhizo.state.StateBinder.call(this, overlord, rhizo.broadcast.BINDER_KEY);
  this.transmitter_ = transmitter;
  this.transmitter_.listen('__binder__', jQuery.proxy(function(data) {
    this.stateReceived_(data);
  }, this));
};
rhizo.inherits(rhizo.broadcast.FollowStateBinder, rhizo.state.StateBinder);

/**
 * Callback invoked when a remote state has been received by the transmitter.
 * @param {*} data Plain javascript object containing the remote visualization
 *     state.
 * @private
 */
rhizo.broadcast.FollowStateBinder.prototype.stateReceived_ = function(data) {
  this.overlord_.transition(this.key(), data.delta, data.state, data.replace);
};

/**
 * Stops listening for remote state changes.
 */
rhizo.broadcast.FollowStateBinder.prototype.unlisten = function() {
  this.transmitter_.unlisten('__binder__');
};

/**
 * Since we are following a remote visualization, there's nothing to do when
 * a local change occurs.
 */
rhizo.broadcast.FollowStateBinder.prototype.onTransition = function() {};


/**
 * A state manager binding that publishes local state changes for remote
 * visualizations to follow.
 *
 * @param {rhizo.state.ProjectOverlord} overlord The state manager for the
 *     project this binder is attached to.
 * @param {rhizo.broadcast.Transmitter} transmitter The transmitter that
 *     publishes notifications of state changes occurred locally.
 * @constructor
 */
rhizo.broadcast.BroadcastStateBinder = function(overlord, transmitter) {
  rhizo.state.StateBinder.call(this, overlord, rhizo.broadcast.BINDER_KEY);
  this.transmitter_ = transmitter;
};
rhizo.inherits(rhizo.broadcast.BroadcastStateBinder, rhizo.state.StateBinder);

/**
 * Publishes a local state change to the transmitter, so that it can be
 * sent to remote visualizations.
 */
rhizo.broadcast.BroadcastStateBinder.prototype.onTransition = function(
    delta, state, opt_replace) {
  this.transmitter_.publish(
      {delta: delta, state: state, replace: opt_replace || false});
};


/**
 * Wrapper around the Google AppEngine Channel APIs and other Ajax callbacks
 * used to broadcast and receive visualization states to/from remote
 * visualizations.
 *
 * @constructor
 */
rhizo.broadcast.Transmitter = function() {
  this.channel_ = null;
  this.socket_ = null;
  this.channel_uuid_ = null;

  this.listen_callbacks_ = {};
};

/**
 * Registers a listener to be notified whenever a message is received.
 * @param {string} key A unique key that identifies the listener.
 * @param {function(*)} callback The callback that will be invoked when a
 *     message is received. It receives a single parameter, the message itself
 *     (which will be a plain untyped javascript object).
 */
rhizo.broadcast.Transmitter.prototype.listen = function(key, callback) {
  this.listen_callbacks_[key] = callback
};

/**
 * Removes a listener.
 * @param {string} key The unique key that identies the listener.
 */
rhizo.broadcast.Transmitter.prototype.unlisten = function(key) {
  delete this.listen_callbacks_[key];
};

/**
 * Instructs the transmitter to start/stop following a given channel. Once
 * following, this transmitter will receive all messages remotely published on
 * the channel.
 *
 * This method is asynchronous. The communication channel will be opened if it's
 * not open yet.
 *
 * @param {string} follow_uuid The uuid of the channel to follow.
 * @param {boolean} enable Whether to start or stop following the channel.
 * @param {function(boolean, string, *)} callback Callback invoked upon
 *     success/failure of the follow operation. It receives up to 3 parameters.
 *     The first is a boolean status flag for success/failure.
 *     On failure the second parameter will contain the description of the error
 *     that occurred.
 *     On success, the second parameter is unused, and the third will contain
 *     the current channel state (i.e. the current state of the remote
 *     visualization being followed), if any.
 */
rhizo.broadcast.Transmitter.prototype.follow = function(follow_uuid,
                                                        enable,
                                                        callback) {
  if (!this.channel_uuid_) {
    // Try opening the channel if it's not established yet.
    this.open(jQuery.proxy(function(status, text) {
      if (!status) {
        // bubble up if we couldn't open the channel.
        callback(status, text);
      } else {
        // otherwise try again issuing the follow statement now that the channel
        // is open.
       this.follow(follow_uuid, enable, callback); 
      }
    }, this));
    return;
  }
  $.ajax({
    url: '/broadcast/follow',
    dataType: 'json',
    type: 'POST',
    data: {uuid: this.channel_uuid_,
           follow: follow_uuid,
           enable: enable ? '1' : '0'},
    error: function(xhr, status, error) {
      callback(false, 'Error changing follow status');
    },
    success: function(data, status, xhr) {
      if (data.status != 'ok') {
        callback(false, 'Error changing follow status: ' + data.status);
      } else {
        if (enable) {
          callback(true, null, JSON.parse(data.initial));
        } else {
          callback(true);
        }

      }
    }
  })
};

/**
 * Publishes a given message on the channel managed by this transmitter.
 * The channel must be opened via open() first.
 *
 * This method is asynchronous.
 *
 * @param {*} message A plain Javascript object containing the payload to
 *     publish. Must be possible to serialize it as JSON.
 * @param {function(boolean, string)} opt_callback An optional callback function
 *     invoked upon success/failure of the publish operation.
 *     It receives 2 parameters: the first is a boolean defining
 *     success/failure, the second is an error message in case of failure.
 */
rhizo.broadcast.Transmitter.prototype.publish = function(message,
                                                         opt_callback) {
  if (!this.channel_uuid_) {
    if (opt_callback) {
      opt_callback(false, 'Channel is not established yet.');
    }
    return;
  }

  $.ajax({
    url: '/broadcast/publish',
    dataType: 'json',
    type: 'POST',
    data: {uuid: this.channel_uuid_, payload: JSON.stringify(message)},
    error: function(xhr, status, error) {
      if (opt_callback) {
        opt_callback(false, 'Error publishing message');
      }
    },
    success: function(data, status, xhr) {
      if (data.status != 'ok') {
        if (opt_callback) {
          opt_callback(false, 'Error publishing message: ' + data.status);
        }
      } else {
        if (opt_callback) {
          opt_callback(true);
        }
      }
    }
  })
};

/**
 * Opens a channel for publishing / receiving messages to/from remote
 * visualizations.
 *
 * This method is asynchronous.
 *
 * @param {function(boolean, string)} callback A callback function invoked upon
 *     success/failure of the open operation. It receives 2 parameters: the
 *     first is a boolean defining success/failure, the second is an error
 *     message in case of failure or the uuid of the opened channel in case
 *     of success.
 */
rhizo.broadcast.Transmitter.prototype.open = function(callback) {
  if (this.channel_uuid_) {
    callback(true, this.channel_uuid_);
    return;
  }
  $.ajax({
    url: '/broadcast/open',
    dataType: 'json',
    type: 'POST',
    error: function(xhr, status, error) {
      callback(false, 'Error opening channel.');
    },
    success: jQuery.proxy(function(data, status, xhr) {
      if (data.status != 'ok') {
        callback(false, 'Error opening channel: ' + data.status);
      } else {
        this.openChannel_(data.channel_token, data.channel_uuid, callback);
      }
    }, this)
  });
};

/**
 * Callback invoked whenever a message is received from the underlying channel.
 * @param {*} evt
 * @private
 */
rhizo.broadcast.Transmitter.prototype.messageReceived_ = function(evt) {
  var message = JSON.parse(evt.data);
  for (var listen_key in this.listen_callbacks_) {
    this.listen_callbacks_[listen_key](message);
  }
};

/**
 * Callback invoked after the first of the 2 handshaking steps required for
 * channel opening, once the channel has been created server side.
 *
 * @param {string} channel_token The token to create the client-side stub of the
 *     channel that has been created on the server.
 * @param {string} channel_uuid The unique id of the channel, that will be used
 *     for all future communications on the channel.
 * @param {function(boolean, string)} callback Callback function passed on by
 *     open(), to be invoked upon success/failure of the entire open operation.
 * @private
 */
rhizo.broadcast.Transmitter.prototype.openChannel_ = function(
    channel_token, channel_uuid, callback) {
  this.channel_ = new goog.appengine.Channel(channel_token);
  this.socket_ = this.channel_.open();
  this.socket_.onopen = jQuery.proxy(function() {
    this.confirmOpenChannel_(channel_uuid, callback);
  }, this);
  this.socket_.onmessage = jQuery.proxy(this.messageReceived_, this);
};

/**
 * Issues the second request to complete the handshaking and put the channel
 * into established (working) mode. Invoked once the local client channel stub
 * has been successfully created.
 *
 * @param {string} channel_uuid The unique id of the channel, that will be used
 *     for all future communications on the channel.
 * @param {function(boolean, string)} callback Callback function passed on by
 *     open(), to be invoked upon success/failure of the entire open operation.
 */
rhizo.broadcast.Transmitter.prototype.confirmOpenChannel_ = function(
    channel_uuid, callback) {
  $.ajax({
    url: '/broadcast/connect',
    dataType: 'json',
    data: {uuid: channel_uuid},
    type: 'POST',
    error: function(xhr, status, error) {
      callback(false, 'Error confirming channel opening.');
    },
    success: jQuery.proxy(function(data, status, xhr) {
      if (data.status != 'ok') {
        callback(false, 'Error confirming channel opening: ' + data.status);
      } else {
        this.channel_uuid_ = channel_uuid;
        callback(true, channel_uuid);
      }
    }, this)
  })
};


/**
 * The singleton transmitter that manages all communications to/from remote
 * visualizations.
 *
 * @type {rhizo.broadcast.Transmitter}
 * @private
 */
rhizo.broadcast.transmitter_ = null;
if (typeof(goog) != 'undefined' &&
    typeof(goog.appengine) != 'undefined' &&
    typeof(goog.appengine.Channel) != 'undefined') {
    rhizo.broadcast.transmitter_ = new rhizo.broadcast.Transmitter();
}


/**
 * @return {rhizo.broadcast.Transmitter} The singleton transmitter that manages
 * all communications to/from remote visualizations. Will be null if
 * message publishing/following is not enabled (for example, Google AppEngine
 * Channel APIs are not available or have not been loaded).
 */
rhizo.broadcast.globalTransmitter = function() {
  return rhizo.broadcast.transmitter_;
};/* ./src/js/rhizo.ui.gui.js */
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

// RHIZODEP=rhizo.ui.component,rhizo
// GUI Namespace
namespace("rhizo.ui.gui");

/**
 * The visualization GUI, defined by the overall container, viewport, universe
 * and a collection of UI Components.
 *
 * @param {HTMLElement} container The HTML element that will contain the
 * @param {string} platform The platform we are currently running on (e.g.:
 *     'mobile', 'default' ... ).
 * @param {string} device The device we are currently running on (e.g.:
 *     'ipad', 'iphone', 'android', 'default' ... ).
 * @constructor
 */
rhizo.ui.gui.GUI = function(container, platform, device) {
  // The target platform we are rendering onto (e.g.: 'mobile').
  this.platform_ = platform;

  // The specific device we are targeting (e.g.: 'ipad').
  this.device_ = device;

  // A JQuery object pointing to the DOM element that contains the whole
  // Rhizosphere instance.
  this.container = $(container);
  this.is_small_container_ = false;
  this.initContainer_();

  // The universe component is the container for all the models managed
  // by Rhizosphere. A universe must always exist in a Rhizosphere
  // visualization.
  this.universe = null;

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

rhizo.ui.gui.GUI.prototype.done = function() {
  var kbParam = rhizo.util.urlParams()['kb'];
  if (kbParam && /true|yes|1/.test(kbParam)) {
    this.activateOnscreenKeyboard();
  }
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

rhizo.ui.gui.GUI.prototype.activateOnscreenKeyboard = function() {
  if (rhizo.keyboard && rhizo.keyboard.Keyboard) {
    new rhizo.keyboard.Keyboard(this.container);
  }
};
/* ./src/js/rhizo.bootstrap.js */
/*
  Copyright 2009 The Rhizosphere Authors. All Rights Reserved.

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

// RHIZODEP=rhizo.model.loader,rhizo.base,rhizo.ui.component,rhizo.jquery,rhizo.ui.gui
namespace('rhizo.bootstrap');


/**
 * Uuid counter to uniquely identify the container of each visualization within
 * the document.
 * @type {number}
 * @private
 */
rhizo.bootstrap.uuids_ = 0;


/**
 * A Bootstrap is the main entry point to start a Rhizosphere visualization.
 * It takes care of loading the data to visualize, create the chrome and other
 * ui elements for the visualization, and bind all the necessary event handlers.
 *
 * @param {HTMLElement} container The HTML element that will contain the
 *     visualization.
 * @param {*} opt_options Visualization-wide configuration options.
 * @param {?function(rhizo.Project)} opt_callback
 *     Optional callback invoked on the visualization is completely initialized.
 *     Receives the rhizo.Project managing the visualization as a parameter.
 * @constructor
 */
rhizo.bootstrap.Bootstrap = function(container, opt_options, opt_callback) {
  this.container_ = container;
  var containerId = $(container).attr('id');
  if (!containerId || containerId.length == 0) {
    // Generates a unique element id for the visualization container if one
    // isn't defined yet.
    // The generated id must be consistent over time (assuming the order of
    // bootstrap calls does not change over time when multiple visualizations
    // are present), since long-lived Rhizosphere state representations are
    // based on this.
    $(container).attr('rhizo-uuid-' + (rhizo.bootstrap.uuids_++));
  }
  this.options_ = { selectfilter: '.rhizo-model:visible',
                    enableHTML5History: true,
                    enableAnims: true};
  if (opt_options) {
    $.extend(this.options_, opt_options);
  }
  this.ready_callback_ = opt_callback;
};

/**
 * Performs all the necessary steps to prepare a Rhizosphere visualization, and
 * then tries loading the given datasource and display it.
 *
 * @param {string} opt_resource The URI of the datasource to load and visualize
 *     with Rhizosphere. If null and the bootstrapper is not allowed to
 *     configure itself from URL parameters, this method behaves like prepare().
 * @return {rhizo.Project} The visualization Project through which you can
 *     have programmatic access to the visualization.
 */
rhizo.bootstrap.Bootstrap.prototype.prepareAndDeploy = function(opt_resource) {
  var project = this.prepare();
  this.deploy(opt_resource);
  return project;
};

/**
 * Performs all the necessary steps to prepare a Rhizosphere visualization, up
 * to the point where it can receive the models to display.
 *
 * Use this method in conjunction with deploy() if you want to be in charge
 * of loading the actual models to visualize.
 *
 * @return {rhizo.Project} The visualization Project through which you can
 *     have programmatic access to the visualization.
 */
rhizo.bootstrap.Bootstrap.prototype.prepare = function() {
  // Initialize the GUI, project and template.
  this.gui_ = this.initGui_();
  this.project_ = new rhizo.Project(this.gui_, this.options_);
  this.template_ = this.initTemplate_(this.project_, this.gui_, this.options_);
  this.project_.chromeReady();
  return this.project_;
};

/**
 * Loads the data items to visualize from the given datasource URI and displays
 * them in the Rhizosphere visualization managed by this bootstrapper.
 * The boostrapper must have already been prepared before invoking this method.
 *
 * @param {string} opt_resource The URI of the datasource to load and visualize
 *     with Rhizosphere. If null, and the bootstrapper is allowed to configure
 *     itself from the URL parameters, it'll try to extract the datasource URI
 *     from the URL.
 */
rhizo.bootstrap.Bootstrap.prototype.deploy = function(opt_resource) {
  // Identify if we have to load a Rhizosphere datasource. Either we received
  // this information explicitly or we try finding it in the URL.
  var resource = opt_resource || this.tryInitResourceFromUrl_();

  if (resource) {
    rhizo.model.loader.load(resource,
                            jQuery.proxy(this.deployExplicit, this),
                            this.options_,
                            this.project_.logger());
  }
};

/**
 * Loads the data items to visualize via the given loader instance and displays
 * them in the Rhizosphere visualization managed by this bootstrapper.
 * The boostrapper must have already been prepared before invoking this method.
 *
 * @param {*} loader A model loader as defined in rhizo.model.loader.js
 */
rhizo.bootstrap.Bootstrap.prototype.deployWithLoader = function(loader) {
  loader.load(jQuery.proxy(this.deployExplicit, this),
              this.options_, this.project_.logger());
};

/**
 * Displays the given data items (models) in the Rhizosphere visualization
 * managed by this bootstrapper. The boostrapper must have already been
 * prepared before invoking this method.
 *
 * @param {*} metamodel A descriptor for the attributes and properties that
 *     each model in the visualization has.
 * @param {*} renderer A component capable of creating HTML representation of
 *     model instances.
 * @param {Array.<*>} models The list of data items to visualize.
 */
rhizo.bootstrap.Bootstrap.prototype.deployExplicit = function(metamodel,
                                                              renderer,
                                                              models) {
  this.project_.setMetaModel(metamodel);
  this.project_.setRenderer(renderer);

  if (renderer.getSizeRange || renderer.getColorRange) {
    this.template_.addComponent(new rhizo.ui.component.Legend(this.project_,
                                                              this.options_));
  }

  if (this.project_.metaReady()) {
    this.template_.metaReady();
    this.project_.deploy(models);
    this.template_.ready();
  }
  this.gui_.done();
  if (this.ready_callback_) {
    this.ready_callback_(this.project_);
  }
};

/**
 * Identify the platform and device we are running onto.
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.identifyPlatformAndDevice_ = function() {
  if (this.options_.platform && this.options_.device) {
    return {platform: this.options_.platform,
            device: this.options_.device};
  }
  var ua = navigator.userAgent;
  if (ua.toLowerCase().indexOf('ipad') != -1) {
    return {platform: 'mobile', device: 'ipad'};
  } else if (ua.toLowerCase().indexOf('iphone') != -1) {
    return {platform: 'mobile', device: 'iphone'};
  } else if (ua.toLowerCase().indexOf('android') != -1) {
    return {platform: 'mobile', 'device': 'android'};
  }
  return {platform: 'default', device: 'default'};
};

/**
 * Identifies the best template to use for the visualization.
 * @param {rhizo.ui.gui.GUI} gui
 * @param {*} options
 * @return {function(rhizo.Project):rhizo.ui.component.Template} A factory for
 *     the template to use.
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.identifyTemplate_ = function(gui, options) {
  if (options.template &&
      options.template in rhizo.ui.component.templates) {
    return rhizo.ui.component.templates[options.template];
  }

  // No specific template has been forced. Select a specific one based on
  // document size and target platform.
  if (gui.isMobile() || gui.isSmall()) {
    return rhizo.ui.component.templates['bottom'];
  }
  return rhizo.ui.component.templates['default'];
};

/**
 * Identifies the platform and device we are running upon and creates a GUI
 * for this project.
 * @return {rhizo.ui.gui.GUI} The project GUI.
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.initGui_ = function() {
  // Identify the target platform and device we are running onto.
  var platformDevice = this.identifyPlatformAndDevice_();

  // Create the GUI.
  var gui = new rhizo.ui.gui.GUI(this.container_,
                                 platformDevice.platform,
                                 platformDevice.device);
  gui.disableFx(!this.options_.enableAnims);

  // Extends jQuery with all the additional behaviors required by Rhizosphere
  // Disable animations and other performance tunings if needed.
  //
  // TODO(battlehorse): this must happen at the global level, and not locally
  // for every single visualization.
  // See http://code.google.com/p/rhizosphere/issues/detail?id=68.
  rhizo.jquery.init(gui, this.options_.enableAnims, true);

  return gui;
};

/**
 * Initializes the template that will render this project chrome.
 * @param {rhizo.Project} project
 * @param {rhizo.ui.gui.GUI} gui
 * @param {*} options
 * @return {rhizo.ui.component.Template} The project template.
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.initTemplate_ = function(project,
                                                             gui,
                                                             options) {
  // Identify the target device and template to use.
  var templateFactory = this.identifyTemplate_(gui, options);
  var template = templateFactory(project, options);

  // Get the minimum chrome up and running.
  template.render();
  return template;
};

/**
 * If the bootstrapper is allowed to extract parameters from the document
 * location, tries extracting the URI of the resource to display from the there.
 *
 * @return {string} The URI of the resource to load and display.
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.tryInitResourceFromUrl_ = function() {
  if (!this.options_.allowConfigFromUrl) {
    this.project_.logger().warn(
        'Sources extraction from url is disabled');
    return null;
  }

  var urlparams = rhizo.util.urlParams();
  var resource = urlparams['source'] || urlparams['src'];
  if (!resource) {
    this.project_.logger().error(
        'Unable to identify datasource from location');
    return null;
  }
  return decodeURIComponent(resource);
};
