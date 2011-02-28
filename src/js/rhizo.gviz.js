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
  var initializer = new rhizo.gviz.Initializer(datatable, logger, opt_options);
  this.project_ = bootstrapper.prepare();
  bootstrapper.deployExplicit(initializer.models,
                              initializer.metamodel,
                              initializer.renderer);
};

/**
 * Fires the Google Visualization 'ready' event to notify visualization users
 * that Rhizosphere is ready for interaction.
 *
 * @param {rhizo.Project} unused_project unused.
 * @private
 */
rhizo.gviz.Rhizosphere.prototype.ready_= function(unused_project) {
  google.visualization.events.trigger(this, 'ready', {});
};


/**
 * Builder to extract Rhizosphere datastructures (models, metamodel and
 * renderer) from a Google Visualization datatable.
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
  this.init_();
};

rhizo.gviz.Initializer.prototype.init_ = function() {
  this.metamodel = this.buildMetaModel_();
  this.models = this.loadModels_(this.metamodel);
  this.renderer = this.options_.renderer ?
                  this.options_.renderer :
                  this.createDefaultRenderer_(this.metamodel, this.models);
};

rhizo.gviz.Initializer.prototype.buildMetaModel_ = function() {
  var metamodel = {};
  for (var i = 0, len = this.dt_.getNumberOfColumns(); i < len; i++) {
    var id = this.getColumnId_(i);
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

/**
 * Returns a unique identifier for a specific datatable column.
 * @param {number} columnNum The column number.
 * @private
 */
rhizo.gviz.Initializer.prototype.getColumnId_ = function(columnNum) {
  return this.dt_.getColumnId(columnNum) || ('col_' + columnNum);
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
  for (var category in categoriesMap) {
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
  for (var category in categoriesMap) {
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
      if (metamodel[this.getColumnId_(j)].kind == rhizo.meta.Kind.CATEGORY) {
        model[this.getColumnId_(j)] = this.parseSingleCategory_(value);
      } else {
        model[this.getColumnId_(j)] = value;
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

/**
 * Returns a unique identifier for a specific datatable column.
 * @param {number} columnNum The column number.
 * @private
 */
rhizo.gviz.DebugRenderer.prototype.getColumnId_ = function(columnNum) {
  return this.dt_.getColumnId(columnNum) || ('col_' + columnNum);
};

rhizo.gviz.DebugRenderer.prototype.render = function(model) {
  var div = $("<div />");
  for (var j = 0, clen = this.dt_.getNumberOfColumns(); j < clen; j++) {
    div.append("<p>" + model[this.getColumnId_(j)] + "</p>");
  }
  return div;
};
