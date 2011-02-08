/*
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

// RHIZODEP=rhizo.model.loader,rhizo.base,rhizo.ui.component,rhizo.jquery,rhizo.ui.gui
namespace('rhizo.bootstrap');


/**
 * Uuid counter to uniquely identify the container of each visualization within
 * the document.
 * @type {number}
 * @private
 */
rhizo.bootstrap.uuids_ = 0;


/**
 * A Bootstrap is the main entry point to start a Rhizosphere visualization.
 * It takes care of loading the data to visualize, create the chrome and other
 * ui elements for the visualization, and bind all the necessary event handlers.
 *
 * @param {HTMLElement} container The HTML element that will contain the
 *     visualization.
 * @param {*} opt_options Visualization-wide configuration options.
 * @param {?function(rhizo.Project)} opt_callback
 *     Optional callback invoked on the visualization is completely initialized.
 *     Receives the rhizo.Project managing the visualization as a parameter.
 * @constructor
 */
rhizo.bootstrap.Bootstrap = function(container, opt_options, opt_callback) {
  this.container_ = container;
  this.deployed_ = false;
  var containerId = $(container).attr('id');
  if (!containerId || containerId.length == 0) {
    // Generates a unique element id for the visualization container if one
    // isn't defined yet.
    // The generated id must be consistent over time (assuming the order of
    // bootstrap calls does not change over time when multiple visualizations
    // are present), since long-lived Rhizosphere state representations are
    // based on this.
    $(container).attr('id', 'rhizo-uuid-' + (rhizo.bootstrap.uuids_++));
  }
  this.options_ = { selectfilter: '.rhizo-model:visible',
                    enableHTML5History: true,
                    enableAnims: true};
  if (opt_options) {
    $.extend(this.options_, opt_options);
  }
  this.ready_callback_ = opt_callback;
};

/**
 * @return {boolean} Whether deployment of models has already occurred or not.
 */
rhizo.bootstrap.Bootstrap.prototype.isDeployed = function() {
  return this.deployed_;
};

/**
 * Performs all the necessary steps to prepare a Rhizosphere visualization, and
 * then tries loading the given datasource and display it.
 *
 * @param {string} opt_resource The URI of the datasource to load and visualize
 *     with Rhizosphere. If null and the bootstrapper is not allowed to
 *     configure itself from URL parameters, this method behaves like prepare().
 * @return {rhizo.Project} The visualization Project through which you can
 *     have programmatic access to the visualization.
 */
rhizo.bootstrap.Bootstrap.prototype.prepareAndDeploy = function(opt_resource) {
  var project = this.prepare();
  this.deploy(opt_resource);
  return project;
};

/**
 * Performs all the necessary steps to prepare a Rhizosphere visualization, up
 * to the point where it can receive the models to display.
 *
 * Use this method in conjunction with deploy() if you want to be in charge
 * of loading the actual models to visualize.
 *
 * @return {rhizo.Project} The visualization Project through which you can
 *     have programmatic access to the visualization.
 */
rhizo.bootstrap.Bootstrap.prototype.prepare = function() {
  // Initialize the GUI, project and template.
  this.gui_ = this.initGui_();
  this.project_ = new rhizo.Project(this.gui_, this.options_);
  this.template_ = this.initTemplate_(this.project_, this.gui_, this.options_);
  this.project_.chromeReady();
  return this.project_;
};

/**
 * Loads the data items to visualize from the given datasource URI and displays
 * them in the Rhizosphere visualization managed by this bootstrapper.
 * The boostrapper must have already been prepared before invoking this method.
 *
 * @param {string} opt_resource The URI of the datasource to load and visualize
 *     with Rhizosphere. If null, and the bootstrapper is allowed to configure
 *     itself from the URL parameters, it'll try to extract the datasource URI
 *     from the URL.
 */
rhizo.bootstrap.Bootstrap.prototype.deploy = function(opt_resource) {
  // Identify if we have to load a Rhizosphere datasource. Either we received
  // this information explicitly or we try finding it in the URL.
  var resource = opt_resource || this.tryInitResourceFromUrl_();

  if (resource) {
    rhizo.model.loader.load(resource,
                            jQuery.proxy(this.deployExplicit, this),
                            this.options_,
                            this.project_.logger());
  }
};

/**
 * Loads the data items to visualize via the given loader instance and displays
 * them in the Rhizosphere visualization managed by this bootstrapper.
 * The boostrapper must have already been prepared before invoking this method.
 *
 * @param {*} loader A model loader as defined in rhizo.model.loader.js
 */
rhizo.bootstrap.Bootstrap.prototype.deployWithLoader = function(loader) {
  loader.load(jQuery.proxy(this.deployExplicit, this),
              this.options_, this.project_.logger());
};

/**
 * Displays the given data items (models) in the Rhizosphere visualization
 * managed by this bootstrapper. The boostrapper must have already been
 * prepared before invoking this method.
 *
 * @param {*} metamodel A descriptor for the attributes and properties that
 *     each model in the visualization has.
 * @param {*} renderer A component capable of creating HTML representation of
 *     model instances.
 * @param {Array.<*>} models The list of data items to visualize.
 */
rhizo.bootstrap.Bootstrap.prototype.deployExplicit = function(metamodel,
                                                              renderer,
                                                              models) {
  this.project_.setMetaModel(metamodel);
  this.project_.setRenderer(renderer);

  if (renderer.getSizeRange || renderer.getColorRange) {
    this.template_.addComponent(new rhizo.ui.component.Legend(this.project_,
                                                              this.options_));
  }

  if (this.project_.metaReady()) {
    this.template_.metaReady();
    this.project_.deploy(models);
    this.template_.ready();
  }
  this.gui_.done();
  if (this.ready_callback_) {
    this.ready_callback_(this.project_);
  }
  this.deployed_ = true;
};

/**
 * Identify the platform and device we are running onto.
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.identifyPlatformAndDevice_ = function() {
  if (this.options_.platform && this.options_.device) {
    return {platform: this.options_.platform,
            device: this.options_.device};
  }
  var ua = navigator.userAgent;
  if (ua.toLowerCase().indexOf('ipad') != -1) {
    return {platform: 'mobile', device: 'ipad'};
  } else if (ua.toLowerCase().indexOf('iphone') != -1) {
    return {platform: 'mobile', device: 'iphone'};
  } else if (ua.toLowerCase().indexOf('android') != -1) {
    return {platform: 'mobile', 'device': 'android'};
  }
  return {platform: 'default', device: 'default'};
};

/**
 * Identifies the best template to use for the visualization.
 * @param {rhizo.ui.gui.GUI} gui
 * @param {*} options
 * @return {function(rhizo.Project):rhizo.ui.component.Template} A factory for
 *     the template to use.
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.identifyTemplate_ = function(gui, options) {
  if (options.template &&
      options.template in rhizo.ui.component.templates) {
    return rhizo.ui.component.templates[options.template];
  }

  // No specific template has been forced. Select a specific one based on
  // document size and target platform.
  if (gui.isMobile() || gui.isSmall()) {
    return rhizo.ui.component.templates['bottom'];
  }
  return rhizo.ui.component.templates['default'];
};

/**
 * Identifies the platform and device we are running upon and creates a GUI
 * for this project.
 * @return {rhizo.ui.gui.GUI} The project GUI.
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.initGui_ = function() {
  // Identify the target platform and device we are running onto.
  var platformDevice = this.identifyPlatformAndDevice_();

  // Create the GUI.
  var gui = new rhizo.ui.gui.GUI(this.container_,
                                 platformDevice.platform,
                                 platformDevice.device);
  gui.disableFx(!this.options_.enableAnims);

  // Extends jQuery with all the additional behaviors required by Rhizosphere
  // Disable animations and other performance tunings if needed.
  //
  // TODO(battlehorse): this must happen at the global level, and not locally
  // for every single visualization.
  // See http://code.google.com/p/rhizosphere/issues/detail?id=68.
  rhizo.jquery.init(gui, this.options_.enableAnims, true);

  return gui;
};

/**
 * Initializes the template that will render this project chrome.
 * @param {rhizo.Project} project
 * @param {rhizo.ui.gui.GUI} gui
 * @param {*} options
 * @return {rhizo.ui.component.Template} The project template.
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.initTemplate_ = function(project,
                                                             gui,
                                                             options) {
  // Identify the target device and template to use.
  var templateFactory = this.identifyTemplate_(gui, options);
  var template = templateFactory(project, options);

  // Get the minimum chrome up and running.
  template.render();
  return template;
};

/**
 * If the bootstrapper is allowed to extract parameters from the document
 * location, tries extracting the URI of the resource to display from the there.
 *
 * @return {string} The URI of the resource to load and display.
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.tryInitResourceFromUrl_ = function() {
  if (!this.options_.allowConfigFromUrl) {
    this.project_.logger().warn(
        'Sources extraction from url is disabled');
    return null;
  }

  var urlparams = rhizo.util.urlParams();
  var resource = urlparams['source'] || urlparams['src'];
  if (!resource) {
    this.project_.logger().error(
        'Unable to identify datasource from location');
    return null;
  }
  return decodeURIComponent(resource);
};

