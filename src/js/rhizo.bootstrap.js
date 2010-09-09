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
  if (this.options_.autoSize) {
    // Autosizing has been requested to identify the template to use.
    if ($(document).width() >= 600 && $(document).height() >= 250) {
      this.options_.miniLayout = false;
    } else {
      this.options_.miniLayout = true;
    }
  }
};

rhizo.bootstrap.Bootstrap.prototype.go = function(opt_resource) {
  // Create the GUI.
  var gui = new rhizo.ui.gui.GUI(this.container_);
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

  // Get the minimum chrome up and running.
  this.template_ = this.options_.miniLayout ?
      new rhizo.ui.component.MiniTemplate(this.project_) :
      new rhizo.ui.component.StandardTemplate(this.project_);
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
