/*
  Copyright 2010 Riccardo Govoni battlehorse@gmail.com

  Licensed under the Apache License, Version 2.0 (the &quot;License&quot;);
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an &quot;AS IS&quot; BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

// RHIZODEP=rhizo.ui.component
// GUI Namespace
namespace("rhizo.ui.gui");

/*
  A GUI is a collection of UI Components. A GUI is built by a Template.
*/
rhizo.ui.gui.GUI = function(container) {

  // A JQuery object pointing to the DOM element that contains the whole
  // Rhizosphere instance.
  this.container = container;

  // The universe component is the container for all the models managed
  // by Rhizosphere. A universe must always exist in a Rhizosphere
  // visualization.
  this.universe = null;

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
 * Enables or disables models selection.
 * @param {string} status Either 'enable' or 'disable'
 */
rhizo.ui.gui.GUI.prototype.toggleSelection = function(status) {
  this.viewport.selectable(status);
};
