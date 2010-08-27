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

// RHIZODEP=rhizo.ui
namespace("rhizo.model");

rhizo.model.SuperModel = function(model, renderer, opt_selected, opt_filtered) {
  this.model = model;
  this.id = model.id;
  this.selected = opt_selected || false;
  this.filters_ = {}; // a map of filter status, one for each model key
  this.rendering = null;
  this.naked_render = null;
  this.expanded = false; // whether the rendering is expanded or not

  this.cachedDimensions_ = {};
  this.setRendererHelpers_(renderer);
  this.rendererRescaler_ = null;
  this.rendererStyleChanger_ = null;
};

rhizo.model.SuperModel.prototype.setRendererHelpers_ = function(renderer) {
  if (typeof(renderer.rescale) == 'function') {
    this.rendererRescaler_ = renderer.rescale;
  }
  if (typeof(renderer.changeStyle) == 'function') {
    this.rendererStyleChanger_ = renderer.changeStyle;
  }  
};

rhizo.model.SuperModel.prototype.unwrap = function() {
  return this.model;
};

rhizo.model.SuperModel.prototype.toString = function() {
  return this.model.toString();
};

rhizo.model.SuperModel.prototype.isFiltered = function(opt_key) {
  if (opt_key) {
    return this.filters_[opt_key] || false;
  } else {
    var countFilters = 0;
    for (key in this.filters_) { countFilters++;}
    return countFilters != 0;
  }
};

rhizo.model.SuperModel.prototype.filter = function(key) {
  this.filters_[key] = true;
};

rhizo.model.SuperModel.prototype.resetFilter = function(key) {
  delete this.filters_[key];
};

rhizo.model.SuperModel.prototype.rescaleRendering = function(
    width, height, opt_failure_callback) {
  // The rendering is guaranteed to be marginless and paddingless, with a
  // 1px border (unless someone tampers the .rhizo-model class), so we
  // programmatically know that internal dimensions need to be resized
  // to a smaller extent (exactly 2px less).
  //
  // If internal width/height falls to 0px we bail out.
  if (width <= 2 || height <= 2) {
    if (opt_failure_callback) {
      opt_failure_callback();
    }
    return false;
  }
  this.cachedDimensions_ = {width: width, height: height};

  // TODO(battlehorse): should rescaling be animated?
  this.rendering.width(width - 2).height(height - 2);
  if (this.rendererRescaler_) {
    // Give the original model renderer a chance to rescale the naked render,
    // if a rescaler has been defined.
    //
    // Like this method, the rescaler too receives outer dimensions.
    this.rendererRescaler_(width - 2, height - 2);
  }
  return true;
};

rhizo.model.SuperModel.prototype.setNakedCss = function(props) {
  if (typeof props != 'object') {
    throw 'setNakedCss() expects a map of properties.';
  }
  if (this.rendererStyleChanger_) {
    this.rendererStyleChanger_(props);
  } else {
    this.naked_render.css(props);
  }
};

rhizo.model.SuperModel.prototype.nakedCss = function(propName) {
  if (typeof propName != 'string') {
    throw 'nakedCss() expects a string of the property to access.';
  }
  return this.naked_render.css(propName);
};

rhizo.model.SuperModel.prototype.refreshCachedDimensions = function() {
  if (this.rendering) {
    this.cachedDimensions_ = {
      width: this.rendering.get(0).offsetWidth,
      height: this.rendering.get(0).offsetHeight
    };
  }
};

/**
 * @return {Object.<string, number>} The cached dimensions of this model
 *     rendering. The returned object has a 'width' and 'height' property
 *     that map to the outer dimensions (incl. border and such) of the
 *     rendering.
 */
rhizo.model.SuperModel.prototype.getCachedDimensions = function() {
  return this.cachedDimensions_;
};
