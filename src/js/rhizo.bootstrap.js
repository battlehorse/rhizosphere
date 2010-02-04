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

// RHIZODEP=rhizo.model.loader,rhizo.base,rhizo.ui.component,rhizo.ui
namespace('rhizo.bootstrap');

rhizo.bootstrap.go = function(container, opt_options, opt_resource) {
  new rhizo.bootstrap.Bootstrap(container, opt_options);
  $globalBootstrapper_.go(opt_resource);
};

rhizo.bootstrap.setMetaModel = function(metamodel) {
  $globalBootstrapper_.setMetaModel(metamodel);
};

rhizo.bootstrap.setRenderer = function(renderer) {
  $globalBootstrapper_.setRenderer(renderer);
};

rhizo.bootstrap.deploy = function(opt_models) {
  $globalBootstrapper_.deploy(opt_models);
};

$globalBootstrapper_ = null;
rhizo.bootstrap.Bootstrap = function(container, opt_options) {
  this.container_ = container;
  this.options_ = { selectfilter: '.rhizo-model:visible' };
  if (opt_options) {
    $.extend(this.options_, opt_options);
  }
  if (this.options_.autoSize) {
    // Autosizing has been requested to identify the template to use.
    if ($(document).width() >= 600 && $(document).height() >= 250) {
      this.options_.miniLayout = false;
    } else {
      this.options_.miniLayout = true;
    }
  }

  $globalBootstrapper_ = this;
}

rhizo.bootstrap.Bootstrap.prototype.go = function(opt_resource) {
  // Get the minimum chrome up and running
  this.template_ = this.options_.miniLayout ?
      new rhizo.ui.component.MiniTemplate() :
      new rhizo.ui.component.StandardTemplate();
  this.template_.renderChrome(this.container_, this.options_);
  this.template_.activateChrome(this.options_);

  // Disable animations and other performance tunings if needed
  rhizo.ui.performanceTuning(this.options_.noAnims);

  // Create the project
  this.project_ = new rhizo.Project(this.options_);

  var source = opt_resource;
  if (!source) {
    var regex = new RegExp('source=(.*)$');
    var results = regex.exec(document.location.href);
    if (!results || !results[1]) {
      rhizo.error("Unable to identify datasource from location");
    } else {
      source = unescape(results[1]);
    }
  }

  if (source) {
    rhizo.model.loader.load(source, this.options_);
  }
};

rhizo.bootstrap.Bootstrap.prototype.setMetaModel = function(metamodel) {
  this.project_.setMetaModel(metamodel);
};

rhizo.bootstrap.Bootstrap.prototype.setRenderer = function(renderer) {
  this.project_.setRenderer(renderer);
};

rhizo.bootstrap.Bootstrap.prototype.deploy = function(opt_models) {
  this.template_.renderDynamic(this.container_, this.options_);
  this.template_.activateDynamic(this.options_);

  this.project_.deploy(opt_models);
  this.template_.done();
};
