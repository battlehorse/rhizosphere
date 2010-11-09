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
  This draws the UI for the filter on this type

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
    project.filter(key, $(this).val());
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
        project.filter(
          key, [$(this.year_).val(), $(this.month_).val(), $(this.day_).val()]);
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
        this.minLabel_.
            text(this.toHumanLabel_(this.toModelScale_(ui.values[0]))).
            addClass("rhizo-slider-moving");
        this.maxLabel_.removeClass("rhizo-slider-moving");
      }
      if (ui.values[1] != maxFilterScale) {
        // max slider has moved
        this.maxLabel_.
            text(this.toHumanLabel_(this.toModelScale_(ui.values[1]))).
            addClass("rhizo-slider-moving");
        this.minLabel_.removeClass("rhizo-slider-moving");
      }
  }, this);

  // wrap change handler into a closure to preserve access to the RangeKind
  // filter.
  var stopCallback = jQuery.proxy(function(ev, ui) {
      var minSlide = Math.max(this.toModelScale_(ui.values[0]), metadata.min);
      var maxSlide = Math.min(this.toModelScale_(ui.values[1]), metadata.max);
      this.minLabel_.text(this.toHumanLabel_(minSlide)).removeClass(
          "rhizo-slider-moving");
      this.maxLabel_.text(this.toHumanLabel_(maxSlide)).removeClass(
          "rhizo-slider-moving");
      project.filter(key, { min: minSlide, max: maxSlide });
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
      [this.toFilterScale_(value.min), this.toFilterScale_(value.max)]);
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
    project.filter(key, $(this).val());
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
  return { key: modelValue.length == 0 ? "Nothing" : modelValue,
           label: modelValue.length == 0 ? "Nothing" : modelValue };
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
