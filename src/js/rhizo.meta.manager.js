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
 * @fileOverview Classes that oversee Rhizosphere filter management.
 */

//RHIZODEP=rhizo,rhizo.ui
namespace('rhizo.meta');


/**
 * A FilterManager is responsible for filtering Rhizosphere models within a
 * given project.
 *
 * Filter operations are triggered by publishing messages on the 'filter'
 * channel of the project event bus. The messages are expected in the following
 * format:
 *
 * message = {
 *   metaModelKey1: filterValue1,
 *   metaModelKey2: filterValue2,
 *   ...
 *   metaModelKeyN: null,
 *   ...
 * };
 *
 * Each message can contain one or more key. Each key should match with the name
 * of a model attribute (i.e. be a valid key within the project metaModel).
 *
 * If the key points to a non-null value, the value is expected to be the filter
 * value and every model not matching the value will be filtered. The format of
 * filter values is filter-dependent. Refer to the documentation for each filter
 * kind in rhizo.meta.js for further info.
 *
 * If the key points to a null value, any filter possibly present on the given
 * key will be removed and all the models that were filtered on such key will
 * revert to their unfiltered status.
 *
 * @param {!rhizo.Project} project The project this filter manager applies to.
 * @constructor
 */
rhizo.meta.FilterManager = function(project) {
  /**
   * The set of filters currently applied to the project. Maps metaModel keys to
   * filter values.
   *
   * @type {!Object.<string, *>}
   * @private
   */
  this.filters_ = {};

  /**
   * Whether filters are automatically committed or not. When autoCommit is
   * false, applying a filter will only result in dimming out the filtered
   * models (instead of removing them altogether from the viewport). A 'commit'
   * operation must follow to confirm the operation and remove (hide) the
   * filtered models from the visualization viewport.
   * @type {boolean}
   * @private
   */
  this.filterAutocommit_ = true;

  /**
   * @type {!rhizo.Project}
   * @private
   */
  this.project_ = project;

  this.project_.eventBus().addPreprocessor(
      'filter', this.onBeforeFilter_, this, /* first */ true);
  this.project_.eventBus().subscribe('filter', this.onFilter_, this);
};

/**
 * Returns the set of filters currently applied to the project. Maps metaModel
 * keys to filter values.
 *
 * @return {!Object.<string, *>} The set of filters currently applied to the
 *     project. Maps metaModel keys to filter values.
 */
rhizo.meta.FilterManager.prototype.getFilters = function() {
  return $.extend({}, this.filters_);
};

/**
 * Returns the filter value for a given filter, or null if the filter is not
 * currently applied to the project.
 *
 * @param {string} metaModelKey The metaModel key for which the filter value is
 *     queried.
 * @return {?*} The filter value, or null if the filter is not currently applied
 *     to the project.
 */
rhizo.meta.FilterManager.prototype.getFilterValue = function(metaModelKey) {
  return this.filters_[metaModelKey] || null;
};

/**
 * Enables or disables filter autocommit.
 *
 * If autocommit is true, any filter operation wil immediately hide filtered
 * models from the visualization viewport. If autocommit is false, any filter
 * operation will only dim the filtered models (leaving them visible in the
 * visualization viewport). A subsequent commit, either explicit via
 * commitFilter() or implicit, is required to hide the filtered models.
 *
 * @param {boolean} enable Whether to enable or disable filter autocommit.
 */
rhizo.meta.FilterManager.prototype.enableFilterAutocommit = function(enable) {
  this.filterAutocommit_ = enable;
  if (this.filterAutocommit_) {
    // If there are any greyed models when auto-filtering is re-enabled, we
    // commit the filter.
    var modelsMap = this.project_.modelsMap();
    for (var modelId in modelsMap) {
      if (modelsMap[modelId].rendering().visibility ==
          rhizo.ui.Visibility.GREY) {
        this.commitFilter();
        break;
      }
    }
  }
};

/**
 * Returns whether the filter manager is operating in autocommit mode or not.
 *
 * @return {boolean} whether the filter manager is operating in autocommit mode
 *     or not.
 */
rhizo.meta.FilterManager.prototype.isFilterAutocommit = function() {
  return this.filterAutocommit_;
};

/**
 * Commits the current set of filters. No-op if the filter manager is operating
 * in autocommit mode.
 */
rhizo.meta.FilterManager.prototype.commitFilter = function() {
  this.project_.layoutManager().forceLayout({filter: true});
};

/**
 * Computes the set of filters to apply (or remove) to transition from the
 * current set of filters to a target set of filters (which may be the empty
 * set to imply the removal of all existing filters).
 *
 * @param {Object.<stirng, *>} The target set of filters.
 * @return {!Object.<string, *>} The set of filters to apply or remove to
 *     transition from the current set of filters to the desired target set.
 */
rhizo.meta.FilterManager.prototype.filterDiff = function(targetFilters) {
  var transitionFilters = $.extend({}, targetFilters);
  for (var metaModelKey in this.filters_) {
    if (!(metaModelKey in transitionFilters)) {
      transitionFilters[metaModelKey] = null;
    }
  }
  return transitionFilters;
};

/**
 * Removes the given filter from all models.
 * @param {string} metaModelKey The metamodel key of the filter to remove.
 * @return {boolean} Whether the filter existed on at least one of the models.
 */
rhizo.meta.FilterManager.prototype.removeFilterFromModels = function(
    metaModelKey) {
  var modelsMap = this.project_.modelsMap();
  var modelsAffected = false;
  for (var modelId in modelsMap) {
    modelsAffected =
        modelsMap[modelId].resetFilter(metaModelKey) || modelsAffected;
  }
  return modelsAffected;
};

/**
 * Refreshes models' visibility based on their filtering status.
 *
 * @param {rhizo.ui.Visibility?} opt_filtered_visibility An optional visibility
 *     level that filtered items should have. The default is
 *     rhizo.ui.Visibility.HIDDEN.
 */
rhizo.meta.FilterManager.prototype.alignVisibility = function(
    opt_filtered_visibility) {
  var vis = rhizo.ui.Visibility;
  var filtered_visibility = opt_filtered_visibility || vis.HIDDEN;

  var forceLayout = false;
  var modelsToFadeOut = [];
  var modelsToFadeIn = [];
  var modelsMap = this.project_.modelsMap();
  for (var modelId in modelsMap) {
    var model = modelsMap[modelId];
    var rendering = model.rendering();
    if (model.isFiltered()) {
      if (rendering.visibility > filtered_visibility) {
        modelsToFadeOut.push(model);
        rendering.visibility = filtered_visibility;
      }
    } else if (rendering.visibility < vis.VISIBLE) {
      // Items that were completely hidden must be repositioned.
      forceLayout = forceLayout || rendering.visibility == vis.HIDDEN;
      modelsToFadeIn.push(model);
      rendering.visibility = vis.VISIBLE;
    }
  }
  rhizo.ui.fadeAllRenderingsTo(modelsToFadeOut, filtered_visibility);
  rhizo.ui.fadeAllRenderingsTo(modelsToFadeIn, vis.VISIBLE);
  return forceLayout;
};

/**
 * Preprocessing callback invoked whenever a message is published on the
 * 'filter' channel.
 *
 * @param {!Object} message The published message.
 * @param {!function(boolean, string=)} rspCallback Callback to invoke with the
 *     preprocessing outcome.
 * @private
 */
rhizo.meta.FilterManager.prototype.onBeforeFilter_ = function(
    message, rspCallback) {
  for (var metaModelKey in message) {
    if (!(metaModelKey in this.project_.metaModel())) {
      // This may occur whenever we are applying a filter loaded from an
      // historical state, but which no longer exists in the current
      // visualization.
      delete message[metaModelKey];
    }
  }
  rspCallback(true);
};

/**
 * Callback invoked when a filter request is published on the 'filter' channel.
 * @param {!Object} message The published message.
 * @private
 */
rhizo.meta.FilterManager.prototype.onFilter_ = function(message) {
  var metaModel = this.project_.metaModel();
  var modelsMap = this.project_.modelsMap();

  var modelsChange = false;
  for (var metaModelKey in message) {
    var filterValue = message[metaModelKey];
    if (filterValue !== null && filterValue !== undefined) {
      // valid filter
      this.filters_[metaModelKey] = filterValue;


      for (var modelId in modelsMap) {
        var model = modelsMap[modelId];
        if (metaModel[metaModelKey].kind.survivesFilter(
            filterValue, model.unwrap()[metaModelKey])) {
          // matches filter. Doesn't have to be hidden
          modelsChange = model.resetFilter(metaModelKey) || modelsChange;
        } else {
          // does not match filter. Must be hidden
          modelsChange = model.filter(metaModelKey) || modelsChange;
        }
      }
    } else {
      // reset filter
      delete this.filters_[metaModelKey];
      modelsChange = this.removeFilterFromModels(metaModelKey) || modelsChange;
    }
  }

  if (modelsChange) {
    this.project_.alignFx();
    if (this.mustLayoutAfterFilter_()) {
      this.commitFilter();
    } else {
      this.alignVisibility(rhizo.ui.Visibility.GREY);
    }
  }
};

/**
 * Decides whether models should be repositioned after a filter was applied.
 * This may be necessary either because the filters are in autocommit mode, or
 * because the filter change caused some models that were completely hidden
 * to become visible (hence all the models must be repositioned to accomodate
 * these ones).
 *
 * @return {boolean} Whether models should be repositioned after a filter was
 *     applied, or it's enough to align their visibility.
 * @private
 */
rhizo.meta.FilterManager.prototype.mustLayoutAfterFilter_ = function() {
  if (this.filterAutocommit_) {
    return true;
  } else {
    var modelsMap = this.project_.modelsMap();
    for (var modelId in modelsMap) {
      var model = modelsMap[modelId];
      if (!model.isFiltered() &&
          model.rendering().visibility == rhizo.ui.Visibility.HIDDEN) {
        return true;
      }
    }
    return false;
  }
};
