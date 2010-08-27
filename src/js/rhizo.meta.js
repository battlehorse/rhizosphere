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
