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
 * @fileOverview Implementation of all basic Rhizosphere metamodel Kinds
 * (model attribute types in Rhizosphere terminology) and associated behavior.
 *
 * Kinds are associated to each Rhizosphere metamodel key to describe the type
 * of each model attribute. The attribute kind drives the behavior of the
 * Rhizosphere visualization when filtering, clustering and other operations
 * are performed on the attribute.
 *
 * To define a new meta-type:
 * - define a new Javascript class.
 *
 * - implement the survivesFilter() function.
 *   The function is invoked when filtering Rhizosphere models on the attribute
 *   the kind describes. It verifies if a model value matches the filter or not
 *
 * - implement the isNumeric() function.
 *   This tells whether the data the kind describes is of numeric nature or not
 *   (i.e. can be used in arithmetic computations).
 *
 * - implement the cluster() function (optional).
 *   Describes a grouping behavior for this type. Invoked whenever the
 *   visualization needs to cluster multiple models in a single group (for
 *   example, when a bucketing layout is used).
 *
 * - implement the compare() function (optional).
 *   Defines how two values of this kind are compared against each other.
 *   Returns negative, 0, or positive number if the first element is smaller,
 *   equal or bigger than the second.
 *
 * - implement a toUserScale() / toModelScale() function pair (optional).
 *   Define how to convert the scale of model values respectively to/from a user
 *   facing scale. For example, a logarithmic conversion may be applied to
 *   normalize model values that span a range that would otherwise be too wide.
 *
 * - register the newly created kind a rhizo.meta.KindRegistry (either the
 *   default rhizo.meta.defaultRegistry or a custom one that you must then
 *   manually provide to a project.
 *
 * A metamodel Kind may have an associated user interface to let the user
 * enter filtering criteria. To provide a user interface for a metamodel Kind,
 * see rhizo.ui.meta.js.
 *
 * NOTE: although all the basic Kind classes defined in this file are stateless,
 * the registration framework allows for stateful instances to be used if
 * needed.
 */


// RHIZODEP=rhizo
// Metamodel namespace
namespace("rhizo.meta");


/**
 * Returns a comparison function that sorts Rhizosphere models according to one
 * of their attributes.
 *
 * The comparison function delegates to the comparison logic of the metamodel
 * Kind associated to the attribute, if present, and falls back to native
 * sorting otherwise.
 *
 * @param {string} key The metamodel key that identifies the attribute to
 *     sort against.
 * @param {*} kind The Rhizosphere metamodel Kind that describes the attribute.
 * @param {boolean=} opt_reverse Whether the sorting order should be reversed.
 * @return {function(rhizo.model.SuperModel, rhizo.model.SuperModel):number}
 *     The comparison function.
 */
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


/**
 * Returns a comparison function that sorts arbitrary values according to the
 * comparison logic defined by a given Rhizosphere metamodel Kind, if present,
 * and falls back to native sorting otherwise.
 *
 * @param {*} kind The Rhizosphere metamodel Kind to use for sorting.
 * @param opt_reverse Whether the sorting order should be reversed.
 * @return {function(*,*):number} The comparison function.
 */
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
 * Registry to enumerate all the available Rhizosphere metamodel Kinds, their
 * associated implementation class and, when present, the associated user
 * interface classes.
 * @constructor
 */
rhizo.meta.KindRegistry = function() {
  /**
   * Maps kind symbolic names to constructor or factories for the kind
   * implementation classes.
   * Each value in the structure is an object that contains the following
   * attributes:
   * - method: defines whether the kind should be instantiated using a
   *   constructor ('ctor') or factory method ('factory)'.
   * - ctor: points to the Kind constructor, if method is 'ctor'.
   * - factory: points to a factory function that returns Kind instances, if
   *   method is 'factory'.
   *
   * @type {!Object.<string, Object>}
   * @private
   */
  this.registry_ = {};

  /**
   * Maps kind symbolic names to constructor or factories for the kind user
   * interface implementation classes.
   * Each value in the structure is an object that contains the following
   * attributes:
   * - method: defines whether the kind user interface should be instantiated
   *   using a constructor ('ctor') or factory method ('factory)'.
   * - ctor: points to the Kind Ui constructor, if method is 'ctor'.
   * - factory: points to a factory function that returns Kind Ui instances, if
   *   method is 'factory'.
   *
   * @type {!Object.<string, Object>}
   * @private
   */
  this.uiRegistry_ = {};
};

/**
 * Returns a shallow clone of this registry. Useful to apply simple
 * customizations to the default set of Rhizosphere metamodel Kinds and
 * associated UIs.
 *
 * @return {rhizo.meta.KindRegistry} A shallow clone of this registry.
 */
rhizo.meta.KindRegistry.prototype.clone = function() {
  var clone = new rhizo.meta.KindRegistry();
  $.extend(clone.registry_, this.registry_);
  $.extend(clone.uiRegistry_, this.uiRegistry_);
  return clone;
};

/**
 * Registers a new metamodel Kind under the given symbolic name.
 * @param {string} key A symbolic name identifying the metamodel kind.
 * @param {function} ctor A constructor function to create new Kind instances.
 */
rhizo.meta.KindRegistry.prototype.registerKind = function(key, ctor) {
  this.registry_[key] = {method: 'ctor', ctor: ctor};
};

/**
 * Registers a new metamodel Kind under the given symbolic name.
 * @param {string} key A symbolic name identifying the metamodel kind.
 * @param {function} factory A factory function that returns new Kind instances.
 */
rhizo.meta.KindRegistry.prototype.registerKindFactory = function(key, factory) {
  this.registry_[key] = {method: 'factory', factory: factory};
};

/**
 * Registers a new metamodel Kind user interface. The user interface can be
 * bound either to a kind symbolic name (in which case all metamodel Kind
 * instances created from the same symbolic name will adopt the specified
 * user interface) or to a kind instance (in which case only the specific
 * instance will use the given Ui).
 *
 * @param {string|Object} keyOrKind A symbolic name identifying the metamodel
 *     kind or a metamodel Kind instance.
 * @param {function} ctor A constructor function to create new Kind user
 *     interface instances.
 */
rhizo.meta.KindRegistry.prototype.registerKindUi = function(keyOrKind, ctor) {
  if (typeof(keyOrKind) == 'string') {
    this.uiRegistry_[keyOrKind] = {method: 'ctor', ctor: ctor};
  } else {
    // assumed to be a Kind instance.
    keyOrKind['__kindRegistry_ui'] = {method: 'ctor', ctor: ctor};
  }
};

/**
 * Registers a new metamodel Kind user interface. The user interface can be
 * bound either to a kind symbolic name (in which case all metamodel Kind
 * instances created from the same symbolic name will adopt the specified
 * user interface) or to a kind instance (in which case only the specific
 * instance will use the given Ui).
 *
 * @param {string|Object} keyOrKind A symbolic name identifying the metamodel
 *     kind or a metamodel Kind instance.
 * @param {function} factory A factory function that returns new Kind user
 *     interface instances.
 */
rhizo.meta.KindRegistry.prototype.registerKindUiFactory = function(
    keyOrKind, factory) {
  if (typeof(keyOrKind) == 'string') {
    this.uiRegistry_[keyOrKind] = {method: 'factory', factory: factory};
  } else {
    // assumed to be a Kind instance.
    keyOrKind['__kindRegistry_ui'] = {method: 'factory', factory: factory};
  }
};

/**
 * Creates a new metamodel Kind implementation class of the requested type.
 * @param {string} key The key identifying the metamodel Kind to create.
 * @return {Object} The newly created metamodel Kind implementation class.
 */
rhizo.meta.KindRegistry.prototype.createNewKind = function(key) {
  if (!(key in this.registry_)) {
    return null;
  }
  var kind = null;
  if (this.registry_[key]['method'] == 'ctor') {
    kind = new this.registry_[key]['ctor']();
  } else {
    kind = this.registry_[key]['factory']();
  }
  // Attach a user interface specification to the newly crated Kind instance
  // using uiRegistry contents.
  if (key in this.uiRegistry_) {
    kind['__kindRegistry_ui'] = this.uiRegistry_[key];
  }
  return kind;
};

/**
 * Creates a new metamodel Kind user interface implementation class of the
 * requested type.
 * @param {Object} kindObj The metamodel Kind instance for which a user
 *     interface is requested.
 * @param {!rhizo.Project} project The project the user interface will be
 *     attached to.
 * @param {string} metaModelKey The name of the model attribute this Kind user
 *     interface will be attached to.
 * @return {Object} The newly created metamodel Kind user interface instance.
 */
rhizo.meta.KindRegistry.prototype.createUiForKind = function(
    kindObj, project, metaModelKey) {
  if (!this.uiExistsForKind(kindObj)) {
    return null;
  }
  var kindUiSpec = kindObj['__kindRegistry_ui'];
  if (kindUiSpec['method'] == 'ctor') {
    return new kindUiSpec['ctor'](project, metaModelKey);
  } else {
    return kindUiSpec['factory'](project, metaModelKey);
  }
};

/**
 * Returns whether an user interface is register for the given Kind instance.
 * @param {Object} kindObj The metamodel Kind instance for which a user
 *     interface is requested.
 * @return {boolean} Whether an user interface is register for the given
 *     Kind instance.
 */
rhizo.meta.KindRegistry.prototype.uiExistsForKind = function(
    kindObj) {
  // A user interface exists under any of the following conditions:
  // - The kind instance was created via createNewKind() and an UI
  //   implementation class was registered under the same symbolic name.
  // - An UI was registered directly for the specific kind instance via
  //   registerKindUi() or registerKindUiFactory()
  return !!kindObj['__kindRegistry_ui'];
};


/**
 * The default metamodel Kind registry Rhizosphere projects will use if not
 * instructed otherwise.
 * @type {rhizo.meta.KindRegistry}
 */
rhizo.meta.defaultRegistry = new rhizo.meta.KindRegistry();


/**
 * Enumeration of all the basic kinds supported by Rhizosphere out of the box.
 * Each entry is a valid key to retrieve the associated kind instance from
 * the default Kind registry (rhizo.meta.defaultRegistry).
 *
 * @enum {string}
 */
rhizo.meta.Kind = {
  STRING: 'string',
  NUMBER: 'number',
  RANGE: 'range',
  DATE: 'date',
  BOOLEAN: 'boolean',
  CATEGORY: 'category'
};


/**
 * Describes a basic string type.
 * @constructor
 */
rhizo.meta.StringKind = function() {};
rhizo.meta.defaultRegistry.registerKind(
    rhizo.meta.Kind.STRING, rhizo.meta.StringKind);

/**
 * String filtering based on case-insensistive indexOf.
 *
 * @param {string} filterValue The current filter value.
 * @param {string} modelValue A model value for the attribute this kind
 *     applies to.
 * @return {boolean} Whether the model value survives the filter criteria or
 *     not.
 */
rhizo.meta.StringKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  return filterValue != '' &&
         (modelValue || '').toLowerCase().indexOf(
             filterValue.toLowerCase()) != -1;
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


/**
 * Describes a basic integer type
 * @constructor
 */
rhizo.meta.NumberKind = function() {};
rhizo.meta.defaultRegistry.registerKind(
    rhizo.meta.Kind.NUMBER, rhizo.meta.NumberKind);

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


/**
 * Describes a basic integer range type.
 * @constructor
 */
rhizo.meta.RangeKind = function() {};
rhizo.meta.defaultRegistry.registerKind(
    rhizo.meta.Kind.RANGE, rhizo.meta.RangeKind);

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
 * Describes a basic date type with custom clustering criteria.
 *
 * @param {string=} opt_clusterby The clustering criteria. 'y' for year-based
 *     clustering, 'm' for month, 'd' for day. Defaults to year-based
 *     clustering.
 * @constructor
 */
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
};
rhizo.meta.defaultRegistry.registerKind(
    rhizo.meta.Kind.DATE, rhizo.meta.DateKind);

rhizo.meta.DateKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  var year = parseInt(filterValue[0], 10);
  var month = parseInt(filterValue[1], 10);
  var day = parseInt(filterValue[2], 10);

  if (!modelValue) {
    return isNaN(year) && isNaN(month) && isNaN(day);
  }

  return ((isNaN(year) || modelValue.getFullYear() == year) &&
          (isNaN(month) || modelValue.getMonth() == month) &&
          (isNaN(day) || modelValue.getDate() == day));
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

/**
 * Converts a number to string ensuring a leading 0 (zero) if the number is
 * only 1-digit long.
 *
 * @param {value} value The number to convert.
 * @return {string} The converted number into string form.
 * @private
 */
rhizo.meta.DateKind.prototype.addZero_ = function(value) {
  var result = String(value);
  if (result.length == 1) {
    result = '0' + result;
  }
  return result;
};


/**
 * Describes a basic boolean type.
 * @constructor
 */
rhizo.meta.BooleanKind = function() {};
rhizo.meta.defaultRegistry.registerKind(
    rhizo.meta.Kind.BOOLEAN, rhizo.meta.BooleanKind);

rhizo.meta.BooleanKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  return filterValue == modelValue;
};

rhizo.meta.BooleanKind.prototype.compare = function(firstValue, secondValue) {
  // true comes before false
  return firstValue ? (secondValue ? 0 : -1) : (secondValue ? 1 : 0);
};

rhizo.meta.BooleanKind.prototype.isNumeric = function() {
  return false;
};


/**
 * Describes a basic category type.
 * @constructor
 */
rhizo.meta.CategoryKind = function() {};
rhizo.meta.defaultRegistry.registerKind(
    rhizo.meta.Kind.CATEGORY, rhizo.meta.CategoryKind);

rhizo.meta.CategoryKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  // Models can use both Arrays and Strings for CategoryKind fields, hence we
  // have to convert everything to Array for the filter to work properly.
  if (!$.isArray(modelValue)) {
    modelValue = [modelValue];
  }

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
