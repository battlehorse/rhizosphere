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
};/* ./src/js/rhizo.ui.js */
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
}

/**
  Wires the expansion listeners to the rendering expansion icons,
  if the renderer supports expansion.
 */
rhizo.ui.initExpandable = function(renderer, opt_options) {
  if (rhizo.ui.expandable(renderer, opt_options)) {
    // register the hover effect to show/hide the expand icon
    $('.rhizo-model').hover(
      function() {
        $(this).children('.rhizo-expand-model').css('display', '');
      }, function() {
        $(this).children('.rhizo-expand-model').css('display', 'none');
      });

    // register the expan icon handler
    $('.rhizo-expand-model').click(function() {
      var id = $(this).attr('id').replace(/rhizo-expand-/, '');
      var model = $p.model(id);

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
rhizo.meta.StringKind.prototype.renderFilter = function(metadata, key) {
  var input = $("<input type='text' />");
  // keypress handling removed due to browser quirks in key detection
  $(input).change(function(ev) {
    $p.filter(key, $(this).val());
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

rhizo.meta.DateKind.prototype.renderFilter = function(metadata, key) {
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
    $p.filter(key, [$(year).val(), $(month).val(), $(day).val()]);
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

rhizo.meta.RangeKind.prototype.renderFilter = function(metadata, key) {
  var slider = $("<div id='rhizo-slider-" + key + "' />");
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
  var slideCallback = (function() {
      var that = this;
      return function(ev, ui) {
        var minSlide = $('#rhizo-slider-' + key).slider('values',0);
        var maxSlide = $('#rhizo-slider-' + key).slider('values',1);
        if (minSlide == ui.value) {
          // min slider has moved
          minLabel.text(that.toHumanLabel_(that.toModelScale_(minSlide))).
                   addClass("rhizo-slider-moving");
          maxLabel.removeClass("rhizo-slider-moving");
        } else {
          // max slider has moved
          maxLabel.text(that.toHumanLabel_(that.toModelScale_(maxSlide))).
                   addClass("rhizo-slider-moving");
          minLabel.removeClass("rhizo-slider-moving");
        }
      };
  }).call(this);

  // wrap change handler into a closure to preserve access to the RangeKind
  // filter.
  var stopCallback = (function() {
      var that = this;
      return function(ev, ui) {
        var minSlide = Math.max($('#rhizo-slider-' + key).slider('values',0),
                                minFilterScale);
        var maxSlide = Math.min($('#rhizo-slider-' + key).slider('values',1),
                                maxFilterScale);
        minLabel.text(that.toHumanLabel_(that.toModelScale_(minSlide))).
                 removeClass("rhizo-slider-moving");
        maxLabel.text(that.toHumanLabel_(that.toModelScale_(maxSlide))).
                 removeClass("rhizo-slider-moving");
        $p.filter(key, { min: minSlide, max: maxSlide });
      };
  }).call(this);

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

rhizo.meta.BooleanKind.prototype.renderFilter = function(metadata, key) {
  var check = $("<select />");
  check.append("<option value=''>-</option>");
  check.append("<option value='true'>Yes</option>");
  check.append("<option value='false'>No</option>");

  $(check).change(function(ev) {
    $p.filter(key, $(this).val());
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

rhizo.meta.CategoryKind.prototype.renderFilter = function(metadata, key) {
  var categories = $("<select " +
                     (metadata.multiple ? 'multiple size="4" ' : '') +
                     " style='vertical-align:top' />");
  categories.append("<option value=''>-</option>");
  metadata.categories.forEach(function(category) {
    categories.append("<option value='" + category + "'>" +
                      category + "</option>");
  });

  $(categories).change(function(ev) {
    var selectedCategories = [ $(this).val() ];
    if (metadata.multiple) {
      selectedCategories = $.grep($(this).val(), function(category) {
        return category != '';
      });
    }
    $p.filter(key, selectedCategories);
  });
  return $("<div class='rhizo-filter' />").
           append(metadata.label + ": ").
           append($(categories));
};

rhizo.meta.CategoryKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  // AND-filter

  // var survives = true;
  // filterValue.forEach(function(category) {
  //   if (modelValue.indexOf(category) == -1) {
  //     survives = false;
  //   }
  // });
  // return survives;

  // OR-filter
  var survives = false;
  filterValue.forEach(function(category) {
    if (modelValue.indexOf(category) != -1) {
      survives = true;
    }
  });
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

/**
 * Permanently disables logging. Turns rhizo.log into a no-op.
 */
rhizo.disableLogging = function() {
  rhizo.log = function() {};  
};

rhizo.log = function(message, opt_severity) {
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

  $('#rhizo-console-contents').prepend(htmlMsg);
  if (opt_severity) {
    htmlMsg.effect("highlight", {color: highlightColor }, 1000);
  }
  if (!$('#rhizo-console-contents').is(':visible') && opt_severity) {
    if (!$('#rhizo-right').is(':visible')) {
      $('#rhizo-right-pop').effect("highlight", {color: highlightColor }, 1000);      
    } else {
      $('#rhizo-console-header').effect("highlight",
                                        {color: highlightColor }, 1000);            
    }
  }
};

rhizo.error = function(message) {
  rhizo.log(message, "error");
};

rhizo.warning = function(message) {
  rhizo.log(message, "warning");
}/* ./src/js/extra/rhizo.meta.extra.js */
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
}

rhizo.model.kickstart = function(model, renderer, opt_options) {
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
    if ($p.isSelected(this.id)) {
      $p.unselect(this.id);
    } else {
      $p.select(this.id);
    }
  });

  $(rendering).draggable({
    opacity: 0.7,
    cursor: 'pointer',
    zIndex: 10000,
    distance: 3,
    start: function(ev, ui) {
      $p.toggleSelection('disable');

      // used by droppable feature
      $('#' + ui.helper[0].id).data(
          "dropTop0",
          parseInt($('#'+ ui.helper[0].id).css("top"),10));
      $('#' + ui.helper[0].id).data(
          "dropLeft0",
          parseInt($('#'+ ui.helper[0].id).css("left"),10));

      // figure out all the initial positions for the selected elements
      // and store them.
      if ($p.isSelected(ui.helper[0].id)) {
        for (id in $p.allSelected()) {
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
      if ($p.isSelected(ui.helper[0].id)) {
        for (id in $p.allSelected()) {
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
      $p.toggleSelection('enable');
      if ($p.isSelected(ui.helper[0].id)) {
        for (id in $p.allSelected()) {
         $('#'+id).removeData("top0");
         $('#'+id).removeData("left0");
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
 * @param {string} id
 * @return {Element} the jquery-enhanced HTML dropdown control
 */
rhizo.layout.metaModelKeySelector = function(id) {
  var select = $("<select id='" + id + "' />");
  if ($p && $p.metaModel()) {
    for (key in $p.metaModel()) {
      select.append("<option value='" + key + "'>" +
                    $p.metaModel()[key].label + "</option>");
    }
  }
  return select;
};

rhizo.layout.NoLayout = function() {};

rhizo.layout.NoLayout.prototype.layout = function(container,
                                                  supermodels,
                                                  meta,
                                                  opt_options) {};

rhizo.layout.NoLayout.prototype.toString = function() {
  return "-";
};

rhizo.layout.FlowLayout = function(opt_top, opt_left) {
  this.top = opt_top || 5;
  this.left = opt_left || 5;
};

rhizo.layout.FlowLayout.prototype.layout = function(container,
                                                    supermodels,
                                                    meta,
                                                    opt_options) {
  var maxWidth = $(container).width();
  var lineHeight = 0;

  // reorder supermodels if needed
  var order = $('#rhizo-flowlayout-order').val();
  var reverse = $('#rhizo-flowlayout-desc:checked').length > 0;
  if (order) {
    rhizo.log("Sorting by " + order);
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

rhizo.layout.FlowLayout.prototype.cleanup = function() {
  this.top = this.left = 5;
};

rhizo.layout.FlowLayout.prototype.details = function() {
  return $("<div />").
           append("Ordered by: ").
           append(rhizo.layout.metaModelKeySelector('rhizo-flowlayout-order')).
           append(" desc?").
           append('<input type="checkbox" id="rhizo-flowlayout-desc" />');
};

rhizo.layout.FlowLayout.prototype.toString = function() {
  return "List";
};

rhizo.layout.ScrambleLayout = function() {};

rhizo.layout.ScrambleLayout.prototype.layout = function(container,
                                                        supermodels,
                                                        meta,
                                                        opt_options) {
  if (opt_options && opt_options.filter) {
    return; // re-layouting because of filtering doesn't affect the layout
  }
  var maxWidth = Math.round($(container).width()*0.3) ;
  var maxHeight = Math.round($(container).height()*0.3);

  for (var i = 0, len = supermodels.length; i < len; i++) {
    var r = $(supermodels[i].rendering);
    var top = Math.round($(container).height() / 3 +
                         Math.random()*maxHeight*2 - maxHeight);
    var left = Math.round($(container).width() / 3 +
                          Math.random()*maxWidth*2 - maxWidth);

    r.move(top, left);
  }
};

rhizo.layout.ScrambleLayout.prototype.toString = function() {
  return "Random";
};

rhizo.layout.BucketLayout = function() {
  this.internalFlowLayout_ = new rhizo.layout.FlowLayout();
  this.bucketHeaders_ = [];
};

rhizo.layout.BucketLayout.prototype.layout = function(container,
                                                      supermodels,
                                                      meta,
                                                      opt_options) {
  var reverse = $('#rhizo-bucketlayout-desc:checked').length > 0;

  // detect bucket
  var bucketBy = $('#rhizo-bucketlayout-bucket').val();
  if (!meta[bucketBy]) {
    rhizo.error("layoutBy attribute does not match any property");
    return;
  }
  rhizo.log("Bucketing by " + bucketBy);

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
      buckets[bucketKey] = []
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

  bucketKeys.forEach(function(bucketKey) {
    this.renderBucketHeader_(container, bucketsLabels[bucketKey]);
    this.internalFlowLayout_.layout(container,
                                    buckets[bucketKey],
                                    meta,
                                    opt_options);

    // re-position for next bucket
    this.internalFlowLayout_.top += 10;
    this.internalFlowLayout_.left = 5;
  }, this);
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
  $(container).append(bucketHeader);
  this.internalFlowLayout_.top += bucketHeader.height() + 5;
};


rhizo.layout.BucketLayout.prototype.details = function() {
  return $("<div />").
           append("Group by: ").
           append(rhizo.layout.metaModelKeySelector('rhizo-bucketlayout-bucket')).
           append(" desc?").
           append('<input type="checkbox" id="rhizo-bucketlayout-desc" />');
};

rhizo.layout.BucketLayout.prototype.cleanup = function() {
  this.internalFlowLayout_.cleanup();
  this.bucketHeaders_.forEach(function(bucketHeader) {
    $(bucketHeader).remove();
  });
  this.bucketHeaders_ = [];
};

rhizo.layout.BucketLayout.prototype.toString = function() {
  return "Buckets";
};


rhizo.layout.layouts = {
  no: new rhizo.layout.NoLayout(),
  flow: new rhizo.layout.FlowLayout(),
  scramble: new rhizo.layout.ScrambleLayout(),
  bucket: new rhizo.layout.BucketLayout()
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
    models.forEach(function(model) {
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
rhizo.layout.TreeLayout = function() {};
  
rhizo.layout.TreeLayout.prototype.layout = function(container, supermodels, meta, opt_options) {
  
  // detect rendering direction
  var vertical = $('#rhizo-treelayout-direction').val() == 'ver';
  this.treePainter_ = new rhizo.layout.TreePainter(vertical);
  
  // detect parent
  var parentKey = $('#rhizo-treelayout-parentKey').val();
  if (!meta[parentKey]) {
    rhizo.error("parentKey attribute does not match any property");
    return;
  }
  rhizo.log("Creating tree by " + parentKey);
  
  try {
    // builds the tree model and also checks for validity
    var roots = this.buildTree_(supermodels, parentKey);
    
    var drawingOffset = { left: 0, top: 0 };
    
    var maxHeight = 0;
    for (var id in roots) { // for each root found
      
      // calculate the bounding rectangle for the whole tree, in gd-od coordinates
      var unrotatedBoundingRect = this.treePainter_.calculateBoundingRect_(roots[id]);
      
      // flip the bounding rectangle back to physical coordinates
      var boundingRect = this.treePainter_.toAbsoluteCoords_(unrotatedBoundingRect);
      
      // 'return carriage' if needed
      if (drawingOffset.left + boundingRect.w > $(container).width()) {
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
      rhizo.error(e);
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
rhizo.layout.TreeLayout.prototype.buildTree_ = function(supermodels, parentKey) {
  var globalNodesMap = {};
  for (var i = 0, l = supermodels.length; i < l; i++) {
    globalNodesMap[supermodels[i].id] = new rhizo.layout.TreeNode(supermodels[i]);
  }
  
  var roots = {};
  
  // supermodels contains only the _visible_ models
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
        
        var parentSuperModel = this.findFirstVisibleParent_($p.model(model[parentKey]), parentKey);
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
 * @param {rhizo.model.SuperModel} superParent the model to start the search from.
 * @param {string} parentKey the name of the model attribute that defines the parent-child relationship.
 * @private
 */
rhizo.layout.TreeLayout.prototype.findFirstVisibleParent_ = function(superParent, parentKey) {
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
    
    superParent = $p.model(superParent.unwrap()[parentKey]);
    if (!superParent) {
      // we reached an hidden root.
      return null;
    }
  }
  
  return superParent;
};

rhizo.layout.TreeLayout.prototype.details = function() {
  var select = $("<select id='rhizo-treelayout-direction' />");
  select.append("<option value='hor'>Horizontally</option>");
  select.append("<option value='ver'>Vertically</option>");  
  
  return $("<div />").append(select)
                     .append(" arrange by: ")
                     .append(rhizo.layout.metaModelKeySelector('rhizo-treelayout-parentKey'));
};

rhizo.layout.TreeLayout.prototype.toString = function() {
  return "Tree";
};

rhizo.layout.TreeLayout.prototype.cleanup = function() {
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
  $(container).append(gdconnector);
  $(container).append(odconnector);  
};

rhizo.layout.TreePainter.prototype.cleanup_ = function() {
  this.connectors_.forEach(function(connector) {
    $(connector).remove();
  });
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
rhizo.layout.layouts.tree = new rhizo.layout.TreeLayout();
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
  var pbarPanel = $('<div id="rhizo-progressbar-panel"></div>').appendTo(container);
  var pbar = $('<div id="rhizo-progressbar"></div>').appendTo(pbarPanel);
  this.pbar_ = pbar.progressbar({value: 1});
  $('<div id="rhizo-progressbar-text">Loading...</div>').appendTo(pbarPanel);  
  // setTimeout(function() { $('#rhizo-progressbar-panel').fadeIn(500); }, 500);
};

rhizo.ui.component.Progress.prototype.update = function(value, opt_text) {
  this.pbar_.progressbar('value', value);
  if (opt_text) {
    $('#rhizo-progressbar-text').text(opt_text);
  }
  if (value >= 100) {
    this.destroy_();
  }
};

rhizo.ui.component.Progress.prototype.destroy_ = function() {
  if ($('#rhizo-progressbar-panel').is(':visible')) {
    setTimeout(function() {
      $('#rhizo-progressbar-panel').fadeOut(500, function() {
        $(this).remove();
      });
    }, 1000);
  } else {
    $('#rhizo-progressbar-panel').remove();
  }    
};

rhizo.ui.component.Logo = function() {};

rhizo.ui.component.Logo.prototype.render = function(container, opt_options) {  
 $('<div id="rhizo-header"><h1>Rhizosphere</h1><p>' +
    'by <a href="mailto:battlehorse@gmail.com">Riccardo Govoni</a> (c) 2009<br />' +
    '<a href="http://sites.google.com/site/rhizosphereui/" target="_blank">Project info</a>' +
    '&nbsp;' +
    '<a href="http://sites.google.com/site/rhizosphereui/Home/documentation" target="_blank" ' +
    'style="font-weight:bold; text-decoration: underline">I Need Help!</a>' +
    '</p></div>').appendTo(container);
};

rhizo.ui.component.Viewport = function() {};

rhizo.ui.component.Viewport.prototype.render = function(container, opt_options) {
  var options = opt_options || {};
  
  $('<div id="rhizo-viewport">' +
    '<div id="rhizo-universe"></div>' +
    '<div id="rhizo-scroll-trigger" title="Click to pan around" ></div>' +
    '</div>' +
    '<div id="rhizo-scroll-overlay" style="display: none">' +
    '<div><button id="rhizo-scroll-done">Done</button></div>' +
    '</div>').appendTo(container);
    
  if (options.miniLayout) {
    $('#rhizo-viewport').addClass('rhizo-miniRender');
    $('#rhizo-scroll-overlay').addClass('rhizo-miniRender');
  } else {
    // shrink the viewport
    $('#rhizo-viewport').css('left',300).css('right', 5);    
  }
};

rhizo.ui.component.Viewport.prototype.activate = function(opt_options) {
  this.activatePanning_();
  this.activateSelectionSupport_(opt_options);
};

rhizo.ui.component.Viewport.prototype.activatePanning_ = function() {
  var dragDelta = {
    top: $('#rhizo-viewport').offset().top +
         $('#rhizo-universe').offset().top,
    left: $('#rhizo-viewport').offset().left +
          $('#rhizo-universe').offset().left
  };

  $('#rhizo-scroll-trigger').click(function() {
    $(this).hide();
    var viewport = $('#rhizo-viewport');
    $('#rhizo-scroll-overlay')
      .css('left', viewport.css('left'))
      .css('top', viewport.css('top'))
      .css('width', viewport.width())
      .css('height', viewport.height())
      .css('z-index', 99)
      .css('display', '');

    $('#rhizo-scroll-overlay').draggable({
      helper: function() {
        return $("<div />");
      },
      start: function(ev, ui) {
        var offset = $('#rhizo-universe').offset();
        $('#rhizo-universe')
          .data("top0", offset.top)
          .data("left0", offset.left);
      },
      drag: function(ev, ui) {
        var universe = $('#rhizo-universe');
        var offset = universe.offset();

        var dragTop = ui.position.top +
                      universe.data("top0") - dragDelta.top;
        var dragLeft = ui.position.left +
                       universe.data("left0") - dragDelta.left;

        $('#rhizo-universe')
          .css('top', dragTop).css('bottom', -dragTop)
          .css('left', dragLeft).css('right', -dragLeft);
      },
      refreshPositions: false
    });
  });

  $('#rhizo-scroll-done').click(function() {
    $('#rhizo-scroll-overlay')
      .css('z-index', -1)
      .css('display', 'none');
    $('#rhizo-scroll-trigger').show();
  });  
};

/**
   Checks whether an event was raised on empty space, i.e. somewhere in the
   viewport, but not on top of any models or any other elements.

   Since the viewport and the universe may not be on top of each other, the
   method checks whether any of the two is the original target of the event.

   @params {Event} the event to inspect.
   @returns {boolean} true if the click occurred on the viewport, false
     otherwise.
 */
rhizo.ui.component.Viewport.prototype.isOnEmptySpace = function(evt) {
  return evt.target.id == 'rhizo-viewport' ||
         evt.target.id == 'rhizo-universe';
};

rhizo.ui.component.Viewport.prototype.activateSelectionSupport_ = function(opt_options) {
  $("#rhizo-viewport").selectable({
    selected: function(ev, ui) {
      if (ui.selected.id) {
        $p.select(ui.selected.id);
      }
    },
    unselected: function(ev, ui) {
      if (ui.unselected.id) {
        $p.unselect(ui.unselected.id);
      }
    },
    // TODO: disabled until incremental refresh() is implemented
    // autoRefresh: false,
    filter: opt_options.selectfilter,
    tolerance: 'touch',
    distance: 1
  });

  var viewport = this;
  $("#rhizo-viewport").click(function(ev, ui) {
    if (viewport.isOnEmptySpace(ev)) {
      $p.unselectAll();
    }
  });
};

rhizo.ui.component.MiniToolbar = function() {};

rhizo.ui.component.MiniToolbar.prototype.render = function(container, opt_options) {
  $(
    '<span>' +
      '<a href="" onclick="return false" id="rhizo-link-help" title="Help" >?</a>' +
      '<a href="" onclick="self.resizeTo(1000,700);self.reload();" title="Maximize" class="rhizo-maximize-icon"></a>' +
    '</span>' +
    '<span class="rhizo-filters-header"><a href="" onclick="return false;" id="rhizo-link-display" >Display</a></span>' +
    '<span class="rhizo-filters-header"><a href="" onclick="return false;" id="rhizo-link-selection" >Selection</a></span>' +
    '<span class="rhizo-filters-header"><a href="" onclick="return false;" id="rhizo-link-filters" >Filters</a></span>' +
    '<span class="rhizo-filters-header"><a href="" onclick="return false;" id="rhizo-legend" style="display: none">Legend</a></span>'
    ).appendTo(container);
};

rhizo.ui.component.MiniToolbar.prototype.activate = function(opt_options) {
  var panels = [
    { panel: '#rhizo-update-layout', link: '#rhizo-link-display'},
    { panel: '#rhizo-selection', link: '#rhizo-link-selection'},
    { panel: '#rhizo-filter-container', link: '#rhizo-link-filters'},
    { panel: '#rhizo-help', link: '#rhizo-link-help'},
    { panel: '#rhizo-legend-panel',  link: '#rhizo-legend'}];

  panels.forEach(function(currentPanel) {
    $(currentPanel.link).click(function() {
      panels.forEach(function(p) {
        if (p.panel == currentPanel.panel) {
          $(p.panel).toggle();
          $(p.link).toggleClass('rhizo-filter-open');
        } else {
          $(p.panel).css('display', 'none');
          $(p.link).removeClass('rhizo-filter-open');
        }
      });
      return false;
    });
  });  
};


rhizo.ui.component.Console = function() {};

rhizo.ui.component.Console.prototype.render = function(container, opt_options) {
  $(
  '<div id="rhizo-console-header">' +
    '<div id="rhizo-console-close">&#8659;</div>' +
    'Log Console' +
  '</div>' +
  '<div id="rhizo-console-contents" style="clear: right; display: none">' +
  '</div>').appendTo(container);
};

rhizo.ui.component.Console.prototype.activate = function(opt_options) {
  $('#rhizo-console-close').click(function() {
    if ($('#rhizo-console-contents').is(":visible")) {
      $('#rhizo-console-contents').slideUp("slow", function() {
        $('#rhizo-console-close').html("&#8659;");
        $('#rhizo-console-contents').empty();
      });
    } else {
      $('#rhizo-console-contents').slideDown("slow", function() {
        $('#rhizo-console-close').html("&#8657;");
      });
    }
  });
};

rhizo.ui.component.Layout = function() {};

rhizo.ui.component.Layout.prototype.render = function(container, opt_options) {
  var options = opt_options || {};
  
  if (!options.miniLayout) {
    $('<div class="rhizo-filters-header">Display</div>').appendTo(container);
  }
  
  $(
    '<div id="rhizo-update-layout"><div id="rhizo-layout-extra-options">' +
    '</div></div>').appendTo(container);
    
  if (options.miniLayout) {
    $('#rhizo-update-layout').addClass('rhizo-floating-panel').css('display', 'none');
  }

  this.select_ = $("<select id='rhizo-layout' />");
  this.detailsMap_ = {};
  if (rhizo.layout && rhizo.layout.layouts) {
    for (layout in rhizo.layout.layouts){
      var engine = rhizo.layout.layouts[layout];
      this.select_.append($("<option value='" + layout + "'>" + engine  + "</option>"));
      if (engine.details) {
	var details = engine.details();
	this.detailsMap_[layout] = details;
	$('#rhizo-layout-extra-options').append(details.css("display","none"));
      }
    }
  }

  this.submit_ = $("<button>Update</button>");
  $('#rhizo-update-layout').prepend(this.submit_)
                           .prepend(this.select_)
                           .prepend("Keep items ordered by: ");
};

rhizo.ui.component.Layout.prototype.activate = function(opt_options) {
  var detailsMap = this.detailsMap_;
  this.select_.change(function(ev) {
    for (layout in detailsMap) {
      if (layout == $(this).val()) {
        detailsMap[layout].show("fast");
      } else {
        detailsMap[layout].hide("fast");
      }
    }
  });

  this.submit_.click(function() {
    $p.layout($('#rhizo-layout').val());
  });
};

rhizo.ui.component.SelectionManager = function() {};

rhizo.ui.component.SelectionManager.prototype.render = function(container, opt_options) {
  var options = opt_options || {};
  
  if (!options.miniLayout) {
    $('<div class="rhizo-filters-header">Selection</div>').appendTo(container);
  } 
  
  $('<div id="rhizo-selection"></div>').appendTo(container);
  
  if (options.miniLayout) {
    $('#rhizo-selection').addClass('rhizo-floating-panel').css('display', 'none');
  }  
  this.button_ = $('<button id="rhizo-selected-items-only">' +
                 'Work on selected items only</button>');
  this.resetButton_ = $('<button id="rhizo-selected-reset" disabled="disabled">' +
                      'Reset</button>');
  $('#rhizo-selection').append(this.button_).append(this.resetButton_); 
};

rhizo.ui.component.SelectionManager.prototype.activate = function(opt_options) {
  this.button_.click(function(ev) {
    var countSelected = 0;
    for (id in $p.allSelected()) { countSelected++ };
    if (countSelected == 0) {
      rhizo.error("No items selected");
      return;
    }

    var allUnselected = $p.allUnselected();
    var countFiltered = 0;
    for (id in allUnselected) {
      allUnselected[id].filter("__selection__"); // hard-coded keyword
      countFiltered++;
    }
    // after filtering some elements, perform layout again
    $p.alignVisibility();
    $p.layout(null, { filter: true});
    $p.unselectAll();
    $('#rhizo-selected-reset').
        removeAttr("disabled").
        text("Reset (" + countFiltered + " filtered)");
  });


  this.resetButton_.click(function(ev) {
    $p.resetAllFilter("__selection__");
    // after filtering some elements, perform layout again
    $p.alignVisibility();
    $p.layout(null, { filter: true});
    $(this).attr("disabled","disabled").text("Reset");
  }); 
};

rhizo.ui.component.Filters = function() {};

rhizo.ui.component.Filters.prototype.render = function(container, opt_options) {
  var options = opt_options || {};
  
  if (!options.miniLayout) {
    $('<div class="rhizo-filters-header">Filters</div>').appendTo(container);
  }
    
  $('<div id="rhizo-filter-container"></div>').appendTo(container);
  
  if (options.miniLayout) {
    $('#rhizo-filter-container').addClass('rhizo-floating-panel').css('display', 'none');
    $('<span id="rhizo-next-filter" title="Next filter"></span>').appendTo($('#rhizo-filter-container'));
    $('<span id="rhizo-prev-filter" title="Previous filter"></span>').appendTo($('#rhizo-filter-container'));  
  }
  
  var first = true;
  var metaModel = $p.metaModel();
  for (key in metaModel) {
    var filter = metaModel[key].kind.renderFilter(metaModel[key], key);
    if (options.miniLayout) {
      if (first) {
        first = false;
      } else {
        filter.css('display', 'none');
      }
    }
    $('#rhizo-filter-container').append(filter);
  }  
};

rhizo.ui.component.Filters.prototype.activate = function(opt_options) {
  // Every single filter implementation auto-activates itself when created.
  // Here we only need to activate the navigation between filters.
  $('#rhizo-next-filter').click(function() {
    var current = $('.rhizo-filter:visible');
    var next = current.next('.rhizo-filter:hidden').eq(0);
    if (next.length > 0) {
      // cannot use hide/show otherwise safari clips rendering
      current.css('display', 'none');
      next.css('display', '');
    }
  });

  $('#rhizo-prev-filter').click(function() {      
    var current = $('.rhizo-filter:visible');
    var prev = current.prev('.rhizo-filter:hidden').eq(0);
    if (prev.length > 0) {
      // cannot use hide/show otherwise safari clips rendering
      current.css('display', 'none');
      prev.css('display', '');
    }
  });  
};

rhizo.ui.component.Legend = function() {};

rhizo.ui.component.Legend.prototype.render = function(container, opt_options) {
  var options = opt_options || {};
  
  var sizeRange = null;
  if ($p.renderer().getSizeRange) {
    sizeRange = $p.renderer().getSizeRange();
  }
  var colorRange = null;
  if ($p.renderer().getColorRange) {
    colorRange = $p.renderer().getColorRange();
  }
  
  if (sizeRange || colorRange) {
    $('<div id="rhizo-legend-panel"></div>').appendTo(container);
    if (!options.miniLayout) {
      $('<div class="rhizo-filters-header">Legend</div>').appendTo($('#rhizo-legend-panel'));
    } else {
      $('#rhizo-legend-panel').addClass('rhizo-floating-panel').css('display', 'none');
      // TODO(battlehorse): this direct reference to an element declared elsewhere
      // should not be here, as it creates an underwater dependency between components. 
      $('#rhizo-legend').show();
    }    
  }

  if (sizeRange) {
    $(
      '<div id="rhizo-legend-size" style="margin-bottom: 5px">' +
        '<span id="rhizo-legend-size-min" ></span>' +
        '<span class="ar-fon-0">A</span> -- ' +
        '<span class="ar-fon-5">A</span>' +
        '<span id="rhizo-legend-size-max" ></span>' +
      '</div>'
      ).appendTo($('#rhizo-legend-panel'));
    $('#rhizo-legend-size-min').html(
        sizeRange.label + ' &nbsp; ' + rhizo.ui.toHumanLabel(sizeRange.min) + ':');
    $('#rhizo-legend-size-max').html(': ' + rhizo.ui.toHumanLabel(sizeRange.max));
  }
  
  if (colorRange) {
    $(
      '<div id="rhizo-legend-color" style="margin-bottom: 5px">' +
        '<span id="rhizo-legend-color-min"></span>' +
        '<span class="ar-col-0 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;' +
        '<span class="ar-col-1 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;' +
        '<span class="ar-col-2 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;' +
        '<span class="ar-col-3 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;' +
        '<span class="ar-col-4 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;' +
        '<span class="ar-col-5 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;' +
        '<span id="rhizo-legend-color-max"></span>' +          
      '</div>'
      ).appendTo($('#rhizo-legend-panel'));
    $('#rhizo-legend-color-min').html(
        colorRange.label + ' &nbsp; ' + rhizo.ui.toHumanLabel(colorRange.min) + ':');
    $('#rhizo-legend-color-max').html(': ' + rhizo.ui.toHumanLabel(colorRange.max));
  }  
};

rhizo.ui.component.Legend.prototype.activate = function(opt_options) {};

rhizo.ui.component.Actions = function() {};

rhizo.ui.component.Actions.prototype.render = function(container, opt_options) {
  $(  
    '<div id="rhizo-actions">' +
      '<h1>Actions</h1>' +
      '<div class="rhizo-action" id="rhizo-action-2">' +
        'Sample Action 1' +
      '</div>' +
      '<div class="rhizo-action" id="rhizo-action-1">' +
        'Sample Action 2' +
      '</div>' +
    '</div>'
    ).appendTo(container);
};

rhizo.ui.component.Actions.prototype.activate = function(opt_options) {
  if ($('.rhizo-action').length > 0) {
    $('.rhizo-action').draggable({helper: 'clone'});
    $('#rhizo-universe').droppable({
      accept: '.rhizo-action',
      drop: function(ev, ui) {
        var offset = $('#rhizo-universe').offset();
        var rightBorder = $('#rhizo-universe').width();
        var bottomBorder = $('#rhizo-universe').height();

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

        $('#rhizo-universe').append(dropbox);
        dropbox.fadeIn();
        dropbox.draggable({
          start: function() { $p.toggleSelection('disable'); },
          stop: function() { $p.toggleSelection('enable'); }
        });
        dropbox.droppable({
          accept: '.rhizo-model',
          drop: function(ev, ui) {
            if (!$p.isSelected(ui.draggable[0].id)) {
              var id = ui.draggable[0].id;
              alert("Action applied on " + $p.model(id));
              $('#' + id).move($('#'+id).data("dropTop0"),
                               $('#'+id).data("dropLeft0"));
            } else {
              var countSelected = 0;
              for (var id in $p.allSelected()) { countSelected++;}
              alert("Action applied on " + countSelected + " elements");

              for (var id in $p.allSelected()) {
                $('#' + id).move($('#'+id).data("dropTop0"),
                                 $('#'+id).data("dropLeft0"));
              }
              $p.unselectAll();
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

rhizo.ui.component.MiniTemplate = function() {
  this.components_ = {
    LOGO: new rhizo.ui.component.Logo(),
    VIEWPORT: new rhizo.ui.component.Viewport(),
    LAYOUT: new rhizo.ui.component.Layout(),
    SELECTION_MANAGER: new rhizo.ui.component.SelectionManager(),
    FILTERS: new rhizo.ui.component.Filters(),
    LEGEND: new rhizo.ui.component.Legend(),    
    MINITOOLBAR: new rhizo.ui.component.MiniToolbar()
  };
};

rhizo.ui.component.MiniTemplate.prototype.renderChrome = function(container, opt_options) {
  rhizo.disableLogging();
  this.components_.VIEWPORT.render(container, opt_options);
  this.progress_ = new rhizo.ui.component.Progress($('#rhizo-viewport'));
  this.bottomBar_ = $('<div id="rhizo-bottom-bar"></div>').appendTo(container); 
  
  this.progress_.update(10, 'Creating static UI...');
  this.components_.MINITOOLBAR.render(this.bottomBar_, opt_options);
  
  var help_floating_panel = $('<div id="rhizo-help" class="rhizo-floating-panel" style="display:none"></div>').appendTo(this.bottomBar_);
  this.components_.LOGO.render(help_floating_panel, opt_options);
  this.progress_.update(25, 'All static UI created.');
};

rhizo.ui.component.MiniTemplate.prototype.activateChrome = function(opt_options) {
  this.progress_.update(26, 'Activating static UI...');
  this.components_.VIEWPORT.activate(opt_options);
  this.components_.MINITOOLBAR.activate(opt_options);  
  this.progress_.update(33, 'Loading models...');
};

rhizo.ui.component.MiniTemplate.prototype.renderDynamic = function(container, opt_options) {
  this.progress_.update(34, 'Creating dynamic controls...');
  this.components_.LAYOUT.render(this.bottomBar_, opt_options);
  this.progress_.update(38, 'Layout engine created.');
  this.components_.SELECTION_MANAGER.render(this.bottomBar_, opt_options);
  this.progress_.update(42, 'Selection manager created.');
  this.components_.FILTERS.render(this.bottomBar_, opt_options);  
  this.progress_.update(46, 'Filters created.');
  this.components_.LEGEND.render(this.bottomBar_, opt_options);
  this.progress_.update(48, 'Legend created.');  
};

rhizo.ui.component.MiniTemplate.prototype.activateDynamic = function(opt_options) {
  this.progress_.update(51, 'Activating dynamic controls...');
  this.components_.LAYOUT.activate(opt_options);
  this.components_.SELECTION_MANAGER.activate(opt_options);
  this.components_.FILTERS.activate(opt_options);    
  this.components_.LEGEND.activate(opt_options);
  this.progress_.update(66, 'Rhizosphere controls are ready.');   
};

rhizo.ui.component.MiniTemplate.prototype.done = function() {
  this.progress_.update(100, 'Rhizosphere ready!');  
};



rhizo.ui.component.StandardTemplate = function() {
  this.components_ = {
    LOGO: new rhizo.ui.component.Logo(),
    VIEWPORT: new rhizo.ui.component.Viewport(),
    CONSOLE: new rhizo.ui.component.Console(),
    LAYOUT: new rhizo.ui.component.Layout(),
    SELECTION_MANAGER: new rhizo.ui.component.SelectionManager(),
    FILTERS: new rhizo.ui.component.Filters(),
    LEGEND: new rhizo.ui.component.Legend(),
    ACTIONS: new rhizo.ui.component.Actions()
  };
};

rhizo.ui.component.StandardTemplate.prototype.renderChrome = function(container, opt_options) {
  this.components_.VIEWPORT.render(container, opt_options);
  this.progress_ = new rhizo.ui.component.Progress($('#rhizo-viewport'));

  this.leftBar_= $('<div id="rhizo-left"></div>').appendTo(container);
  $('<div id="rhizo-right-pop"></div>').appendTo(container);
  this.rightBar_ = $('<div id="rhizo-right" style="display:none"></div>').appendTo(container);

  this.progress_.update(10, 'Creating static UI...');
  this.components_.LOGO.render(this.leftBar_, opt_options);
  this.components_.CONSOLE.render(this.rightBar_, opt_options);
  this.progress_.update(25, 'All static UI created.');
};

rhizo.ui.component.StandardTemplate.prototype.activateChrome = function(opt_options) {
  this.progress_.update(26, 'Activating static UI...');
  
  $('#rhizo-right-pop').click(function() {
    if ($('#rhizo-right').is(":visible")) {
      $(this).css('right', 0);
      $('#rhizo-viewport').css('right', 5);
      $('#rhizo-right').css('display', 'none');
    } else {
      $('#rhizo-viewport').css('right', 135);
      $(this).css('right', 130);
      $('#rhizo-right').css('display', '');
    }
  });
  
  this.components_.CONSOLE.activate(opt_options);
  this.components_.VIEWPORT.activate(opt_options);
  this.progress_.update(33, 'Loading models...');
};

rhizo.ui.component.StandardTemplate.prototype.renderDynamic = function(container, opt_options) {
  this.progress_.update(34, 'Creating dynamic controls...');
  this.components_.LAYOUT.render(this.leftBar_, opt_options);
  this.progress_.update(38, 'Layout engine created.');  
  this.components_.SELECTION_MANAGER.render(this.leftBar_, opt_options);
  this.progress_.update(42, 'Selection manager created.');      
  this.components_.FILTERS.render(this.leftBar_, opt_options);
  this.progress_.update(46, 'Filters created.');
  this.components_.LEGEND.render(this.leftBar_, opt_options);
  this.progress_.update(48, 'Legend created.');
  this.components_.ACTIONS.render(this.rightBar_, opt_options);
  this.progress_.update(50, 'Actions created');
};

rhizo.ui.component.StandardTemplate.prototype.activateDynamic = function(opt_options) {
  this.progress_.update(51, 'Activating dynamic controls...');
  this.components_.LAYOUT.activate(opt_options);
  this.components_.SELECTION_MANAGER.activate(opt_options);
  this.components_.FILTERS.activate(opt_options);
  this.components_.LEGEND.activate(opt_options);  
  this.components_.ACTIONS.activate(opt_options); 
  this.progress_.update(66, 'Rhizosphere controls are ready.');  
};

rhizo.ui.component.StandardTemplate.prototype.done = function() {
  this.progress_.update(100, 'Rhizosphere ready!');
};/* ./src/js/rhizo.gviz.js */
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

rhizo.gviz.Initializer = function(dataTable, opt_options, opt_customRenderer) {
  this.dt_ = dataTable;
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
        rhizo.warning("Column " + metamodel[id].label +
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

  prunedCats = prunedCats.forEach(function(category) {
    categoriesMap[category.replace(/^\s+|\s+$/g, "")] = true;
  });

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
    rowCategories.forEach(function(category) {
      categoriesMap[category] = true;
    });
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

// Plain Javascript file loader
rhizo.model.loader.JS = function() {};
rhizo.model.loader.loaders.push(new rhizo.model.loader.JS());

rhizo.model.loader.JS.prototype.setGlobalOptions =
    function(globalOptions) {
  this.globalOptions_ = globalOptions;
}

rhizo.model.loader.JS.prototype.match = function(resource) {
  return /\.js$/.test(resource);
};

rhizo.model.loader.JS.prototype.load = function(resource) {
  var e = document.createElement("script");
  e.src = resource;
  e.type="text/javascript";
  document.getElementsByTagName("head")[0].appendChild(e);

  // we expect the script to contain the code the deploy the project,
  // in addition to just defining models and renderers.
};

// Google Spreadsheet GViz loader
rhizo.model.loader.GoogleSpreadsheet = function() {};
rhizo.model.loader.loaders.push(new rhizo.model.loader.GoogleSpreadsheet());

rhizo.model.loader.GoogleSpreadsheet.prototype.setGlobalOptions =
    function(globalOptions) {
  this.globalOptions_ = globalOptions;
}

rhizo.model.loader.GoogleSpreadsheet.prototype.match = function(resource) {
  return /spreadsheets\.google\.com/.test(resource);
};

rhizo.model.loader.GoogleSpreadsheet.prototype.load = function(resource) {
  // The javascript http://www.google.com/jsapi and the visualization
  // package must be already included in the page and available at this point.
  if (!google.visualization) {
    rhizo.error('Google Visualization APIs not available.');
  } else {
    var query = new google.visualization.Query(resource);
    var that = this;  // needed to propagate this through the Gviz callback.
    var callback = function(response) {
      that.handleQueryResponse_(response);
    }
    query.send(callback);
  }
};

rhizo.model.loader.GoogleSpreadsheet.prototype.handleQueryResponse_ =
    function(response) {
  if (response.isError()) {
    alert("GViz load failed: " + response.getMessage());
    return;
  }
  var initializer = new rhizo.gviz.Initializer(response.getDataTable(),
                                               this.globalOptions_);

  rhizo.bootstrap.setRenderer(initializer.renderer);
  rhizo.bootstrap.setMetaModel(initializer.metamodel);
  rhizo.bootstrap.deploy(initializer.models);
};

// Gadget GViz loader
rhizo.model.loader.GoogleGadget = function() {};
rhizo.model.loader.loaders.push(new rhizo.model.loader.GoogleGadget());

rhizo.model.loader.GoogleGadget.prototype.setGlobalOptions =
    function(globalOptions) {
  this.globalOptions_ = globalOptions;
}

rhizo.model.loader.GoogleGadget.RESOURCE = "__google_gadget";
rhizo.model.loader.GoogleGadget.prototype.match = function(resource) {
  var regexp = new RegExp(rhizo.model.loader.GoogleGadget.RESOURCE);
  return regexp.test(resource);
};

rhizo.model.loader.GoogleGadget.prototype.load = function(resource) {
  if (!google.visualization) {
    rhizo.error('Google Visualization APIs not available.');
    return;
  }
  
  if (typeof _IG_Prefs == 'undefined') {
    rhizo.error('Google Gadget APIs not available.');
    return;
  } 
  
  var prefs = new _IG_Prefs();
  var gadgetHelper = new google.visualization.GadgetHelper();
  var query = gadgetHelper.createQueryFromPrefs(prefs);
  var that = this;  // needed to propagate this through the Gviz callback.
  var callback = function(response) {
    that.handleQueryResponse_(response);
  }
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
 * @param {Object} globalOptions key-values for the global options.
 */
rhizo.model.loader.load = function(resource, globalOptions) {
  var loaders = rhizo.model.loader.loaders;

  for (var i = 0; i < loaders.length; i++) {
    loaders[i].setGlobalOptions(globalOptions);
    if (loaders[i].match(resource)) {
      loaders[i].load(resource);
      return;
    }
  }

  // No rhizo-console at this point yet, so we rely on alerts. This is
  // probably going to change if dynamic model loading is introduced.
  alert('No loader available for the resource: ' + resource);
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

// RHIZODEP=rhizo.model.loader,rhizo.base,rhizo.ui.component,rhizo.ui
namespace('rhizo.bootstrap');

rhizo.bootstrap.go = function(container, opt_options, opt_resource) {
  new rhizo.bootstrap.Bootstrap(container, opt_options);
  $globalBootstrapper_.go(opt_resource);
};

rhizo.bootstrap.setMetaModel = function(metamodel) {
  $globalBootstrapper_.setMetaModel(metamodel);
};

rhizo.bootstrap.setRenderer = function(renderer) {
  $globalBootstrapper_.setRenderer(renderer);
};

rhizo.bootstrap.deploy = function(opt_models) {
  $globalBootstrapper_.deploy(opt_models);
};

$globalBootstrapper_ = null;
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
  
  $globalBootstrapper_ = this;
}

rhizo.bootstrap.Bootstrap.prototype.go = function(opt_resource) {
  // Get the minimum chrome up and running
  this.template_ = this.options_.miniLayout ? 
      new rhizo.ui.component.MiniTemplate() :
      new rhizo.ui.component.StandardTemplate();
  this.template_.renderChrome(this.container_, this.options_);
  this.template_.activateChrome(this.options_);
  
  // Disable animations and other performance tunings if needed
  rhizo.ui.performanceTuning(this.options_.noAnims);
  
  // Create the project
  this.project_ = new rhizo.Project(this.options_);
  
  var source = opt_resource;
  if (!source) {
    var regex = new RegExp('source=(.*)$');
    var results = regex.exec(document.location.href);
    if (!results || !results[1]) {
      rhizo.error("Unable to identify datasource from location");
    } else {
      source = unescape(results[1]);
    }
  } 
  
  if (source) {
    rhizo.model.loader.load(source, this.options_);
  }
};

rhizo.bootstrap.Bootstrap.prototype.setMetaModel = function(metamodel) {
  this.project_.setMetaModel(metamodel);
};

rhizo.bootstrap.Bootstrap.prototype.setRenderer = function(renderer) {
  this.project_.setRenderer(renderer);
};

rhizo.bootstrap.Bootstrap.prototype.deploy = function(opt_models) {
  this.template_.renderDynamic(this.container_, this.options_);
  this.template_.activateDynamic(this.options_);

  this.project_.deploy(opt_models);
  this.template_.done();
};
