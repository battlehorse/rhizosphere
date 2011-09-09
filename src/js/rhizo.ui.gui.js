/**
  @license
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

// RHIZODEP=rhizo.ui.component,rhizo
// GUI Namespace
namespace("rhizo.ui.gui");

/**
 * The visualization GUI, defined by the overall container, viewport and
 * universe.
 *
 * The GUI is not aware of the full list of other UI components
 * that are part of it, as this list can vary depending on the template being
 * used. Components can still communicate with each other via the project
 * eventbus.
 *
 * @param {HTMLElement} container The HTML element that will contain the
 * @param {string} platform The platform we are currently running on (e.g.:
 *     'mobile', 'default' ... ).
 * @param {string} device The device we are currently running on (e.g.:
 *     'ipad', 'iphone', 'android', 'default' ... ).
 * @constructor
 */
rhizo.ui.gui.GUI = function(container, platform, device) {
  /**
   * The target platform we are rendering onto (e.g.: 'mobile').
   *
   * @type {string}
   * @private
   */
  this.platform_ = platform;

  /**
   * The specific device we are targeting (e.g.: 'ipad').
   *
   * @type {string}
   * @private
   */
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

  // The viewport component defines which part of the universe is visible to
  // the user. The universe may be bigger than the current visible area,
  // so the viewport is responsible for panning too.
  this.viewport = null;

  // Dictates whether animations are enabled or not.
  this.noFx = false;
};

rhizo.ui.gui.GUI.prototype.done = function() {
  var kbParam = rhizo.util.urlParams()['kb'];
  if (kbParam && /true|yes|1/.test(kbParam)) {
    this.activateOnscreenKeyboard();
  }
};

/**
 * Reverts the Rhizosphere container back to its original state, before the
 * Rhizosphere visualization was assembled inside it, removing indiscriminately
 * any DOM element contained within.
 */
rhizo.ui.gui.GUI.prototype.destroy = function() {
  var classes = this.container.get(0).className.split(' ');
  for (var i = 0; i < classes.length; i++) {
    if (classes[i].indexOf('rhizo') == 0) {
      this.container.removeClass(classes[i]);
    }
  }
  this.container.children().remove();
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

rhizo.ui.gui.GUI.prototype.disableFx = function(disabled) {
  this.noFx = disabled;
};

rhizo.ui.gui.GUI.prototype.activateOnscreenKeyboard = function() {
  if (rhizo.keyboard && rhizo.keyboard.Keyboard) {
    new rhizo.keyboard.Keyboard(this.container);
  }
};
