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
      var minSlide = this.slider.slider('values',0);
      var maxSlide = this.slider.slider('values',1);
      if (minSlide == ui.value) {
        // min slider has moved
        minLabel.text(this.meta.toHumanLabel_(this.meta.toModelScale_(minSlide))).
                 addClass("rhizo-slider-moving");
        maxLabel.removeClass("rhizo-slider-moving");
      } else {
        // max slider has moved
        maxLabel.text(this.meta.toHumanLabel_(this.meta.toModelScale_(maxSlide))).
                 addClass("rhizo-slider-moving");
        minLabel.removeClass("rhizo-slider-moving");
      }
  }, {meta: this, slider: slider});

  // wrap change handler into a closure to preserve access to the RangeKind
  // filter.
  var stopCallback = jQuery.proxy(function(ev, ui) {
      var minSlide = Math.max(this.slider.slider('values',0),
                              minFilterScale);
      var maxSlide = Math.min(this.slider.slider('values',1),
                              maxFilterScale);
      minLabel.text(this.meta.toHumanLabel_(this.meta.toModelScale_(minSlide))).
               removeClass("rhizo-slider-moving");
      maxLabel.text(this.meta.toHumanLabel_(this.meta.toModelScale_(maxSlide))).
               removeClass("rhizo-slider-moving");
      project.filter(key, { min: minSlide, max: maxSlide });
  }, {meta: this, slider: slider});

  $(slider).slider({
    stepping: metadata.stepping,
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

rhizo.meta.RangeKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  var scaledMinValue = this.toModelScale_(filterValue.min);
  var scaledMaxValue = this.toModelScale_(filterValue.max);
  return modelValue >= scaledMinValue && modelValue <= scaledMaxValue;
};

rhizo.meta.RangeKind.prototype.compare =
    rhizo.meta.NumberKind.prototype.compare;

rhizo.meta.RangeKind.prototype.cluster =
    rhizo.meta.NumberKind.prototype.cluster;

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
  }
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
  }
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

rhizo.meta.DecimalRangeKind.prototype.toModelScale_ = function(filterValue) {
  // toFixed() returns a string, hence the need to parseFloat()
  return parseFloat((filterValue / this.scale_).toFixed(this.precision_));
};

rhizo.meta.DecimalRangeKind.prototype.toFilterScale_ = function(modelValue) {
  return parseInt(modelValue * this.scale_, 10);
};

rhizo.meta.DecimalRangeKind.prototype.toHumanLabel_ =
  rhizo.meta.RangeKind.prototype.toHumanLabel_;

/**
   LogarithmRangeKind meta: A specialized filter that can render range sliders
   according to a Log10 scale.
   This filter reuses what provided by the DecimalRangeKind filter.
*/
rhizo.meta.LogarithmRangeKind = function(opt_precision) {
  this.precision_ = opt_precision || 2;
  this.scale_ = Math.pow(10, this.precision_);
};

rhizo.meta.LogarithmRangeKind.prototype.renderFilter =
  rhizo.meta.DecimalRangeKind.prototype.renderFilter;

rhizo.meta.LogarithmRangeKind.prototype.survivesFilter =
    rhizo.meta.DecimalRangeKind.prototype.survivesFilter;

rhizo.meta.LogarithmRangeKind.prototype.compare =
    rhizo.meta.DecimalRangeKind.prototype.compare;

rhizo.meta.LogarithmRangeKind.prototype.cluster =
    rhizo.meta.DecimalRangeKind.prototype.cluster;

rhizo.meta.LogarithmRangeKind.prototype.toModelScale_ = function(filterValue) {
  // toFixed() returns a string, hence the need to parseFloat()
  return parseFloat(Math.pow(10, filterValue / this.scale_).toFixed(this.precision_));
};

rhizo.meta.LogarithmRangeKind.prototype.toFilterScale_ = function(modelValue) {
  return parseInt(rhizo.util.log10_(modelValue) * this.scale_, 10);
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


// Register the extra filters
rhizo.meta.Kind.DECIMAL = new rhizo.meta.DecimalKind();
rhizo.meta.Kind.DECIMALRANGE = new rhizo.meta.DecimalRangeKind();
rhizo.meta.Kind.LOGARITHMRANGE = new rhizo.meta.LogarithmRangeKind();
rhizo.meta.Kind.STRINGARRAY = new rhizo.meta.StringArrayKind();
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

rhizo.model.SuperModel = function(model, opt_selected, opt_filtered) {
  this.model = model;
  this.id = model.id;
  this.selected = opt_selected || false;
  this.filters_ = {}; // a map of filter status, one for each model key
  this.rendering = null;
  this.expanded = false; // whether the rendering is expanded or not

  this.renderingRescaler = null;
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
  return this.renderingRescaler.rescale(
    $('.rhizo-naked-render', this.rendering),
    width, height, opt_failure_callback);
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
    model.renderingRescaler = renderer;
  } else {
    model.renderingRescaler = new rhizo.ui.defaultRenderingRescaler();
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

- implement the details() function (optional)
  This renders a piece of UI you can use to collect extra options
  for your layout

- implement the cleanup() function (optional)
  If your layout creates data structures or UI components that
  have to be cleaned up

- update the rhizo.layout.layouts structure
*/

// RHIZODEP=rhizo.log,rhizo.meta
namespace("rhizo.layout");

/**
 * Creates a dropdown control that enumerates all the metaModel keys.
 * @param {rhizo.Project} project
 * @param {string} className
 * @return {Element} the jquery-enhanced HTML dropdown control
 */
rhizo.layout.metaModelKeySelector = function(project, className) {
  var select = $("<select class='" + className + "' />");
  if (project && project.metaModel()) {
    for (key in project.metaModel()) {
      select.append("<option value='" + key + "'>" +
                    project.metaModel()[key].label + "</option>");
    }
  }
  return select;
};

rhizo.layout.NoLayout = function(unused_project) {};

rhizo.layout.NoLayout.prototype.layout = function(container,
                                                  supermodels,
                                                  allmodels,
                                                  meta,
                                                  opt_options) {};

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
                                                    opt_options) {
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
    var r = $(supermodels[i].rendering);
    lineHeight = Math.max(lineHeight, r.height());

    if (this.left + r.width() > maxWidth) {
      this.left = 5;
      this.top += lineHeight + 5;
      lineHeight = r.height();
    }

    r.move(this.top, this.left);
    this.left += r.width() + 5;
  }
  // adjust top after last line
  this.top += lineHeight;
};

rhizo.layout.FlowLayout.prototype.overrideDetailControls = function(
  orderSelector, reverseCheckbox) {
  this.orderSelector_ = orderSelector;
  this.reverseCheckbox_ = reverseCheckbox;
};

rhizo.layout.FlowLayout.prototype.cleanup = function(sameEngine, opt_options) {
  this.top = this.left = 5;
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
                                                        opt_options) {
  if (opt_options && opt_options.filter) {
    return; // re-layouting because of filtering doesn't affect the layout
  }
  var maxWidth = Math.round(container.width()*0.3) ;
  var maxHeight = Math.round(container.height()*0.3);

  for (var i = 0, len = supermodels.length; i < len; i++) {
    var r = $(supermodels[i].rendering);
    var top = Math.round(container.height() / 3 +
                         Math.random()*maxHeight*2 - maxHeight);
    var left = Math.round(container.width() / 3 +
                          Math.random()*maxWidth*2 - maxWidth);

    r.move(top, left);
  }
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
                                                      opt_options) {
  var reverse = this.reverseCheckbox_.is(":checked");

  // detect bucket
  var bucketBy = this.bucketSelector_.val();
  if (!meta[bucketBy]) {
    this.project_.logger().error("layoutBy attribute does not match any property");
    return;
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

  for (var i = 0; i < bucketKeys.length; i++) {
    var bucketKey = bucketKeys[i];
    this.renderBucketHeader_(container, bucketsLabels[bucketKey]);
    this.internalFlowLayout_.layout(container,
                                    buckets[bucketKey],
                                    allmodels,
                                    meta,
                                    opt_options);

    // re-position for next bucket
    this.internalFlowLayout_.top += 10;
    this.internalFlowLayout_.left = 5;
  }
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

rhizo.layout.BucketLayout.prototype.cleanup = function(sameEngine, opt_options) {
  this.internalFlowLayout_.cleanup(sameEngine, opt_options);
  $.each(this.bucketHeaders_, function() { this.remove(); });
  this.bucketHeaders_ = [];
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
                                                   miniLayout,
                                                   identifier) {
  // 0 to 5 scale
  var size = parseInt(((value - range.min) / (range.max - range.min))*5.0, 10);
  return 'ar-' + identifier + '-' + size.toString() + (miniLayout ? 'm' : '');
};


rhizo.autorender.AR.prototype.getFontClass_ = function(value,
                                                       range,
                                                       miniLayout,
                                                       master) {
  return this.getClass_(value, range, miniLayout, 'fon');
};

rhizo.autorender.AR.prototype.getColorClass_ = function(value,
                                                        range,
                                                        miniLayout) {
  return this.getClass_(value, range, miniLayout, 'col');
};

rhizo.autorender.AR.prototype.renderSingleModelKey_ = function(key, value) {
  var html = [];
  html.push('<p><span class="dim">');
  html.push(this.metamodel_[key].label);
  html.push('</span>: ');
  html.push(value);
  html.push('</p>');
  return html.join('');
};

/**
  Detects whether the renderings produced by this renderer can be expanded
  or not. 
  If it is in miniLayout mode:
    then only the masterField is shown and expandable is true if there are
    additional fields.
  If it is NOT in miniLayout mode:
    then expandable is true if there are more fields, in addition to the
    ones are already shown (numfields_) plus the masterField (that is always
    shown).
 */
rhizo.autorender.AR.prototype.expandable = function(opt_options) {
  var miniLayout = opt_options && opt_options.miniLayout;
  var threshold = miniLayout ? 1 :  this.numfields_ + 1;
  return this.metamodelFields_ > threshold;
};

rhizo.autorender.AR.prototype.render = function(model, 
                                                expanded, 
                                                opt_options) {
  var miniLayout = opt_options && opt_options.miniLayout;

  var colorClass = 'ar-col-0' + (miniLayout ? 'm' : '');
  if (this.colorField_) {
    colorClass = this.getColorClass_(model[this.colorField_],
                                     this.colorRange_,
                                     miniLayout);
  }

  var fontClass = 'ar-fon-0' + (miniLayout ? 'm' : '');
  if (this.sizeField_) {
    fontClass = this.getFontClass_(model[this.sizeField_],
                                   this.sizeRange_,
                                   miniLayout);
  }

  if (miniLayout && !expanded) {
    return $("<div class='" + colorClass + "'>" +
             "<span class='" + fontClass + "'>" +
             model[this.masterField_] + "</span>" +
             "</div>");
  } else {
    html = [];
    html.push("<div class='" + colorClass + "'>");
    html.push("<span class='" + fontClass + "'>" +
              model[this.masterField_] + "</span>");

    var count = 0;
    if (this.sizeField_) {
      html.push(this.renderSingleModelKey_(this.sizeField_,
                                           model[this.sizeField_]));
      count++
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
    html.push("</div>")
    return $(html.join(''));
  }
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
  this.models_ = jQuery.map(models, function(model) {
    return new rhizo.model.SuperModel(model);
  });

  // model loading and rendering
  if (!this.checkModels_()) {
    return false;
  }

  this.buildModelsMap_();
  for (var i = this.models_.length-1; i >= 0; i--) {
    this.initializeModel_(this.models_[i]);
  }
  return true;
};

rhizo.Project.prototype.finalizeUI_ = function() {
  // Once the models are rendered, bind events that require rendered
  // DOM elements to be present, such as the maximize icon.
  rhizo.ui.initExpandable(this, this.renderer_, this.options_);

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
  var supermodel = this.model(id);
  this.selectionMap_[id] = supermodel;
  supermodel.selected = true;
  supermodel.rendering.addClass('ui-selected');

  this.logger_.info("Selected " + supermodel);
};

rhizo.Project.prototype.unselect = function(id) {
  var supermodel = this.model(id);
  this.selectionMap_[id] = null;
  delete this.selectionMap_[id];
  supermodel.selected = false;
  supermodel.rendering.removeClass('ui-selected');
  this.logger_.info("Unselected " + supermodel);
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
  var selectionMap = this.selectionMap_;
  return $.grep(this.models_, function(superModel) {
    return !selectionMap[superModel.id];
  });
};

/**
   Enables or disables models selection.

   @param {string} status either 'enable' or 'disable'
 */
rhizo.Project.prototype.toggleSelection = function(status) {
  this.gui_.viewport.selectable(status);
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

rhizo.Project.prototype.initializeModel_ = function(model) {
  var rendering = rhizo.model.kickstart(model,
                                        this,
                                        this.renderer_,
                                        this.options_);

  // initial positioning in the DOM and layout
  $(rendering).css("position", "absolute")
              .css("top", 0)
              .css("left", 0)
              .css("display", "none");

  this.gui_.universe.append(rendering);
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
  for (var i = this.models_.length-1; i >=0; i--) {
    if (this.models_[i].isFiltered()) {
      this.models_[i].rendering.fadeOut();
    } else {
      numShownModels += 1;
    }
  }

  if (!opt_delayCount) {
    jQuery.fx.off = this.options_.noAnims || numShownModels > 200;
  }

  // fade in all the affected elements according to current filter status
  // fade in is done _after_ changing performance settings, unless explicit
  // delay has been requested.
  for (var i = this.models_.length-1; i >= 0; i--) {
    if (!this.models_[i].isFiltered()) {
      this.models_[i].rendering.fadeIn();
    }
  }

  if (opt_delayCount) {
    jQuery.fx.off = this.options_.noAnims || numShownModels > 200;
  }
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
  - TreeLayout: the layout itself. It builds the tree structure out of the supermodels
    and, for every root found, draws a tree. Trees are stacked from left to right, top to bottom,
    hence this class uses the 'traditional' set of positioning coordinates (top, left, width, height).

  - TreeNode: a simple datastructure representing a node in the tree. It is used also to store some
    rendering information about the node, such as the bounding rectangle which can contain the rendering
    of the node itself and all its children

  - TreePainter: the class responsible for drawing each tree (aka, each set of nodes connected to a single
    root). Since trees can be rendered both vertically and horizontally, the TreePainter uses
    and abstract set of coordinates :
    * gd: the growing direction
    * od: the opposite direction
    Siblings are appended to the layout following the growing direction.
    Childs are appended to their parents following the opposite direction.

    Hence, in a horizontal tree, _gd_ is left to right and _od_ is top to bottom.
    In a vertical tree, _gd_ is top to bottom and _od_ is left to right.

    Using this abstract set of coordinates allows the TreePainter to re-use the same rendering code.
    Utility methods are provided to convert between the 'physical' and 'abstract' coordinate set.
*/

// RHIZODEP=rhizo.layout

/**
 * @constructor
 */
rhizo.layout.TreeLayout = function(project) {
  this.project_ = project;
  this.directionSelector_ = null;
  this.metaModelKeySelector_ = null;
};

rhizo.layout.TreeLayout.prototype.layout = function(container,
                                                    supermodels,
                                                    allmodels,
                                                    meta,
                                                    opt_options) {

  // detect rendering direction
  var vertical = this.directionSelector_.val() == 'ver';
  this.treePainter_ = new rhizo.layout.TreePainter(vertical);

  // detect parent
  var parentKey = this.metaModelKeySelector_.val();
  if (!meta[parentKey]) {
    this.project_.logger().error("parentKey attribute does not match any property");
    return;
  }
  this.project_.logger().info("Creating tree by " + parentKey);

  try {
    // builds the tree model and also checks for validity
    var roots = this.buildTree_(supermodels, allmodels, parentKey);

    var drawingOffset = { left: 0, top: 0 };

    var maxHeight = 0;
    for (var id in roots) { // for each root found

      // calculate the bounding rectangle for the whole tree, in gd-od coordinates
      var unrotatedBoundingRect = this.treePainter_.calculateBoundingRect_(roots[id]);

      // flip the bounding rectangle back to physical coordinates
      var boundingRect = this.treePainter_.toAbsoluteCoords_(unrotatedBoundingRect);

      // 'return carriage' if needed
      if (drawingOffset.left + boundingRect.w > container.width()) {
        drawingOffset.left = 0;
        drawingOffset.top += maxHeight + (maxHeight > 0 ? 5 : 0);
      }

      // Flip the drawing offset back into the gd-od coordinate set and draw the tree.
      this.treePainter_.draw_(container, roots[id], this.treePainter_.toRelativeCoords_(drawingOffset));

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
};

/**
 * Builds a hierarchical structure of TreeNodes. Raises exceptions
 * if cycles are found within the tree. Deals automatically with "filtered"
 * parts of the tree
 * @private
 */
rhizo.layout.TreeLayout.prototype.buildTree_ = function(supermodels,
                                                        allmodels,
                                                        parentKey) {
  var globalNodesMap = {};
  for (var i = 0, l = supermodels.length; i < l; i++) {
    globalNodesMap[supermodels[i].id] = new rhizo.layout.TreeNode(supermodels[i]);
  }

  var roots = {};

  // supermodels contains only the _visible_ models, while allmodels contains
  // all the known models.
  for (var i = 0, l = supermodels.length; i < l; i++) {
    if (!globalNodesMap[supermodels[i].unwrap().id].validated) {

      // we never encountered the node before. Start navigating
      // this branch upward, paying attention to cycles
      var localNodesMap = {};
      var model = supermodels[i].unwrap();

      while(true) {
        if (localNodesMap[model.id]) {
          // cycle detected
          throw new rhizo.layout.TreeCycleException("Tree is invalid: cycle detected");
        }
        localNodesMap[model.id] = model;
        globalNodesMap[model.id].validated = true;

        var parentSuperModel = this.findFirstVisibleParent_(allmodels,
                                                            allmodels[model[parentKey]],
                                                            parentKey);
        if (parentSuperModel) {
          var parentModel = parentSuperModel.unwrap();
          globalNodesMap[parentModel.id].addChild(globalNodesMap[model.id]);
          model = parentSuperModel.unwrap();
        } else {
          roots[model.id] = globalNodesMap[model.id];
          break;
        }
      }
    }
  }

  return roots;
};


/**
 * From a given model, returns the first non-filtered model in the tree hierarchy defined
 * according to parentKey. If the given model itself is not filtered, it is returned without
 * further search. If a cycle is detected while traversing filtered parents, an exception is raised.
 *
 * @param {Object} allmodels a map associating model ids to SuperModel instances.
 *     currently known to the project.
 * @param {rhizo.model.SuperModel} superParent the model to start the search from.
 * @param {string} parentKey the name of the model attribute that defines the parent-child relationship.
 * @private
 */
rhizo.layout.TreeLayout.prototype.findFirstVisibleParent_ = function(allmodels,
                                                                     superParent,
                                                                     parentKey) {
  if (!superParent) {
    return null;
  }

  var localNodesMap = {};
  while (superParent.isFiltered()) {
    if (localNodesMap[superParent.id]) {
      // cycle detected
      throw new rhizo.layout.TreeCycleException("Tree is invalid: hidden cycle detected");
    }
    localNodesMap[superParent.id] = superParent;

    superParent = allmodels[superParent.unwrap()[parentKey]];
    if (!superParent) {
      // we reached an hidden root.
      return null;
    }
  }

  return superParent;
};

rhizo.layout.TreeLayout.prototype.details = function() {
  this.directionSelector_ = $("<select class='rhizo-treelayout-direction' />");
  this.directionSelector_.append("<option value='hor'>Horizontally</option>");
  this.directionSelector_.append("<option value='ver'>Vertically</option>");

  this.metaModelKeySelector_ = rhizo.layout.metaModelKeySelector(
      this.project_, 'rhizo-treelayout-parentKey');

  return $("<div />").append(this.directionSelector_).
                      append(" arrange by: ").
                      append(this.metaModelKeySelector_);
};

rhizo.layout.TreeLayout.prototype.toString = function() {
  return "Tree";
};

rhizo.layout.TreeLayout.prototype.cleanup = function(sameEngine, opt_options) {
  if (this.treePainter_) {
    this.treePainter_.cleanup_();
  }
};


/*
  The whole class depends on coordinate transformation between screen width-height
  into the gd-od coordinates.

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

  This class adopts two different layout variations when rendered vertically rather
  than horizontally.

  When rendered vertically, each parent will always be above, or at the same (physical or, equivalently, gd)
  height as the highest of its children. In this way, it looks like childrens are hanging under the parents.
  This is called the 'packed' layout.

  When rendered horizontally, each parent will be positioned evenly in the middle along the 
  (phyisical, or, equivalently gd) width of the area occupied by all its children. It this way, the tree
  appears to be balanced.
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
 * Given a rendering, which is a DOM block element with physical coordinates,
 * return its size in the growing direction
 *
 * @param {Element} rendering a block element that represents a model rendering
 * @returns {number} its dimension in the gd axis
 * @private
 */
rhizo.layout.TreePainter.prototype.gd_ = function(rendering) {
  return this.vertical_ ? rendering.height() : rendering.width();
};

/**
 * Given a rendering, which is a DOM block element with physical coordinates,
 * return its size in the opposite direction
 *
 * @param {Element} rendering a block element that represents a model rendering
 * @returns {number} its dimension in the od axis
 * @private
 */
rhizo.layout.TreePainter.prototype.od_ = function(rendering) {
  return this.vertical_ ? rendering.width() : rendering.height();
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
 * Given a rendering, it returns the gd-od coordinate of its center, assuming it is 
 * positioned in 'packed' layout.
 * @private
 */
rhizo.layout.TreePainter.prototype.packedCenter_ = function(offset, rendering) {
  return {
    gd: offset.gd + 5 + this.gd_(rendering)/2,
    od: offset.od + this.od_(rendering)/2
  };
};

/**
 * Given a rendering, it returns the gd-od coordinate of its center, assuming it is
 * positioned in 'even' layout.
 * @private
 */
rhizo.layout.TreePainter.prototype.evenCenter_ = function(offset, rendering, boundingRect) {
  return {
    gd: offset.gd + boundingRect.gd / 2,
    od: offset.od + 5 + this.od_(rendering)/2
  };
};


/**
 * For every node, recursively calculate its bounding rectangle, in gd-od coordinates.
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

  var r = treenode.superModel.rendering;

  // enrich the treenode with rendering info
  treenode.boundingRect =
    { od: this.od_(r) + childsArea.od + 25, // 20 px padding between node and childs, 5 px padding for the whole rect
      gd: Math.max(this.gd_(r), childsArea.gd) + 5};

  return treenode.boundingRect;
};

/**
 * Recursively draw every node and, if the node is not a root, the connectors to its
 * parent. This method differentiates between the packed and even layouting within the tree.
 *
 * @private
 */
rhizo.layout.TreePainter.prototype.draw_ = function(container, treenode, offset, parentOffset, parentNode) {
  var r = $(treenode.superModel.rendering);

  // vertical layout stacks items from the top, while the horizontal layout
  // keeps the tree center aligned.
  if (this.vertical_) {
    r.move(offset.gd + 5, offset.od);

    // draw connector if needed
    if (parentOffset != null) {
      this.drawConnector_(container,
        this.packedCenter_(offset, r),
        this.packedCenter_(parentOffset, parentNode.superModel.rendering));
    }
  } else {
    r.move(offset.od + 5, offset.gd + (treenode.boundingRect.gd - this.gd_(r))/2);

    // draw connector if needed
    if (parentOffset != null) {
      this.drawConnector_(container,
        this.evenCenter_(offset, r, treenode.boundingRect),
        this.evenCenter_(parentOffset, parentNode.superModel.rendering, parentNode.boundingRect));    
    }
  }

  // Renders all the children along the gd direction
  var progressiveGd = offset.gd;
  for (var childId in treenode.childs) {
    var childNode = treenode.childs[childId];

    var childOffset = {
      od: offset.od + this.od_(r) + 20,
      gd: progressiveGd
    };
    this.draw_(container, childNode, childOffset, offset, treenode);
    progressiveGd += childNode.boundingRect.gd + 5;
  }
};


/**
 * Draws a connector between a node and its parent. A connector is always composed of two segments.
 * A segment along the gd axis and a segment along the od axis.
 *
 * @param curCenter the gd-od coordinate of the center of the current node
 * @param parentCenter the gd-od coordinate of the center of its parent node
 * @private
 */
rhizo.layout.TreePainter.prototype.drawConnector_ = function(container, curCenter, parentCenter) {
  var gdconnector = $("<div class='rhizo-tree-connector' />");
  gdconnector
    .css('position', 'absolute')
    .css(this.gdName_, Math.min(curCenter.gd, parentCenter.gd))
    .css(this.odName_, parentCenter.od)
    .css(this.odLength_, 2)
    .css(this.gdLength_, Math.abs(parentCenter.gd - curCenter.gd));

  var odconnector = $("<div class='rhizo-tree-connector' />");
  odconnector
    .css('position', 'absolute')
    .css(this.gdName_, curCenter.gd)
    .css(this.odName_, parentCenter.od)
    .css(this.gdLength_, 2)
    .css(this.odLength_, Math.abs(parentCenter.od - curCenter.od));

  this.connectors_.push(gdconnector);
  this.connectors_.push(odconnector);
  container.append(gdconnector);
  container.append(odconnector);
};

rhizo.layout.TreePainter.prototype.cleanup_ = function() {
  $.each(this.connectors_, function() { this.remove(); });
  this.connectors_ = [];
};


/**
 * A class that represents a node in the tree and wraps the superModel
 * it contains.
 * @constructor
 */
rhizo.layout.TreeNode = function(superModel, childs) {
  this.superModel = superModel;
  this.id = superModel.id;
  this.childs = childs || {};
  this.validated = false;
};

rhizo.layout.TreeNode.prototype.addChild = function(treenode) {
  if (!this.childs[treenode.id]) {
    this.childs[treenode.id] = treenode;
  }
};


rhizo.layout.TreeCycleException = function(message) {
  this.message = message;
  this.name = "TreeCycleException";
}

rhizo.layout.TreeCycleException.prototype.toString = function() {
  return this.name + ": " + this.message;
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

rhizo.ui.component.Logo = function() {};

rhizo.ui.component.Logo.prototype.getPanel = function() {
  return this.headerPanel_;
};

rhizo.ui.component.Logo.prototype.render = function(container, gui, opt_options) {
  var options = opt_options || {};
  gui.addComponent('rhizo.ui.component.Logo', this);
  this.headerPanel_ = $('<div />', {'class': 'rhizo-header'}).html(
      '<h1>Rhizosphere</h1><p>' +
      'by <a href="mailto:battlehorse@gmail.com">Riccardo Govoni</a> (c) 2010<br />' +
      '<a href="http://sites.google.com/site/rhizosphereui/" target="_blank">Project info</a>' +
      '&nbsp;' +
      '<a href="http://sites.google.com/site/rhizosphereui/Home/documentation" target="_blank" ' +
      'style="font-weight:bold; text-decoration: underline">I Need Help!</a>' +
      '</p>').appendTo(container);

  if (options.miniLayout) {
    this.headerPanel_.addClass('rhizo-floating-panel').css('display', 'none');
  }
};

rhizo.ui.component.Viewport = function() {};

rhizo.ui.component.Viewport.prototype.render = function(container, gui, opt_options) {
  var options = opt_options || {};

  this.viewport_ = $('<div/>', {'class': 'rhizo-viewport'}).appendTo(container);
  this.universe_ = $('<div/>', {'class': 'rhizo-universe'}).appendTo(this.viewport_);

  // Update the GUI object.
  gui.setViewport(this.viewport_);
  gui.setUniverse(this.universe_);

  this.scroll_trigger_ = $('<div/>', {
      'class': 'rhizo-scroll-trigger',
      title: 'Click to pan around'
    }).appendTo(this.viewport_);

  this.scroll_overlay_ = $('<div />', {'class': 'rhizo-scroll-overlay'}).
      css('display', 'none').appendTo(container);
  this.scroll_done_ = $('<button />', {'class': 'rhizo-scroll-done'}).text('Done');
  $('<div />').append(this.scroll_done_).appendTo(this.scroll_overlay_);

  if (options.miniLayout) {
    this.viewport_.addClass('rhizo-miniRender');
    this.scroll_overlay_.addClass('rhizo-miniRender');
  } else {
    // shrink the viewport
    this.viewport_.css('left',300).css('right', 5);
  }
};

rhizo.ui.component.Viewport.prototype.activate = function(gui, opt_options) {
  this.scroll_trigger_.click(
      jQuery.proxy(rhizo.ui.component.Viewport.prototype.startScroll_, this));
  this.scroll_done_.click(
      jQuery.proxy(rhizo.ui.component.Viewport.prototype.stopScroll_, this));
};

rhizo.ui.component.Viewport.prototype.startScroll_ = function() {
  var dragDelta = {
    top: this.universe_.offset().top,
    left: this.universe_.offset().left
  };

  this.scroll_trigger_.hide();
  this.scroll_overlay_.css({
      'left': this.viewport_.css('left'),
      'top': this.viewport_.css('top'),
      'width': this.viewport_.width(),
      'height': this.viewport_.height(),
      'z-index': 99,
      'display': ''
    });

  this.scroll_overlay_.draggable({
    helper: function() {
      return $("<div />");
    },
    start: jQuery.proxy(function(ev, ui) {
      var offset = this.universe_.offset();
      this.universe_.data("top0", offset.top).data("left0", offset.left);
    }, this),
    drag: jQuery.proxy(function(ev, ui) {
      // Computes where to reposition the universe pane from the delta movement
      // of the drag helper.
      //
      // S---------------------------->
      // |
      // |
      // |   R---------------------
      // |   |   U-----
      // |   |   |
      // |   |   |  U'-----
      // |   |   |  | U''----
      // |   |   |  | |
      // \/
      //
      // S: screen. Top left corner is at 0,0
      // R: Rhizosphere visualization bounding box.
      // U: Universe position at Rhizosphere initialiation time. The Viewport
      //    (Universe parent node) shares the same top-left corner.
      //    'dragDelta' points to these coordinates.
      // U': Universe position at drag start time. {top0, left0} coordinates
      //     point to this.
      // U'': Current (during dragging) Universe position.
      //
      // The drag helper always start at U, so:
      // ui.offset.top - dragDelta.top = overall drag distance from the
      //     beginning of the drag.
      // this.universe_.data("top0") - dragDelta.top = Distance between
      //     the Viewport and the Universe position at the beginning of the
      //     drag.
      //
      // Hence 'dragTop' and 'dragLeft' measure the distance between the
      // position the Universe should be dragged to and the Viewport corner.
      //
      var dragTop = ui.offset.top +
                    this.universe_.data("top0") - 2*dragDelta.top;
      var dragLeft = ui.offset.left +
                     this.universe_.data("left0") - 2*dragDelta.left;

      this.universe_.
          css('top', dragTop).css('bottom', -dragTop).
          css('left', dragLeft).css('right', -dragLeft);
    }, this),
    refreshPositions: false
  });
};

rhizo.ui.component.Viewport.prototype.stopScroll_ = function() {
  this.scroll_overlay_.css({
      'z-index': -1,
      'display': 'none'
    });
  this.scroll_trigger_.show();
};

rhizo.ui.component.MiniToolbar = function() {};

rhizo.ui.component.MiniToolbar.prototype.render = function(container, project, gui, opt_options) {
  var span = $('<span />').appendTo(container);
  this.resizeLink_ = $('<a/>', {href: '#', title: 'Maximize', 'class': 'rhizo-maximize-icon'}).
    appendTo(span);

  this.components_ = [
    {component: 'rhizo.ui.component.Layout', title: 'Display', 'class': ''},
    {component: 'rhizo.ui.component.SelectionManager', title: 'Selection', 'class': ''},
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
    this.components_[i].link = this.createLink_(this.components_[i].title,
                                                this.components_[i]['class'],
                                                container);
    this.components_[i].panel = gui.getComponent(this.components_[i].component).getPanel();
  }
};

rhizo.ui.component.MiniToolbar.prototype.createLink_ = function(text, className, container) {
  var span = $('<span />', {'class': 'rhizo-filters-header'}).appendTo(container);
  var link = $('<a/>', {href:  '#', title: text, 'class': className}).text(text).appendTo(span);
  return link;
};

rhizo.ui.component.MiniToolbar.prototype.activate = function(project, gui, opt_options) {
  this.resizeLink_.click(function() {
    self.resizeTo(1000, 700);
    self.location.reload();
    return false;
  });

  jQuery.each(this.components_, jQuery.proxy(function(i, currentComponent) {
    currentComponent.link.click(jQuery.proxy(function() {
      jQuery.each(this.components_, function(j, comp) {
        if (comp == currentComponent) {
          $(comp.panel).toggle();
          $(comp.link).toggleClass('rhizo-filter-open');
        } else {
          $(comp.panel).css('display', 'none');
          $(comp.link).removeClass('rhizo-filter-open');
        }
      });
      return false;
    }, this));
  }, this));
};


rhizo.ui.component.Console = function() {};

rhizo.ui.component.Console.prototype.render = function(container, gui, opt_options) {
  gui.addComponent('rhizo.ui.component.Console', this);

  this.toggleButton_ = $('<div />', {'class': 'rhizo-console-close'}).html('&#8659;');

  this.consoleHeader_ = $('<div />', {'class': 'rhizo-console-header'});
  this.consoleHeader_.append(this.toggleButton_).append('Log Console');
  this.consoleHeader_.appendTo(container);

  this.consoleContents_ = $('<div />', {'class': 'rhizo-console-contents'});
  this.consoleContents_.appendTo(container);
};

rhizo.ui.component.Console.prototype.activate = function(gui, opt_options) {
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

rhizo.ui.component.RightBar.prototype.render = function(container, gui, opt_options) {
  gui.addComponent('rhizo.ui.component.RightBar', this);

  this.toggle_ = $('<div />', {'class': 'rhizo-right-pop'}).appendTo(container);
  this.rightBar_ = $('<div />', {'class': 'rhizo-right'}).css('display', 'none').
      appendTo(container);
};

rhizo.ui.component.RightBar.prototype.activate = function(gui, opt_options) {
  this.toggle_.click(jQuery.proxy(function() {
    if (this.rightBar_.is(":visible")) {
      this.toggle_.css('right', 0);
      gui.viewport.css('right', 5);
      this.rightBar_.css('display', 'none');
    } else {
      gui.viewport.css('right', 135);
      this.toggle_.css('right', 130);
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

rhizo.ui.component.Layout = function() {};

rhizo.ui.component.Layout.prototype.getPanel = function() {
  return this.layoutPanel_;
};

rhizo.ui.component.Layout.prototype.render = function(container, project, gui, opt_options) {
  gui.addComponent('rhizo.ui.component.Layout', this);
  var options = opt_options || {};

  if (!options.miniLayout) {
    $('<div />', {'class': 'rhizo-filters-header'}).
        text('Display').
        appendTo(container);
  }

  this.layoutPanel_ = $('<div />').appendTo(container);
  this.layoutOptions_ = $('<div />', {'class': 'rhizo-layout-extra-options'}).appendTo(this.layoutPanel_);

  if (options.miniLayout) {
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

rhizo.ui.component.Layout.prototype.activate = function(project, gui, opt_options) {
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
    project.layout(this.layoutSelector_.val());
  }, this));
};

rhizo.ui.component.SelectionManager = function() {};

rhizo.ui.component.SelectionManager.prototype.getPanel = function() {
  return this.selectionPanel_;
};

rhizo.ui.component.SelectionManager.prototype.render = function(container, project, gui, opt_options) {
  gui.addComponent('rhizo.ui.component.SelectionManager', this);

  var options = opt_options || {};

  if (!options.miniLayout) {
    $('<div />', {'class': 'rhizo-filters-header'}).
        text('Selection').
        appendTo(container);
  }

  this.selectionPanel_ = $('<div />', {'class': 'rhizo-selection'}).
      appendTo(container);

  if (options.miniLayout) {
    this.selectionPanel_.addClass('rhizo-floating-panel').css('display', 'none');
  }
  this.selectButton_ = $('<button />').text('Work on selected items only');
  this.resetButton_ = $('<button />', {disabled: 'disabled'}).text('Reset');
  this.selectionPanel_.append(this.selectButton_).append(this.resetButton_);
};

rhizo.ui.component.SelectionManager.prototype.activate = function(project, gui, opt_options) {
  this.activateSelectableViewport_(project, gui, opt_options);
  this.activateButtons_(project, opt_options);
};

rhizo.ui.component.SelectionManager.prototype.activateButtons_ = function(project, opt_options) {
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
    project.alignVisibility();
    project.layout(null, { filter: true});
    project.unselectAll();
    this.resetButton_.
        removeAttr("disabled").
        text("Reset (" + countFiltered + " filtered)");
  }, this));


  this.resetButton_.click(function(ev) {
    project.resetAllFilter("__selection__");
    // after filtering some elements, perform layout again
    project.alignVisibility();
    project.layout(null, { filter: true});
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
    function(project, gui, opt_options) {
  gui.viewport.selectable({
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
    filter: opt_options.selectfilter,
    tolerance: 'touch',
    distance: 1
  });

  var that = this;
  gui.viewport.click(function(ev, ui) {
    if (that.isOnEmptySpace_(ev)) {
      project.unselectAll();
    }
  });
};


rhizo.ui.component.Filters = function() {};

rhizo.ui.component.Filters.prototype.getPanel = function() {
  return this.filterPanel_;
};

rhizo.ui.component.Filters.prototype.render = function(container, project, gui, opt_options) {
  gui.addComponent('rhizo.ui.component.Filters', this);
  var options = opt_options || {};

  if (!options.miniLayout) {
    $('<div />', {'class': 'rhizo-filters-header'}).
        text('Filters').
        appendTo(container);
  }

  this.filterPanel_ = $('<div />', {'class': 'rhizo-filter-container'}).appendTo(container);

  this.nextFilter_ = null;
  this.prevFilter_ = null;
  if (options.miniLayout) {
    this.filterPanel_.addClass('rhizo-floating-panel').css('display', 'none');

    this.nextFilter_ = $('<span />', {'class': 'rhizo-next-filter', title: 'Next filter'}).
      appendTo(this.filterPanel_);
    this.prevFilter_ = $('<span />', {'class': 'rhizo-prev-filter', title: 'Previous filter'}).
      appendTo(this.filterPanel_);
  }

  var first = true;
  var metaModel = project.metaModel();
  for (key in metaModel) {
    var filter = metaModel[key].kind.renderFilter(project, metaModel[key], key);
    if (options.miniLayout) {
      if (first) {
        first = false;
      } else {
        filter.css('display', 'none');
      }
    }
    this.filterPanel_.append(filter);
  }
};

rhizo.ui.component.Filters.prototype.activate = function(project, gui, opt_options) {
  // Every single filter implementation auto-activates itself when created.
  // Here we only need to activate the navigation between filters.
  if (this.nextFilter_) {
    this.nextFilter_.click(function() {
      var current = $('.rhizo-filter:visible');
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
      var current = $('.rhizo-filter:visible');
      var prev = current.prev('.rhizo-filter:hidden').eq(0);
      if (prev.length > 0) {
        // cannot use hide/show otherwise safari clips rendering
        current.css('display', 'none');
        prev.css('display', '');
      }
    });
  }
};

rhizo.ui.component.Legend = function() {};

rhizo.ui.component.Legend.prototype.getPanel = function() {
  return this.legendPanel_;
};

rhizo.ui.component.Legend.prototype.render = function(container, project, gui, opt_options) {
  gui.addComponent('rhizo.ui.component.Legend', this);
  var options = opt_options || {};

  var sizeRange = null;
  if (project.renderer().getSizeRange) {
    sizeRange = project.renderer().getSizeRange();
  }
  var colorRange = null;
  if (project.renderer().getColorRange) {
    colorRange = project.renderer().getColorRange();
  }

  if (!options.miniLayout) {
    $('<div />', {'class': 'rhizo-filters-header'}).
    text('Legend').
    appendTo(container);
  }

  this.legendPanel_ = $('<div />', {'class': "rhizo-legend-panel"}).appendTo(container);

  if (options.miniLayout) {
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

rhizo.ui.component.Legend.prototype.activate = function(project, gui, opt_options) {};

rhizo.ui.component.Actions = function() {};

rhizo.ui.component.Actions.prototype.render = function(container, project, gui, opt_options) {
  var actionsContainer = $('<div />', {'class': 'rhizo-actions'}).
    append($("<h1 />").text('Actions')).appendTo(container);

  // Create 2 sample actions
  for (var i = 0; i < 2; i++) {
    $('<div />', {'class': 'rhizo-action'}).text('Sample Action ' + (i+1)).appendTo(actionsContainer);
  }
};

rhizo.ui.component.Actions.prototype.activate = function(project, gui, opt_options) {
  if ($('.rhizo-action').length > 0) {
    $('.rhizo-action').draggable({helper: 'clone'});
    gui.universe.droppable({
      accept: '.rhizo-action',
      drop: function(ev, ui) {
        var offset = gui.universe.offset();
        var rightBorder = gui.universe.width();
        var bottomBorder = gui.universe.height();

        var actionName = ui.draggable.text();

        var left = ui.absolutePosition.left - offset.left;
        if ((left + 200) > rightBorder) {
          left = rightBorder - 210;
        }

        var top = ui.absolutePosition.top - offset.top;
        if ((top + 200) > bottomBorder) {
          top = bottomBorder - 210;
        }

        var dropbox = $("<div class='rhizo-droppable-action'>" +
                        "Drop your items here to perform:<br />" +
                        actionName  +"</div>")
          .css('position', 'absolute')
          .css('top', top)
          .css('left', left)
          .css('display', 'none');

        gui.universe.append(dropbox);
        dropbox.fadeIn();
        dropbox.draggable({
          start: function() { project.toggleSelection('disable'); },
          stop: function() { project.toggleSelection('enable'); }
        });
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

rhizo.ui.component.MiniTemplate = function(project) {
  this.project_ = project;
  this.gui_ = project.gui();
  this.components_ = {
    // chrome components
    LOGO: new rhizo.ui.component.Logo(),
    VIEWPORT: new rhizo.ui.component.Viewport(),

    // dynamic components
    LAYOUT: new rhizo.ui.component.Layout(),
    SELECTION_MANAGER: new rhizo.ui.component.SelectionManager(),
    FILTERS: new rhizo.ui.component.Filters(),
    LEGEND: new rhizo.ui.component.Legend(),
    MINITOOLBAR: new rhizo.ui.component.MiniToolbar()
  };
};

rhizo.ui.component.MiniTemplate.prototype.renderChrome = function(opt_options) {
  this.components_.VIEWPORT.render(this.gui_.container, this.gui_, opt_options);
  this.progress_ = new rhizo.ui.component.Progress(this.gui_.viewport);

  this.progress_.update(10, 'Creating static UI...');
  this.bottomBar_ = $('<div />', {'class': "rhizo-bottom-bar"}).appendTo(this.gui_.container);
  this.components_.LOGO.render(this.bottomBar_, this.gui_, opt_options);
  this.progress_.update(25, 'All static UI created.');
};

rhizo.ui.component.MiniTemplate.prototype.activateChrome = function(opt_options) {
  this.progress_.update(26, 'Activating static UI...');
  this.components_.VIEWPORT.activate(this.gui_, opt_options);
  this.progress_.update(33, 'Loading models...');
};

rhizo.ui.component.MiniTemplate.prototype.renderDynamic = function(opt_options) {
  this.progress_.update(34, 'Creating dynamic controls...');
  this.components_.LAYOUT.render(this.bottomBar_, this.project_, this.gui_, opt_options);
  this.progress_.update(36, 'Layout engine created.');
  this.components_.SELECTION_MANAGER.render(this.bottomBar_, this.project_, this.gui_, opt_options);
  this.progress_.update(40, 'Selection manager created.');
  this.components_.FILTERS.render(this.bottomBar_, this.project_, this.gui_, opt_options);
  this.progress_.update(44, 'Filters created.');

  if (this.project_.renderer().getSizeRange ||
      this.project_.renderer().getColorRange) {
    this.components_.LEGEND.render(this.bottomBar_,
                                   this.project_,
                                   this.gui_,
                                   opt_options);
    this.progress_.update(46, 'Legend created.');
  }

  // All other components must be in place before creating the toolbar.
  this.components_.MINITOOLBAR.render(this.bottomBar_, this.project_, this.gui_, opt_options);
  this.progress_.update(48, 'Toolbar created.');
};

rhizo.ui.component.MiniTemplate.prototype.activateDynamic = function(opt_options) {
  this.progress_.update(51, 'Activating dynamic controls...');
  this.components_.LAYOUT.activate(this.project_, this.gui_, opt_options);
  this.components_.SELECTION_MANAGER.activate(this.project_, this.gui_, opt_options);
  this.components_.FILTERS.activate(this.project_, this.gui_, opt_options);
  this.components_.LEGEND.activate(this.project_, this.gui_, opt_options);
  this.components_.MINITOOLBAR.activate(this.project_, this.gui_, opt_options);
  this.progress_.update(66, 'Rhizosphere controls are ready.');
};

rhizo.ui.component.MiniTemplate.prototype.done = function() {
  this.progress_.update(100, 'Rhizosphere ready!');
};



rhizo.ui.component.StandardTemplate = function(project) {
  this.project_ = project;
  this.gui_ = project.gui();
  this.components_ = {
    // chrome components
    LOGO: new rhizo.ui.component.Logo(),
    VIEWPORT: new rhizo.ui.component.Viewport(),
    RIGHTBAR: new rhizo.ui.component.RightBar(),
    CONSOLE: new rhizo.ui.component.Console(),

    // dynamic components
    LAYOUT: new rhizo.ui.component.Layout(),
    SELECTION_MANAGER: new rhizo.ui.component.SelectionManager(),
    FILTERS: new rhizo.ui.component.Filters(),
    LEGEND: new rhizo.ui.component.Legend(),
    ACTIONS: new rhizo.ui.component.Actions()
  };
};

rhizo.ui.component.StandardTemplate.prototype.renderChrome = function(opt_options) {
  this.components_.VIEWPORT.render(this.gui_.container, this.gui_, opt_options);
  this.progress_ = new rhizo.ui.component.Progress(this.gui_.viewport);

  this.leftBar_= $('<div/>', {'class': 'rhizo-left'}).appendTo(this.gui_.container);
  this.components_.RIGHTBAR.render(this.gui_.container, this.gui_, opt_options);

  this.progress_.update(10, 'Creating static UI...');
  this.components_.LOGO.render(this.leftBar_, this.gui_, opt_options);
  this.components_.CONSOLE.render(
      this.components_.RIGHTBAR.getPanel(),
      this.gui_,
      opt_options);
  this.progress_.update(25, 'All static UI created.');
};

rhizo.ui.component.StandardTemplate.prototype.activateChrome = function(opt_options) {
  this.progress_.update(26, 'Activating static UI...');

  this.components_.RIGHTBAR.activate(this.gui_, opt_options);
  this.components_.CONSOLE.activate(this.gui_, opt_options);
  this.components_.VIEWPORT.activate(this.gui_, opt_options);
  this.progress_.update(33, 'Loading models...');
};

rhizo.ui.component.StandardTemplate.prototype.renderDynamic =
    function(opt_options) {
  this.progress_.update(34, 'Creating dynamic controls...');
  this.components_.LAYOUT.render(this.leftBar_, this.project_, this.gui_, opt_options);
  this.progress_.update(38, 'Layout engine created.');
  this.components_.SELECTION_MANAGER.render(this.leftBar_, this.project_, this.gui_, opt_options);
  this.progress_.update(42, 'Selection manager created.');
  this.components_.FILTERS.render(this.leftBar_, this.project_, this.gui_, opt_options);
  this.progress_.update(46, 'Filters created.');

  if (this.project_.renderer().getSizeRange ||
      this.project_.renderer().getColorRange) {
    this.components_.LEGEND.render(this.leftBar_,
                                   this.project_,
                                   this.gui_,
                                   opt_options);
    this.progress_.update(48, 'Legend created.');
  }
  this.components_.ACTIONS.render(
      this.components_.RIGHTBAR.getPanel(),
      this.project_,
      this.gui_,
      opt_options);
  this.progress_.update(50, 'Actions created');
};

rhizo.ui.component.StandardTemplate.prototype.activateDynamic =
    function(opt_options) {
  this.progress_.update(51, 'Activating dynamic controls...');
  this.components_.LAYOUT.activate(this.project_, this.gui_, opt_options);
  this.components_.SELECTION_MANAGER.activate(this.project_, this.gui_, opt_options);
  this.components_.FILTERS.activate(this.project_, this.gui_, opt_options);
  this.components_.LEGEND.activate(this.project_, this.gui_, opt_options);
  this.components_.ACTIONS.activate(this.project_, this.gui_, opt_options);
  this.progress_.update(66, 'Rhizosphere controls are ready.');
};

rhizo.ui.component.StandardTemplate.prototype.done = function() {
  this.progress_.update(100, 'Rhizosphere ready!');
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
// model is re-rendered with its original size, not the one the treemap expects.
//
// TODO(battlehorse): This layout does not support nesting and hierarchies yet.
//
// TODO(battlehorse): Some layout artifacts and overflowing occur, probably due
// to rounding errors, when the areas to display become too small (below 1x1 pixel?).
//

rhizo.layout.treemap.TreeMapNode = function(supermodel, areaMeta, areaRatio) {
  this.model_ = supermodel;
  this.area_ = parseFloat(this.model_.unwrap()[areaMeta]) * areaRatio;
  if (isNaN(this.area_)) {
    this.area_ = 0.0;
  }
};

rhizo.layout.treemap.TreeMapNode.prototype.area = function() {
  return this.area_;
};

rhizo.layout.treemap.TreeMapNode.prototype.model = function() {
  return this.model_;
};

rhizo.layout.treemap.TreeMapDirection = {
  HOR: 'h',
  VER: 'v'
};

rhizo.layout.treemap.TreeMapSlice = function(length, direction, anchorPoint) {
  this.length_ = length;
  this.direction_ = direction;
  this.anchorPoint_ = anchorPoint;
  this.nodes_ = [];
  this.sliceArea_ = 0.0;
  this.minArea_ = Number.MAX_VALUE;
};

rhizo.layout.treemap.TreeMapSlice.prototype.addNode = function(node) {
  this.nodes_.push(node);
  this.sliceArea_ += node.area();
  this.minArea_ = Math.min(this.minArea_, node.area());
};

rhizo.layout.treemap.TreeMapSlice.prototype.span = function(opt_newNode) {
  if (opt_newNode) {
    return (this.sliceArea_ + opt_newNode.area()) / this.length_;
  } else {
    return this.sliceArea_ / this.length_;
  }
};

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

rhizo.layout.treemap.TreeMapSlice.prototype.length = function() {
  return this.length_;
};

rhizo.layout.treemap.TreeMapSlice.prototype.nodes = function() {
  return this.nodes_;
};

rhizo.layout.treemap.TreeMapSlice.prototype.direction = function() {
  return this.direction_;
};

rhizo.layout.treemap.TreeMapSlice.prototype.anchorPoint = function() {
  return this.anchorPoint_;
};

rhizo.layout.TreeMapLayout = function(project) {
  this.project_ = project;
  this.areaSelector_ = null;
  this.colorSelector_ = null;
  this.managedModels_ = null;

  this.colorMin_ = {r: 237, g: 76, b: 95};
  this.colorMax_ = {r: 122, g: 255, b: 115};
};

rhizo.layout.TreeMapLayout.prototype.layout = function(container,
                                                       supermodels,
                                                       allmodels,
                                                       meta,
                                                       opt_options) {
  if (this.managedModels_) {
    for (var i = 0; i < supermodels.length; i++) {
      delete this.managedModels_[supermodels[i].id];
    }
    this.restoreSizesAndColors_(this.managedModels_, opt_options);
  }

  var areaMeta = this.areaSelector_.val();
  var colorMeta = this.colorSelector_.val();

  var area = 0.0;
  var colorRange = null;
  if (colorMeta.length > 0) {
    colorRange = {
      min: Number.MAX_VALUE,
      max: Number.MIN_VALUE,
      meta: colorMeta
    };
  }
  supermodels.sort(rhizo.meta.sortBy(areaMeta, meta[areaMeta].kind, true));
  for (var i = 0; i < supermodels.length; i++) {
    var model = supermodels[i];

    // Accumulate area
    area += parseFloat(model.unwrap()[areaMeta]);

    // Identify the minimum and maximum color ranges.
    if (colorMeta.length > 0) {
      var colorVal = parseFloat(model.unwrap()[colorMeta]);
      if (!isNaN(colorVal)) {
        colorRange.min = Math.min(colorRange.min, colorVal);
        colorRange.max = Math.max(colorRange.max, colorVal);
      }
    }

    if (model.expanded) {
      // Revert expanded items, since it messes up with treemapping.
      model.expanded = !model.expanded;
      rhizo.ui.reRender(this.project_.renderer(),
                        model.rendering, model.unwrap(), model.expanded,
                        opt_options);
    }
  }
  // Map container dimensions to the area defined by areaMeta.
  var remainderContainer = {
    width: container.width(),
    height: container.height()
  };
  var areaRatio = container.width() * container.height() * 1.0 / area;

  var slices = [];
  if (remainderContainer.width < remainderContainer.height) {
    slices.push(new rhizo.layout.treemap.TreeMapSlice(
      remainderContainer.width,
      rhizo.layout.treemap.TreeMapDirection.HOR,
      {x:0, y:0}));
  } else {
    slices.push(new rhizo.layout.treemap.TreeMapSlice(
      remainderContainer.height,
      rhizo.layout.treemap.TreeMapDirection.VER,
      {x:0, y:0}));
  }
  var currentSlice = slices[0];
  var modelsCount = 0;
  if (supermodels.length > 0) {
    var node = new rhizo.layout.treemap.TreeMapNode(supermodels[modelsCount++],
                                                    areaMeta,
                                                    areaRatio);
    if (node.area() <= 0.0) {
      // Nodes are sorted by decreasing areas. It means that all the models have
      // a zero (or less) area. There's nothing to layout.
      return;
    } else {
      currentSlice.addNode(node);
    }
  }

  var numModelsToHide = 0;
  while (modelsCount < supermodels.length) {
    // create a TreeMapNode that wraps the currently inspected supermodel.
    var node = new rhizo.layout.treemap.TreeMapNode(supermodels[modelsCount++],
                                                    areaMeta,
                                                    areaRatio);
    if (node.area() <= 0.0) {
      node.model().filter('__treemap__');  // hard-coded filter key
      numModelsToHide++;
      continue;
    }

    // compute the worst aspect ratio the slice would have if the node were
    // added to the current slice.
    var withAspectRatio = currentSlice.aspectRatio(node);
    var withoutAspectRatio = currentSlice.aspectRatio();

    if (withAspectRatio > withoutAspectRatio) {
      // Create a new slice, in the opposite direction from the current one

      // Update the remainder container.
      remainderContainer = this.getRemainderContainer_(remainderContainer,
                                                       currentSlice);

      var containerSpan =
        currentSlice.direction() == rhizo.layout.treemap.TreeMapDirection.HOR ?
        remainderContainer.height : remainderContainer.width;

      if (currentSlice.direction() == rhizo.layout.treemap.TreeMapDirection.HOR) {
        currentSlice = new rhizo.layout.treemap.TreeMapSlice(
          containerSpan,
          rhizo.layout.treemap.TreeMapDirection.VER,
          {x:currentSlice.anchorPoint().x,
           y: currentSlice.anchorPoint().y + currentSlice.span()});
      } else {
        currentSlice = new rhizo.layout.treemap.TreeMapSlice(
          containerSpan,
          rhizo.layout.treemap.TreeMapDirection.HOR,
          {x: currentSlice.anchorPoint().x + currentSlice.span(),
           y: currentSlice.anchorPoint().y});
      }
      slices.push(currentSlice);
    }
    currentSlice.addNode(node);

  }
  if (slices.length > 0) {
    this.managedModels_ = {};
    numModelsToHide += this.draw_(container, slices, colorRange);
  }
  if (numModelsToHide > 0) {
    this.project_.alignVisibility();
  }
};

rhizo.layout.TreeMapLayout.prototype.draw_ = function(container, slices, colorRange) {
  var numModelsToHide = 0;
  for (var i = 0; i < slices.length; i++) {
    numModelsToHide += this.drawSlice_(container, slices[i], colorRange);
  }
  return numModelsToHide;
};

rhizo.layout.TreeMapLayout.prototype.drawSlice_ = function(container, slice, colorRange) {
  var numModelsToHide = 0;
  var t = slice.anchorPoint().y;
  var l = slice.anchorPoint().x;
  for (var i = 0; i < slice.nodes().length; i++) {
    var length = slice.nodes()[i].area() / slice.span();
    var model = slice.nodes()[i].model();
    
    if (Math.round(length) == 0 || Math.round(slice.span()) == 0) {
      // Hide items that are too small to be displayed on screen
      model.filter('__treemap__');
      numModelsToHide++;
    } else {
      var renderingSize = {};
      if (slice.direction() == rhizo.layout.treemap.TreeMapDirection.HOR) {
        renderingSize['width'] = Math.round(length);
        renderingSize['height'] = Math.round(slice.span());
      } else {
        renderingSize['width'] = Math.round(slice.span());
        renderingSize['height'] = Math.round(length);
      }
      if (!model.rescaleRendering(renderingSize['width'], renderingSize['height'])) {
        model.filter('__treemap__');
        numModelsToHide++;
      } else {
        this.managedModels_[model.id] = model;
        if (colorRange) {
          var colorVal = parseFloat(model.unwrap()[colorRange.meta]);
          if (!isNaN(colorVal)) {
            model.rendering.css('backgroundColor',
                                this.getBackgroundColor_(colorVal,
                                                         colorRange));
          }
        }
        model.rendering.move(Math.round(t), Math.round(l));        
      }
    }
    if (slice.direction() == rhizo.layout.treemap.TreeMapDirection.HOR) {
      l += length;
    } else {
      t += length;
    }
  }
  return numModelsToHide;
};

rhizo.layout.TreeMapLayout.prototype.getBackgroundColor_ = function(colorVal,
                                                                    colorRange) {
  var channels = ['r', 'g', 'b'];
  var outputColor = {};
  for (var i = 0; i < channels.length; i++) {
    var channel = channels[i];
    outputColor[channel] = this.colorMin_[channel] +
      (this.colorMax_[channel] - this.colorMin_[channel])*
      (colorVal - colorRange.min)/(colorRange.max - colorRange.min);
  }
  return 'rgb(' + Math.round(outputColor.r) + ',' +
      Math.round(outputColor.g) + ',' +
      Math.round(outputColor.b) + ')';

}

rhizo.layout.TreeMapLayout.prototype.getRemainderContainer_ = function(
    remainderContainer, slice) {
  var sliceSpan = slice.span();
  if (slice.direction() == rhizo.layout.treemap.TreeMapDirection.HOR) {
    return {width: remainderContainer.width,
            height: remainderContainer.height - sliceSpan};
  } else {
    return {width: remainderContainer.width - sliceSpan,
            height: remainderContainer.height};
  }
};

rhizo.layout.TreeMapLayout.prototype.cleanup = function(sameEngine,
                                                        opt_options) {
  // Restore all models to their original sizes, if we are moving to a different
  // layout engine.
  if (!sameEngine) {
    this.restoreSizesAndColors_(this.managedModels_, opt_options);
    this.managedModels_ = null;
  }
  this.project_.resetAllFilter('__treemap__');
  this.project_.alignVisibility();
};

rhizo.layout.TreeMapLayout.prototype.restoreSizesAndColors_ = function(modelsMap,
                                                                       opt_options) {
  for (var modelId in modelsMap) {
    var model = modelsMap[modelId];
    model.rendering.css('backgroundColor', '');
    rhizo.ui.reRender(this.project_.renderer(),
                      model.rendering,
                      model.unwrap(),
                      model.expanded,
                      opt_options);
  }
};

rhizo.layout.TreeMapLayout.prototype.details = function() {
  this.areaSelector_ = rhizo.layout.metaModelKeySelector(
    this.project_, 'rhizo-treemaplayout-area');
  this.colorSelector_ = rhizo.layout.metaModelKeySelector(
    this.project_, 'rhizo-treemaplayout-color');
  this.colorSelector_.append("<option value='' selected>-</option>");
  return $("<div />").
      append("Area: ").
      append(this.areaSelector_).
      append(" Color:").
      append(this.colorSelector_);
};

rhizo.layout.TreeMapLayout.prototype.toString = function() {
  return "TreeMap";
};

// register the treemaplayout in global layout list
rhizo.layout.layouts.treemap = rhizo.layout.TreeMapLayout;
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
rhizo.ui.gui.GUI = function(container) {

  // A JQuery object pointing to the DOM element that contains the whole
  // Rhizosphere instance.
  this.container = container;

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

// RHIZODEP=rhizo.model.loader,rhizo.base,rhizo.ui.component,rhizo.ui,rhizo.ui.gui
namespace('rhizo.bootstrap');

rhizo.bootstrap.Bootstrap = function(container, opt_options) {
  this.container_ = container;
  this.options_ = { selectfilter: '.rhizo-model:visible' };
  if (opt_options) {
    $.extend(this.options_, opt_options);
  }
  if (this.options_.autoSize) {
    // Autosizing has been requested to identify the template to use.
    if ($(document).width() >= 600 && $(document).height() >= 250) {
      this.options_.miniLayout = false;
    } else {
      this.options_.miniLayout = true;
    }
  }
};

rhizo.bootstrap.Bootstrap.prototype.go = function(opt_resource) {
  // Create the GUI.
  var gui = new rhizo.ui.gui.GUI(this.container_);

  // Create the project.
  this.project_ = new rhizo.Project(gui, this.options_);

  // Get the minimum chrome up and running.
  this.template_ = this.options_.miniLayout ?
      new rhizo.ui.component.MiniTemplate(this.project_) :
      new rhizo.ui.component.StandardTemplate(this.project_);
  this.template_.renderChrome(this.options_);
  this.template_.activateChrome(this.options_);

  this.project_.chromeReady();

  // Disable animations and other performance tunings if needed.
  rhizo.ui.performanceTuning(this.options_.noAnims);

  // Open the models' source...
  var source = opt_resource;
  if (!source) {
    var regex = new RegExp('source=(.*)$');
    var results = regex.exec(document.location.href);
    if (!results || !results[1]) {
      this.project_.logger().error("Unable to identify datasource from location");
    } else {
      source = unescape(results[1]);
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
  
  this.template_.renderDynamic(this.options_);
  this.template_.activateDynamic(this.options_);

  this.project_.deploy(payload.models);
  this.template_.done();
};
