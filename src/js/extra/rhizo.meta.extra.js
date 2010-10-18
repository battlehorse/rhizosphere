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
  this.precision_ = opt_precision || 2;
  this.scale_ = Math.pow(10, this.precision_);
};
rhizo.inherits(rhizo.meta.DecimalRangeKind, rhizo.meta.RangeKind);

rhizo.meta.DecimalRangeKind.prototype.compare =
    rhizo.meta.DecimalKind.prototype.compare;

rhizo.meta.DecimalRangeKind.prototype.cluster =
    rhizo.meta.DecimalKind.prototype.cluster;

rhizo.meta.DecimalRangeKind.prototype.toModelScale_ = function(filterValue) {
  // toFixed() returns a string, hence the need to parseFloat()
  return parseFloat((filterValue / this.scale_).toFixed(this.precision_));
};

rhizo.meta.DecimalRangeKind.prototype.toFilterScale_ = function(modelValue) {
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
