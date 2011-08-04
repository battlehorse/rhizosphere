/**
  @license
  Copyright 2011 The Rhizosphere Authors. All Rights Reserved.

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
 * @fileOverview User interfaces for Rhizosphere metamodel Kinds to collect
 * filtering criteria from the user. Filtering criteria are then used to
 * filter out Rhizosphere models from the visualization project, allowing the
 * user to perform faceted searches on the visualization contents.
 * @author Riccardo Govoni (battlehorse@google.com)
 *
 * To define a new metamodel Kind user interface:
 * - define a new Javascript class.
 *
 * - implement a filterUiControls() function.
 *   This renders and returns the metamodel Kind filter Ui.
 *
 * - register for notifications on the 'filter' eventbus channel.
 *   Notifications will be delivered whenever the filtering criteria for the
 *   project change, for the user interface to catch up.
 *
 * - publish filtering requests entered by the user on the 'filter' eventbus
 *   channel, for the rest of the project to catch up on user requests to
 *   modify the set of filters applied to the visualization.
 *
 * The rhizo.ui.meta.FilterUi base class can be used to simplify ui development.
 */

// RHIZODEP=rhizo,rhizo.meta
namespace('rhizo.ui.meta');


/**
 * Helper function to wrap a Kind user interface into a standard labeled box
 * that will fit into Rhizosphere default filter containers.
 *
 * @param {!rhizo.Project} project The visualization project.
 * @param {string} metaModelKey The key identifying the metamodel the user
 *     interface pertains to.
 * @param {*} filterUi A DOM element or jQuery object referencing the metamodel
 *     Kind user interface.
 * @return {*} A jQuery wrapper referencing the labeled box containing the
 *     Kind user interface.
 */
rhizo.ui.meta.labelWrap = function(project, metaModelKey, filterUi) {
  return $("<div class='rhizo-filter' />").
      append(project.metaModel()[metaModelKey].label + ": ").
      append($(filterUi));
};


/**
 * Helper superclass to simplify management of metamodel Kind user interfaces.
 *
 * @param {!rhizo.Project} project The visualization project.
 * @param {string} metaModelKey The metamodel key this user interface class
 *     pertains to.
 */
rhizo.ui.meta.FilterUi = function(project, metaModelKey) {
  /**
   * jQuery object wrapping the DOM nodes containing the filter engine user
   * interface.
   * @type {*}
   * @private
   */
  this.ui_controls_ = null;

  /**
   * The project this filter UI belongs to.
   * @type {!rhizo.Project}
   * @private
   */
  this.project_ = project;

  /**
   * The metaModel key (aka model attribute name) this filter applies to.
   * @type {string}
   * @private
   */
  this.metaModelKey_ = metaModelKey;

  this.project_.eventBus().subscribe('filter', this.onFilter_, this);
  this.project_.eventBus().subscribe('model', this.onModelChange_, this,
      /* committed */ true);
};

/**
 * Returns the UI controls associated to this metamodel Kind. Controls are
 * rendered only once, so this method can be invoked multiple times with no
 * side effects.
 *
 * @return {*} Either an HTML node or a jQuery object pointing to it,
 *     collecting the UI controls for this Kind user interface.
 */
rhizo.ui.meta.FilterUi.prototype.filterUIControls = function() {
  if (!this.ui_controls_) {
    this.ui_controls_ = this.renderControls();
    this.setFilterValue(
        this.project_.filterManager().getFilterValue(this.metaModelKey_));
  }
  return this.ui_controls_;
};


/**
 * Callback invoked when a filter-related change occurs on the project.
 * If the change pertains to the metamodel Kind this UI manages, transitions
 * the UI to the new state as advertised by the received message.
 *
 * @param {Object} message The message describing the filter change. See
 *     rhizo.meta.FilterManager documentation for the expected message
 *     structure.
 * @private
 */
rhizo.ui.meta.FilterUi.prototype.onFilter_ = function(message) {
  if (!(this.metaModelKey_ in message)) {
    return;  // Not a message directed to us.
  }
  if (this.ui_controls_) {
    this.setFilterValue(message[this.metaModelKey_]);
  }
};

/**
 * Helper function that subclasses should invoke whenever the filtering
 * criteria for the metamodel Kind managed by this UI changes.
 *
 * @param {*} value The new filtering criteria.
 */
rhizo.ui.meta.FilterUi.prototype.doFilter = function(value) {
  var message = {};
  message[this.metaModelKey_] = value;
  this.project_.eventBus().publish(
      'filter', message, /* callback */ null, this);
};

/**
 * Stub method for subclasses to override. Updates the user interface to
 * display a different filtering criteria for the metamodel Kind this class
 * manages.
 *
 * @param {*} value The new filtering criteria.
 */
rhizo.ui.meta.FilterUi.prototype.setFilterValue = function(value) {};

/**
 * Stub method for subclasses to override. Returns the user interface for the
 * metamodel Kind this class manages.
 *
 * @return {*} Either an HTML node or a jQuery object pointing to it,
 *     collecting the UI controls for this metamodel Kind.
 */
rhizo.ui.meta.FilterUi.prototype.renderControls = function() {
  return null;
};

/**
 * Callback invoked when models are added or removed from the visualization.
 * @param {Object} message The message describing the model additions or
 *     removals. See rhizo.model.ModelManager documentation for the expected
 *     message structure.
 * @private
 */
rhizo.ui.meta.FilterUi.prototype.onModelChange_ = function(message) {
  var remove = message['action'] == 'remove';
  this.modelsChanged(remove, message['models'], this.project_.models());
  this.setFilterValue(
      this.project_.filterManager().getFilterValue(this.metaModelKey_));
};

/**
 * Helper function for subclasses to override. Updates the user interface in
 * response to changes in the set of models that are part of the visualization.
 *
 * @param {boolean} remove Whether models have been added or removed.
 * @param {!Array.<!rhizo.model.SuperModel>} deltaModels The list of models that
 *     have changed (added or removed).
 * @param {!Array.<!rhizo.model.SuperModel>} allModels The list of all models
 *     that are currently part of the visualization.
 */
rhizo.ui.meta.FilterUi.prototype.modelsChanged = function(
    remove, deltaModels, allModels) {};


/**
 * User interface class for basic text input.
 *
 * @param {!rhizo.Project} project The visualization project.
 * @param {string} metaModelKey The key identifying the metamodel the user
 *     interface pertains to.
 * @constructor
 * @extends rhizo.ui.meta.FilterUi
 */
rhizo.ui.meta.TextKindUi = function(project, metaModelKey) {
  this.input_ = null;
  rhizo.ui.meta.FilterUi.call(this, project, metaModelKey);
};
rhizo.inherits(rhizo.ui.meta.TextKindUi, rhizo.ui.meta.FilterUi);
rhizo.meta.defaultRegistry.registerKindUi(
    rhizo.meta.Kind.STRING, rhizo.ui.meta.TextKindUi);
rhizo.meta.defaultRegistry.registerKindUi(
    rhizo.meta.Kind.NUMBER, rhizo.ui.meta.TextKindUi);

rhizo.ui.meta.TextKindUi.prototype.renderControls = function() {
  this.input_ = $("<input type='text' />");
  // keypress handling removed due to browser quirks in key detection
  $(this.input_).change(jQuery.proxy(function() {
    this.doFilter($(this.input_).val().length > 0 ? $(this.input_).val() : null);
  }, this));
  return rhizo.ui.meta.labelWrap(this.project_, this.metaModelKey_, this.input_);
};

rhizo.ui.meta.TextKindUi.prototype.setFilterValue = function(value) {
  this.input_.val(value || '');
};


/**
 * User interface for date input.
 *
 * @param {!rhizo.Project} project The visualization project.
 * @param {string} metaModelKey The key identifying the metamodel the user
 *     interface pertains to.
 * @constructor
 * @extends rhizo.ui.meta.FilterUi
 */
rhizo.ui.meta.DateKindUi = function(project, metaModelKey) {
  this.monthMap_ = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul',
    'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  this.year_ = null;
  this.month_ = null;
  this.day_ = null;

  /**
   * A fixed range of selectable years in the year picker. This field is
   * filled only when a fixed year range is specified on the metamodel entry
   * this UI is assigned to. If defined, the year picker will always show the
   * same set of selectable years, no matter what the span of years actually
   * covered by visualization models is.
   *
   * The object has only two keys: 'min' and 'max' for the minimum and maximum
   * acceptable years (inclusive).
   *
   * @type {Object.<string, number>}
   * @private
   */
  this.fixedYearRange_ = null;

  /**
   * The range of selectable years in the year picker, as derived from the
   * span of years covered by the models currently part of the visualization.
   *
   * The object has only two keys: 'min' and 'max' for the minimum and maximum
   * acceptable years (inclusive).
   *
   * @type {Object.<string, number>}
   * @private
   */
  this.yearRange_ = null;
  rhizo.ui.meta.FilterUi.call(this, project, metaModelKey);
};
rhizo.inherits(rhizo.ui.meta.DateKindUi, rhizo.ui.meta.FilterUi);
rhizo.meta.defaultRegistry.registerKindUi(
    rhizo.meta.Kind.DATE, rhizo.ui.meta.DateKindUi);

rhizo.ui.meta.DateKindUi.prototype.renderControls = function() {
  this.extractFixedYearRange_();
  this.year_ = $("<select style='vertical-align:top' />");
  this.updateYearRanges_();

  this.month_ = $("<select style='vertical-align:top' />");
  this.month_.append("<option value='mm'>mm</option>");
  for (i = 0; i < this.monthMap_.length; i++) {
    this.month_.append("<option value='" + i + "'>" +
                       this.monthMap_[i] +
                       "</option>");
  }

  this.day_ = $("<select style='vertical-align:top' />");
  this.day_.append("<option value='dd'>dd</option>");
  for (i = 1 ; i <= 31; i++) {
    this.day_.append("<option value='" + i + "'>" + i + "</option>");
  }
  
  $(this.year_).add($(this.month_)).add($(this.day_)).change(
      jQuery.proxy(function(ev) {
        // When the user explicitly changes the selected year, remove all
        // stale entries that may be consequences of model additions/removals.
        $(this.year_).find('option[disabled="disabled"]').remove();
        var year = $(this.year_).val();
        var month = $(this.month_).val();
        var day = $(this.day_).val();
        if (year == 'yyyy' && month == 'mm' && day == 'dd') {
          this.doFilter(null);
        } else {
          this.doFilter(
              [year != 'yyyy' ? year : undefined,
               month != 'mm' ? month : undefined,
               day != 'dd' ? day : undefined]);
        }
      }, this));

  return rhizo.ui.meta.labelWrap(this.project_, this.metaModelKey_,
    $(this.year_).add($(this.month_)).add($(this.day_)));
};

rhizo.ui.meta.DateKindUi.prototype.setFilterValue = function(value) {
  value = value || [undefined, undefined, undefined];

  $(this.year_).find('option[disabled="disabled"]').remove();
  if (value[0] && (
      !this.yearRange_ || 
      value[0] < this.yearRange_.min || 
      value[0] > this.yearRange_.max)) {
    // The requested year falls outside the available year range. Create a
    // disabled entry to represent it.
    this.createYearOptions_(
        value[0],
        null,
        /* disabled */ true,
        /* prepend */ !this.yearRange_ || value[0] < this.yearRange_.min);
  }

  this.year_.val(value[0] || 'yyyy');
  this.month_.val(value[1] || 'mm');
  this.day_.val(value[2] || 'dd');
};

/**
 * Extracts the range of selectable years to be mandatorily shown in the year
 * picker, if defined in the metamodel entry this UI is assigned to.
 * @private
 */
rhizo.ui.meta.DateKindUi.prototype.extractFixedYearRange_ = function() {
  var metadata = this.project_.metaModel()[this.metaModelKey_];
  if (typeof(metadata.minYear) != 'undefined' && metadata.minYear != null &&
      typeof(metadata.maxYear) != 'undefined' && metadata.maxYear != null) {
    this.fixedYearRange_ = {
        min: parseInt(metadata.minYear, 10),
        max: parseInt(metadata.maxYear, 10)
    };
    this.yearRange_ = this.fixedYearRange_;
  }
};

/**
 * Updates the range of years spanned by the year picker.
 * @private
 */
rhizo.ui.meta.DateKindUi.prototype.updateYearRanges_ = function() {
  this.year_.children().remove();
  this.year_.append("<option value='yyyy'>yyyy</option>");
  if (this.yearRange_) {
    this.createYearOptions_(this.yearRange_.min, this.yearRange_.max);
  }
};

/**
 * Fills the year picker with a set of years.
 * @param {number} minYear The minimum year the picker should contain
 *     (inclusive).
 * @param {number=} opt_maxYear The maximum year the picker should contain
 *     (inclusive), or undefined to add only minYear.
 * @param {boolean=} opt_disabled Whether the added years should be selectable
 *     or not. Defaults to true.
 * @param {boolean=} opt_prepend Whether the added years should be added
 *     at the beginning or at the end of the year picker list.
 * @private
 */
rhizo.ui.meta.DateKindUi.prototype.createYearOptions_ = function(
    minYear, opt_maxYear, opt_disabled, opt_prepend) {
  var maxYear = typeof(opt_maxYear) == 'number' ? opt_maxYear : minYear;
  for (var i = minYear; i <= maxYear; i++) {
    var opt = '<option value="' + i + '" ' +
        (!!opt_disabled ? 'disabled="disabled"' : '' ) +
        '>' + i + '</option>';
    !!opt_prepend ?
        this.year_.children(':first').after(opt) :
        this.year_.append(opt);
  }
};

/**
 * Callback invoked when models are added or removed from the visualization, to
 * compute the set of selectable years in the year picker based on the range of
 * dates spanned by visualization models (unless a fixed year range is
 * specified in the metamodel entry this UI is assigned to).
 *
 * @param {boolean} remove Whether models have been added or removed.
 * @param {!Array.<!rhizo.model.SuperModel>} deltaModels The list of models that
 *     have changed (added or removed).
 * @param {!Array.<!rhizo.model.SuperModel>} allModels The list of all models
 *     that are currently part of the visualization.
 * @override
 */
rhizo.ui.meta.DateKindUi.prototype.modelsChanged = function(
    remove, deltaModels, allModels) {
  if (this.fixedYearRange_) {
    return;
  }
  if (allModels.length == 0) {
    this.yearRange_ = null;
    this.updateYearRanges_();
    return;
  }
  var minYear = Number.POSITIVE_INFINITY, maxYear = Number.NEGATIVE_INFINITY;
  for (var i = allModels.length-1; i >= 0; i--) {
    var modelDate = allModels[i].unwrap()[this.metaModelKey_];
    if (modelDate) {
      minYear = Math.min(minYear, modelDate.getFullYear());
      maxYear = Math.max(maxYear, modelDate.getFullYear());
    }
  }
  this.yearRange_ = {min: minYear, max: maxYear};
  this.updateYearRanges_();
};


/**
 * User interface for numeric range input via a dual-thumb slider.
 *
 * @param {!rhizo.Project} project The visualization project.
 * @param {string} metaModelKey The key identifying the metamodel the user
 *     interface pertains to.
 * @constructor
 * @extends rhizo.ui.meta.FilterUi
 */
rhizo.ui.meta.RangeKindUi = function(project, metaModelKey) {
  this.slider_ = null;
  this.minLabel_ = null;
  this.maxLabel_ = null;

  /**
   * A fixed range of selectable values. This field is filled only when a
   * fixed range is specified in the metamodel entry this UI is assigned to.
   * If defined, the slider will always span the specified range, no matter
   * what the span of values actually covered by the visualization models is.
   *
   *
   * The object has only two keys: 'min' and 'max' for the minimum and maximum
   * range extents (inclusive).
   *
   * @type {Object.<string, number>}
   * @private
   */
  this.fixedRange_ = null;

  /**
   * The range of selectable values, as derived from the set of values spanned
   * by the models currently part of the visualization.
   *
   * The object has only two keys: 'min' and 'max' for the minimum and maximum
   * range extents (inclusive).
   *
   * @type {Object.<string, number>}
   * @private
   */
  this.range_ = null;

  /**
   * As 'range_' but normalized to the filter scale (see toModelScale() and 
   * toFilterScale()).
   *
   * @type {Object.<string, number>}
   * @private
   */
  this.rangeFilterScale_ = null;

  /**
   * The stepping between slider ticks, if specified in the metamodel entry this
   * UI is assigned to.
   * @type {number}
   * @private
   */
  this.stepping_ = null;

  /**
   * The number of fixed steps the slider should enforce, if specified in the
   * metamodel entry this UI is assigned to.
   * @type {number}
   * @private
   */
  this.steps_ = null;
  rhizo.ui.meta.FilterUi.call(this, project, metaModelKey);
};
rhizo.inherits(rhizo.ui.meta.RangeKindUi, rhizo.ui.meta.FilterUi);
rhizo.meta.defaultRegistry.registerKindUi(
    rhizo.meta.Kind.RANGE, rhizo.ui.meta.RangeKindUi);

rhizo.ui.meta.RangeKindUi.prototype.renderControls = function() {
  this.extractMetamodelOptions_();
  this.minLabel_ = $('<span />', {'class': 'rhizo-slider-label'});
  this.maxLabel_ = $('<span />', {'class': 'rhizo-slider-label'});

  this.slider_ = $("<div class='rhizo-slider' />").slider({
    stepping: this.stepping_ ? this.toFilterScale(this.stepping_) : null,
    steps: this.steps_,
    range: true,
    slide: jQuery.proxy(this.onSlide_, this),
    stop: jQuery.proxy(this.onStopSlide_, this),
    orientation: 'horizontal'
  });
  this.updateRange_();

  return rhizo.ui.meta.labelWrap(this.project_, this.metaModelKey_,
      $(this.minLabel_).
      add($("<span> to </span>")).
      add($(this.maxLabel_)).
      add($(this.slider_)));
};

/**
 * Extracts slider configuration options as defined in the metamodel entry this
 * UI is assigned to. This includes the fixed range of selectable values the
 * slider should span, stepping and steps configuration.
 * @private
 */
rhizo.ui.meta.RangeKindUi.prototype.extractMetamodelOptions_ = function() {
  var metadata = this.project_.metaModel()[this.metaModelKey_];
  if (typeof(metadata.min) != 'undefined' && metadata.min != null &&
      typeof(metadata.max) != 'undefined' && metadata.max != null) {
    this.fixedRange_ = {
        min: parseFloat(metadata.min),
        max: parseFloat(metadata.max)
    };
    this.range_ = this.fixedRange_;
    this.rangeFilterScale_ = {
      min: this.toFilterScale(this.range_.min),
      max: this.toFilterScale(this.range_.max)
    };
  }
  this.stepping_ = metadata.stepping;
  this.steps_ = metadata.steps;
};

/**
 * Updates the slider range.
 * @private
 */
rhizo.ui.meta.RangeKindUi.prototype.updateRange_ = function() {
  this.slider_.slider('option', {
    min: this.rangeFilterScale_ ? this.rangeFilterScale_.min : 0,
    max: this.rangeFilterScale_ ? this.rangeFilterScale_.max : 100
  }).slider(this.rangeFilterScale_ ? 'enable' : 'disable');
};

/**
 * Event callback triggered while the user is moving one of the slider thumbs.
 *
 * @param {*} ev
 * @param {*} ui 
 * @private
 */
rhizo.ui.meta.RangeKindUi.prototype.onSlide_ = function(ev, ui) {
  if (ui.values[0] != this.rangeFilterScale_.min) {
    // min slider has moved
    this.minLabel_.
        text(this.toHumanLabel(this.toModelScale(ui.values[0]))).
        addClass("rhizo-slider-moving");
    this.maxLabel_.removeClass("rhizo-slider-moving");
  }
  if (ui.values[1] != this.rangeFilterScale_.max) {
    // max slider has moved
    this.maxLabel_.
        text(this.toHumanLabel(this.toModelScale(ui.values[1]))).
        addClass("rhizo-slider-moving");
    this.minLabel_.removeClass("rhizo-slider-moving");
  }
};

/**
 * Event callback triggered while the user stops moving one of the slider
 * thumbs.
 *
 * @param {*} ev
 * @param {*} ui 
 * @private
 */
rhizo.ui.meta.RangeKindUi.prototype.onStopSlide_ = function(ev, ui) {
  var minSlide = Math.max(this.toModelScale(ui.values[0]), this.range_.min);
  var maxSlide = Math.min(this.toModelScale(ui.values[1]), this.range_.max);
  this.minLabel_.text(this.toHumanLabel(minSlide)).removeClass(
      "rhizo-slider-moving");
  this.maxLabel_.text(this.toHumanLabel(maxSlide)).removeClass(
      "rhizo-slider-moving");
  if (minSlide != this.range_.min || maxSlide != this.range_.max) {
    this.doFilter({ min: minSlide, max: maxSlide });
  } else {
    this.doFilter(null);
  }
};

/**
 * Callback invoked when models are added or removed from the visualization, to
 * compute the updated slider range based on the range of values spanned by
 * visualization models.
 *
 * @param {boolean} remove Whether models have been added or removed.
 * @param {!Array.<!rhizo.model.SuperModel>} deltaModels The list of models that
 *     have changed (added or removed).
 * @param {!Array.<!rhizo.model.SuperModel>} allModels The list of all models
 *     that are currently part of the visualization.
 * @override
 */
rhizo.ui.meta.RangeKindUi.prototype.modelsChanged = function(
    remove, deltaModels, allModels) {
  if (this.fixedRange_) {
    return;
  }
  if (allModels.length == 0) {
    this.range_ = null;
    this.rangeFilterScale_ = null;
    this.updateRange_();
    return;
  }
  var min = Number.POSITIVE_INFINITY; max = Number.NEGATIVE_INFINITY;
  for (var i = allModels.length-1; i >= 0; i--) {
    var modelValue = allModels[i].unwrap()[this.metaModelKey_];
    if (typeof(modelValue) != 'undefined' && typeof(modelValue) != 'null') {
      min = Math.min(min, modelValue);
      max = Math.max(max, modelValue);
    }
  }
  this.range_ = {min: min, max: max};
  this.rangeFilterScale_ = {
    min: this.toFilterScale(this.range_.min),
    max: this.toFilterScale(this.range_.max)
  };
  this.updateRange_();
};

rhizo.ui.meta.RangeKindUi.prototype.setFilterValue = function(value) {
  if (!this.range_) {
    this.minLabel_.add(this.maxLabel_).text('-');
    return;
  }
  value = {
    min: value ? this.clamp_(value.min) : this.range_.min,
    max: value ? this.clamp_(value.max) : this.range_.max
  };
  this.minLabel_.text(this.toHumanLabel(value.min));
  this.maxLabel_.text(this.toHumanLabel(value.max));
  this.slider_.slider(
      'values',
      [this.toFilterScale(value.min), this.toFilterScale(value.max)]);
};

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
rhizo.ui.meta.RangeKindUi.prototype.toModelScale = function(filterValue) {
  var kind = this.project_.metaModel()[this.metaModelKey_].kind;
  if (kind.toModelScale) {
    return kind.toModelScale(filterValue);
  }
  return filterValue;
};

/**
 * Converts a value as read from the model into a value in the slider scale.
 * This is the inverse method of the previous one.
 * @param {number} modelValue the value received from the model.
 */
rhizo.ui.meta.RangeKindUi.prototype.toFilterScale = function(modelValue) {
  var kind = this.project_.metaModel()[this.metaModelKey_].kind;
  if (kind.toUserScale) {
    return kind.toUserScale(modelValue);
  }
  return modelValue;
};

/**
 * Converts a numeric value into a human readable form.
 *
 * The default implementation of this method is a no-op. Custom filters
 * extending the range slider should customize this method according to their
 * needs. rhizo.ui.toHumanLabel() is a useful helper in this case.
 *
 * @param {number} modelValue the value to be converted
 */
rhizo.ui.meta.RangeKindUi.prototype.toHumanLabel = function(modelValue) {
  return modelValue;
};

/**
 * Clamps the given value between the minimum and maximum range limits.
 * @param {number} val The value to clamp.
 * @private
 */
rhizo.ui.meta.RangeKindUi.prototype.clamp_ = function(val) {
  return Math.max(this.range_.min, Math.min(this.range_.max, val));
};


/**
 * User interface to collect boolean inputs.
 *
 * @param {!rhizo.Project} project The visualization project.
 * @param {string} metaModelKey The key identifying the metamodel the user
 *     interface pertains to.
 * @constructor
 * @extends rhizo.ui.meta.FilterUi
 */
rhizo.ui.meta.BooleanKindUi = function(project, metaModelKey) {
  this.check_ = null;
  rhizo.ui.meta.FilterUi.call(this, project, metaModelKey);
};
rhizo.inherits(rhizo.ui.meta.BooleanKindUi, rhizo.ui.meta.FilterUi);
rhizo.meta.defaultRegistry.registerKindUi(
    rhizo.meta.Kind.BOOLEAN, rhizo.ui.meta.BooleanKindUi);

rhizo.ui.meta.BooleanKindUi.prototype.renderControls = function() {
  this.check_ = $("<select />");
  this.check_.append("<option value=''>-</option>");
  this.check_.append("<option value='true'>Yes</option>");
  this.check_.append("<option value='false'>No</option>");

  $(this.check_).change(jQuery.proxy(function() {
    this.doFilter(
        $(this.check_).val().length > 0 ?
            ($(this.check_).val() == 'true') :
            null);
  }, this));
  return rhizo.ui.meta.labelWrap(this.project_, this.metaModelKey_, this.check_);
};

rhizo.ui.meta.BooleanKindUi.prototype.setFilterValue = function(value) {
  this.check_.val(value == null ? '' : (value ? 'true' : 'false'));
};


/**
 * User interface for single or multiple selection among a finite set of
 * categories.
 *
 * @param {!rhizo.Project} project The visualization project.
 * @param {string} metaModelKey The key identifying the metamodel the user
 *     interface pertains to.
 * @constructor
 * @extends rhizo.ui.meta.FilterUi
 */
rhizo.ui.meta.CategoryKindUi = function(project, metaModelKey) {
  this.categoryPicker_ = null;

  /**
   * Whether multiple choice is allowed or not.
   * @type {boolean}
   * @private
   */
  this.multiple_ = false;

  /**
   * A fixed list of categories for the category picker. This field is
   * filled only when categories are explicitly specified on the
   * metamodel entry this UI is assigned to. If defined, the category picker
   * will always show the same set of categories to choose from.
   *
   * @type {Array.<string>}
   * @private
   */
  this.fixedCategories_ = null;

  /**
   * The set of categories for the category picker, as derived from the
   * set of unique categories found in the models currently part of the
   * visualization.
   *
   * @type {!Object.<string, boolean>}
   * @private
   */
  this.categories_ = {};
  rhizo.ui.meta.FilterUi.call(this, project, metaModelKey);
};
rhizo.inherits(rhizo.ui.meta.CategoryKindUi, rhizo.ui.meta.FilterUi);
rhizo.meta.defaultRegistry.registerKindUi(
    rhizo.meta.Kind.CATEGORY, rhizo.ui.meta.CategoryKindUi);

rhizo.ui.meta.CategoryKindUi.prototype.renderControls = function() {
  this.extractMetamodelOptions_();
  this.categoryPicker_ = $(
      "<select " + (this.multiple_ ? 'multiple size="4" ' : '') +
      " style='vertical-align:top' />");
  this.updateCategories_();

  $(this.categoryPicker_).change(jQuery.proxy(function(ev) {
    // When the user explicitly changes the selected year, remove all
    // stale entries that may be consequences of model additions/removals.
    $(this.categoryPicker_).find('option[disabled="disabled"]').remove();
    var selectedCategories = [];
    if (this.multiple_) {
      selectedCategories = $.grep($(this.categoryPicker_).val(),
          function(category) {
        return category != '';
      });
    } else if ($(this.categoryPicker_).val().length > 0) {
      selectedCategories = [ $(this.categoryPicker_).val() ];
    }
    if (selectedCategories.length == 0) {
      selectedCategories = null;
    }
    this.doFilter(selectedCategories);
  }, this));
  return rhizo.ui.meta.labelWrap(
      this.project_, this.metaModelKey_, this.categoryPicker_);
};

/**
 * Extracts configuration options as defined in the metamodel entry this
 * UI is assigned to. This includes the fixed range of selectable categories
 * the picker should contain and where multiple selection is allowed or not.
 * @private
 */
rhizo.ui.meta.CategoryKindUi.prototype.extractMetamodelOptions_ = function() {
  var metadata = this.project_.metaModel()[this.metaModelKey_];
  this.fixedCategories_ = metadata['categories'] || null;
  if (this.fixedCategories_) {
    for (var i = this.fixedCategories_.length; i >= 0; i--) {
      this.categories_[this.fixedCategories_[i]] = true;
    }
  }
  this.multiple_ = !!metadata['multiple']
};

/**
 * Updates the set of categories the picker allows to choose from.
 * @private
 */
rhizo.ui.meta.CategoryKindUi.prototype.updateCategories_ = function() {
  this.categoryPicker_.children().remove();
  this.categoryPicker_.append("<option value=''>-</option>");

  var sortedCategories = [];
  for (var category in this.categories_) {
    sortedCategories.push(category);
  }
  sortedCategories.sort();
  for (var i = 0; i < sortedCategories.length; i++) {
    this.categoryPicker_.append(
        "<option value='" + sortedCategories[i] + "'>" +
        sortedCategories[i] + "</option>");
  }
};

rhizo.ui.meta.CategoryKindUi.prototype.setFilterValue = function(value) {
  this.categoryPicker_.find('option[disabled="disabled"]').remove();
  if (value) {
    var categories = $.isArray(value) ? value : [value];
    for (var i = categories.length-1; i >= 0; i--) {
      if (!(categories[i] in this.categories_)) {
        this.categoryPicker_.append(
            "<option value='" + categories[i] + "' disabled='disabled'>" +
            categories[i] + "</option>");
      }
    }
  }
  // val() accepts both a single string and an array.
  this.categoryPicker_.val(value || (this.multiple_ ? [] : ''));
};

/**
 * Callback invoked when models are added or removed from the visualization, to
 * compute the updated set of categories based on the range of values spanned
 * by visualization models.
 *
 * @param {boolean} remove Whether models have been added or removed.
 * @param {!Array.<!rhizo.model.SuperModel>} deltaModels The list of models that
 *     have changed (added or removed).
 * @param {!Array.<!rhizo.model.SuperModel>} allModels The list of all models
 *     that are currently part of the visualization.
 * @override
 */
rhizo.ui.meta.CategoryKindUi.prototype.modelsChanged = function(
    remove, deltaModels, allModels) {
  if (this.fixedCategories_) {
    return;
  }

  this.categories_ = {};
  if (allModels.length == 0) {
    this.updateCategories_();
    return;
  }
  for (var i = allModels.length-1; i >= 0; i--) {
    var modelCategories = allModels[i].unwrap()[this.metaModelKey_];
    if (!modelCategories) { continue; }
    if (!$.isArray(modelCategories)) { modelCategories = [ modelCategories ]; }
    for (var j = modelCategories.length-1; j >= 0; j--) {
      this.categories_[modelCategories[j]] = true;
    }
  }
  this.updateCategories_();
};
