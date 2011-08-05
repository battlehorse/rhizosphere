/**
  @license
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
 * @fileOverview Definition of additional Rhizosphere metamodel Kinds that
 * address specialized needs and may be excluded from main distribution if
 * not needed. Users needing them should be able to include them in their own
 * visualization by just including this js file in addition to the rest of the
 * Rhizosphere javascript payload.
 */

// RHIZODEP=rhizo,rhizo.meta
namespace('rhizo.meta');


// Extends the Kind enum to include keys for the extra filters.
rhizo.meta.Kind = rhizo.meta.Kind || {};
rhizo.meta.Kind.DECIMAL = 'decimal';
rhizo.meta.Kind.DECIMALRANGE = 'decimalRange';
rhizo.meta.Kind.LOGARITHMRANGE = 'logarithmRange';
rhizo.meta.Kind.STRINGARRAY = 'stringArray';


/**
 * An extensions of the basic number type to handle decimal (floating point)
 * numbers.
 * @param {Object} metamodelEntry The metamodel entry this decimal type is
 *     assigned to. The metamodel entry can be enriched with an additional
 *     'precision' property to customize the precision (in terms of decimal
 *     digits after the floating point) to use when parsing and clustering
 *     decimal numbers. Users of this filter are strongly encouraged to
 *     customize this setting on a per-field basis.
 * @constructor
 */
rhizo.meta.DecimalKind = function(metamodelEntry) {
  this.precision_ = typeof(metamodelEntry['precision']) == 'number' ?
      metamodelEntry['precision'] : 2;
};
rhizo.meta.defaultRegistry.registerKind(
    rhizo.meta.Kind.DECIMAL, rhizo.meta.DecimalKind);

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
  var fModelValue = parseFloat(modelValue.toFixed(this.precision_));

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
 * An extension of the basic range type to handle ranges of decimal values.
 *
 * @param {Object} metamodelEntry The metamodel entry this decimal type is
 *     assigned to. The metamodel entry can be enriched with an additional
 *     'precision' property to customize the precision (in terms of decimal
 *     digits after the floating point) to use when parsing and clustering
 *     decimal numbers. Users of this filter are strongly encouraged to
 *     customize this setting on a per-field basis.
 * @constructor
 */
rhizo.meta.DecimalRangeKind = function(metamodelEntry) {
  this.precision_ = typeof(metamodelEntry['precision']) == 'number' ?
      metamodelEntry['precision'] : 2;
  this.scale_ = Math.pow(10, this.precision_);
};
rhizo.meta.defaultRegistry.registerKind(
    rhizo.meta.Kind.DECIMALRANGE, rhizo.meta.DecimalRangeKind);

rhizo.meta.DecimalRangeKind.prototype.survivesFilter = function(filterValue,
                                                                modelValue) {
  return modelValue >= filterValue.min && modelValue <= filterValue.max;
};

rhizo.meta.DecimalRangeKind.prototype.compare =
    rhizo.meta.DecimalKind.prototype.compare;

rhizo.meta.DecimalRangeKind.prototype.cluster =
    rhizo.meta.DecimalKind.prototype.cluster;

rhizo.meta.DecimalRangeKind.prototype.isNumeric =
    rhizo.meta.DecimalKind.prototype.isNumeric;

rhizo.meta.DecimalRangeKind.prototype.toModelScale = function(userValue) {
  // toFixed() returns a string, hence the need to parseFloat()
  return parseFloat((userValue / this.scale_).toFixed(this.precision_));
};

rhizo.meta.DecimalRangeKind.prototype.toUserScale = function(modelValue) {
  return Math.round(modelValue * this.scale_);
};


/**
 * An extension of the basic range type to handle ranges of decimal values,
 * specialized for operating over decimal ranges of values using a logarithmic
 * scale.
 *
 * @param {Object} metamodelEntry The metamodel entry this logarithm type is
 *     assigned to. The metamodel entry can be enriched with an additional set
 *     of properties:
 *     - 'precision': defines the precision (in terms of decimal digits after
 *       the floating point) to use when parsing and clustering decimal
 *       numbers. Users of this filter are strongly encouraged to customize
 *       this setting on a per-field basis.
 *     - 'oneplus': If true, then the transformation applied to convert between
 *       user and model scale will be Log10(1+x) rather than Log10(x) (useful
 *       if your dataset has values that start from 0).
 * @constructor
 */
rhizo.meta.LogarithmRangeKind = function(metamodelEntry) {
  this.precision_ = typeof(metamodelEntry['precision']) == 'number' ?
      metamodelEntry['precision'] : 2;
  this.scale_ = Math.pow(10, this.precision_);
  this.oneplus_ = !!metamodelEntry['oneplus'];
};
rhizo.meta.defaultRegistry.registerKind(
    rhizo.meta.Kind.LOGARITHMRANGE, rhizo.meta.LogarithmRangeKind);

rhizo.meta.LogarithmRangeKind.prototype.survivesFilter = function(filterValue,
                                                                  modelValue) {
  return modelValue >= filterValue.min && modelValue <= filterValue.max;
};

rhizo.meta.LogarithmRangeKind.prototype.compare =
    rhizo.meta.DecimalKind.prototype.compare;

rhizo.meta.LogarithmRangeKind.prototype.cluster =
    rhizo.meta.DecimalKind.prototype.cluster;

rhizo.meta.LogarithmRangeKind.prototype.isNumeric =
    rhizo.meta.DecimalKind.prototype.isNumeric;

rhizo.meta.LogarithmRangeKind.prototype.toModelScale = function(userValue) {
  // toFixed() returns a string, hence the need to parseFloat()
  var delta = this.oneplus_ ? -1 : 0;
  return parseFloat(
    Math.pow(10, userValue / this.scale_).toFixed(this.precision_)) +  delta;
};

rhizo.meta.LogarithmRangeKind.prototype.toUserScale = function(modelValue) {
  modelValue = this.oneplus_ ? modelValue+1 : modelValue;
  return Math.round(rhizo.util.log10_(modelValue) * this.scale_);
};


/**
 * A metamodel Kind that behaves exactly like a String kind but expects the
 * model to be an array of strings, instead of just a single one.
 *
 * TODO(battlehorse): This is still very temporary, since a) it doesn't support
 * clustering and b) it could be made a lot more generic (create array filters
 * out of normal filters by wrapping them).
 *
 * @constructor
 */
rhizo.meta.StringArrayKind = function() {};
rhizo.meta.defaultRegistry.registerKind(
    rhizo.meta.Kind.STRINGARRAY, rhizo.meta.StringArrayKind);

rhizo.meta.StringArrayKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  if (filterValue != '') {
    for (var i=0; i<modelValue.length;i++) {
      if (modelValue[i].toLowerCase().indexOf(
          filterValue.toLowerCase()) != -1) {
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
