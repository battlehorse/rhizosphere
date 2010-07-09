/*
  Copyright 2008 Riccardo Govoni battlehorse@gmail.com

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

// TODO(battlehorse): this file should depend on rhizo.bootstrap, but this
// dependency is omitted because it would cause a circular dependency.
// The reason is that the bootstrap sequence is actually composed of 2 steps:
// - a first step that render the chrome, initiates model loading (hence calling
//   the functions declared here)
// - a second step that renders and deploys the loaded models (called from
//   within this file for some loaders).
// The fix requires splitting bootstrap into 2 separate files.

// RHIZODEP=rhizo.gviz
namespace("rhizo.model.loader");

// Global registry of available loaders.
// Add elements to this array if you want to include your loader.
rhizo.model.loader.loaders = [];

// Plain Javascript file loader
$globalJSLoaderCount = 0;
$globalJSLoaderMap = {};
rhizo.model.loader.JS = function(bootstrapper, project, globalOptions) {
  this.bootstrapper_ = bootstrapper;
  this.project_ = project;
  this.globalOptions_ = globalOptions;
  this.loaderCount_ = $globalJSLoaderCount++;
  $globalJSLoaderMap[this.loaderCount_] = this;
};
rhizo.model.loader.loaders.push(rhizo.model.loader.JS);

rhizo.model.loader.JS.prototype.match = function(resource) {
  return /\.js$/.test(resource);
};

rhizo.model.loader.JS.prototype.load = function(resource) {
  var e = document.createElement("script");
  e.src = resource + '?jsonp=$globalJSLoaderMap[' + this.loaderCount_ + '].loadDone';
  e.type="text/javascript";
  document.getElementsByTagName("head")[0].appendChild(e);

  // we expect the script to contain the code the deploy the project,
  // in addition to just defining models and renderers.
};

rhizo.model.loader.JS.prototype.loadDone = function(payload) {
  this.bootstrapper_.deploy(payload);
};

// Google Spreadsheet GViz loader
rhizo.model.loader.GoogleSpreadsheet = function(bootstrapper, project, globalOptions) {
  this.bootstrapper_ = bootstrapper;
  this.project_ = project;
  this.globalOptions_ = globalOptions;
};
rhizo.model.loader.loaders.push(rhizo.model.loader.GoogleSpreadsheet);

rhizo.model.loader.GoogleSpreadsheet.prototype.match = function(resource) {
  return /spreadsheets\.google\.com/.test(resource);
};

rhizo.model.loader.GoogleSpreadsheet.prototype.load = function(resource) {
  // The javascript http://www.google.com/jsapi and the visualization
  // package must be already included in the page and available at this point.
  if (!google.visualization) {
    this.project_.logger().error('Google Visualization APIs not available.');
  } else {
    var query = new google.visualization.Query(resource);
    var that = this;  // needed to propagate this through the Gviz callback.
    var callback = function(response) {
      that.handleQueryResponse_(response);
    };
    query.send(callback);
  }
};

rhizo.model.loader.GoogleSpreadsheet.prototype.handleQueryResponse_ =
    function(response) {
  if (response.isError()) {
    this.project_.logger().error("GViz load failed: " + response.getMessage());
    return;
  }
  var initializer = new rhizo.gviz.Initializer(response.getDataTable(),
                                               this.project_,
                                               this.globalOptions_);

  this.bootstrapper_.deploy({
    'renderer': initilizer.renderer,
    'metamodel': initializer.metamodel,
    'models': initializer.models});
};

// Gadget GViz loader
rhizo.model.loader.GoogleGadget = function(bootstrapper, project, globalOptions) {
  this.bootstrapper_ = bootstrapper;
  this.project_ = project;
  this.globalOptions_ = globalOptions;
};
rhizo.model.loader.loaders.push(rhizo.model.loader.GoogleGadget);

rhizo.model.loader.GoogleGadget.RESOURCE = "__google_gadget";
rhizo.model.loader.GoogleGadget.prototype.match = function(resource) {
  var regexp = new RegExp(rhizo.model.loader.GoogleGadget.RESOURCE);
  return regexp.test(resource);
};

rhizo.model.loader.GoogleGadget.prototype.load = function(resource) {
  if (!google.visualization) {
    this.project_.logger().error('Google Visualization APIs not available.');
    return;
  }

  if (typeof _IG_Prefs == 'undefined') {
    this.project_.logger().error('Google Gadget APIs not available.');
    return;
  }

  var prefs = new _IG_Prefs();
  var gadgetHelper = new google.visualization.GadgetHelper();
  var query = gadgetHelper.createQueryFromPrefs(prefs);
  var that = this;  // needed to propagate this through the Gviz callback.
  var callback = function(response) {
    that.handleQueryResponse_(response);
  };
  query.send(callback);
};

rhizo.model.loader.GoogleGadget.prototype.handleQueryResponse_ =
  rhizo.model.loader.GoogleSpreadsheet.prototype.handleQueryResponse_;


/**
 * Global function that load a resource containing a Rhizosphere
 * model and creates a rhizo.Project out of it.
 * This method call should probably appear somewhere in your bootstrap
 * sequence, unless you only want to explicitly load a specific model.
 *
 * @param {string} resource the resource to load.
 *     Tipically this will be a URL.
 * @param {rhizo.boostrap.Bootstrap} bootstrapper the project bootstrapper.
 * @param {rhizo.Project} project the project we're loading the models for.
 * @param {Object} globalOptions key-values for the global options.
 */
rhizo.model.loader.load = function(resource, bootstrapper, project, globalOptions) {
  var loader_ctors = rhizo.model.loader.loaders;

  for (var i = 0; i < loader_ctors.length; i++) {
    var loader = new loader_ctors[i](bootstrapper, project, globalOptions);
    if (loader.match(resource)) {
      loader.load(resource);
      return;
    }
  }

  // TODO(battlehorse): The logger here might not be visible to the user
  // (e.g.: native console or NoOpLogger ), should we rely on alert() to
  // make sure the user receives the message?
  project.logger().error('No loader available for the resource: ' + resource);
};
