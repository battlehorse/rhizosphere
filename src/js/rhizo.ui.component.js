/**
  @license
  Copyright 2009 The Rhizosphere Authors. All Rights Reserved.

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
 * === Components and Templates
 *
 * This file contains the building blocks of the Rhizosphere UI:
 *
 * = Components:
 *   a Component is a single UI control (e.g. the layout selector or the filters
 *   container) that can be plugged into the Rhizosphere UI.
 *
 *   Components follow a simple lifecycle that mimics the loading phase of a
 *   Rhizosphere visualization:
 *   - initialization
 *   - render: Only the static aspects of the visualization are available at
 *     this point. The component defines its html skeleton.
 *   - metaReady: The component can use information about the visualization
 *     metamodel and renderer.
 *   - ready: The visualization is fully loaded, including models, and ready
 *     to use.
 *
 *   The lifecycle can terminate early if the visualization input is malformed.
 *   Components should provide an interface as functional as possible for
 *   each lifecycle state.
 *
 * = Containers:
 *   an extension of Component that allows the container to include other
 *   components within itself.
 *
 * = Templates
 *   a Template is a specialized Container that defines an entire Rhizosphere
 *   UI. It extends Container by ensuring that the visualization has a Viewport
 *   (which is the only mandatory part of a visualization) and includes extra
 *   features like UI feedback of the loading sequence.
 *
 *   Every visualization has a template attached to it. Every template should
 *   inherit from the rhizo.ui.component.Template base class.
 *
 * New templates can be registered by adding a factory method to the
 * rhizo.ui.component.templates enumeration.
 */

// RHIZODEP=rhizo.ui,rhizo.layout
// Components Namespace
namespace("rhizo.ui.component");


/**
 * Progress-bar to handle visualization startup feedback.
 * @constructor
 */
rhizo.ui.component.Progress = function() {};

/**
 * Initializes and renders the progress bar.
 * @param {*} container jQuery object pointing to the element to which add the
 *   progress bar.
 */
rhizo.ui.component.Progress.prototype.render = function(container) {
  this.pbarPanel_ = $('<div/>', {'class': 'rhizo-progressbar-panel'}).
      appendTo(container);
  
  // center the progress bar.
  this.pbarPanel_.css({
    'top': Math.round((container.height() - this.pbarPanel_.height()) / 2),
    'left': Math.round((container.width() - this.pbarPanel_.width()) / 2)
  });
  var pbar = $('<div/>', {'class': 'rhizo-progressbar'}).
      appendTo(this.pbarPanel_);
  this.pbar_ = pbar.progressbar({value: 1});
  this.pbarText_ = $('<div/>', {'class': 'rhizo-progressbar-text'}).
      text('Loading...').
      appendTo(this.pbarPanel_);
};

/**
 * Updates the progress bar to a new value.
 * @param {number} value The new value to set. If greater or equal than 100, the
 *     task is assumed to be completed and the progressbar is removed.
 * @param {?string} opt_text An optional descriptive text to describe the
 *     current status.
 */
rhizo.ui.component.Progress.prototype.update = function(value, opt_text) {
  this.pbar_.progressbar('value', value);
  if (opt_text) {
    this.pbarText_.text(opt_text);
  }
  if (value >= 100) {
    this.destroy_();
  }
};

/**
 * Destroys the progress bar.
 * @private
 */
rhizo.ui.component.Progress.prototype.destroy_ = function() {
  if (this.pbarPanel_.is(':visible')) {
    setTimeout(jQuery.proxy(function() {
      this.pbarPanel_.fadeOut(function() {
        $(this).remove();
      });
    }, this), 1000);
  } else {
    this.pbarPanel_.remove();
  }
};


/* ==== Events and other enums ==== */

/**
 * Enumeration of the types of events that components can fire to each other.
 * @enum {string}
 */
rhizo.ui.component.EventType = {
  ACTIVATE: 'activate',  // the component has been activated.
  DEACTIVATE: 'deactivate'  // the component has been deactivated.
};


/**
 * Enumeration of the phases of a component lifecycle.
 * @enum {number}
 */
rhizo.ui.component.Phase = {
  INIT: 0,
  RENDER: 1,
  METAREADY: 2,
  READY: 3
};


/* ==== Component, Container, Template definition ==== */


/**
 * Defines a Component, the basic building block of the Rhizosphere UI.
 *
 * @param {rhizo.Project} project The project this component belongs to.
 * @param {*} options Project-wide configuration options
 * @param {?string} opt_key Optional key the component will use to register
 *     itself with the project GUI.
 * @constructor
 */
rhizo.ui.component.Component = function(project, options, opt_key) {
  this.project_ = project;
  this.gui_ = project.gui();
  this.options_ = options;

  this.key_ = opt_key;
  if (opt_key) {
    this.gui_.addComponent(opt_key, this);
  }
};

/**
 * @return {?string} The registration key of this component, if any. The
 *     registration key can be used to uniquely identify this component
 *     among all the ones registered with the project GUI.
 */
rhizo.ui.component.Component.prototype.key = function() {
  return this.key_;
};

/**
 * @return {?string} The component title, if defined. Subclasses should
 *     override. The containing template or container can use this information
 *     to visually separate this component from others.
 */
rhizo.ui.component.Component.prototype.title = function() {
  return null;
};

/**
 * @return {?string} The CSS class to assign to the component title. Subclasses
 *     should override.
 */
rhizo.ui.component.Component.prototype.titleClass = function() {
  return null;
};

/**
 * Callback method whenever an event that affects the component occurs.
 * Subclasses should override.
 * @param {rhizo.ui.component.EventType} evt The type of event that occurred.
 */
rhizo.ui.component.Component.prototype.onEvent = function(evt) {};

/**
 * Renders the component. Subclasses should override to define the HTML
 * skeleton of the component.
 *
 * When this method is invoked, only static information about the visualization
 * are known. The project models, metamodel and renderer are not defined yet.
 *
 * Components should define their entire HTML structure here, and activate it
 * in later phases (metaReady, ready) depending on the minimum information
 * needed to proceed.
 *
 * @return {Array.<HTMLElement>|HTMLElement} The set of elements (can be one
 *     or more) that define the component structure.
 */
rhizo.ui.component.Component.prototype.render = function() {
  return $('<div />').get(0);
};

/**
 * Callback method that notifies that the project metamodel and renderer are
 * now known. Subclasses should extend to enrich the component with
 * functionality that depends on the metamodel and renderer presence.
 */
rhizo.ui.component.Component.prototype.metaReady = function() {};

/**
 * Callback method that notifies that the visualization this component belongs
 * to is now ready and fully usable.
 * Subclasses should extend to fully activate the component UI and/or to
 * trigger functionality that requires the visualization to be fully loaded.
 */
rhizo.ui.component.Component.prototype.ready = function() {};


/**
 * A Container is a specialized component that can contain other components
 * within itself.
 *
 * @param {rhizo.Project} project The project this container belongs to.
 * @param {*} options Project-wide configuration options
 * @param {?string} opt_key Optional key the container will use to register
 *     itself with the project GUI.
 * @constructor
 */
rhizo.ui.component.Container = function(project, options, opt_key) {
  rhizo.ui.component.Component.call(this, project, options, opt_key);
  this.components_ = [];
  this.phase_ = rhizo.ui.component.Phase.INIT;
};
rhizo.inherits(rhizo.ui.component.Container, rhizo.ui.component.Component);

/**
 * Adds a component to this container. A component can be added to the container
 * during any phase of the container lifecycle (even when the container has been
 * made ready and the visualization is fully usable).
 *
 * @param {rhizo.ui.component.Component} component The component to add.
 * @param {number} opt_position The optional position in the sequence of
 *     components where the new one should be inserted. Follows the same rules
 *     as Array.prototype.splice.
 * @return {Array.<HTMLElement>|HTMLElement} The set of elements (can be one or
 *     more) that the newly added component generated. This is not null only if
 *     the component was added after the container already rendered its
 *     contents.
 */
rhizo.ui.component.Container.prototype.addComponent = function(component,
                                                               opt_position) {
  if (opt_position) {
    this.components_.splice(opt_position, 0, component);
  } else {
    this.components_.push(component);    
  }

  if (opt_position < 0) {
    opt_position = this.components_.length - 1 + opt_position;
  }

  // Catch up with the missing lifecycle steps if the component is added late
  // in the game.
  var new_renderings = null;
  switch(this.phase_) {
    case rhizo.ui.component.Phase.INIT:
      break;
    case rhizo.ui.component.Phase.RENDER:
      new_renderings = this.renderSingleComponent(component, opt_position);
      break;
    case rhizo.ui.component.Phase.METAREADY:
      new_renderings = this.renderSingleComponent(component, opt_position);
      component.metaReady();
      break;
    case rhizo.ui.component.Phase.READY:
      new_renderings = this.renderSingleComponent(component, opt_position);
      component.metaReady();
      component.ready();
      break;
    default:
      break;
  }

  // Return any new HTML elements that were created, for the upstream container
  // to properly attach them to the visualization.
  return new_renderings;
};

/**
 * @return {Array.<rhizo.ui.component.Component>} Returns the list of components
 *     that are contained within this container.
 */
rhizo.ui.component.Container.prototype.getComponents = function() {
  return this.components_;
};

/**
 * @return {rihzo.ui.component.Phase} The lifecycle phase the container is
 *     currently in.
 */
rhizo.ui.component.Container.prototype.phase = function() {
  return this.phase_;
};

/**
 * Renders the container and iteratively renders all the components contained
 * within. Deletages to renderContainer() and renderSingleComponent() methods
 * that subclasses should implement.
 *
 * @return {Array.<HTMLElement>|HTMLElement} The set of elements (can be one
 *     or more) that define the container structure.
 */
rhizo.ui.component.Container.prototype.render = function() {
  this.phase_ = rhizo.ui.component.Phase.RENDER;
  var all_renderings = [];
  this.appendRendering_(this.renderContainer(), all_renderings);
  for (var i = 0; i < this.components_.length; i++) {
    this.appendRendering_(this.renderSingleComponent(this.components_[i], i),
                          all_renderings);
  }
  return all_renderings;
};

/**
 * Adds a single rendering to the list of all renderings that will be returned
 * by render().
 * 
 * @param {?Array.<HTMLElement>|HTMLElement} rendering
 * @param {Array.<HTMLElement>} all_renderings
 * @private
 */
rhizo.ui.component.Container.prototype.appendRendering_ = function(
    rendering, all_renderings) {
  if (!rendering) {
    return;
  }
  if (jQuery.isArray(rendering)) {
    Array.prototype.push.apply(all_renderings, rendering);
  } else {
    all_renderings.push(rendering);
  }
};

/**
 * Renders the container itself. Subclasses should override this method.
 * @return {Array.<HTMLElement>|HTMLElement} The set of elements (can be one
 *     or more) that define the container itself.
 */
rhizo.ui.component.Container.prototype.renderContainer = function() {
  return null;
};

/**
 * Renders a single component within the container.
 * @param {rhizo.ui.component.Component} component The component to render.
 * @param {?number} opt_position The position of the component being rendered
 *     in the sequence of components part of this container. Guaranteed to be
 *     greater or equal to 0.
 * @return {Array.<HTMLElement>|HTMLElement} The set of elements (can be one
 *     or more) that define the given component and should be attached to the
 *     visualization DOM, unless they're explicity attached within this method.
 */
rhizo.ui.component.Container.prototype.renderSingleComponent = function(
    component, opt_position) {
  return null;
};

/**
 * Dispatches the notification that the project metamodel and renderer are now
 * known to all the components managed by this container.
 */
rhizo.ui.component.Container.prototype.metaReady = function() {
  this.phase_ = rhizo.ui.component.Phase.METAREADY;
  var components = this.getComponents();
  for (var i = 0; i < components.length; i++) {
    components[i].metaReady();
  }
};

/**
 * Dispatches the notification the visualization is now ready to all the
 * components managed by this container.
 */
rhizo.ui.component.Container.prototype.ready = function() {
  this.phase_ = rhizo.ui.component.Phase.READY;
  var components = this.getComponents();
  for (var i = 0; i < components.length; i++) {
    components[i].ready();
  }
};


/**
 * Base class to define Rhizosphere UI templates. A Template is a specialized
 * Container with the additional knowledge of the project Viewport (the only
 * mandatory part of a Rhizosphere visualization).
 *
 * A template will always include a rhizo.ui.component.Viewport instance.
 *
 * A template follows the same rendering sequence of containers and components.
 * Additional components can be added to the template, even after it has been
 * made live, via the addComponent() method.
 *
 * A template can notify an external component about the state of the
 * initialization process. By default a rhizo.ui.component.Progress progressbar
 * is used, but it can be customized via setProgressHandler().
 *
 * @param {rhizo.Project} project The project this template belongs to.
 * @param {*} options Project-wide configuration options
 * @param {?string} template_key A unique key that identifies the template.
 *     Generates a CSS class name that can be used for template-specific UI
 *     skinning.
 * @constructor
 */
rhizo.ui.component.Template = function(project, options, template_key) {
  rhizo.ui.component.Container.call(this, project, options, template_key);

  this.viewport_ = new rhizo.ui.component.Viewport(project, options);
  this.progress_ = new rhizo.ui.component.Progress();
};
rhizo.inherits(rhizo.ui.component.Template, rhizo.ui.component.Container);

/**
 * Sets the progress handler, that will receive notifications about the
 * template initialization sequence.
 *
 * @param {*} progress An object that responds to the render(container) and
 *     update(value, message) functions. See rhizo.ui.component.Progress for
 *     an example on how to create a progress handler.
 *     Set to null to disable progress reporting altogether.
 */
rhizo.ui.component.Template.prototype.setProgressHandler = function(progress) {
  this.progress_ = progress;
};

/**
 * Adds a component to this template.
 * @param {rhizo.ui.component.Component} component The component to add
 */
rhizo.ui.component.Template.prototype.addComponent = function(component) {
  var new_renderings = rhizo.ui.component.Container.prototype.addComponent.call(
      this, component);
  if (new_renderings) {
    this.gui_.container.append(new_renderings);
  }
};

/**
 * Renders the template. Unlike the vanilla container rendering, the template
 * does not create its containing HTML element, but instead it populates the
 * project GUI container.
 *
 * @return {HTMLElement} The project GUI container, filled with the template
 *     contents.
 */
rhizo.ui.component.Template.prototype.render = function() {
  var all_renderings = rhizo.ui.component.Container.prototype.render.call(this);
  if (this.progress_) {
    this.progress_.update(20, 'Chrome created. Loading metadata...');
  }
  return all_renderings;
};

rhizo.ui.component.Template.prototype.renderContainer = function() {
  this.gui_.container.addClass('rhizo-template-' + this.key());
  this.gui_.container.append(this.viewport_.render());
  if (this.progress_) {
    this.progress_.render(this.gui_.viewport);
  }
  return this.gui_.container.get(0);
};

rhizo.ui.component.Template.prototype.renderSingleComponent = function(
    component) {
  this.gui_.container.append(component.render());
  return null;  // The rendering has already been appened to the container.
};

rhizo.ui.component.Template.prototype.metaReady = function() {
  if (this.progress_) {
    this.progress_.update(40, 'Metadata loaded. Updating components...');
  }
  this.viewport_.metaReady();
  rhizo.ui.component.Container.prototype.metaReady.call(this);
  if (this.progress_) {
    this.progress_.update(60, 'Components updated. Loading models...');
  }
};

rhizo.ui.component.Template.prototype.ready = function() {
  if (this.progress_) {
    this.progress_.update(80, 'Models loaded. Activating UI...');
  }
  this.viewport_.ready();
  rhizo.ui.component.Container.prototype.ready.call(this);
  if (this.progress_) {
    this.progress_.update(100, 'Rhizosphere ready!');
  }
};


/* ==== Specialized containers ==== */

/**
 * A vertical box container. It renders all the components contained within in
 * a linear fashion, prepending each component with an header containing its
 * title (if the component defined one).
 *
 * @param {rhizo.Project} project The project this box belongs to.
 * @param {*} options Project-wide configuration options
 * @param {?string} opt_key Optional key the box will use to register
 *     itself with the project GUI.
 * @param {string} boxclass The CSS class assigned to the box.
 * @constructor
 */
rhizo.ui.component.VBox = function(project, options, opt_key, boxclass) {
  rhizo.ui.component.Container.call(this, project, options, opt_key);
  this.boxclass_ = boxclass;
  this.panel_ = null;
};
rhizo.inherits(rhizo.ui.component.VBox, rhizo.ui.component.Container);

rhizo.ui.component.VBox.prototype.renderContainer = function() {
  this.panel_ = $('<div />', {'class': this.boxclass_});
  return this.panel_.get(0);
};

rhizo.ui.component.VBox.prototype.renderSingleComponent = function(component) {
  var title = component.title();
  if (title) {
    var titleClass = 'rhizo-section-header';
    if (component.titleClass()) {
      titleClass += ' ' + component.titleClass();
    }
    var titleEl = $('<div />', {'class': titleClass}).
      text(title).
      appendTo(this.panel_);
  }
  this.panel_.append(component.render());
  return null;  // rendering has been appended to the panel itself.
};


/**
 * A collapsible box sitting on the right of the viewport.
 *
 * @param {rhizo.Project} project The project this box belongs to.
 * @param {*} options Project-wide configuration options
 * @param {?string} opt_key Optional key the box will use to register
 *     itself with the project GUI.
 * @param {string} boxclass The CSS class assigned to the box.
 * @constructor
 */
rhizo.ui.component.RightBar = function(project, options, opt_key, boxclass) {
  rhizo.ui.component.Container.call(this, project, options, opt_key);
  this.boxclass_ = boxclass;
};
rhizo.inherits(rhizo.ui.component.RightBar, rhizo.ui.component.Container);

rhizo.ui.component.RightBar.prototype.renderContainer = function() {
  this.toggle_ = $('<div />', {'class': 'rhizo-right-pop'}).html('&#x25c2;');
  this.rightBar_ = $('<div />', {'class': this.boxclass_}).
      css('display', 'none');
  this.activateToggle_();
  return [this.rightBar_.get(0), this.toggle_.get(0)];
};

rhizo.ui.component.RightBar.prototype.renderSingleComponent = function(
    component) {
  var title = component.title();
  if (title) {
    var titleClass = 'rhizo-section-header';
    if (component.titleClass()) {
      titleClass += ' ' + component.titleClass();
    }
    var titleEl = $('<div />', {'class': titleClass}).
      text(title).
      appendTo(this.rightBar_);
  }
  this.rightBar_.append(component.render());  
  return null;  // rendering has been appended to the rightBar directly.
};

/**
 * Activates the controls that toggles the collapsed status of the box.
 * @private
 */
rhizo.ui.component.RightBar.prototype.activateToggle_ = function() {
  this.toggle_.click(jQuery.proxy(function() {
    if (this.rightBar_.is(":visible")) {
      this.toggle_.css('right', 0).html('&#x25c2;');
      this.gui_.viewport.css('right', 5);
      this.rightBar_.css('display', 'none');
    } else {
      this.gui_.viewport.css('right', 135);
      this.toggle_.css('right', 130).html('&#x25b8;');
      this.rightBar_.css('display', '');
    }
  }, this));
};

/**
 * @return {*} The jQuery object pointing to the control that toggles the
 *     collapsed status of the box.
 */
rhizo.ui.component.RightBar.prototype.getToggle = function() {
  return this.toggle_;
};

/**
 * @return {boolean} Whether the box is currently in its collapsed status or
 *     not.
 */
rhizo.ui.component.RightBar.prototype.isCollapsed = function() {
  return this.rightBar_.is(':visible');
};


/**
 * An horizontal bar that cointains links to activate other components, which
 * will be displayed as floating panels above the links bar.
 * 
 * @param {rhizo.Project} project The project this box belongs to.
 * @param {*} options Project-wide configuration options
 * @param {?string} opt_key Optional key the box will use to register
 *     itself with the project GUI.
 * @param {string} boxclass The CSS class assigned to the box.
 * @constructor
 */
rhizo.ui.component.HBox = function(project, options, opt_key, boxclass) {
  rhizo.ui.component.Container.call(this, project, options, opt_key, boxclass);
  this.toggles_ = [];
  this.boxclass_ = boxclass;
};
rhizo.inherits(rhizo.ui.component.HBox, rhizo.ui.component.Container);

rhizo.ui.component.HBox.prototype.renderContainer = function() {
  this.bar_ = $('<div />', {'class': this.boxclass_});
  return this.bar_.get(0);
};

rhizo.ui.component.HBox.prototype.renderSingleComponent = function(
    component, opt_position) {
  var toggle = {
    component: component,
    key: component.key(),
    clickable: this.renderClickable_(component.title(),
                                     component.titleClass()),
    renderings: component.render()
  };
  this.toggles_.push(toggle);  
  if (opt_position) {
    if (opt_position > 0) {
      toggle.clickable.insertAfter(
        this.bar_.find('.rhizo-section-header:eq(' + (opt_position-1) + ')'));
    } else {  // opt_position == 0
      this.bar_.prepend(toggle.clickable);
    }
  } else {
    this.bar_.append(toggle.clickable);    
  }
  $(toggle.renderings).addClass('rhizo-floating-panel').css('display', 'none');
  this.activateToggle_(toggle);
  return $(toggle.renderings).get();
};

/**
 * Renders a single clickable link in the links bar.
 * 
 * @param {string} title The link label.
 * @param {?string} opt_className Optional CSS class to assign to the link.
 * @return {*} jQuery object pointing to the clickable link.
 * @private
 */
rhizo.ui.component.HBox.prototype.renderClickable_ = function(title, 
                                                              opt_className) {
  var titleClass = 'rhizo-section-header';
  if (opt_className) {
    titleClass += ' ' + opt_className;
  }
  var div = $('<div />', {'class': titleClass}).appendTo(this.bar_);
  $('<a />', {href: 'javascript:;', title: title}).
      text(title).
      appendTo(div);
  return div;
};

/**
 * Enables the toggling of a component. When a component is toggled, by clicking
 * the correspondent link in the links bar, any other open component is closed,
 * so that only one component at a time is always visible.
 * 
 * @param {*} The object describing the toggle-able component.
 * @private
 */
rhizo.ui.component.HBox.prototype.activateToggle_ = function(curToggle) {
  curToggle.clickable.click(jQuery.proxy(function() {
    jQuery.each(this.toggles_, jQuery.proxy(function(j, toggle) {
      if (toggle == curToggle) {
        $(toggle.renderings).toggle();
        $(toggle.clickable).toggleClass('rhizo-section-open');
      } else {
        $(toggle.renderings).css('display', 'none');
        $(toggle.clickable).removeClass('rhizo-section-open');
      }
      if (this.phase() == rhizo.ui.component.Phase.READY)  {
        toggle.component.onEvent(
            $(toggle.clickable).hasClass('rhizo-section-open') ?
              rhizo.ui.component.EventType.ACTIVATE :
              rhizo.ui.component.EventType.DEACTIVATE);
      }
    }, this));
  }, this));
};

/**
 * Toggles the visibility of the component identified by the given key.
 * 
 * @param {string} key The key of the component to toggle.
 * @param {boolean} active Whether the component should be activated (made
 *     visible) or deactivated.
 */
rhizo.ui.component.HBox.prototype.toggleComponent = function(key,
                                                             active) {
  for (var i = 0; i < this.toggles_.length; i++) {
    if (this.toggles_[i].key == key) {
      var currentActive = this.toggles_[i].clickable.
          hasClass('rhizo-section-open');
      if (currentActive != active) {
        this.toggles_[i].clickable.click();
      }
      break;
    }
  }
};


/* ==== Viewport ==== */

/**
 * The Viewport is the core of the visualization, where all models renderings
 * are displayed and laid out.
 *
 * @param {rhizo.Project} project The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @constructor
 */
rhizo.ui.component.Viewport = function(project, options) {
  rhizo.ui.component.Component.call(this, project, options);
  this.universeTargetPosition_ = {top: 0, left: 0};
};
rhizo.inherits(rhizo.ui.component.Viewport, rhizo.ui.component.Component);

rhizo.ui.component.Viewport.prototype.render = function() {
  this.viewport_ = $('<div/>', {'class': 'rhizo-viewport'});
  this.universe_ = $('<div/>', {'class': 'rhizo-universe'}).
      appendTo(this.viewport_);

  // Update the GUI object.
  this.gui_.setViewport(this.viewport_);
  this.gui_.setUniverse(this.universe_);

  return this.viewport_.get(0);
};

rhizo.ui.component.Viewport.prototype.ready = function() {
  this.viewport_.draggable({
    cancel: '.rhizo-model',
    helper: jQuery.proxy(function() {
      return $("<div />").appendTo(this.viewport_);
    }, this),
    start: jQuery.proxy(function(ev, ui) {
      var position = this.universe_.position();
      this.universe_.data("top0", position.top).data("left0", position.left);
    }, this),
    drag: jQuery.proxy(function(ev, ui) {
      // Computes where to reposition the universe pane from the delta movement
      // of the drag helper.
      //
      // - gui.universe.data({top0, left0}) points to the relative position of
      //   the universe (in respect to the viewport) at the start of the drag
      //   movement.
      // - ui.position.{top,left} points to the relative position of the drag
      //   helper (in respect to the viewport) at the current instant.
      var dragTop = ui.position.top + this.universe_.data("top0");
      var dragLeft = ui.position.left + this.universe_.data("left0");

      var snapDistance = 15;
      if (Math.abs(ui.position.left) <= snapDistance) {
        dragLeft = this.universe_.data("left0");
      }
      if (Math.abs(dragLeft) <= 15) {
        dragLeft = 0;
      }

      this.moveUniverse_({top: dragTop, left: dragLeft});
    }, this),
    refreshPositions: false
  });

  // Mousewheel (or trackpad) based panning.
  if ($.support.mouseWheel) {
    this.viewport_.mousewheel(jQuery.proxy(function (evt, deltaX, deltaY) {
        this.panUniverse_(deltaX, deltaY);
    }, this));
  }
};

/**
 * Moves the universe relatively to the viewport.
 * 
 * @param {*} position An object exposing the 'top' and 'left' properties (both
 *     numbers) that define where the universe should be moved to. The
 *     coordinates define the position of the universe top-left corner with
 *     respect to the viewport top-left corner.
 * @private
 */
rhizo.ui.component.Viewport.prototype.moveUniverse_ = function(position) {
  this.universeTargetPosition_ = {top: position.top, left: position.left};
  this.universe_.stop().css(this.universeTargetPosition_);
};

/**
 * Pans the universe with a smooth scrolling along the requested direction(s).
 * @param {number} deltaX {-1,0,+1} to define that the universe was respectively
 *     panned right, not panned horizontally or panned left.
 * @param {number} deltaY {-1,0,+1} to define that the universe was respectively
 *     panned down, not panned vertically or panned up.
 * @private
 */
rhizo.ui.component.Viewport.prototype.panUniverse_ = function(deltaX,
                                                              deltaY) {
  var scale = Math.round(this.viewport_.get(0).offsetHeight / 10);
  this.universeTargetPosition_ = {
    top: deltaY*scale + this.universeTargetPosition_.top,
    left: deltaX*scale + this.universeTargetPosition_.left
  };
  this.universe_.stop().animate(this.universeTargetPosition_);
};


/* ==== Component specializations ==== */

/**
 * The visualization logo.
 * @param {rhizo.Project} project The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @param {boolean} titleless Whether this component should have a title or not.
 * @param {boolean} sliding Whether the link section should be hidden by default
 *     and slide into view only when requested.
 * @constructor
 */
rhizo.ui.component.Logo = function(project, options, titleless, sliding) {
  rhizo.ui.component.Component.call(this, project, options, 'rhizo.ui.component.Logo');
  this.titleless_ = titleless;
  this.sliding_ = sliding;
};
rhizo.inherits(rhizo.ui.component.Logo, rhizo.ui.component.Component);

rhizo.ui.component.Logo.prototype.title = function() {
  return this.titleless_ ? null : '?';
};

rhizo.ui.component.Logo.prototype.render = function() {
  var panel = $('<div />', {'class': 'rhizo-logo'});
  var header = $('<h1>Rhizosphere</h1>').appendTo(panel);
  var links = $('<p />').appendTo(panel);

  links.append(
      $('<a />', {
        'href': 'http://www.rhizospherejs.com/doc',
        'target': '_blank'}).
          text('Help'));

  links.append('&nbsp;').append(
      $('<a />', {
        'href': 'http://sites.google.com/site/rhizosphereui/',
        'target': '_blank'}).
          text('Project Info'));

  links.append('&nbsp;').append(
      $('<a />', {
        'href': 'http://rhizosphere.googlecode.com/hg/AUTHORS.txt',
        'target': '_blank'}).
          text('Authors'));

  links.append('&nbsp;').append(
      $('<a />', {
        'href': 'http://rhizosphere.googlecode.com/hg/COPYING.txt',
        'target': '_blank'}).
          text('License'));

  if (this.sliding_) {
    header.click(function() {
      links.slideToggle('fast');
    });
  }

  return panel.get(0);
};


/**
 * A logging console that collects messages and notifications.
 * @param {rhizo.Project} project The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @constructor
 */
rhizo.ui.component.Console = function(project, options) {
  rhizo.ui.component.Component.call(this, project, options,
                                    'rhizo.ui.component.Console');
};
rhizo.inherits(rhizo.ui.component.Console, rhizo.ui.component.Component);

rhizo.ui.component.Console.prototype.render = function() {
  this.toggleButton_ = $('<div />', {'class': 'rhizo-console-close'}).
      html('&#8659;');

  this.consoleHeader_ = $('<div />', {'class': 'rhizo-console-header'});
  this.consoleHeader_.append(this.toggleButton_).append('Log Console');

  this.consoleContents_ = $('<div />', {'class': 'rhizo-console-contents'});

  this.activate_();
  return [this.consoleHeader_.get(0), this.consoleContents_.get(0)];
};

/**
 * @private
 */
rhizo.ui.component.Console.prototype.activate_ = function() {
  this.toggleButton_.click(jQuery.proxy(function() {
    if (this.consoleContents_.is(":visible")) {
      this.consoleContents_.slideUp("slow", jQuery.proxy(function() {
        this.toggleButton_.html("&#8659;");
        this.consoleContents_.empty();
      }, this));
    } else {
      this.consoleContents_.slideDown("slow", jQuery.proxy(function() {
        this.toggleButton_.html("&#8657;");
      }, this));
    }
  }, this));
};

/**
 * @return {*} The jQuery object pointing to the element containing all the
 *     console messages accumulated so far.
 */
rhizo.ui.component.Console.prototype.getContents = function() {
  return this.consoleContents_;
};


/**
 * @return {*} The jQuery object pointing to the console header.
 */
rhizo.ui.component.Console.prototype.getHeader = function() {
  return this.consoleHeader_;
};


/**
 * The layout selector component.
 * @param {rhizo.Project} project The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @constructor
 */
rhizo.ui.component.Layout = function(project, options) {
  rhizo.ui.component.Component.call(this, project, options,
                                    'rhizo.ui.component.Layout');
};
rhizo.inherits(rhizo.ui.component.Layout, rhizo.ui.component.Component);

rhizo.ui.component.Layout.prototype.title = function() {
  return 'Display';
};

rhizo.ui.component.Layout.prototype.render = function() {
  this.layoutPanel_ = $('<div />');
  this.layoutOptions_ = $('<div />', {'class': 'rhizo-layout-extra-options'}).
      appendTo(this.layoutPanel_);

  this.layoutSelector_ = $("<select />", {disabled: 'disabled'});
  this.layoutSelector_.append($("<option value=''>No layout engines</option>"));

  this.submit_ = $('<button />', {disabled: 'disabled'}).text('Update');
  this.layoutPanel_.prepend(this.submit_).
      prepend(this.layoutSelector_).
      prepend("Keep items ordered by: ");

  return this.layoutPanel_.get(0);
};

rhizo.ui.component.Layout.prototype.metaReady = function() {
  this.layoutSelector_.children().remove();
  var layoutControlsMap = {};
  var layoutEngines = this.project_.layoutEngines();
  for (var layoutEngineName in layoutEngines) {
    var layoutEngine = layoutEngines[layoutEngineName];
    this.layoutSelector_.append(
      $("<option value='" + layoutEngineName + "' " +
        (this.project_.currentLayoutEngineName() == layoutEngineName ?
             "selected" : "") +
        ">" + layoutEngine  + "</option>"));
    if (layoutEngine.layoutUIControls) {
      var layoutControls = layoutEngine.layoutUIControls();
      layoutControlsMap[layoutEngineName] = $(layoutControls);
      if (this.project_.currentLayoutEngineName() != layoutEngineName) {
        layoutControls.css("display","none");
      }
      this.layoutOptions_.append(layoutControls);
    }
  }

  this.layoutSelector_.removeAttr('disabled').change(function(ev) {
    for (var layout in layoutControlsMap) {
      if (layout == $(this).val()) {
        layoutControlsMap[layout].show("fast");
      } else {
        layoutControlsMap[layout].hide("fast");
      }
    }
  });
};

rhizo.ui.component.Layout.prototype.ready = function() {
  this.submit_.removeAttr('disabled').click(jQuery.proxy(function() {
    // TODO(battlehorse): forcealign should be true only if there are
    // uncommitted filters (i.e. GREY models).
    this.project_.layout(this.layoutSelector_.val(), null, {forcealign:true});
  }, this));
};

/**
 * Selects the given layout engine.
 * @param {string} layoutEngineName The name of the layout engine to select.
 */
rhizo.ui.component.Layout.prototype.setEngine = function(layoutEngineName) {
  this.layoutSelector_.val(layoutEngineName).change();
};


/**
 * Handles selections and selection-based filtering.
 * @param {rhizo.Project} project The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @constructor
 */
rhizo.ui.component.SelectionManager = function(project, options) {
  rhizo.ui.component.Component.call(this, project, options,
                                    'rhizo.ui.component.SelectionManager');
};
rhizo.inherits(rhizo.ui.component.SelectionManager,
               rhizo.ui.component.Component);

rhizo.ui.component.SelectionManager.prototype.title = function() {
  return 'Selection';
};

rhizo.ui.component.SelectionManager.prototype.onEvent = function(evt) {
  var isActive = evt == rhizo.ui.component.EventType.ACTIVATE;
  if (this.gui_.isSelectionModeOn() != isActive) {
    // Selection mode is not enabled, but the selection panel is active,
    // or viceversa.
    this.gui_.toggleSelectionMode();
  }
};

rhizo.ui.component.SelectionManager.prototype.render = function() {
  var selectionPanel = $('<div />', {'class': 'rhizo-selection'});

  this.selection_trigger_ = $('<div />', {
      'class': 'rhizo-selection-trigger',
      'title': 'Start selecting items'}).appendTo(this.gui_.viewport);

  this.selectButton_ = $('<button />', {disabled: 'disabled'}).
      text('Work on selected items only');
  this.resetButton_ = $('<button />', {disabled: 'disabled'}).text('Reset');
  selectionPanel.append(this.selectButton_).append(this.resetButton_);

  return selectionPanel.get(0);
};

rhizo.ui.component.SelectionManager.prototype.ready = function() {
  this.activateSelectableViewport_();
  this.activateButtons_();
};

/**
 * @private
 */
rhizo.ui.component.SelectionManager.prototype.activateButtons_ = function() {
  this.selectButton_.removeAttr('disabled').click(jQuery.proxy(function() {
    var countFiltered =  this.project_.filterUnselected();
    this.setNumFilteredModels(countFiltered);
  }, this));


  // Reset button remains disabled until the first selection is performed.
  this.resetButton_.click(jQuery.proxy(function() {
    this.project_.resetUnselected();
    this.setNumFilteredModels(0);
  }, this));
};

/**
 * Checks whether an event was raised on empty space, i.e. somewhere in the
 * viewport, but not on top of any models or any other elements.
 *
 * Since the viewport and the universe may be not on top of each other, the
 * method checks whether any of the two is the original target of the event.
 *
 * @param {Event} evt the event to inspect.
 * @returns {boolean} true if the click occurred on the viewport, false
 *   otherwise.
 * @private
 */
rhizo.ui.component.SelectionManager.prototype.isOnEmptySpace_ = function(evt) {
  return $(evt.target).hasClass('rhizo-viewport') ||
         $(evt.target).hasClass('rhizo-universe');
};

/**
 * @private
 */
rhizo.ui.component.SelectionManager.prototype.activateSelectableViewport_ =
    function() {
  var project = this.project_;
  this.selection_trigger_.click(function() {
    project.gui().toggleSelectionMode();
  });

  this.gui_.viewport.selectable({
    disabled: true,  // initially disabled.
    selected: function(ev, ui) {
      var selected_id = $(ui.selected).data("id");
      if (selected_id) {
        project.select(selected_id);
      }
    },
    unselected: function(ev, ui) {
      var unselected_id = $(ui.unselected).data("id");
      if (unselected_id) {
        project.unselect(unselected_id);
      }
    },
    // TODO: disabled until incremental refresh() is implemented
    // autoRefresh: false,
    filter: this.options_.selectfilter,
    tolerance: 'touch',
    distance: 1
  });

  this.gui_.viewport.click(jQuery.proxy(function(ev, ui) {
    if (this.isOnEmptySpace_(ev)) {
      project.unselectAll();
    }
  }, this));
};

/**
 * Toggles the title of the selection trigger depending on the status of the
 * viewport.
 * 
 * @param {boolean} selectionModeOn Whether the viewport is currently in
 *     selection mode or not.
 */
rhizo.ui.component.SelectionManager.prototype.toggleSelectionTrigger =
    function(selectionModeOn) {
 this.selection_trigger_.attr(
     'title',
     selectionModeOn ? 'Stop selecting items' : 'Start selecting items');
};

/**
 * Sets the number of models that have been filtered out via selections.
 * @param {number} numFilteredModels The number of models that are currently
 *     filtered because of selection choices.
 */
rhizo.ui.component.SelectionManager.prototype.setNumFilteredModels =
    function(numFilteredModels) {
  if (numFilteredModels > 0) {
    this.resetButton_.
        removeAttr("disabled").
        text("Reset (" + numFilteredModels + " filtered)");
  } else {
    this.resetButton_.attr('disabled', 'disabled').text('Reset');
  }
};


/**
 * A panel that enables/disables filters autocommit functionality.
 * 
 * @param {rhizo.Project} project The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @constructor
 */
rhizo.ui.component.AutocommitPanel = function(project, options) {
  rhizo.ui.component.Component.call(this, project, options,
                                    'rhizo.ui.component.AutocommitPanel');
  this.callback_ = null;
};
rhizo.inherits(rhizo.ui.component.AutocommitPanel,
               rhizo.ui.component.Component);

/**
 * Registers a callback to be invoked anytime the autocommit setting is toggled.
 * @param {function(boolean)} callback The callback to invoke. It receives one
 *     parameter that defines whether autocommit is enabled or not.
 */
rhizo.ui.component.AutocommitPanel.prototype.registerCallback = function(
    callback) {
  this.callback_ = callback;
};

rhizo.ui.component.AutocommitPanel.prototype.render = function() {
  var autocommitPanel =
      $('<div />', {'class': 'rhizo-filter rhizo-autocommit-panel'});
  this.autocommit_ =
      $('<input />', {type: 'checkbox',
                      checked: this.project_.isFilterAutocommit(),
                      disabled: 'disabled'}).
      appendTo(autocommitPanel);
  this.autocommitLabel_ =
      $('<span>Autocommit</span>').appendTo(autocommitPanel);
  this.hideButton_ =
      $('<button />', {disabled: 'disabled'}).
      text('Apply filters').
      appendTo(autocommitPanel);
  return autocommitPanel;
};

rhizo.ui.component.AutocommitPanel.prototype.ready = function() {
  this.autocommit_.removeAttr('disabled').click(jQuery.proxy(function(ev) {
    this.setAutocommit_(this.autocommit_.is(':checked'));
  }, this));

  this.autocommitLabel_.click(jQuery.proxy(function() {
    // Can't delegate the click directly to the checkbox, because the event
    // handler is triggered _before_ the checkbox state changes.
    if (this.autocommit_.is(':checked')) {
      this.autocommit_.removeAttr('checked');
      this.setAutocommit_(false);
    } else {
      this.autocommit_.attr('checked', 'checked');
      this.setAutocommit_(true);
    }
  }, this));

  this.hideButton_.
      attr('disabled', this.project_.isFilterAutocommit()).
      click(jQuery.proxy(function() {
        this.project_.commitFilter();
  }, this));
};

/**
 * Callback invoked whenever the autocommit status changes.
 * @param {boolean} autocommit Whether to enable autocommit or not.
 * @private
 */
rhizo.ui.component.AutocommitPanel.prototype.setAutocommit_ = function(
    autocommit) {
  if (autocommit) {
    this.hideButton_.attr('disabled', 'disabled');
  } else {
    this.hideButton_.removeAttr('disabled');
  }
  if (this.callback_) {
    this.callback_(autocommit);
  }
  this.project_.enableFilterAutocommit(autocommit);
};


/**
 * Renders a series of filters as a stack, with all filters showing one on
 * top of the other.
 * @param {rhizo.Project} project The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @constructor
 */
rhizo.ui.component.FilterStackContainer = function(project, options) {
  rhizo.ui.component.Component.call(this, project, options,
                                    'rhizo.ui.component.FilterStackContainer');
  this.autocommitPanel_ = new rhizo.ui.component.AutocommitPanel(project,
                                                                 options);

  /**
   * Number of metaModel keys that will trigger filter selection (instead of
   * just showing all the available filters).
   * @type {number}
   * @private
   */
  this.filterSelectorThreshold_ = 5;

  /**
   * Defines which filters are currently visible. This set is only meaningful
   * when filter selection is active, otherwise all filters are always visible.
   * @type {Object.<string, boolean>}
   * @private
   */
  this.activeFilters_ = {};
};
rhizo.inherits(rhizo.ui.component.FilterStackContainer,
               rhizo.ui.component.Component);

rhizo.ui.component.FilterStackContainer.prototype.title = function() {
  return 'Filters';
};

rhizo.ui.component.FilterStackContainer.prototype.render = function() {
  this.filterPanel_ = $('<div />', {'class': 'rhizo-filter-container'});
  this.filterPanel_.append(this.autocommitPanel_.render());

  this.noFilterNotice_ = $('<p />').text('No filters available.');
  this.filterPanel_.append(this.noFilterNotice_);

  return this.filterPanel_.get(0);
};

rhizo.ui.component.FilterStackContainer.prototype.metaReady = function() {
  var metaModel = this.project_.metaModel();
  var filtersNum = 0;
  for (var key in metaModel) {
    filtersNum++;
  }

  if (filtersNum > 0) {
    this.noFilterNotice_.remove();
  }

  if (filtersNum <= this.filterSelectorThreshold_) {
    for (key in metaModel) {
      var filter = metaModel[key].kind.renderFilter(this.project_,
                                                    metaModel[key],
                                                    key);
      this.filterPanel_.append(filter);
    }
  } else {
    this.renderFilterSelector_();
  }
};

/**
 * Renders the filter selector, and an initial selection of filters up to
 * the selector threshold.
 * @private
 */
rhizo.ui.component.FilterStackContainer.prototype.renderFilterSelector_ =
    function() {
  var metaModel = this.project_.metaModel();
  this.filterSelector_ = $('<select />',
                           {'class': 'rhizo-filter-selector',
                            disabled: 'disabled'});
  $('<option />').attr('value', '').text('More filters...').
      appendTo(this.filterSelector_);
  for (var key in metaModel) {
    var option = $('<option />').attr('value', key).text(metaModel[key].label);
    this.filterSelector_.append(option);
  }
  this.filterPanel_.append(this.filterSelector_);
  var visibleFilterCount = 0;
  for (key in metaModel) {
    this.activateFilter_(key);
    if (++visibleFilterCount == this.filterSelectorThreshold_) {
      break;
    }
  }
};

rhizo.ui.component.FilterStackContainer.prototype.ready = function() {
  // Every single filter implementation auto-activates itself when created.
  // Here we only need to activate the navigation between filters.
  //
  // TODO(battlehorse): Extend filters so that they can be properly
  // disabled/enabled when needed.
  this.autocommitPanel_.ready();
  if (this.filterSelector_) {
    this.activateFilterSelector_();
  }
};

/**
 * @private
 */
rhizo.ui.component.FilterStackContainer.prototype.activateFilterSelector_ =
    function() {
  this.filterSelector_.removeAttr('disabled').change(jQuery.proxy(function() {
    var key = this.filterSelector_.val();
    if (!(key in this.project_.metaModel())) {
      return;
    }
    this.activateFilter_(key, this.project_);

    // re-select the first (default) option.
    this.filterSelector_.find('option').eq(0).attr('selected', 'selected');
  }, this));
};

/**
 * @param {string} key
 * @private
 */
rhizo.ui.component.FilterStackContainer.prototype.activateFilter_ =
    function(key) {
  var metaModel = this.project_.metaModel();
  var filter = metaModel[key].kind.renderFilter(this.project_, 
                                                metaModel[key],
                                                key);
  this.activeFilters_[key] = true;
  var filterCloseIcon =
      $('<div />', {'class': 'rhizo-icon rhizo-close-icon'}).
          text('x').
          prependTo(filter);
  filterCloseIcon.click(jQuery.proxy(function() {
    // remove the filter
    filter.remove();
    delete this.activeFilters_[key];

    // re-align the visualization.
    this.project_.filter(key, null);

    // re-enable the filter among the selectable ones.
    this.filterSelector_.
        find('option[value=' + rhizo.util.escapeSelectorToken(key) + ']').
        removeAttr('disabled');
  }, this));

  filter.appendTo(this.filterPanel_);
  this.filterSelector_.
      find('option[value=' + rhizo.util.escapeSelectorToken(key) + ']').
      attr('disabled', 'disabled');
};

/**
 * Checks whether the given filter is active (i.e., its UI is showing).
 * @param {string} key The metamodel key of the filter to inspect.
 * @return {boolean} Whether the filter is active (its UI is showing) or not.
 */
rhizo.ui.component.FilterStackContainer.prototype.isFilterActive =
    function(key) {
  if (!this.filterSelector_) {
    return true;
  }
  return key in this.activeFilters_;
};

/**
 * Ensures that the UI for the given filter key is visible to the user. This is
 * only relevant when filter selection is active, otherwise all filters are
 * always visible.
 * @param {string} key The metamodel key of the filter to show.
 */
rhizo.ui.component.FilterStackContainer.prototype.showFilter = function(key) {
  if (!this.filterSelector_) {
    // The filter selector is not in use. This means that all filters are
    // always visible.
    return;
  }
  if (!(key in this.activeFilters_)) {
    this.activateFilter_(key);
  }
};


/**
 * Renders a series of filters as a 'book', with only filter showing at any
 * time, and additional controls to flip between one filter and the next.
 * 
 * @param {rhizo.Project} project The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @constructor
 */
rhizo.ui.component.FilterBookContainer = function(project, options) {
  rhizo.ui.component.Component.call(this, project, options,
                                    'rhizo.ui.component.FilterBookContainer');
  this.autocommitPanel_ = new rhizo.ui.component.AutocommitPanel(project,
                                                                 options);
};
rhizo.inherits(rhizo.ui.component.FilterBookContainer,
               rhizo.ui.component.Component);

rhizo.ui.component.FilterBookContainer.prototype.title = function() {
  return 'Filters';
};

rhizo.ui.component.FilterBookContainer.prototype.render = function() {
  this.filterPanel_ = $('<div />', {'class': 'rhizo-filter-container'});

  this.nextFilter_ =
      $('<div />', {'class': 'rhizo-next-filter', title: 'Next filter'}).
      text('>').
      appendTo(this.filterPanel_);
  this.prevFilter_ =
      $('<div />', {'class': 'rhizo-prev-filter', title: 'Previous filter'}).
      text('<').
      appendTo(this.filterPanel_);
  this.commitFilterLink_ =
      $('<a />', {'href': 'javascript:;', 'class': 'rhizo-autocommit-link'}).
      text('Apply').
      appendTo(this.filterPanel_);

  this.filterPanel_.append(this.autocommitPanel_.render());
  return this.filterPanel_.get(0);
};

rhizo.ui.component.FilterBookContainer.prototype.metaReady = function() {
  if (this.project_.isFilterAutocommit()) {
    this.commitFilterLink_.css('display', 'none');
  }
  this.autocommitPanel_.registerCallback(jQuery.proxy(function(isAutocommit) {
    this.commitFilterLink_.css('display', isAutocommit ? 'none' : '');
  }, this));

  var metaModel = this.project_.metaModel();
  for (var key in metaModel) {
    var filter = metaModel[key].kind.renderFilter(this.project_,
                                                  metaModel[key],
                                                  key);
    filter.css('display', 'none');
    this.filterPanel_.append(filter);
  }
};

rhizo.ui.component.FilterBookContainer.prototype.ready = function() {
  this.autocommitPanel_.ready();
  this.commitFilterLink_.click(jQuery.proxy(function() {
    this.project_.commitFilter();
  }, this));

  // Every single filter implementation auto-activates itself when created.
  // Here we only need to activate the navigation between filters.
  var gui = this.gui_;
  this.nextFilter_.click(function() {
    var current = $('.rhizo-filter:visible', gui.container);
    var next = current.next('.rhizo-filter:hidden').eq(0);
    if (next.length > 0) {
      // cannot use hide/show otherwise safari clips rendering
      current.css('display', 'none');
      next.css('display', '');
    }
  });

  this.prevFilter_.click(function() {
    var current = $('.rhizo-filter:visible', gui.container);
    var prev = current.prev('.rhizo-filter:hidden').eq(0);
    if (prev.length > 0) {
      // cannot use hide/show otherwise safari clips rendering
      current.css('display', 'none');
      prev.css('display', '');
    }
  });
};


/**
 * A legend to describes model color and size coding.
 * @param {rhizo.Project} project The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @constructor
 */
rhizo.ui.component.Legend = function(project, options) {
  rhizo.ui.component.Component.call(this, project, options,
                                    'rhizo.ui.component.Legend');
  this.legendPanel_ = null;
};
rhizo.inherits(rhizo.ui.component.Legend, rhizo.ui.component.Component);

rhizo.ui.component.Legend.prototype.title = function() {
  return 'Legend';
};

rhizo.ui.component.Legend.prototype.render = function() {
  this.legendPanel_ = $('<div />', {'class': "rhizo-legend-panel"});
  $('<p />').text('Legend is not available yet.').appendTo(this.legendPanel_);
  return this.legendPanel_.get(0);
};

rhizo.ui.component.Legend.prototype.metaReady = function() {
  // Currently only works in tandem with rhizo.autorender.AR
  if (!this.project_.renderer().getSizeRange &&
      !this.project_.renderer().getColorRange) {
    return;
  }
  this.legendPanel_.children().remove();

  var sizeRange = null;
  if (this.project_.renderer().getSizeRange) {
    sizeRange = this.project_.renderer().getSizeRange();
  }
  var colorRange = null;
  if (this.project_.renderer().getColorRange) {
    colorRange = this.project_.renderer().getColorRange();
  }

  if (sizeRange) {
    var panel = $('<div />', {'class': 'rhizo-legend-size'});
    var minLabel = $('<span />', {'class': 'rhizo-legend-size-min'}).html(
        sizeRange.label + ' &nbsp; ' + rhizo.ui.toHumanLabel(sizeRange.min) + ':');
    var maxLabel = $('<span />', {'class': 'rhizo-legend-size-max'}).html(
        ': ' + rhizo.ui.toHumanLabel(sizeRange.max));

    panel.append(minLabel).append(
        '<span class="ar-fon-0">A</span> -- ' +
        '<span class="ar-fon-5">A</span>').
        append(maxLabel).appendTo(this.legendPanel_);
  }

  if (colorRange) {
    var panel = $('<div />', {'class': 'rhizo-legend-color'});
    var minLabel = $('<span />', {'class': 'rhizo-legend-color-min'}).html(
        colorRange.label + ' &nbsp; ' + rhizo.ui.toHumanLabel(colorRange.min) + ':');
    var maxLabel = $('<span />', {'class': 'rhizo-legend-color-max'}).html(
        ': ' + rhizo.ui.toHumanLabel(colorRange.max));

    panel.append(minLabel).append(
        '<span class="ar-col-0 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;' +
        '<span class="ar-col-1 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;' +
        '<span class="ar-col-2 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;' +
        '<span class="ar-col-3 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;' +
        '<span class="ar-col-4 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;' +
        '<span class="ar-col-5 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;').
        append(maxLabel).appendTo(this.legendPanel_);
  }
};


/**
 * Experimental component to handle user-specified actions on models.
 * @param {rhizo.Project} project The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @constructor
 */
rhizo.ui.component.Actions = function(project, options) {
  rhizo.ui.component.Component.call(this, project, options);
};
rhizo.inherits(rhizo.ui.component.Actions, rhizo.ui.component.Component);

rhizo.ui.component.Actions.prototype.title = function() {
  return 'Actions';
};

rhizo.ui.component.Actions.prototype.render = function() {
  var actionsContainer = $('<div />', {'class': 'rhizo-actions'});

  // Create 2 sample actions
  for (var i = 0; i < 2; i++) {
    $('<div />', {'class': 'rhizo-action'}).
        text('Sample Action ' + (i+1)).
        appendTo(actionsContainer);
  }
  return actionsContainer.get(0);
};

rhizo.ui.component.Actions.prototype.ready = function() {
  if ($('.rhizo-action', this.gui_.container).length > 0) {
    var gui = this.gui_;
    var project = this.project_;
    $('.rhizo-action', this.gui_.container).draggable({helper: 'clone'});
    this.gui_.universe.droppable({
      accept: '.rhizo-action',
      drop: function(ev, ui) {
        var offset = gui.universe.offset();
        var rightBorder = gui.universe.width();
        var bottomBorder = gui.universe.height();

        var actionName = ui.draggable.text();

        var left = ui.offset.left - offset.left;
        if ((left + 200) > rightBorder) {
          left = rightBorder - 210;
        }

        var top = ui.offset.top - offset.top;
        if ((top + 200) > bottomBorder) {
          top = bottomBorder - 210;
        }

        var dropbox = $("<div class='rhizo-droppable-action'>" +
                        "Drop your items here to perform:<br />" +
                        actionName  +"</div>").css({top: top, left: left});

        gui.universe.append(dropbox);
        dropbox.fadeIn();
        dropbox.draggable();
        dropbox.droppable({
          accept: '.rhizo-model',
          drop: function(ev, ui) {
            var id = ui.draggable.data("id");
            if (!project.isSelected(id)) {
              alert("Action applied on " + project.model(id));
              project.model(id).rendering().moveToMark().unmarkPosition();
            } else {
              var countSelected = 0;
              var all_selected = project.allSelected();
              for (var id in all_selected) { countSelected++;}
              alert("Action applied on " + countSelected + " elements");

              for (var id in all_selected) {
                all_selected[id].rendering().moveToMark().unmarkPosition();
              }
              project.unselectAll();
            }
          }
        });

        dropbox.dblclick(function() {
          dropbox.remove();
          return false;
        });
      }
    });
  }
};

/* ==== Templates ==== */


/**
 * Barebone template that only contains Rhizosphere viewport, used when all
 * interactive controls are defined externally and all Rhizosphere interactions
 * occur via programmatic API calls.
 *
 * @param {rhizo.Project} project The project this template belongs to.
 * @param {*} options Project-wide configuration options.
 * @param {?string} template_key A unique key that identifies the template.
 *     Generates a CSS class name that can be used for template-specific UI
 *     skinning.
 * @constructor
 */
rhizo.ui.component.BareTemplate = function(project, options, template_key) {
  rhizo.ui.component.Template.call(this, project, options, template_key);

};
rhizo.inherits(rhizo.ui.component.BareTemplate, rhizo.ui.component.Template);


/**
 * Template used when Rhizosphere is accessed via a mobile device, or when
 * the available screen estate is reduced (such as in gadgets). Collects all
 * the visualization controls in a links bar at the bottom of the screen.
 * 
 * @param {rhizo.Project} project The project this template belongs to.
 * @param {*} options Project-wide configuration options.
 * @param {?string} template_key A unique key that identifies the template.
 *     Generates a CSS class name that can be used for template-specific UI
 *     skinning.
 * @constructor
 */
rhizo.ui.component.BottomTemplate = function(project, options, template_key) {
  rhizo.ui.component.Template.call(this, project, options, template_key);
  this.initComponents_(project, options);
};
rhizo.inherits(rhizo.ui.component.BottomTemplate, rhizo.ui.component.Template);

rhizo.ui.component.BottomTemplate.prototype.initComponents_ = function(
    project, options) {
  this.hbox_ = new rhizo.ui.component.HBox(project, options,
      'rhizo.ui.component.BottomBar', 'rhizo-bottom-bar');

  var default_components = this.defaultComponents(project, options);
  for (var i = 0; i < default_components.length; i++) {
    this.hbox_.addComponent(default_components[i]);
  }

  rhizo.ui.component.Template.prototype.addComponent.call(this, this.hbox_);
};

/**
 * Returns the list of default template components. Subclasses can override.
 * @param {rhizo.Project} project The project this template belongs to.
 * @param {*} options Project-wide configuration options 
 * @return {Array.<rhizo.ui.component.Component>} The list of default
 *     components that will be part of the template.
 */
rhizo.ui.component.BottomTemplate.prototype.defaultComponents = function(
    project, options) {
  return [
      new rhizo.ui.component.Layout(project, options),
      new rhizo.ui.component.SelectionManager(project, options),
      new rhizo.ui.component.FilterBookContainer(project, options),
      new rhizo.ui.component.Logo(project, options, false, false)
  ];
};

/**
 * Overrides the default addComponent() implementation to explicitly assign
 * newly added components to the template bottom links bar.
 * 
 * @param {rhizo.ui.component.Component} component The component to add.
 */
rhizo.ui.component.BottomTemplate.prototype.addComponent = function(component) {
  this.addtoBottomBar(component);
  return null;
};

/**
 * Adds the component to the template's bottom controls bar.
 * 
 * @param {rhizo.ui.component.Component} component The component to add.
 */
rhizo.ui.component.BottomTemplate.prototype.addtoBottomBar = function(
    component) {
  // Keep the Logo always as the last component. Add new components just before
  // that.
  var renderings = this.hbox_.addComponent(component, -1);
  if (renderings) {
    this.gui_.container.append(renderings);
  }
};


/**
 * Default Rhizosphere UI template.
 * @param {rhizo.Project} project The project this template belongs to.
 * @param {*} options Project-wide configuration options
 * @param {?string} template_key A unique key that identifies the template.
 *     Generates a CSS class name that can be used for template-specific UI
 *     skinning.
 * @constructor
 */
rhizo.ui.component.StandardTemplate = function(project, options, template_key) {
  rhizo.ui.component.Template.call(this, project, options, template_key);
  this.initComponents_(project, options);
};
rhizo.inherits(rhizo.ui.component.StandardTemplate,
               rhizo.ui.component.Template);

rhizo.ui.component.StandardTemplate.prototype.initComponents_ = function(
    project, options) {
  this.leftbox_ = new rhizo.ui.component.VBox(project, options, /* key */ null,
                                              'rhizo-left');
  this.rightbox_ = new rhizo.ui.component.RightBar(
      project, options, 'rhizo.ui.component.RightBar', 'rhizo-right');

  var left_components = this.defaultLeftComponents(project, options);
  for (var i = 0; i < left_components.length; i++) {
    this.leftbox_.addComponent(left_components[i]);
  }

  var right_components = this.defaultRightComponents(project, options);
  for (var i = 0; i < right_components.length; i++) {
    this.rightbox_.addComponent(right_components[i]);
  }

  rhizo.ui.component.Template.prototype.addComponent.call(this, this.leftbox_);
  rhizo.ui.component.Template.prototype.addComponent.call(this, this.rightbox_);
};

/**
 * Returns the list of default template components that will be added to the
 * left bar. Subclasses can override.
 * @param {rhizo.Project} project The project this template belongs to.
 * @param {*} options Project-wide configuration options
 * @return {Array.<rhizo.ui.component.Component>} The list of default
 *     components that will be part of the template.
 */
rhizo.ui.component.StandardTemplate.prototype.defaultLeftComponents = function(
    project, options) {
  return [
      new rhizo.ui.component.Logo(project, options, true, true),
      new rhizo.ui.component.Layout(project, options),
      new rhizo.ui.component.SelectionManager(project, options),
      new rhizo.ui.component.FilterStackContainer(project, options)
  ];
};

/**
 * Returns the list of default template components that will be added to the
 * right bar. Subclasses can override.
 * @param {rhizo.Project} project The project this template belongs to.
 * @param {*} options Project-wide configuration options
 * @return {Array.<rhizo.ui.component.Component>} The list of default
 *     components that will be part of the template.
 */
rhizo.ui.component.StandardTemplate.prototype.defaultRightComponents =
    function(project, options) {
  return [
      new rhizo.ui.component.Console(project, options),
      new rhizo.ui.component.Actions(project, options)
  ];
};

/**
 * Overrides the default addComponent() implementation to explicitly assign
 * newly added components to the template left controls bar.
 * 
 * @param {rhizo.ui.component.Component} component The component to add.
 */
rhizo.ui.component.StandardTemplate.prototype.addComponent = function(
    component)  {
  this.addtoLeftBar(component);
  return null;
};

/**
 * Adds the component to the template's left controls bar.
 * 
 * @param {rhizo.ui.component.Component} component The component to add.
 */
rhizo.ui.component.StandardTemplate.prototype.addtoLeftBar = function(
    component) {
  var renderings = this.leftbox_.addComponent(component);
  if (renderings) {
    this.gui_.container.append(renderings);
  }
};

/**
 * Adds the component to the template's right controls bar.
 * 
 * @param {rhizo.ui.component.Component} component The component to add.
 */
rhizo.ui.component.StandardTemplate.prototype.addToRightBar = function(
    component) {
  var renderings = this.rightbox_.addComponent(component);
  if (renderings) {
    this.gui_.container.append(renderings);
  }
};


/**
 * Enumerates available template factories. A template factory is a function
 * that receives a rhizo.Project as input and returns a template instance.
 *
 * New templates can be registered by adding a factory to this enum.
 *
 * @enum {string} Enumeration of available template factories.
 */
rhizo.ui.component.templates = {
  'bare': function(project, options) {
    return new rhizo.ui.component.BareTemplate(
        project, options, 'bare');
  },
  'bottom': function(project, options) {
    return new rhizo.ui.component.BottomTemplate(
        project, options, 'bottom');
  },
  'default': function(project, options) {
    return new rhizo.ui.component.StandardTemplate(
        project, options, 'default');
  }
};
