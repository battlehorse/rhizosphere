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

/**
 * Definition of Rhizosphere loaders, and global functions to access the
 * registry of known loaders.
 *
 * A loader is responsible for loading the 3 main components a Rhizosphere
 * visualization needs to be properly displayed:
 *
 * - A list of models: This is the list of data items we want to visualize.
 * - A metamodel: A metamodel describes that attributes and properties that
 *     each model in the above list has.
 * - A renderer: A renderer creates HTML representations of models.
 *
 * A loader is a Javascript object that exposes the following constructor and
 * methods:
 * - A 1-arg constructor that receives the URI of the resource to load as a
 *     parameter.
 * - match():boolean: Decides whether the loader is capable of loading
 *     Rhizosphere models from the given resource URI.
 * - load(function callback, options, logger): Loads Rhizosphere models from the
 *     resource URI and invokes the callback once loading completes. The
 *     callback function accepts the metamodel, renderer and loaded models as
 *     parameters. 'options' contains visualization-wide configuration options
 *     that can be used to tune the loading. 'logger' is a generic logger that
 *     exposes error(), warn() and info() methods.
 *
 * Loaders should be registered in the rhizo.model.loader.loaders array.
 * When Rhizosphere is bootstrapped with a generic URI and an explicit loader is
 * not specified, it will scan such array to automatically find a suitable
 * loader to use among the known ones.
 */

// RHIZODEP=rhizo.gviz
namespace("rhizo.model.loader");

// Global registry of available loaders.
// Add elements to this array if you want Rhizosphere to be aware of your
// loader when it needs to load a new resource.
rhizo.model.loader.loaders = [];

// Global tracking of existing Javascript loaders, necessary to match the
// JSONP callbacks fired by included scripts to the right loader.
$globalJSONPLoaderCount = 0;
$globalJSONPLoaderMap = {};

// Plain Javascript file loader
rhizo.model.loader.JSONP = function(resource) {
  this.resource_ = resource;
  this.loaderCount_ = $globalJSONPLoaderCount++;
  $globalJSONPLoaderMap[this.loaderCount_] = this;
};
rhizo.model.loader.loaders.push(rhizo.model.loader.JSONP);

rhizo.model.loader.JSONP.prototype.match = function() {
  return /\.js$/.test(this.resource_);
};

rhizo.model.loader.JSONP.prototype.load = function(callback,
                                                   unused_options,
                                                   unused_logger) {
  this.callback_ = callback;
  var e = document.createElement("script");
  e.src = this.resource_ +
      '?jsonp=$globalJSONPLoaderMap[' +
      this.loaderCount_ +
      '].loadDone';
  e.type="text/javascript";
  document.getElementsByTagName("head")[0].appendChild(e);

  // we expect the script to contain the code the deploy the project,
  // in addition to just defining models and renderers.
};

rhizo.model.loader.JSONP.prototype.loadDone = function(payload) {
  this.callback_(payload.metamodel,
                 payload.renderer,
                 payload.models);
  $globalJSONPLoaderMap[this.loaderCount_] = null;
};

// Generic Google Visualization API (GViz) loader
rhizo.model.loader.GViz = function(resource) {
  this.resource_ = resource;
};
rhizo.model.loader.loaders.push(rhizo.model.loader.GViz);

rhizo.model.loader.GViz.prototype.match = function() {
  // Google Visualizations can be exposed under any URL. We leave to specific
  // implementations the task of matching against known GViz sources.
  return false;
};

rhizo.model.loader.GViz.prototype.load = function(callback, options, logger) {
  // The javascript http://www.google.com/jsapi and the visualization
  // package must be already included in the page and available at this point.
  if (typeof google == 'undefined' ||
      typeof google.visualization == 'undefined') {
    logger.error('Google Visualization APIs not available.');
  } else {
    var query = new google.visualization.Query(this.resource_);
    var that = this;  // needed to propagate this through the Gviz callback.
    query.send(function(response) {
      that.handleQueryResponse_(response, callback, options, logger);
    })
  }
};

rhizo.model.loader.GViz.prototype.handleQueryResponse_ =
    function(response, callback, options, logger) {
  if (response.isError()) {
    logger.error("GViz load failed: " + response.getMessage());
    return;
  }
  var initializer = new rhizo.gviz.Initializer(response.getDataTable(),
                                               logger, options);


  callback(initializer.metamodel,
           initializer.renderer,
           initializer.models);
};

// Google Spreadsheets loader (which follows the GViz spec).
rhizo.model.loader.GoogleSpreadsheets = function(resource) {
  rhizo.model.loader.GViz.call(this, resource);
};
rhizo.inherits(rhizo.model.loader.GoogleSpreadsheets, rhizo.model.loader.GViz);
rhizo.model.loader.loaders.push(rhizo.model.loader.GoogleSpreadsheets);

rhizo.model.loader.GoogleSpreadsheets.prototype.match = function() {
  return /spreadsheets\.google\.com/.test(this.resource_);
};

// Google Gadgets loader (which follows the GViz spec)
rhizo.model.loader.GoogleGadget = function(unused_resource) {
  rhizo.model.loader.GViz.call(this, unused_resource);
};
rhizo.inherits(rhizo.model.loader.GoogleGadget, rhizo.model.loader.GViz);
rhizo.model.loader.loaders.push(rhizo.model.loader.GoogleGadget);

rhizo.model.loader.GoogleGadget.prototype.match = function() {
  // Google Gadgets can load their data from any URL. This implementation
  // uses a google.visualization.GadgetHelper to extract the datasource URL
  // from the gadget prefs and therefore this loader must be explicitly
  // invoked.
  return false;
};

rhizo.model.loader.GoogleGadget.prototype.load = function(callback,
                                                          options,
                                                          logger) {
  if (typeof google == 'undefined' ||
      typeof google.visualization == 'undefined') {
    logger.error('Google Visualization APIs not available.');
    return;
  }

  if (typeof _IG_Prefs == 'undefined') {
    logger.error('Google Gadget APIs not available.');
    return;
  }

  var prefs = new _IG_Prefs();
  var gadgetHelper = new google.visualization.GadgetHelper();
  var query = gadgetHelper.createQueryFromPrefs(prefs);
  var that = this;  // needed to propagate this through the Gviz callback.
  query.send(function(response) {
    that.handleQueryResponse_(response, callback, options, logger);
  });
};


/**
 * Global function that load a resource containing a Rhizosphere
 * model and handle back the loaded models and associated meta information
 * to the given callback.
 *
 * This method is part of the default Rhizosphere bootstrap sequence (see
 * rhizo.bootstrap.Bootstrap), but can also be invoked explicitly if needed
 * by custom loaders.
 *
 * @param {string} resource the resource to load. Tipically this will be a URL.
 * @param {function(Array.<*>, *, *)} callback Callback function that will be
 *     invoked once the resource has been loaded and all data necessary for a
 *     Rhizosphere visualization (models, metamodel, renderer) are available.
 * @param {*} options Visualization-wide configuration options.
 * @param {*} logger A logger that exposes info(), error() and warn() logging
 *     functions.
 */
rhizo.model.loader.load = function(resource, callback, options, logger) {
  var loader_ctors = rhizo.model.loader.loaders;

  for (var i = 0; i < loader_ctors.length; i++) {
    var loader = new loader_ctors[i](resource);
    if (loader.match()) {
      loader.load(callback, options, logger);
      return;
    }
  }

  // TODO(battlehorse): The logger here might not be visible to the user
  // (e.g.: native console or NoOpLogger ), should we rely on alert() to
  // make sure the user receives the message?
  logger.error('No loader available for the resource: ' + resource);
};
