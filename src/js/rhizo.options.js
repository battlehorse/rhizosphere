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
 * @fileOverview Classes that oversee Rhizosphere configuration.
 * @author Riccardo Govoni (battlehorse@google.com)
 */

// Global project namespace
// RHIZODEP=rhizo
namespace("rhizo");

/**
 * Collection of configuration options for a single Rhizosphere instance.
 * Wraps string options keys as instance methods for the sake of option
 * usage traceability throughout the Rhizosphere codebase.
 *
 * It does not perform any validation or normalization of the option values
 * it holds.
 *
 * @param {(Object.<string, *>|rhizo.Options)=} opt_optionsObj Either an
 *     object literal or another rhizo.Options object to initialize this
 *     one from. Initialization performs a shallow copy of this parameter,
 *     therefore options should not be shared across different Rhizosphere
 *     instances. The full list of supported options' keys is enumerated at
 *     http://www.rhizospherejs.com/doc/contrib_tables.html.
 * @constructor
 */
rhizo.Options = function(opt_optionsObj) {
  this.options_ = {  // Defaults
      selectfilter: '.rhizo-model:visible',
      selectionMode: 'all',
      panningMode: 'infinite',
      showErrorsInViewport: true,
      enableHTML5History: true,
      enableLoadingIndicator: true,
      enableAnims: true,
      enableDragAndDrop: true,
      enableLayoutOnResize: true,
      enableSelectionFromCard: true,
      allowConfigFromUrl: false,
      layoutOptions: {},
      logLevel: 'error',
      cacheDimensions: false,
      arDefaults: true,
      arNumFields: 5,
      uiStackFiltersThreshold: 5
  };
  this.merge(opt_optionsObj);
};

/**
 * Augments this set of options with additional ones. In case of overlapping
 * option keys, the new set of options will override the current ones.
 *
 * @param {(Object.<string, *>|rhizo.Options)=} opt_optionsObj Either an
 *     object literal or another rhizo.Options object. The method performs a
 *     shallow copy of this parameter, therefore options should not be shared
 *     across different Rhizosphere instances.
 */
rhizo.Options.prototype.merge = function(opt_optionsObj) {
  if (!opt_optionsObj) {
    return;
  }
  $.extend(this.options_,
      opt_optionsObj instanceof rhizo.Options ?
      opt_optionsObj.options_ : opt_optionsObj);
};

/**
 * @private
 */
rhizo.Options.prototype.asString_ = function(key) {
  var value = this.options_[key];
  if (value !== null && value !== undefined) {
    return String(value);
  }
  return null;
};

/**
 * @private
 */
rhizo.Options.prototype.asInteger_ = function(key) {
  var value = parseInt(this.options_[key], 10);
  return isNaN(value) ? null : value;
};

/**
 * @return {string} An identifier of the platform Rhizosphere is running upon
 *     (e.g., 'mobile'), for the visualization user interface to apply
 *     platform-specific customizations. Overrides automatic platform
 *     detection logic.
 */
rhizo.Options.prototype.platform = function() {
  return this.asString_('platform');
};

/**
 * @return {string} An identifier of the device Rhizosphere is running upon
 *     (e.g. 'iphone'), for the visualization user interface to apply
 *     device-specific customizations. Overrides automatic device detection
 *     logic.
 */
rhizo.Options.prototype.device = function() {
  return this.asString_('device');
};

/**
 * @return {string} An identifier of the user interface template and chrome
 *     the visualization should adopt.
 */
rhizo.Options.prototype.template = function() {
  return this.asString_('template');
};

/**
 * @return {Object} The visualization metamodel, either explicitly set by the
 *     user or automatically assembled by the visualization loader during
 *     the initialization process. See the documentation for
 *     info: http://www.rhizospherejs.com/doc/users_jsformat.html#metamodel.
 */
rhizo.Options.prototype.metamodel = function() {
  return this.options_['metamodel'];
};

/**
 * @return {Object} A metamodel fragment, a partial metamodel specification
 *     that will be superimposed to the metamodel definition defined above.
 */
rhizo.Options.prototype.metamodelFragment = function() {
  return this.options_['metamodelFragment'];
};

/**
 * @return {Object} The visualization renderer, either explicitly set by the
 *     user or automatically assembled by the visualization loader during the
 *     initialization process. See the documentation for
 *     info: http://www.rhizospherejs.com/doc/users_jsformat.html#renderer.
 */
rhizo.Options.prototype.renderer = function() {
  return this.options_['renderer'];
};

/**
 * @return {string} The logging granularity the visualization should use. See
 *     rhizo.log.js for the set of supported values.
 */
rhizo.Options.prototype.logLevel = function() {
  return this.asString_('logLevel');
};

/**
 * @return {string} The CSS selector that identifies selectable items in the
 *     visualization. Affects the performance for selecting/unselecting items.
 *     It is unlikely that you have to change this option unless you mess
 *     with Rhizosphere rendering internals.
 */
rhizo.Options.prototype.selectFilter = function() {
  return this.asString_('selectfilter');
};

/**
 * @return {string} What selection capabilities to activate on the user
 *     interface: 'none' (no selection can be performed via the UI, programmatic
 *     events via the project eventbus are still accepted), 'click' (only model
 *     selection by clicking on model renderings or other UI elements that
 *     allow click-based selection, like layout headers), 'box' (box selection
 *     by drawing selection boxes in the viewport) and 'all' (both 'click' and
 *     'box' modes).
 */
rhizo.Options.prototype.selectionMode = function() {
  return this.asString_('selectionMode');
};

/**
 * @return {boolean} Whether box selection gestures (if enabled), can be
 *     triggered from everywhere within the viewport (including when the mouse
 *     is hovering over a model rendering) or otherwise can only be triggered
 *     from 'empty' viewport areas. This option is ignored (and implicitly
 *     treated as false) is drag'n'drop is enabled, since that takes priority
 *     in handling drag gestures starting from within a model rendering.
 */
rhizo.Options.prototype.isSelectionFromCardEnabled = function() {
  return !!this.options_['enableSelectionFromCard'];
};

/**
 * @return {boolean} Whether 'click' selection, as defined for the
 *     'selectionMode' option, is allowed.
 */
rhizo.Options.prototype.isClickSelectionMode = function() {
  return this.selectionMode() == 'click' || this.selectionMode() == 'all';
};

/**
 * @return {boolean} Whether 'box' selection, as defined for the
 *     'selectionMode' option, is allowed.
 */
rhizo.Options.prototype.isBoxSelectionMode = function() {
  return this.selectionMode() == 'box' || this.selectionMode() == 'all';
};

/**
 * @return {string} The visualization panning mode. Either 'infinite', where
 *     the visualization pane extends limitlessly on both dimensions, 'native',
 *     where native browser scrollbars are used to constrain the panning
 *     are, or 'none', where no panning whatsoever is allowed.
 */
rhizo.Options.prototype.panningMode = function() {
  return this.asString_('panningMode');
};

/**
 * @return {boolean} Whether errors that occur within the visualization will
 *     be presented to the user via message bubbles in the visualization
 *     viewport (the main area where visualization objects are displayed).
 */
rhizo.Options.prototype.showErrorsInViewport = function() {
  return !!this.options_['showErrorsInViewport'];
};

/**
 * @return {boolean} Whether the visualization uses HTML5 History (if supported
 *     by the browser) to keep track of its state.
 */
rhizo.Options.prototype.isHTML5HistoryEnabled = function() {
  return !!this.options_['enableHTML5History'];
};

/**
 * @return {boolean} Whether a progress bar will be displayed to the user while
 *     Rhizosphere is loading.
 */
rhizo.Options.prototype.isLoadingIndicatorEnabled = function() {
  return !!this.options_['enableLoadingIndicator'];
};

/**
 * @return {boolean} Whether visualization models can be dragged around using
 *     the mouse.
 */
rhizo.Options.prototype.isDragAndDropEnabled = function() {
  return !!this.options_['enableDragAndDrop'];
};

/**
 * @return {boolean} Whether the visualization models will be laid out when
 *     the viewport visible area changes.
 */
rhizo.Options.prototype.mustLayoutOnResize = function() {
  return !!this.options_['enableLayoutOnResize'];
};

/**
 * @return {boolean} Whether animations are used to smooth transitions and
 *     operations performed on the visualization, like layouts and filters.
 */
rhizo.Options.prototype.areAnimationsEnabled = function() {
  return !!this.options_['enableAnims'];
};

/**
 * @return {boolean} Whether Rhizosphere will forcefully cache renderings'
 *     dimensions. Greatly improves layout performance, but may result in
 *     layout bugs if the models being visualized change their rendering
 *     dimensions arbitrarily after the visualization initialization.
 */
rhizo.Options.prototype.forceDimensionCaching = function() {
  return !!this.options_['cacheDimensions'];
};

/**
 * @return {boolean} Whether Rhizosphere is allowed to extract configuration
 *     options from the URL of the page it is embedded into.
 */
rhizo.Options.prototype.allowConfigFromUrl = function() {
  return !!this.options_['allowConfigFromUrl'];
};

/**
 * @return {Object.<string, number>} A map of constraints for the area that
 *     Rhizosphere will use to lay out models' renderings out of all the
 *     available viewport. See rhizo.layout.LayoutBox for the details.
 */
rhizo.Options.prototype.layoutConstraints = function() {
  return this.options_['layoutConstraints'];
};

/**
 * @param {string} layout The name of the layout engine whose option is to be
 *     looked up (e.g.: 'flow'), as registered in the rhizo.layout.layouts map.
 * @param {string} key The option key to look up.
 * @return {*} A specific configuration option for the requested layout engine,
 *     if it exists. If not found, undefined is returned.
 */
rhizo.Options.prototype.layoutOptions = function(layout, key) {
  var layoutOptions = this.options_['layoutOptions'][layout];
  if (!layoutOptions) {
    return undefined;
  }
  return layoutOptions[key];
};

/**
 * @return {string} The metamodel field that represents a visualization
 *     model title, for automatically defined renderers. Currently used only
 *     by rhizo.autorender.AR.
 */
rhizo.Options.prototype.autoRenderMasterField = function() {
  return this.asString_('arMaster');
};

/**
 * @return {string} The metamodel field to infer a visualization model title
 *     font size from, for automatically defined renderers. Currently
 *     used only by rhizo.autorender.AR.
 */
rhizo.Options.prototype.autoRenderSizeField = function() {
  return this.asString_('arSize');
};

/**
 * @return {string} The metamodel field to infer a visualization model color
 *     background, for automatically defined renderers. Currently used only by
 *     rhizo.autorender.AR.
 */
rhizo.Options.prototype.autoRenderColorField = function() {
  return this.asString_('arColor');
};

/**
 * @return {boolean} Whether automatically defined renderers should locate
 *     the master, size and color fields if not explicitly specified by the
 *     previous options. Currently used only by rhizo.autorender.AR.
 */
rhizo.Options.prototype.autoRenderUseDefaults = function() {
  return !!this.options_['arDefaults'];
};

/**
 * @return {number} The number of metamodel fields to display in model
 *     renderings' generated by automated renderers. Currently used only by
 *     rhizo.autorender.AR.
 */
rhizo.Options.prototype.autoRenderNumberOfFields = function() {
  return this.asInteger_('arNumFields');
};

/**
 * @return {number} The threshold for number of filters displayed in the
 *     StackFilterContainer interface to decide whether all available filters
 *     should be displayed immediately, or whether they should be hidden
 *     behind an 'Add Filter...' dropdown.
 */
rhizo.Options.prototype.uiStackFiltersThreshold = function() {
  return this.asInteger_('uiStackFiltersThreshold');
};
