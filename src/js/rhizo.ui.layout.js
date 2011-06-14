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
 * @fileOverview User interfaces for Rhizosphere layout engines and related
 * shared classes. Layout engines' UIs are used to collect user input to
 * configure each layout engine behavior.
 *
 * To define a layout engine user interface:
 * - define a new Javascript class.
 *
 * - implement a layoutUIControls() function
 *   This renders and returns the layout engine UI.
 *
 * - register for notifications on the 'layout' eventbus channel.
 *   Notifications will be delivered whenever any kind of layout-related
 *   change occurs elsewhere in the project (such as the layout state being
 *   restored to a different value) for the user interface to catch up.
 *
 * - publish layout-affecting user interactions on the 'layout' eventbus
 *   channel, for the rest of the project to catch up on user requests to
 *   modify the managed layout state.
 *
 * The rhizo.ui.layout.LayoutUi base class can be used to simplify ui
 * development.
 */

// RHIZODEP=rhizo,rhizo.layout.shared,rhizo.layout,rhizo.layout.tree,rhizo.layout.treemap
namespace("rhizo.ui.layout");


/**
 * Associates a given class as the user interface for a layout engine.
 *
 * @param {string} engineName The layout engine to associate UI to.
 * @param {function} uiCtor The constructor function for the UI class.
 */
rhizo.ui.layout.registerUi = function(engineName, uiCtor) {
  if (engineName in rhizo.layout.layouts) {
    rhizo.layout.layouts[engineName]['ui'] = uiCtor;
  }
};


/**
 * Creates a dropdown control that enumerates all the metaModel keys.
 * @param {rhizo.Project} project
 * @param {string} className The classname the dropdown should have.
 * @param {function(string, Object):boolean=} opt_matcher Optional function to
 *     decide whether to include a given metaModel key in the selector.
 *     Receives as parametes the key itself and the associated metamodel entry.
 * @return {Element} the jquery-enhanced HTML dropdown control
 */
rhizo.ui.layout.metaModelKeySelector = function(
    project, className, opt_matcher) {
  var select = $("<select class='" + className + "' />");
  if (project && project.metaModel()) {
    for (var key in project.metaModel()) {
      if (!opt_matcher || opt_matcher(key, project.metaModel()[key])) {
        select.append("<option value='" + key + "'>" +
                      project.metaModel()[key].label + "</option>");
      }
    }
  }
  return select;
};


/**
 * Helper superclass to simplify management of layout engines' user interfaces.
 *
 * @param {rhizo.Project} project The project the engine belongs to.
 * @param {string} engineName The name of the layout engine this UI applies to.
 * @constructor
 */
rhizo.ui.layout.LayoutUi = function(project, engineName) {
  /**
   * jQuery object wrapping the DOM nodes containing the layout engine user
   * interface.
   * @type {*}
   * @private
   */
  this.ui_controls_ = null;

  /**
   * The project this UI belongs to.
   * @type {!rhizo.Project}
   * @private
   */
  this.project_ = project;

  /**
   * The name of the engine this interface pertains to.
   * @type {string}
   * @private
   */
  this.engineName_ = engineName;

  this.project_.eventBus().subscribe('layout', this.onLayout_, this);
};

/**
 * Returns the UI controls associated to this layout engine. Controls are
 * rendered only once, so this method can be invoked multiple times with no
 * side effects.
 *
 * @return {*} Either an HTML node or a jQuery object pointing to it,
 *     collecting the UI controls for this layout.
 */
rhizo.ui.layout.LayoutUi.prototype.layoutUIControls = function() {
  if (!this.ui_controls_) {
    this.ui_controls_ = this.renderControls();
    this.setState(
        this.project_.layoutManager().getEngineState(this.engineName_));
  }
  return this.ui_controls_;
};

/**
 * Callback invoked when a layout-related change occurs on the project.
 * If the change pertains to the layout engine this UI is managing, transitions
 * the UI to the new state as advertised by the received message.
 *
 * @param {Object} message The message describing the layout change. See
 * rhizo.layout.LayoutManager documentation for the expected message structure.
 */
rhizo.ui.layout.LayoutUi.prototype.onLayout_ = function(message) {
  if (message['engine'] != this.engineName_) {
    return;  // Not a message directed to us.
  }
  if (this.ui_controls_ && message['state']) {
    // We can assume the state to be valid since it already passed the
    // LayoutManager preprocessor.
    this.setState(message['state']);
  }
};

/**
 * Stub method for subclasses to override. Returns the user interface for the
 * layout engine this class manages.
 *
 * @return {*} Either an HTML node or a jQuery object pointing to it,
 *     collecting the UI controls for this layout.
 */
rhizo.ui.layout.LayoutUi.prototype.renderControls = function() {
  return null;
};

/**
 * Stub method for subclasses to override. Transitions the layout engine user
 * interface to a new state.
 *
 * @param {Object} state The state to transition the user interface to. The
 *     actual object composition is engine dependent. See
 *     rhizo.layout.StatefulLayout for further info.
 */
rhizo.ui.layout.LayoutUi.prototype.setState = function(state) {};

/**
 * Helper function that subclasses should invoke whenever the layout
 * state changes because of user action on the user interface controls.
 *
 * @param {Object} state The new layout state.
 */
rhizo.ui.layout.LayoutUi.prototype.setStateFromUi = function(state) {
  this.project_.eventBus().publish('layout', {
    engine: this.engineName_,
    state: state,
    // TODO(battlehorse): forcealign should be true only if there are
    // uncommitted filters (i.e. GREY models).
    options: {forcealign: true}
  }, /* callback */ null, this);
};


/**
 * User interface for rhizo.layout.ScrambleLayout layout engine.
 * @param {rhizo.Project} project The project the engine belongs to.
 * @param {string} engineName The name of the layout engine this UI applies to.
 * @constructor
 * @extends rhizo.ui.layout.LayoutUi
 */
rhizo.ui.layout.ScrambleLayoutUi = function(project, engineName) {
  rhizo.ui.layout.LayoutUi.call(this, project, engineName);
};
rhizo.inherits(rhizo.ui.layout.ScrambleLayoutUi, rhizo.ui.layout.LayoutUi);
rhizo.ui.layout.registerUi('scramble', rhizo.ui.layout.ScrambleLayoutUi);

/** @inheritDoc */
rhizo.ui.layout.ScrambleLayoutUi.prototype.renderControls = function() {
  var reshuffle = $('<button />').text('Reshuffle').click(
    jQuery.proxy(function() {
      this.setStateFromUi({});
    }, this));
  return $('<div />').append(reshuffle);
};


/**
 * User interface for rhizo.layout.FlowLayout layout engine.
 * @param {rhizo.Project} project The project the engine belongs to.
 * @param {string} engineName The name of the layout engine this UI applies to.
 * @constructor
 * @extends rhizo.ui.layout.LayoutUi
 */
rhizo.ui.layout.FlowLayoutUi = function(project, engineName) {
  rhizo.ui.layout.LayoutUi.call(this, project, engineName);
  this.project_ = project;
  this.orderSelector_ = null;
  this.reverseCheckbox_ = null;
};
rhizo.inherits(rhizo.ui.layout.FlowLayoutUi, rhizo.ui.layout.LayoutUi);
rhizo.ui.layout.registerUi('flow', rhizo.ui.layout.FlowLayoutUi);

/** @inheritDoc */
rhizo.ui.layout.FlowLayoutUi.prototype.renderControls = function() {
  this.orderSelector_ =  rhizo.ui.layout.metaModelKeySelector(
    this.project_, 'rhizo-flowlayout-order').
      change(jQuery.proxy(this.updateState_, this));
  this.reverseCheckbox_ = $(
    '<input type="checkbox" class="rhizo-flowlayout-desc" />').
      click(jQuery.proxy(this.updateState_, this));

  return $("<div />").
           append("Ordered by: ").
           append(this.orderSelector_).
           append(" desc?").
           append(this.reverseCheckbox_);
};

/** @inheritDoc */
rhizo.ui.layout.FlowLayoutUi.prototype.setState = function(state) {
  this.orderSelector_.val(state.order);
  if (state.reverse) {
    this.reverseCheckbox_.attr('checked', 'checked');
  } else {
    this.reverseCheckbox_.removeAttr('checked');
  }
};

/**
 * Updates the layout state whenever the user modifies the controls.
 * @private
 */
rhizo.ui.layout.FlowLayoutUi.prototype.updateState_ = function() {
  this.setStateFromUi({
    order: this.orderSelector_.val(),
    reverse: this.reverseCheckbox_.is(':checked')
  });
};


/**
 * User interface for rhizo.layout.BucketLayout layout engine.
 * @param {rhizo.Project} project The project the engine belongs to.
 * @param {string} engineName The name of the layout engine this UI applies to.
 * @constructor
 * @extends rhizo.ui.layout.LayoutUi
 */
rhizo.ui.layout.BucketLayoutUi = function(project, engineName) {
  rhizo.ui.layout.LayoutUi.call(this, project, engineName);
  this.project_ = project;
  this.bucketSelector_ = null;
  this.reverseCheckbox_ = null;
};
rhizo.inherits(rhizo.ui.layout.BucketLayoutUi, rhizo.ui.layout.LayoutUi);
rhizo.ui.layout.registerUi('bucket', rhizo.ui.layout.BucketLayoutUi);

/** @inheritDoc */
rhizo.ui.layout.BucketLayoutUi.prototype.renderControls = function() {
  this.bucketSelector_ = rhizo.ui.layout.metaModelKeySelector(
      this.project_, 'rhizo-bucketlayout-bucket').
      change(jQuery.proxy(this.updateState_, this));
  this.reverseCheckbox_ = $('<input type="checkbox" ' +
                            'class="rhizo-bucketlayout-desc" />').
      click(jQuery.proxy(this.updateState_, this));
  return $("<div />").
           append("Group by: ").
           append(this.bucketSelector_).
           append(" desc?").
           append(this.reverseCheckbox_);
};

/** @inheritDoc */
rhizo.ui.layout.BucketLayoutUi.prototype.setState = function(state) {
  this.bucketSelector_.val(state.bucketBy);
  if (state.reverse) {
    this.reverseCheckbox_.attr('checked', 'checked');
  } else {
    this.reverseCheckbox_.removeAttr('checked');
  }
};

/**
 * Updates the layout state whenever the user modifies the controls.
 * @private
 */
rhizo.ui.layout.BucketLayoutUi.prototype.updateState_ = function() {
  this.setStateFromUi({
    bucketBy: this.bucketSelector_.val(),
    reverse: this.reverseCheckbox_.is(':checked')
  });
};


/**
 * User interface for rhizo.layout.TreeLayout layout engine.
 * @param {rhizo.Project} project The project the engine belongs to.
 * @param {string} engineName The name of the layout engine this UI applies to.
 * @constructor
 * @extends rhizo.ui.layout.LayoutUi
 */
rhizo.ui.layout.TreeLayoutUi = function(project, engineName) {
  rhizo.ui.layout.LayoutUi.call(this, project, engineName);
  this.project_ = project;

  this.directionSelector_ = null;
  this.metaModelKeySelector_ = null;

  /**
   * The matcher to identify all model attributes where tree structures can be
   * built from.
   * @type {function(string, Object):boolean}
   * @private
   */
  this.matcher_ = rhizo.layout.orMatcher(
      rhizo.layout.linkMatcher, rhizo.layout.hierarchyMatcher);
};
rhizo.inherits(rhizo.ui.layout.TreeLayoutUi, rhizo.ui.layout.LayoutUi);
rhizo.ui.layout.registerUi('tree', rhizo.ui.layout.TreeLayoutUi);

/** @inheritDoc */
rhizo.ui.layout.TreeLayoutUi.prototype.renderControls = function() {
  var parentKeys = this.getParentKeys_();
  var details = $("<div />");
  if (parentKeys.length == 0) {
    // should never happen because of verifyMetaModel
    details.append("No hierarchical relationships exist");
    return details;
  }

  details.append(" arrange ");
  this.directionSelector_ = $("<select class='rhizo-treelayout-direction' />");
  this.directionSelector_.append("<option value='hor'>Horizontally</option>");
  this.directionSelector_.append("<option value='ver'>Vertically</option>");
  this.directionSelector_.change(jQuery.proxy(this.updateState_, this));
  details.append(this.directionSelector_);

  if (parentKeys.length > 1) {
    this.metaModelKeySelector_ = rhizo.ui.layout.metaModelKeySelector(
        this.project_,
        'rhizo-treelayout-parentKey',
        this.matcher_);
    this.metaModelKeySelector_.change(jQuery.proxy(this.updateState_, this));
    details.append(" by ").append(this.metaModelKeySelector_);
  } else if (parentKeys.length == 1) {
    this.metaModelKeySelector_ =
        $("<input type='hidden' />").val(parentKeys[0]);
  }
  return details;
};

/**
 * @return {Array.<string>} The list of all metamodel keys which can be used
 *     to arrange models in a tree structure, i.e. they either identify
 *     parent-child relationships (see rhizo.layout.linkMatcher) or place
 *     a model in a hierarchical path (see rhizo.layout.hierarchyMatcher).
 * @private
 */
rhizo.ui.layout.TreeLayoutUi.prototype.getParentKeys_ = function() {
  var parentKeys = [];
  for (var key in this.project_.metaModel()) {
    if (this.matcher_(key, this.project_.metaModel()[key])) {
      parentKeys.push(key);
    }
  }
  return parentKeys;
};

/** @inheritDoc */
rhizo.ui.layout.TreeLayoutUi.prototype.setState = function(state) {
  this.directionSelector_.val(state.direction);
  if (this.metaModelKeySelector_) {
    this.metaModelKeySelector_.val(state.parentKey);
  }
};

/**
 * Updates the layout state whenever the user modifies the controls.
 * @private
 */
rhizo.ui.layout.TreeLayoutUi.prototype.updateState_ = function() {
  var state = {
    direction: this.directionSelector_.val()
  };
  if (this.metaModelKeySelector_) {
    state.parentKey = this.metaModelKeySelector_.val();
  }
  this.setStateFromUi(state);
};


/**
 * User interface for rhizo.layout.TreeMapLayout layout engine.
 * @param {rhizo.Project} project The project the engine belongs to.
 * @param {string} engineName The name of the layout engine this UI applies to.
 * @constructor
 * @extends rhizo.ui.layout.LayoutUi
 */
rhizo.ui.layout.TreeMapLayoutUi = function(project, engineName) {
  rhizo.ui.layout.LayoutUi.call(this, project, engineName);
  this.project_ = project;

  this.areaSelector_ = null;
  this.colorSelector_ = null;
  this.parentKeySelector_ = null;

  /**
   * The matcher to identify all model attributes where tree structures can be
   * built from.
   * @type {function(string, Object):boolean}
   * @private
   */
  this.parentMatcher_ = rhizo.layout.orMatcher(
      rhizo.layout.linkMatcher, rhizo.layout.hierarchyMatcher);
};
rhizo.inherits(rhizo.ui.layout.TreeMapLayoutUi, rhizo.ui.layout.LayoutUi);
rhizo.ui.layout.registerUi('treemap', rhizo.ui.layout.TreeMapLayoutUi);

/** @inheritDoc */
rhizo.ui.layout.TreeMapLayoutUi.prototype.renderControls = function() {
  var hasParentKeys = this.checkParentKeys_();
  var details = $('<div />');

  this.areaSelector_ = rhizo.ui.layout.metaModelKeySelector(
      this.project_,
      'rhizo-treemaplayout-area',
      rhizo.layout.numericMatcher).
    change(jQuery.proxy(this.updateState_, this));
  this.colorSelector_ = rhizo.ui.layout.metaModelKeySelector(
      this.project_,
      'rhizo-treemaplayout-color',
      rhizo.layout.numericMatcher).
    append("<option value=''>-</option>").
    change(jQuery.proxy(this.updateState_, this));
  details.
      append(this.renderSelector_('Area: ', this.areaSelector_)).
      append(this.renderSelector_('Color: ', this.colorSelector_));
  if (hasParentKeys) {
    this.parentKeySelector_ = rhizo.ui.layout.metaModelKeySelector(
        this.project_,
        'rhizo-treemaplayout-parentKey',
        this.parentMatcher_).
      append("<option value=''>-</option>").
      change(jQuery.proxy(this.updateState_, this));
    details.append(this.renderSelector_('Group by: ', this.parentKeySelector_));
  }
  return details;
};

/**
 * Renders an option selector, by grouping together a label and a combobox in
 * a single element.
 * @param {string} label Text label to associate to the SELECT element.
 * @param {*} selector jQuery object pointing to a SELECT element.
 * @return {*} JQuery object pointing to the grouped control.
 * @private
 */
rhizo.ui.layout.TreeMapLayoutUi.prototype.renderSelector_ = function(
    label, selector) {
  return $('<div />', {'class': 'rhizo-layout-control'}).
      append($('<label />').text(label)).append(selector);
};

/**
 * Checks whether the project metamodel contains keys that define parent-child
 * relationships between models, so that hierarchical treemaps can be built.
 * @return {boolean} Whether the project allows hierarchical treemaps or not.
 * @private
 */
rhizo.ui.layout.TreeMapLayoutUi.prototype.checkParentKeys_ = function() {
  for (var key in this.project_.metaModel()) {
    if (this.parentMatcher_(key, this.project_.metaModel()[key])) {
      return true;
    }
  }
  return false;
};

/** @inheritDoc */
rhizo.ui.layout.TreeMapLayoutUi.prototype.setState = function(state) {
  this.areaSelector_.val(state.area);
  this.colorSelector_.val(state.color || '');  // color is optional
  if (this.parentKeySelector_) {
    this.parentKeySelector_.val(state.parentKey || '');  // parent is optional.
  }
};

/**
 * Updates the layout state whenever the user modifies the controls.
 * @private
 */
rhizo.ui.layout.TreeMapLayoutUi.prototype.updateState_ = function() {
  var state = {
    area: this.areaSelector_.val(),
    color: this.colorSelector_.val()
  };
  if (this.parentKeySelector_) {
    state.parentKey = this.parentKeySelector_.val();
  }
  this.setStateFromUi(state);
};
