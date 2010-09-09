/*
  Copyright 2009 Riccardo Govoni battlehorse@gmail.com

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

// RHIZODEP=rhizo.model.loader,rhizo.base,rhizo.ui.component,rhizo.jquery,rhizo.ui.gui
namespace('rhizo.bootstrap');

rhizo.bootstrap.Bootstrap = function(container, opt_options) {
  this.container_ = container;
  this.options_ = { selectfilter: '.rhizo-model:visible' };
  if (opt_options) {
    $.extend(this.options_, opt_options);
  }
};

/**
 * Identify the platform and device we are running onto.
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.identifyPlatformAndDevice_ = function() {
  if (this.options_.forcePlatform && this.options_.forceDevice) {
    return {platform: this.options_.forcePlatform,
            device: this.options_.forceDevice};
  }
  var ua = navigator.userAgent;
  if (ua.toLowerCase().indexOf('ipad') != -1) {
    return {plaftorm: 'mobile', device: 'ipad'};
  }
  return {platform: 'default', device: 'default'};
};

/**
 * Identifies the best template to use for the visualization.
 * @param {rhizo.ui.gui.GUI} gui
 * @return {function(rhizo.Project):Object} A constructor for the template to
 *     use. 
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.identifyTemplate_ = function(gui) {
  var templateCtors = {
    'bottom' : rhizo.ui.component.BottomTemplate,
    'default': rhizo.ui.component.StandardTemplate
  };

  if (this.options_.forceTemplate &&
      this.options_.forceTemplate in templateCtors)
  if (this.options_.forceTemplate) {
    return templateCtors[this.options_.forceTemplate];
  }

  // No specific template has been forced. Select a specific one based on
  // document size and target platform.
  if (gui.isMobile() || gui.isSmall()) {
    return templateCtors['bottom'];
  }
  return templateCtors['default'];
};

rhizo.bootstrap.Bootstrap.prototype.go = function(opt_resource) {
  // Identify the target platform and device we are running onto.
  var platformDevice = this.identifyPlatformAndDevice_();  

  // Create the GUI.
  var gui = new rhizo.ui.gui.GUI(this.container_,
                                 platformDevice.platform,
                                 platformDevice.device);
  if (this.options_.noAnims) {
    gui.disableFx(true);
  }

  // Extends jQuery with all the additional behaviors required by Rhizosphere
  // Disable animations and other performance tunings if needed.
  // 
  // TODO(battlehorse): this must happen at the global level, and not locally
  // for every single visualization.
  // See http://code.google.com/p/rhizosphere/issues/detail?id=68.
  rhizo.jquery.init(gui, this.options_.noAnims);

  // Create the project.
  this.project_ = new rhizo.Project(gui, this.options_);

  // Identify the target device and template to use.
  var templateCtor = this.identifyTemplate_(gui);
  this.template_ = new templateCtor(this.project_);

  // Get the minimum chrome up and running.
  this.template_.renderChrome(this.options_);
  this.template_.activateChrome(this.options_);

  this.project_.chromeReady();

  // Open the models' source...
  var source = opt_resource;
  if (!source && this.options_.allowSourcesFromUrl) {
    var regex = new RegExp('(source|src)=([^&]+)');
    var results = regex.exec(document.location.href);
    if (!results || !results[2]) {
      this.project_.logger().error("Unable to identify datasource from location");
    } else {
      source = decodeURIComponent(results[2]);
    }
  }

  // ... and load it.
  if (source) {
    rhizo.model.loader.load(source, this, this.project_, this.options_);
  }
};

rhizo.bootstrap.Bootstrap.prototype.deploy = function(payload) {
  this.project_.setMetaModel(payload.metamodel);
  this.project_.setRenderer(payload.renderer);

  this.project_.metaReady();

  this.template_.renderDynamic(this.options_);
  this.template_.activateDynamic(this.options_);

  this.project_.deploy(payload.models);
  this.template_.done();
};
