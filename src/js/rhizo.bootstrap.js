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

// RHIZODEP=rhizo.options,rhizo.model.loader,rhizo.base,rhizo.ui.component,rhizo.jquery,rhizo.ui.gui
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
 *     visualization. It must have an explicit CSS position set (either
 *     'relative' or 'absolute'). You are free to set its width and height and
 *     Rhizosphere will render itself within the given constraints.
 * @param {(Object.<string, *>|rhizo.Options)=} opt_options Visualization-wide
 *     configuration options, specified either as a key-value map or using
 *     a rhizo.Options object. The set of allowed keys is described at
 *     http://www.rhizospherejs.com/doc/contrib_tables.html#options.
 * @param {function(rhizo.UserAgent, boolean, string=)=} opt_callback
 *     Optional callback invoked on the visualization is completely initialized.
 *     Receives 3 parameters: the rhizo.UserAgent managing the visualization, a
 *     boolean indicating whether the visualization successfully initialized
 *     and a string containing the error details if the initialization was
 *     not sucessful.
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
  this.options_ = new rhizo.Options(opt_options);
  this.callback_ = opt_callback;
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
 * @return {rhizo.UserAgent} A user agent bound to the visualization through
 *     which you can have programmatic access to the visualization.
 */
rhizo.bootstrap.Bootstrap.prototype.prepareAndDeploy = function(opt_resource) {
  var ua = this.prepare();
  this.deploy(opt_resource);
  return ua;
};

/**
 * Performs all the necessary steps to prepare a Rhizosphere visualization, up
 * to the point where it can receive the models to display.
 *
 * Use this method in conjunction with deploy() if you want to be in charge
 * of loading the actual models to visualize.
 *
 * @return {rhizo.UserAgent} A user agent bound to the visualization through
 *     which you can have programmatic access to the visualization.
 */
rhizo.bootstrap.Bootstrap.prototype.prepare = function() {
  // Initialize the GUI, project and template.
  this.gui_ = this.initGui_();
  this.project_ = new rhizo.Project(this.gui_, this.options_);
  this.template_ = this.initTemplate_(this.project_, this.gui_, this.options_);
  return this.project_.userAgent();
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
  } else {
    this.deployExplicit();
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
 * @param {Array.<*>} opt_models The optional list of data items to visualize
 *     at visualization startup. Models can be later added or removed using
 *     the provided methods on rhizo.UserAgent.
 * @param {*} opt_metamodel A descriptor for the attributes and properties that
 *     each model in the visualization has. Ignored if the metamodel has
 *     been specified via configuration options.
 * @param {*} opt_renderer A component capable of creating HTML representation
 *     of model instances. Ignored if the renderer has been specified via
 *     configuration options.
 */
rhizo.bootstrap.Bootstrap.prototype.deployExplicit = function(opt_models,
                                                              opt_metamodel,
                                                              opt_renderer) {
  this.project_.logger().time('Bootstrap::deployExplicit');

  var additionalOptions = {};
  if (opt_metamodel && !this.options_.metamodel()) {
    additionalOptions['metamodel'] = opt_metamodel;
  }
  if (opt_renderer && !this.options_.renderer()) {
    additionalOptions['renderer'] = opt_renderer;
  }
  this.options_.merge(additionalOptions);

  if (this.options_.renderer() &&
      (this.options_.renderer().getSizeRange ||
       this.options_.renderer().getColorRange)) {
    this.template_.addComponent(new rhizo.ui.component.Legend(this.project_,
                                                              this.options_));
  }

  var outcome = this.project_.deploy();
  if (!outcome.success) {
    this.project_.logger().error(outcome.details);
    this.template_.setProgressHandler(null);
    this.gui_.done();
    this.deployed_ = true;
    this.callback_ && this.callback_(
        this.project_.userAgent(), outcome.success, outcome.details);
    this.project_.logger().timeEnd('Bootstrap::deployExplicit'); 
    return;
  }

  this.template_.metaReady();
  if (opt_models && opt_models.length > 0) {

    // We manually disable animations for the initial layout (the browser is
    // already busy creating the whole dom).
    this.gui_.disableFx(true);

    this.project_.userAgent().addModels(
        opt_models, jQuery.proxy(this.modelsAdded_, this));
  } else {
    this.modelsAdded_(true);
  }
};

/**
 * Callback invoked after the project initial set of models has been deployed.
 *
 * @param {boolean} success Whether the model deployment was successful and all
 *     the models were well-formed.
 * @param {string=} opt_details The error details, if the model deployment
 *     failed for any reason.
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.modelsAdded_ = function(
    success, opt_details) {
  if (!success) {
    this.project_.logger().error(opt_details);
  }
  this.project_.alignFx();
  this.template_.ready();
  this.gui_.done();
  this.deployed_ = true;
  this.callback_ && this.callback_(
      this.project_.userAgent(), success, opt_details);
  this.project_.logger().timeEnd('Bootstrap::deployExplicit');
};

/**
 * Identify the platform and device we are running onto.
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.identifyPlatformAndDevice_ = function() {
  if (this.options_.platform() && this.options_.device()) {
    return {platform: this.options_.platform(),
            device: this.options_.device()};
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
 * @param {!rhizo.ui.gui.GUI} gui
 * @param {!rhizo.Options} options
 * @return {function(rhizo.Project):rhizo.ui.component.Template} A factory for
 *     the template to use.
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.identifyTemplate_ = function(gui, options) {
  var template = options.template();
  if (template && template in rhizo.ui.component.templates) {
    return rhizo.ui.component.templates[template];
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
  gui.disableFx(!this.options_.areAnimationsEnabled());

  // Extends jQuery with all the additional behaviors required by Rhizosphere.
  rhizo.jquery.init(this.options_.panningMode() == 'infinite');

  return gui;
};

/**
 * Initializes the template that will render this project chrome.
 * @param {!rhizo.Project} project
 * @param {!rhizo.ui.gui.GUI} gui
 * @param {!rhizo.Options} options
 * @return {rhizo.ui.component.Template} The project template.
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.initTemplate_ = function(project,
                                                             gui,
                                                             options) {
  // Identify the target device and template to use.
  var templateFactory = this.identifyTemplate_(gui, options);
  var template = templateFactory(project);

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
  if (!this.options_.allowConfigFromUrl()) {
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

