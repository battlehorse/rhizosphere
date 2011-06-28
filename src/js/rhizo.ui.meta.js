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
  rhizo.ui.meta.FilterUi.call(this, project, metaModelKey);
};
rhizo.inherits(rhizo.ui.meta.DateKindUi, rhizo.ui.meta.FilterUi);
rhizo.meta.defaultRegistry.registerKindUi(
    rhizo.meta.Kind.DATE, rhizo.ui.meta.DateKindUi);

rhizo.ui.meta.DateKindUi.prototype.renderControls = function() {
  var metadata = this.project_.metaModel()[this.metaModelKey_];
  this.year_ = $("<select style='vertical-align:top' />");
  this.year_.append("<option value='yyyy'>yyyy</option>");
  for (var i = metadata.minYear ; i <= metadata.maxYear; i++) {
    this.year_.append("<option value='" + i + "'>" + i + "</option>");
  }
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
  this.year_.val(value[0] || 'yyyy');
  this.month_.val(value[1] || 'mm');
  this.day_.val(value[2] || 'dd');
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

  this.metadataMin_ = null;
  this.metadataMax_ = null;
  rhizo.ui.meta.FilterUi.call(this, project, metaModelKey);
};
rhizo.inherits(rhizo.ui.meta.RangeKindUi, rhizo.ui.meta.FilterUi);
rhizo.meta.defaultRegistry.registerKindUi(
    rhizo.meta.Kind.RANGE, rhizo.ui.meta.RangeKindUi);

rhizo.ui.meta.RangeKindUi.prototype.renderControls = function() {
  var metadata = this.project_.metaModel()[this.metaModelKey_];
  this.slider_ = $("<div class='rhizo-slider' />");
  this.minLabel_ = $('<span />', {'class': 'rhizo-slider-label'}).
      text(this.toHumanLabel(metadata.min));
  this.maxLabel_ = $('<span />', {'class': 'rhizo-slider-label'}).
      text(this.toHumanLabel(metadata.max));

  this.metadataMin_ = metadata.min;
  this.metadataMax_ = metadata.max;

  var minFilterScale = this.toFilterScale(metadata.min);
  var maxFilterScale = this.toFilterScale(metadata.max);
  var steppingFilterScale;
  if (metadata.stepping) {
    steppingFilterScale = this.toFilterScale(metadata.stepping);
  }

  // wrap slide handler into a closure to preserve access to the RangeKind
  // filter.
  var slideCallback = jQuery.proxy(function(ev, ui) {
      if (ui.values[0] != minFilterScale) {
        // min slider has moved
        this.minLabel_.
            text(this.toHumanLabel(this.toModelScale(ui.values[0]))).
            addClass("rhizo-slider-moving");
        this.maxLabel_.removeClass("rhizo-slider-moving");
      }
      if (ui.values[1] != maxFilterScale) {
        // max slider has moved
        this.maxLabel_.
            text(this.toHumanLabel(this.toModelScale(ui.values[1]))).
            addClass("rhizo-slider-moving");
        this.minLabel_.removeClass("rhizo-slider-moving");
      }
  }, this);

  // wrap change handler into a closure to preserve access to the RangeKind
  // filter.
  var stopCallback = jQuery.proxy(function(ev, ui) {
      var minSlide = Math.max(this.toModelScale(ui.values[0]), metadata.min);
      var maxSlide = Math.min(this.toModelScale(ui.values[1]), metadata.max);
      this.minLabel_.text(this.toHumanLabel(minSlide)).removeClass(
          "rhizo-slider-moving");
      this.maxLabel_.text(this.toHumanLabel(maxSlide)).removeClass(
          "rhizo-slider-moving");
      if (minSlide != this.metadataMin_ || maxSlide != this.metadataMax_) {
        this.doFilter({ min: minSlide, max: maxSlide });
      } else {
        this.doFilter(null);
      }
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

  return rhizo.ui.meta.labelWrap(this.project_, this.metaModelKey_,
      $(this.minLabel_).
      add($("<span> to </span>")).
      add($(this.maxLabel_)).
      add($(this.slider_)));
};

rhizo.ui.meta.RangeKindUi.prototype.setFilterValue = function(value) {
  value = {
    min: value ? this.clamp_(value.min) : this.metadataMin_,
    max: value ? this.clamp_(value.max) : this.metadataMax_
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
  return Math.min(this.metadataMax_, Math.max(this.metadataMin_, val));
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
  this.categories_ = null;
  this.multiple_ = false;
  rhizo.ui.meta.FilterUi.call(this, project, metaModelKey);
};
rhizo.inherits(rhizo.ui.meta.CategoryKindUi, rhizo.ui.meta.FilterUi);
rhizo.meta.defaultRegistry.registerKindUi(
    rhizo.meta.Kind.CATEGORY, rhizo.ui.meta.CategoryKindUi);

rhizo.ui.meta.CategoryKindUi.prototype.renderControls = function() {
  var metadata = this.project_.metaModel()[this.metaModelKey_];
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

  $(this.categories_).change(jQuery.proxy(function(ev) {
    var selectedCategories = [];
    if (metadata.multiple) {
      selectedCategories = $.grep($(this.categories_).val(),
          function(category) {
        return category != '';
      });
    } else if ($(this.categories_).val().length > 0) {
      selectedCategories = [ $(this.categories_).val() ];
    }
    if (selectedCategories.length == 0) {
      selectedCategories = null;
    }
    this.doFilter(selectedCategories);
  }, this));
  return rhizo.ui.meta.labelWrap(
      this.project_, this.metaModelKey_, this.categories_);
};

rhizo.ui.meta.CategoryKindUi.prototype.setFilterValue = function(value) {
  // val() accepts both a single string and an array.
  this.categories_.val(value || (this.multiple_ ? [] : ''));
};
