/*
  Copyright 2010 The Rhizosphere Authors. All Rights Reserved.

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

// RHIZODEP=rhizo.ui.component
// GUI Namespace
namespace("rhizo.ui.gui");

/**
 * The visualization GUI, defined by the overall container, viewport, universe
 * and a collection of UI Components.
 *
 * @param {HTMLElement} container The HTML element that will contain the
 * @param {string} platform The platform we are currently running on (e.g.:
 *     'mobile', 'default' ... ).
 * @param {string} device The device we are currently running on (e.g.:
 *     'ipad', 'iphone', 'default' ... ).
 * @constructor
 */
rhizo.ui.gui.GUI = function(container, platform, device) {
  // The target platform we are rendering onto (e.g.: 'mobile').
  this.platform_ = platform;

  // The specific device we are targeting (e.g.: 'ipad').
  this.device_ = device;

  // A JQuery object pointing to the DOM element that contains the whole
  // Rhizosphere instance.
  this.container = $(container);
  this.is_small_container_ = false;
  this.initContainer_();

  // The universe component is the container for all the models managed
  // by Rhizosphere. A universe must always exist in a Rhizosphere
  // visualization.
  this.universe = null;
  this.universeTargetPosition_ = {top: 0, left: 0};

  // The viewport component defines which part of the universe is visible to
  // the user. The universe may be bigger than the current visible area,
  // so the viewport is responsible for panning too.
  this.viewport = null;

  // A set of additional components, each one identified by a unique name
  // (map key).
  //
  // In addition to the mandatory components, defined above, a GUI can have
  // extra components attached to it.
  this.componentsMap_ = {};

  // Dictates whether animations are enabled or not.
  this.noFx = false;

  this.selectionModeOn_ = false;
};

rhizo.ui.gui.GUI.prototype.done = function() {
  if (/kb=(true|yes|1)/.test(document.location.href)) {
    this.activateOnscreenKeyboard();
  }
};

rhizo.ui.gui.GUI.prototype.initContainer_ = function() {
  // Enable device-specific and platform-specific styles.
  this.container.
      addClass('rhizo').
      addClass('rhizo-device-' + this.device_).
      addClass('rhizo-platform-' + this.platform_);  
  this.is_small_container_ = this.container.width() < 600 ||
      this.container.height() < 250;
};

rhizo.ui.gui.GUI.prototype.setViewport = function(viewport) {
  this.viewport = viewport;
};

rhizo.ui.gui.GUI.prototype.setUniverse = function(universe) {
  this.universe = universe;
};

rhizo.ui.gui.GUI.prototype.addComponent = function(component_key, component) {
  this.componentsMap_[component_key] = component;
};

rhizo.ui.gui.GUI.prototype.getComponent = function(component_key) {
  return this.componentsMap_[component_key];
};

/**
 * @return {boolean} Whether the GUI is 'small' (in terms of pixel area).
 *     Renderers might use this hint to customize the renderings they produce.
 */
rhizo.ui.gui.GUI.prototype.isSmall = function() {
  return this.is_small_container_;
};

/**
 * @return {boolean} Are we running on a mobile device?
 */
rhizo.ui.gui.GUI.prototype.isMobile = function() {
  return this.platform_ == 'mobile';
};

rhizo.ui.gui.GUI.prototype.allRenderingHints = function() {
  return {
    small: this.isSmall(),
    mobile: this.isMobile()
  };
};

/**
 * @return {boolean} Whether the viewport is in selection mode or not.
 */
rhizo.ui.gui.GUI.prototype.isSelectionModeOn = function() {
  return this.selectionModeOn_;
};

/**
 * Toggles the viewport between selection mode and panning mode (the default),
 * which determines how mouse drag operations will be interpreted.
 */
rhizo.ui.gui.GUI.prototype.toggleSelectionMode = function() {
  this.selectionModeOn_ = !this.selectionModeOn_;
  var selectable_status = this.selectionModeOn_ ? 'enable' : 'disable';
  var draggable_status = this.selectionModeOn_ ? 'disable' : 'enable';
  this.viewport.selectable(selectable_status).
      draggable(draggable_status).
      toggleClass('rhizo-selection-mode');

  // If a BottomBar exists, ask it to make the SelectionManager component
  // visible whenever we are in selection mode.
  var bottomBar = this.getComponent('rhizo.ui.component.BottomBar');
  if (bottomBar) {
    bottomBar.toggleComponent('rhizo.ui.component.SelectionManager',
                              this.selectionModeOn_); 
  }

  var selManager = this.getComponent('rhizo.ui.component.SelectionManager');
  if (selManager) {
    selManager.toggleSelectionTrigger(this.selectionModeOn_);
  }
};

rhizo.ui.gui.GUI.prototype.disableFx = function(disabled) {
  this.noFx = disabled;
};

rhizo.ui.gui.GUI.prototype.moveUniverse = function(position) {
  this.universeTargetPosition_ = {top: position.top, left: position.left};
  this.universe.stop().css(this.universeTargetPosition_);
};

rhizo.ui.gui.GUI.prototype.panUniverse = function(yMagnitude,
                                                  xMagnitude,
                                                  timestamp) {
  var scale = Math.round(this.viewport.get(0).offsetHeight / 10);
  this.universeTargetPosition_ = {
    top: yMagnitude*scale + this.universeTargetPosition_.top,
    left: xMagnitude*scale + this.universeTargetPosition_.left
  };
  this.universe.stop().animate(this.universeTargetPosition_);
};

rhizo.ui.gui.GUI.prototype.activateOnscreenKeyboard = function() {
  if (rhizo.keyboard && rhizo.keyboard.Keyboard) {
    new rhizo.keyboard.Keyboard(this.container);
  }
};
