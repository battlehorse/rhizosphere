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

// RHIZODEP=rhizo.meta,rhizo.autorender,rhizo.log
namespace("rhizo.gviz");

/**
 * Exposes Rhizosphere as a visualization compatible with the Google
 * Visualization APIs.
 *
 * See http://code.google.com/apis/visualization/interactive_charts.html for
 * an introduction to the Google Visualization APIs and
 * http://code.google.com/apis/visualization/documentation/using_overview.html
 * for more detailed information about using Google Visualizations.
 *
 * The visualization fires a 'ready' event once it has finished loading and is
 * ready to accept user interaction.
 *
 * @param {HTMLElement} container The element that will contain the
 *    visualization. It must have an explicit CSS position set (either
 *     'relative' or 'absolute'). You are free to set its width and height and
 *     Rhizosphere will render itself within the given constraints.
 * @constructor
 */
rhizo.gviz.Rhizosphere = function(container) {
  if (typeof google == 'undefined' ||
      typeof google.visualization == 'undefined') {
    throw 'Google Visualization APIs not available. Please load them first.'
  }
  this.container_ = container;

  /**
   * @type {rhizo.Project}
   * @private
   */
  this.project_ = null;
};

/**
 * Initializes and draws the Rhizosphere visualization with the given Google
 * Visualization datatable.
 *
 * Rhizosphere accepts any well-formed Google Visualization datatable and
 * automatically extracts relevant metadata to set up the visualization.
 *
 * If you are not comfortable with the automatic selection of metadata and/or
 * rendering algorithm, you can provide your own custom metadata and rendering
 * via configuration options.
 * See http://www.rhizospherejs.com/doc/contrib_tables.html#options.
 *
 * @param {google.visualization.DataTable} datatable The dataset to visualize
 *     in Rhizosphere.
 * @param {*} opt_options key-value map of Visualization-wide configuration
 *     options, as described at
 *     http://www.rhizospherejs.com/doc/contrib_tables.html#options.
 */
rhizo.gviz.Rhizosphere.prototype.draw = function(datatable, opt_options) {
  if (this.project_) {
    // Google Visualizations can be redrawn multiple times. Rhizosphere does
    // not properly support redraws, so the easiest (and crudest) way to achieve
    // it is to destroy and rebuild the entire visualization.
    this.project_.destroy();
  }
  var bootstrapper = new rhizo.bootstrap.Bootstrap(
      this.container_, opt_options, jQuery.proxy(this.ready_, this));

  var logger = rhizo.nativeConsoleExists() ?
      new rhizo.NativeLogger() :  new rhizo.NoOpLogger();
  this.project_ = bootstrapper.prepare().getProject();

  var initializer = new rhizo.gviz.Initializer(datatable, logger, opt_options);
  if (!initializer.parse()) {
    // The datatable is empty, we skip visualization deployment.
    this.ready_();
  } else {
    bootstrapper.deployExplicit(initializer.models,
                                initializer.metamodel,
                                initializer.renderer);
  }
};

/**
 * Fires the Google Visualization 'ready' event to notify visualization users
 * that Rhizosphere is ready for interaction.
 *
 * @param {!rhizo.UserAgent} unused_ua unused.
 * @private
 */
rhizo.gviz.Rhizosphere.prototype.ready_= function(unused_ua) {
  google.visualization.events.trigger(this, 'ready', {});
};


/**
 * Builder to extract Rhizosphere datastructures (models, metamodel and
 * renderer) from a Google Visualization datatable.
 *
 * Each datatable row maps to a Rhizosphere model, while each column (or
 * group of columns) maps to a model attribute and associated Rhizosphere
 * metamodel entry.
 *
 * The class relies on usage of custom column properties and/or conventions in
 * column labeling to extract additional structural information that would
 * otherwise not be available in the input Google Visualization datatable.
 *
 * Parent-child relationships:
 * - Pair of columns with the latter having the same label as the former,
 *   prefixed with the 'Parent' string are assumed to represent a child-parent
 *   tree hierarchy, e.g.:
 *   *Location*, *ParentLocation*, *Population*
 *   Italy,      Europe,           60M
 *   Uk,         Europe,           61M
 *   Europe,     World,            857M
 *   USA,        World,            300M
 *   World,      ,                 7B
 *
 * - Alternatively, the parent column may have a custom 'rhizosphereParent'
 *   property set to 'true', to indicate that the column represents the parent
 *   of the previous column.
 *
 * Categories:
 * - The presence of a 'CAT' token in column labels, or the presence of a custom
 *   'rhizosphereCategory' column property (with any value) is an hint that the
 *   values in the column belong to a finite set of categories, that Rhizosphere
 *   will represent using dedicated logic. A single cell can use comma separated
 *   values to assign multiple categories to the datapoint it belongs to.
 *
 * - If an additional 'MUL' token is present on the label of a category column
 *   (as defined above), or a 'rhizosphereCategory' custom column property
 *   exists and has a 'multiple' attribute (with any value), then Rhizosphere
 *   will allow the user to select multiple values concurrently for the given
 *   column when filtering upon it.
 *
 * - If an additional 'HIE' token is present on the label of a category column
 *   (as defined above), or a 'rhizosphereCategory' custom column property
 *   exists and has a 'hierarchy' attribute (with any value), then Rhizosphere
 *   will assume that the categories defined by the column are arranged in a
 *   hierarchical fashion. Rhizosphere will use the information to enable tree
 *   based functionalities (such as tree and nested treemap layouts) on the
 *   given column. Example of a column definining hierarchical categories:
 *
 *   *Name*,  *Hobbies CAT HIE*
 *   John,    "Sports,Soccer"
 *   George,  "Sports,Baseball"
 *   Mary,    "Leisure,Cinema"
 *   Anne,    "Leisure,Cinema,Sci-Fi movies"
 *
 *   Will result in the following tree of categories:
 *   Root
 *   |____ Sports
 *   |     |______ Soccer
 *   |     |______ Baseball
 *   |
 *   |____ Leisure
 *         |______ Cinema
 *                 |______ Sci-Fi movies
 *
 * - Alternatively, a hierarchical categorization can be expressed using
 *   multiple subsequent columns with the same label. The initializer
 *   will interpret it as a flattened multilevel hierarchy and interpret it as
 *   described above. Example:
 *
 *   *Location*, *Location*, *Location*, *Population*
 *   World,      Europe,     Italy,      60M
 *   World,      Europe,     Uk,         61M
 *   World,      USA,        ,           300M
 *   World,      ,           ,           7B
 *
 *   If a hierarchical categorization exhaustively identifies all the
 *   datatable rows (Rhizosphere models) in a unique way, it will be internally
 *   converted in the format described for parent-child relationships. That is,
 *   Rhizosphere will assume the categorization to represent a valid tree
 *   representation of all the models (which is a stricter notion than just
 *   assuming models can be placed within a hierarchical set of
 *   categorizations).
 *   NOTE that the conversion will occur only for the first hierarchical
 *   categorization matching the requirements.
 *
 * @param {google.visualization.DataTable} dataTable The dataset to extract
 *     Rhizosphere metamodel and models from.
 * @param {*} logger A logger object that exposes error(), warn() and info()
 *     methods.
 * @param {*} opt_options key-value map of Visualization-wide configuration
 *     options.
 */
rhizo.gviz.Initializer = function(dataTable,
                                  logger,
                                  opt_options) {
  this.dt_ = dataTable;
  this.logger_ = logger;
  this.options_ = opt_options || {};
};

/**
 * Parses the Google Visualization DataTable and builds a metamodel, models,
 * renderer tuple from it.
 *
 * @return {boolean} Whether it was possible to parse the datatable or not.
 *     When false, metamodel, models and renderer won't be available.
 */
rhizo.gviz.Initializer.prototype.parse = function() {
  if (this.dt_.getNumberOfRows() == 0 || this.dt_.getNumberOfColumns() == 0) {
    return false;
  }
  var colGroups = this.getColumnGroupings_();
  if (this.transformDataTableIfNeeded_(colGroups)) {
    // Recompute colum groups if the datatable was changed.
    colGroups = this.getColumnGroupings_();
  }
  // TODO(battlehorse): The initializer should deal with the possibility of
  // receiving a complete metamodel via configuration options.
  this.metamodel = this.buildMetaModel_(colGroups);
  this.models = this.loadModels_(this.metamodel, colGroups);
  this.renderer = this.options_.renderer ?
                  this.options_.renderer :
                  this.createDefaultRenderer_(this.metamodel, this.models);
  return true;
};

/**
 * Returns a unique identifier for a specific datatable column.
 * @param {number} columnNum The column number.
 * @return {string} The column identifier.
 * @private
 */
rhizo.gviz.Initializer.prototype.getColumnId_ = function(columnNum) {
  return this.dt_.getColumnId(columnNum) || ('col_' + columnNum);
};

/**
 * Returns a unique identifier for a column group.
 * @param {number} startColumnNum The start column (inclusive) of the group.
 * @param {number} endColumnNum The end column (exclusive) of the group.
 * @return {string} The group identifier.
 * @private
 */
rhizo.gviz.Initializer.prototype.getColumnGroupId_ = function(
    startColumnNum, endColumnNum) {
  return this.getColumnId_(startColumnNum) + '__' +
      this.getColumnId_(endColumnNum-1);
};

/**
 * @param {number} columnNum
 * @return {string} The column label for the requested column.
 * @private
 */
rhizo.gviz.Initializer.prototype.getColumnLabel_ = function(columnNum) {
  var label = this.dt_.getColumnLabel(columnNum);
  if (label == '') {
    label = "Column " + this.getColumnId_(columnNum);
  }
  return label;
};

/**
 * Checks whether a given column represents the parent of the previous one in
 * a parent-child relationship.
 *
 * @param {number} columnNum The column to check.
 * @return {boolean}
 * @private
 */
rhizo.gviz.Initializer.prototype.isParentColumn_ = function(columnNum) {
  if (columnNum == 0) {
    return false;  // The first column in a datatable cannot be a parent,
                   // because there is no preceding column.
  }
  return (!!this.dt_.getColumnProperty(columnNum, 'rhizosphereParent')) ||
      this.getColumnLabel_(columnNum) ==
          'Parent' + this.getColumnLabel_(columnNum-1);
};

/**
 * Checks whether a given column is marked as containing a set of categories.
 *
 * @param {number} columnNum The column to check.
 * @return {Object.<string, boolean>?} null if the column is not a category
 *     holder, or an Object with 'multiple' and 'hierarchy' properties
 *     otherwise. The properties will be true if the multiple selection and/or
 *     hierarchical arrangement of the categories have been requested.
 * @private
 */
rhizo.gviz.Initializer.prototype.getCategoryColumnData_ = function(columnNum) {
  var categoryProperties =  this.dt_.getColumnProperty(
      columnNum, 'rhizosphereCategory');
  if (categoryProperties) {
    return {
      'multiple': !!categoryProperties.multiple,
      'hierarchy': !!categoryProperties.hierarchy
    };
  }
  if (this.getColumnLabel_(columnNum).indexOf('CAT') != -1) {
    return {
      'multiple': this.getColumnLabel_(columnNum).indexOf('MUL') != -1,
      'hierarchy': this.getColumnLabel_(columnNum).indexOf('HIE') != -1
    };
  }
  return null;
};

/**
 * Static function to strip category markers from a column label.
 * @param {string} columnLabel
 * @return {string}
 * @private
 */
rhizo.gviz.Initializer.stripCategoryTokens_ = function(columnLabel) {
  return columnLabel.replace(/CAT|MUL|HIE/g, '').replace(/^\s+|\s+$/g, '');
};

/**
 * Scans the datatable looking for repeated columns having the same label,
 * defining a column group. This is an hint for the presence of flattened
 * multilevel hierarchies.
 *
 * @return {Object.<number, number>} A mapping from the starting column
 *     (inclusive) to the end column (exclusive) of each column group found.
 * @private
 */
rhizo.gviz.Initializer.prototype.getColumnGroupings_ = function() {
  var groups = {};
  var numColumns = this.dt_.getNumberOfColumns();
  var columnIndex = 0;
  var lastColumnLabel = this.getColumnLabel_(columnIndex);
  for (var i = 1; i < numColumns; i++) {
    if (this.getColumnLabel_(i) == lastColumnLabel) {
      continue;
    }

    if (i > columnIndex+1) {
      // columnIndex is the start column of the group (inclusive), i is the
      // end column of the group (exclusive)
      groups[columnIndex] = i;
    }
    columnIndex = i;
    lastColumnLabel = this.getColumnLabel_(columnIndex);
  }

  if (columnIndex != numColumns - 1) {
    groups[columnIndex] = numColumns;
  }
  return groups;
};

/**
 * Identifies the need for transformations on the input datatable and applies
 * them if needed.
 * The only transformation currently supported is the conversion of hierarchical
 * categories that define an exhaustive model tree into a parent-child
 * relationship (see the documentation in the constructor for further info).
 *
 * @param {Object.<number, number>} colGroups The column groups found in the
 *     datatable.
 * @return {boolean} Whether the input datatable was transformed or not.
 * @private
 */
rhizo.gviz.Initializer.prototype.transformDataTableIfNeeded_ = function(
    colGroups) {
  for (var i = 0, clen = this.dt_.getNumberOfColumns(); i < clen;) {
    if (i in colGroups) {
      if (this.isValidModelTree_(i, colGroups[i])) {
        this.logger_.info('Column group starting at ' + i +
            ' is a valid model tree. Transforming the datatable.');
        this.packHierarchy_(i, colGroups[i]);
        return true;
      }

      i = colGroups[i];  // jump after the column group
      continue;
    }

    var categoryColumn = this.getCategoryColumnData_(i);
    if (categoryColumn && categoryColumn['hierarchy']) {
      if (this.isValidModelTree_(i)) {
        this.logger_.info('Hierarchy column at position ' + i +
            ' is a valid model tree. Transforming the datatable.');
        this.packHierarchy_(i);
        return true;
      }
    }
    i+=1;
  }
  return false;
};

/**
 * Checks whether a column (or column group) defining a hierarchical
 * categorization exhaustively identifies all the datatable rows (Rhizosphere
 * models) in a unique way, i.e. it identifies a parent-child relationship
 * between the Rhizosphere models that will be created from the datatable
 * (which is a stricter notion than just assuming models can be placed within a
 * hierarchical set of categorizations).
 *
 * @param {number} startColumnNum The column to inspect, or the starting index
 *     (inclusive) of a column group.
 * @param {number=} opt_endColumnNum The optional end index (exclusive) of a
 *     column group.
 * @return {boolean} Whether the column (or column group) defines an exhaustive
 *     model tree.
 * @private
 */
rhizo.gviz.Initializer.prototype.isValidModelTree_ = function(
    startColumnNum, opt_endColumnNum) {
  var treeIds = {};
  var treeRoot = {};
  var numNodes = 0;
  for (var i = 0, len = this.dt_.getNumberOfRows(); i < len; i++) {
    var parentNode = treeRoot;
    var categories = rhizo.gviz.Initializer.getRowCategories_(
        this.dt_, i, startColumnNum, opt_endColumnNum);
    for (var c = 0; c < categories.length; c++) {
      var value = categories[c];
      if (!(value in parentNode)) {
        if (value in treeIds) {
          return false; // The node already exists, but in a different part
                        // of the tree (turning this into a graph).
        }
        treeIds[value] = true;
        parentNode[value] = {};
        numNodes++;
      }
      parentNode = parentNode[value];
    }
  }
  return numNodes == this.dt_.getNumberOfRows();
};

/**
 * Replaces the Initializer datatable with a dataview that converts an
 * exhaustive hierarchical model categorization into a set of parent-child
 * relationships between models (see the documentation in the constructor for
 * further info).
 *
 * @param {number} startColumn The column that contains an exhaustive
 *     hierarchical model categorization, or the starting index (inclusive) of
 *     a column group that does the same.
 * @param {number=} opt_endColumn The optional end index (exclusive) of a column
 *     group.
 * @private
 */
rhizo.gviz.Initializer.prototype.packHierarchy_ = function(
    startColumn, opt_endColumn) {
  var view = new google.visualization.DataView(this.dt_);
  var columns = [];

  // All the columns preceding the hierarchical one(s) are left as is.
  for (var i = 0; i < startColumn; i++) {
    columns.push(i);
  }

  // Define a calculated (synthetic) column containing the child of the
  // parent-child relationship.
  // Columns calculated this way are necessarily converted to string types.
  columns.push({
    'type': 'string',
    'id': 'c(' + this.getColumnId_(startColumn) +
        (opt_endColumn ? ':' + this.getColumnId_(opt_endColumn-1) : '') + ')',
    'label': this.dt_.getColumnLabel(startColumn),
    'calc': function(dataTable, rowNum) {
      return rhizo.gviz.Initializer.packFunction_(
          dataTable, rowNum, startColumn, opt_endColumn, 0);
  }});

  // Define a calculated (synthetic) column containing the parent of the
  // parent-child relationship. The label is defined in such a way to match
  // the required conventions for parent-child relationships (checked while
  // building the metamodel).
  columns.push({
    'type': 'string',
    'id': 'p(' + this.getColumnId_(startColumn) +
        (opt_endColumn ? ':' + this.getColumnId_(opt_endColumn-1) : '') + ')',
    'label': 'Parent' +  this.dt_.getColumnLabel(startColumn),
    'calc': function(dataTable, rowNum) {
      return rhizo.gviz.Initializer.packFunction_(
          dataTable, rowNum, startColumn, opt_endColumn, 1);
    }
  });

  // All the columns after the hierarchical one(s) are left as is.
  for (i = opt_endColumn || startColumn + 1;
       i < this.dt_.getNumberOfColumns();
       i++) {
    columns.push(i);
  }
  view.setColumns(columns);
  this.dt_ = view;
};

/**
 * Static function that returns either the leaf category (delta=0) or
 * immediate parent (delta=1) from a hierarchical categorization expressed
 * either as a set of comma separated values in a single column,
 * e.g. "World,Europe,Italy", or a set of separate columns, each one holding a
 * value, e.g. "World", "Europe", "Italy".
 *
 * @param {google.visualization.DataTable} dataTable The input datatable.
 * @param {number} rowNum The affected row.
 * @param {number} startColumn The column that contains the hierarchical model
 *     categorization, or the starting index (inclusive) of a column group that
 *     does the same.
 * @param {number=} opt_endColumn The optional end index (exclusive) of a column
 *     group.
 * @param {number} delta
 * @return {string}
 * @private
 */
rhizo.gviz.Initializer.packFunction_ = function(
    dataTable, rowNum, startColumn, opt_endColumn, delta) {
  var categories = rhizo.gviz.Initializer.getRowCategories_(
    dataTable, rowNum, startColumn, opt_endColumn);
  if (categories.length-1-delta < 0) {
    return null;
  } else {
    return categories[categories.length-1-delta];
  }
};

/**
 * Builds a metamodel by inspecting datatable column metadata. For each
 * column a matching metamodel entry is built with a defined label and kind.
 *
 * See the comments in the class constructor for further info about the
 * conventions adopted during parsing.
 *
 * @param {Object.<number, number>} colGroups The column groups found in the
 *     datatable.
 * @return {Object} The visualization metamodel.
 * @private
 */
rhizo.gviz.Initializer.prototype.buildMetaModel_ = function(colGroups) {
  var metamodel = {};
  for (var i = 0, len = this.dt_.getNumberOfColumns(); i < len;) {
    var metamodelKey = null;
    var metamodelEntry = null;
    var parentMetamodelKey = null;
    var parentMetamodelEntry = null;

    if (i in colGroups) {
      // The current column marks the beginning of a column group.
      metamodelKey =
          this.getColumnGroupId_(i, colGroups[i]);
      metamodelEntry = this.buildMetaModelEntry_(metamodelKey, i, colGroups[i]);
      i = colGroups[i]; // jump after the column group
    } else {
      metamodelKey = this.getColumnId_(i);
      metamodelEntry = this.buildMetaModelEntry_(metamodelKey, i);
      i+= 1;

      // Look ahead to determine whether the current column is part of a
      // parent-child definition
      if (i != len && this.isParentColumn_(i)) {
        parentMetamodelKey = this.getColumnId_(i);
        parentMetamodelEntry = this.buildMetaModelEntry_(parentMetamodelKey, i);
        parentMetamodelEntry['isLink'] = true;
        parentMetamodelEntry['linkKey'] = metamodelKey;

        i += 1;
      }
    }

    metamodel[metamodelKey] = metamodelEntry;
    if (parentMetamodelKey) {
      metamodel[parentMetamodelKey] = parentMetamodelEntry;
    }
  }
  return metamodel;
};

/**
 * Builds a single metamodel entry.
 * @param {string} metamodelKey The key this metamodel entry will be associated
 *     to.
 * @param {number} startColumnNum The column to be converted into a metamodel
 *     entry, or the starting index (inclusive) of a column group to be
 *     processed in the same way.
 * @param {number=} opt_endColumnNum The optional end index (exclusive) of a
 *     column group.
 * @return {Object.<string, *>} The metamodel entry.
 * @private
 */
rhizo.gviz.Initializer.prototype.buildMetaModelEntry_ = function(
    metamodelKey, startColumnNum, opt_endColumnNum) {
  var metamodelEntry = {};
  // Assign the label
  metamodelEntry['label'] = this.getColumnLabel_(startColumnNum);

  // Assign the metamodel kind
  if (opt_endColumnNum) {
    // A column group forcefully defines a hierarchical category.
    this.buildMetaModelCategoryEntry_(
        metamodelEntry, startColumnNum, opt_endColumnNum);
  } else {
    var type = this.dt_.getColumnType(startColumnNum);
    if (type == 'number') {
      var min = this.dt_.getColumnRange(startColumnNum).min;
      var max = this.dt_.getColumnRange(startColumnNum).max;
      if (min == max) {
        metamodelEntry['kind'] = rhizo.meta.Kind.NUMBER;
      } else {
        metamodelEntry['kind'] = rhizo.meta.Kind.RANGE;
        metamodelEntry['min'] = min;
        metamodelEntry['max'] = max;
      }
    } else if (type == 'boolean') {
      metamodelEntry['kind'] = rhizo.meta.Kind.BOOLEAN;
    } else {
      // assumed string type
      if (type != 'string') {
        this.logger_.warn(
            "Column " + metamodelEntry['label'] +
            " will be treated as String. Unsupported type: " + type);
      }

      var categoryColumn = this.getCategoryColumnData_(startColumnNum);
      if (categoryColumn) {
        this.buildMetaModelCategoryEntry_(
            metamodelEntry, startColumnNum, null, categoryColumn);
      } else {
        metamodelEntry['kind'] = rhizo.meta.Kind.STRING;
      }
    }
  }

  // Assign autorender attributes, if any
  this.buildAutoRenderInfo_(metamodelKey, metamodelEntry);

  return metamodelEntry;
};

/**
 * Builds a single metamodel entry of rhizo.meta.Kind.CATEGORY kind.
 *
 * @param {Object.<string, *>} metamodelEntry The metamodel entry to fill.
 * @param {number} startColumnNum The column to be converted into a metamodel
 *     entry, or the starting index (inclusive) of a column group to be
 *     processed in the same way.
 * @param {number=} opt_endColumnNum The optional end index (exclusive) of a
 *     column group.
 * @param {Object.<string, boolean>=} opt_categoryColumnData Optional structure
 *     about category information extracted from the column via
 *     getCategoryColumnData_().
 * @private
 */
rhizo.gviz.Initializer.prototype.buildMetaModelCategoryEntry_ = function(
    metamodelEntry, startColumnNum, opt_endColumnNum, opt_categoryColumnData) {
  metamodelEntry['kind'] = rhizo.meta.Kind.CATEGORY;
  metamodelEntry['categories'] = rhizo.gviz.Initializer.getAllCategories_(
      this.dt_, startColumnNum, opt_endColumnNum);
  metamodelEntry['isHierarchy'] = opt_endColumnNum ||
      (opt_categoryColumnData && opt_categoryColumnData['hierarchy']);
  metamodelEntry['multiple'] =
      opt_categoryColumnData && opt_categoryColumnData['multiple'];

  if (opt_categoryColumnData) {
    metamodelEntry['label'] =
        rhizo.gviz.Initializer.stripCategoryTokens_(metamodelEntry['label']);
  }
};


/**
 * Static function to extract a list of all the unique categories found in the
 * specified column (or column group) over the entire datatable.
 *
 * @param {google.visualization.DataTable} datatable The table to inspect.
 * @param {number} startColumnNum The column containing categories, or the
 *     starting index (inclusive) of a column group containing categories.
 * @param {number=} opt_endColumnNum The optional end index (exclusive) of a
 *     column group.
 * @return {Array.<string>} The list of all categories found, in sorted order.
 * @private
 */
rhizo.gviz.Initializer.getAllCategories_ = function(
    datatable, startColumnNum, opt_endColumnNum) {
  var categories = [];

  if (opt_endColumnNum) {
    // Parse categories from a group of columns.
    for (var i = 0, len = datatable.getNumberOfRows(); i < len; i++) {
      for (var j = startColumnNum; j < opt_endColumnNum; j++) {
        categories.push(datatable.getValue(i, j));
      }
    }
  } else {
    // Parse categories from the comma-separated values of a single column.
    for (var i = 0, len = datatable.getNumberOfRows(); i < len; i++) {
      Array.prototype.push.apply(
          categories,
          rhizo.gviz.Initializer.splitCSVCategory_(
              datatable.getValue(i, startColumnNum)));
    }
  }
  return rhizo.gviz.Initializer.cleanCategories_(categories).sort();
};

/**
 * Static function to extract all the categories found in a column (or
 * column group) for a specific row of a datatable.
 *
 * @param {google.visualization.DataTable} datatable The table to inspect.
 * @param {number} rowNum The row to inspect.
 * @param {number} startColumnNum The column containing categories, or the
 *     starting index (inclusive) of a column group containing categories.
 * @param {number=} opt_endColumnNum The optional end index (exclusive) of a
 *     column group.
 * @return {Array.<string>} The list of all categories found.
 * @private
 */
rhizo.gviz.Initializer.getRowCategories_ = function(
    datatable, rowNum, startColumnNum, opt_endColumnNum) {
  var categories = []
  if (opt_endColumnNum) {
    // Loading categories from a column group
    for (var col = startColumnNum; col < opt_endColumnNum; col++) {
      categories.push(datatable.getValue(rowNum, col));
    }
  } else {
    // Parsing a single CSV column.
    categories = rhizo.gviz.Initializer.splitCSVCategory_(
        datatable.getValue(rowNum, startColumnNum));
  }
  return rhizo.gviz.Initializer.cleanCategories_(categories);
}

/**
 * Splits a CSV string which is supposed to contain a list of categories.
 *
 * @param {string} value The string to split.
 * @return {Array.<string>} The split list.
 * @private
 */
rhizo.gviz.Initializer.splitCSVCategory_ = function(value) {
  if (value == null || String(value) == '') {
    return [];
  }
  return String(value).split(',');
};

/**
 * Cleans a list of categories by removing empty entries, duplicates and
 * converting all the contents to (trimmed) string.
 *
 * @param {Array.<string>} categories The list to clean.
 * @return {Array.<string>} The cleaned list.
 * @private
 */
rhizo.gviz.Initializer.cleanCategories_ = function(categories) {
  // Remove empty categories
  var prunedCats = $.grep(categories, function(category) {
    return category != null && String(category) != '';
  });

  // Convert to string, strip spaces and eliminate duplicates.
  var categoriesMap = {};
  for (var i = 0; i < prunedCats.length; i++) {
    categoriesMap[String(prunedCats[i]).replace(/^\s+|\s+$/g, "")] = true;
  }

  // Write to output array.
  var results = [];
  for (var category in categoriesMap) {
    results.push(category);
  }
  return results;
};

/**
 * Assigns autorender options to matching metamodel entries.
 *
 * @param {string} metamodelKey The key of the metamodel entry to inspect.
 * @param {Object.<string, *>} metamodelEntry The metamodel entry to inspect.
 * @private
 */
rhizo.gviz.Initializer.prototype.buildAutoRenderInfo_ =
    function(metamodelKey, metamodelEntry) {
  var ar = {};
  var hasArAttribute = false;
  if (this.options_['arMaster'] &&
      this.matchAutoRenderOption_(
          this.options_['arMaster'], metamodelEntry['label'], metamodelKey)) {
    ar.master = true;
    hasArAttribute = true;
  }
  if (this.options_['arSize'] &&
      this.matchAutoRenderOption_(
          this.options_['arSize'], metamodelEntry['label'], metamodelKey)) {
    ar.bind = (ar.bind ? ar.bind : '') + 'size ';
    hasArAttribute = true;
  }
  if (this.options_['arColor'] &&
      this.matchAutoRenderOption_(
          this.options_['arColor'], metamodelEntry['label'], metamodelKey)) {
    ar.bind = (ar.bind ? ar.bind : '') + 'color ';
    hasArAttribute = true;
  }
  if (hasArAttribute) {
    metamodelEntry['ar'] = ar;
  }
};

/**
 * Checks whether a specific autorender option should be applied to the given
 * metamodel entry.
 * @param {string} optionValue A value describing the metamodel entry the
 *     autorender option should be assigned to. Will be matched against either
 *     the metamodel label or id (respectively matching the column label or
 *     id of the underlying datatable the metamodel was generated from).
 * @param {string} label The label of the metamodel entry being checked.
 * @param {string} metamodelKey The key of the metamodel entry being checked.
 * @return {boolean} Whether the autorender option should be applied to this
 *     metamodel entry.
 * @private
 */
rhizo.gviz.Initializer.prototype.matchAutoRenderOption_ =
    function(optionValue, label, metamodelKey) {
  optionValue = optionValue.toLowerCase();
  var colRegExp = /^[a-z]$/;
  if (colRegExp.test(optionValue)) {
    // try matching the column id
    // TODO(battlehorse): Too strictly tailored to the ids Google Spreadsheet
    // assigns to columns ('A', 'B', ...)
    metamodelKey = String(metamodelKey).toLowerCase();
    return metamodelKey == optionValue ||
        // matches if optionValue points to the first column of a group
        metamodelKey.indexOf(optionValue + '__') == 0 ||
        // matches if optionValue points to child column of a parent-child.
        metamodelKey.indexOf('c(' + optionValue + ':') == 0;
  } else {
    // otherwise try to match the column label
    return label.toLowerCase() == optionValue;
  }
};

/**
 * Creates the list of Rhizosphere models from the underlying datatable.
 *
 * @param {Object} metamodel The visualization metamodel
 * @param {Object.<number, number>} colGroups  A mapping from the starting
 *     column (inclusive) to the end column (exclusive) of each column group
 *     found.
 * @private
 */
rhizo.gviz.Initializer.prototype.loadModels_ = function(metamodel, colGroups) {
  var models = [];
  for (var row = 0, len = this.dt_.getNumberOfRows(); row < len; row++) {
    var model = {'id': 'gviz-' + row};
    for (var col = 0, clen = this.dt_.getNumberOfColumns(); col < clen;) {
      if (col in colGroups) {
        // Parsing a column group
        model[this.getColumnGroupId_(col, colGroups[col])] =
          rhizo.gviz.Initializer.getRowCategories_(
              this.dt_, row, col, colGroups[col]);
        col = colGroups[col];  // jump after the column group
      } else {
        // Parse a single column.
        if (metamodel[this.getColumnId_(col)].kind ==
            rhizo.meta.Kind.CATEGORY) {
          model[this.getColumnId_(col)] =
              rhizo.gviz.Initializer.getRowCategories_(this.dt_, row, col);
        } else {
          model[this.getColumnId_(col)] = this.dt_.getValue(row, col);
        }
        col++;
      }
    }
    models.push(model);
  }
  return models;
};

/**
 * Creates the visualization renderer.
 *
 * @param {Object} metamodel The visualization metamodel.
 * @param {Array.<Object>}models The visualization models.
 * @return {rhizo.autorender.AR} The renderer.
 * @private
 */
rhizo.gviz.Initializer.prototype.createDefaultRenderer_ =
    function(metamodel, models) {
  return new rhizo.autorender.AR(metamodel,
                                 models,
                                 this.options_.arDefaults,
                                 this.options_.arNumFields);
  // return new rhizo.gviz.DebugRenderer(this.dt_);
};


/**
 * A simple renderer for debug purposes. Not used in real life.
 * @param {google.visualization.DataTable} dataTable
 * @constructor
 */
rhizo.gviz.DebugRenderer = function(dataTable) {
  this.dt_ = dataTable;
};

/**
 * Returns a unique identifier for a specific datatable column.
 * @param {number} columnNum The column number.
 * @return {string} The column id.
 * @private
 */
rhizo.gviz.DebugRenderer.prototype.getColumnId_ = function(columnNum) {
  return this.dt_.getColumnId(columnNum) || ('col_' + columnNum);
};

/**
 * Renders a Rhizosphere model.
 * @param {Object} model
 */
rhizo.gviz.DebugRenderer.prototype.render = function(model) {
  var div = $("<div />");
  for (var j = 0, clen = this.dt_.getNumberOfColumns(); j < clen; j++) {
    div.append("<p>" + model[this.getColumnId_(j)] + "</p>");
  }
  return div;
};
