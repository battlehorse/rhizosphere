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

// RHIZODEP=rhizo.layout,rhizo.ui
// Dependency on rhizo.ui is for rhizo.ui.reRender.

namespace("rhizo.layout");
namespace("rhizo.layout.treemap");

// TreeMap Layout.
// Based on the "Squarified Treemaps" algorithm, by Mark Bruls, Kees Huizing,
// and Jarke J. van Wijk (http://tinyurl.com/2eey2zn).
//
// TODO(battlehorse): When expanding and unexpanding a model in this layout, the
// model is re-rendered with its original size, not the one the treemap expects.
//
// TODO(battlehorse): This layout does not support nesting and hierarchies yet.
//
// TODO(battlehorse): Some layout artifacts and overflowing occur, probably due
// to rounding errors, when the areas to display become too small (below 1x1 pixel?).
//

rhizo.layout.treemap.TreeMapNode = function(supermodel, areaMeta, areaRatio) {
  this.model_ = supermodel;
  this.area_ = parseFloat(this.model_.unwrap()[areaMeta]) * areaRatio;
  if (isNaN(this.area_)) {
    this.area_ = 0.0;
  }
};

rhizo.layout.treemap.TreeMapNode.prototype.area = function() {
  return this.area_;
};

rhizo.layout.treemap.TreeMapNode.prototype.model = function() {
  return this.model_;
};

rhizo.layout.treemap.TreeMapDirection = {
  HOR: 'h',
  VER: 'v'
};

rhizo.layout.treemap.TreeMapSlice = function(length, direction, anchorPoint) {
  this.length_ = length;
  this.direction_ = direction;
  this.anchorPoint_ = anchorPoint;
  this.nodes_ = [];
  this.sliceArea_ = 0.0;
  this.minArea_ = Number.MAX_VALUE;
};

rhizo.layout.treemap.TreeMapSlice.prototype.addNode = function(node) {
  this.nodes_.push(node);
  this.sliceArea_ += node.area();
  this.minArea_ = Math.min(this.minArea_, node.area());
};

rhizo.layout.treemap.TreeMapSlice.prototype.span = function(opt_newNode) {
  if (opt_newNode) {
    return (this.sliceArea_ + opt_newNode.area()) / this.length_;
  } else {
    return this.sliceArea_ / this.length_;
  }
};

rhizo.layout.treemap.TreeMapSlice.prototype.aspectRatio = function(
    opt_newNode) {
  var span = this.span(opt_newNode);
  var ratio = null;
  if (opt_newNode) {
    ratio = Math.min(this.minArea_, opt_newNode.area()) / (1.0 * span * span);
  } else {
    ratio = this.minArea_ / (1.0 * span * span);
  }
  if (ratio < 1) {
    ratio = 1.0 / ratio;
  }
  return ratio;
};

rhizo.layout.treemap.TreeMapSlice.prototype.length = function() {
  return this.length_;
};

rhizo.layout.treemap.TreeMapSlice.prototype.nodes = function() {
  return this.nodes_;
};

rhizo.layout.treemap.TreeMapSlice.prototype.direction = function() {
  return this.direction_;
};

rhizo.layout.treemap.TreeMapSlice.prototype.anchorPoint = function() {
  return this.anchorPoint_;
};

/**
 * A wrapper around a supermodel managed (i.e. actively laid out) by
 * TreeMapLayout.
 * 
 * Since TreeMapLayout actively alters the rendering of the models it lays out,
 * we need to keep track of the ones we are currently managing, to be able to
 * restore them to their original shape/color once.
 * 
 * @param {rhizo.model.SuperModel} model The model to wrap.
 * @constructor
 */
rhizo.layout.treemap.ManagedModel = function(model) {
  this.model_ = model;
  this.originalDimensions_ = jQuery.extend({}, model.getCachedDimensions());
  this.originalBackground_ = model.nakedCss('background-color');
};

rhizo.layout.treemap.ManagedModel.prototype.restoreAll = function() {
  this.model_.setNakedCss({backgroundColor: this.originalBackground_});
  this.model_.rescaleRendering(this.originalDimensions_.width,
                               this.originalDimensions_.height);
};

rhizo.layout.TreeMapLayout = function(project) {
  this.project_ = project;
  this.areaSelector_ = null;
  this.colorSelector_ = null;
  this.managedModels_ = null;

  this.colorMin_ = {r: 237, g: 76, b: 95};
  this.colorMax_ = {r: 122, g: 255, b: 115};
};

rhizo.layout.TreeMapLayout.prototype.layout = function(container,
                                                       supermodels,
                                                       allmodels,
                                                       meta,
                                                       opt_options) {
  // The list of managed models is preserved through multiple consequent
  // applications of the TreeMapLayout:
  // - when two TreeMapLayouts are applied consequently only the delta of models
  //   between the two is restored (removed from managed models) or added to the
  //   set.
  // - when a TreeMapLayout is replaced by a different one, all managed models
  //   are restored (see cleanup()).
  // - when a TreeMapLayout replaces a previous (different) layout, the set of
  //   managed models is initially null and populated during the layout
  //   operation.
  if (this.managedModels_) {
    var survivingModelIds = {};
    for (var i = 0; i < supermodels.length; i++) {
      survivingModelIds[supermodels[i].id] = true;
    }
    var restorableModels = {};
    for (var modelId in this.managedModels_) {
      if (!(modelId in survivingModelIds)) {
        restorableModels[modelId] = this.managedModels_[modelId];
      }
    }
    this.restoreSizesAndColors_(restorableModels, opt_options);
    for (var modelId in restorableModels) {
      delete this.managedModels_[modelId];
    }
  }

  var areaMeta = this.areaSelector_.val();
  var colorMeta = this.colorSelector_.val();

  var area = 0.0;
  var colorRange = null;
  if (colorMeta.length > 0) {
    colorRange = {
      min: Number.MAX_VALUE,
      max: Number.MIN_VALUE,
      meta: colorMeta
    };
  }
  supermodels.sort(rhizo.meta.sortBy(areaMeta, meta[areaMeta].kind, true));
  for (var i = 0; i < supermodels.length; i++) {
    var model = supermodels[i];

    // Accumulate area
    area += parseFloat(model.unwrap()[areaMeta]);

    // Identify the minimum and maximum color ranges.
    if (colorMeta.length > 0) {
      var colorVal = parseFloat(model.unwrap()[colorMeta]);
      if (!isNaN(colorVal)) {
        colorRange.min = Math.min(colorRange.min, colorVal);
        colorRange.max = Math.max(colorRange.max, colorVal);
      }
    }

    if (model.expanded) {
      // Revert expanded items, since it messes up with treemapping.
      model.expanded = !model.expanded;
      rhizo.ui.reRender(model, 
                        this.project_.renderer(),
                        opt_options);
    }
  }
  // Pointer to the container were new treemap nodes are added to. Initially
  // maps to the entire available rendering area.
  var remainderContainer = {
    width: container.width(),
    height: container.height()
  };

  // Compute the ratio between the treemap area as defined by the dimension we
  // are treemapping along and the available pixel region as defined by the
  // container we will render into.
  var areaRatio = container.width() * container.height() * 1.0 / area;

  var slices = [];
  if (remainderContainer.width < remainderContainer.height) {
    slices.push(new rhizo.layout.treemap.TreeMapSlice(
      remainderContainer.width,
      rhizo.layout.treemap.TreeMapDirection.HOR,
      {x:0, y:0}));
  } else {
    slices.push(new rhizo.layout.treemap.TreeMapSlice(
      remainderContainer.height,
      rhizo.layout.treemap.TreeMapDirection.VER,
      {x:0, y:0}));
  }
  var currentSlice = slices[0];
  var modelsCount = 0;
  if (supermodels.length > 0) {
    var node = new rhizo.layout.treemap.TreeMapNode(supermodels[modelsCount++],
                                                    areaMeta,
                                                    areaRatio);
    if (node.area() <= 0.0) {
      // Nodes are sorted by decreasing areas. It means that all the models have
      // a zero (or less) area. There's nothing to layout.
      return;
    } else {
      currentSlice.addNode(node);
    }
  }

  var numModelsToHide = 0;
  while (modelsCount < supermodels.length) {
    // create a TreeMapNode that wraps the currently inspected supermodel.
    var node = new rhizo.layout.treemap.TreeMapNode(supermodels[modelsCount++],
                                                    areaMeta,
                                                    areaRatio);
    if (node.area() <= 0.0) {
      node.model().filter('__treemap__');  // hard-coded filter key
      numModelsToHide++;
      continue;
    }

    // compute the worst aspect ratio the slice would have if the node were
    // added to the current slice.
    var withAspectRatio = currentSlice.aspectRatio(node);
    var withoutAspectRatio = currentSlice.aspectRatio();

    if (withAspectRatio > withoutAspectRatio) {
      // Create a new slice, in the opposite direction from the current one

      // Update the remainder container.
      remainderContainer = this.getRemainderContainer_(remainderContainer,
                                                       currentSlice);

      var containerSpan =
        currentSlice.direction() == rhizo.layout.treemap.TreeMapDirection.HOR ?
        remainderContainer.height : remainderContainer.width;

      if (currentSlice.direction() == rhizo.layout.treemap.TreeMapDirection.HOR) {
        currentSlice = new rhizo.layout.treemap.TreeMapSlice(
          containerSpan,
          rhizo.layout.treemap.TreeMapDirection.VER,
          {x:currentSlice.anchorPoint().x,
           y: currentSlice.anchorPoint().y + currentSlice.span()});
      } else {
        currentSlice = new rhizo.layout.treemap.TreeMapSlice(
          containerSpan,
          rhizo.layout.treemap.TreeMapDirection.HOR,
          {x: currentSlice.anchorPoint().x + currentSlice.span(),
           y: currentSlice.anchorPoint().y});
      }
      slices.push(currentSlice);
    }
    currentSlice.addNode(node);

  }
  if (slices.length > 0) {
    this.managedModels_ = this.managedModels_ || {};
    numModelsToHide += this.draw_(container, slices, colorRange);
  }
  if (numModelsToHide > 0) {
    this.project_.alignVisibility();
  }
};

rhizo.layout.TreeMapLayout.prototype.draw_ = function(container,
                                                      slices,
                                                      colorRange) {
  var numModelsToHide = 0;
  for (var i = 0; i < slices.length; i++) {
    numModelsToHide += this.drawSlice_(container, slices[i], colorRange);
  }
  return numModelsToHide;
};

rhizo.layout.TreeMapLayout.prototype.drawSlice_ = function(container,
                                                           slice,
                                                           colorRange) {
  var numModelsToHide = 0;
  var t = slice.anchorPoint().y;
  var l = slice.anchorPoint().x;
  for (var i = 0; i < slice.nodes().length; i++) {
    var length = slice.nodes()[i].area() / slice.span();
    var model = slice.nodes()[i].model();

    if (Math.round(length) == 0 || Math.round(slice.span()) == 0) {
      // Hide items that are too small to be displayed on screen
      model.filter('__treemap__');
      numModelsToHide++;
    } else {
      var renderingSize = {};
      if (slice.direction() == rhizo.layout.treemap.TreeMapDirection.HOR) {
        renderingSize['width'] = Math.round(length);
        renderingSize['height'] = Math.round(slice.span());
      } else {
        renderingSize['width'] = Math.round(slice.span());
        renderingSize['height'] = Math.round(length);
      }
      if (!(model.id in this.managedModels_)) {
        this.managedModels_[model.id] =
            new rhizo.layout.treemap.ManagedModel(model);        
      }
      if (!model.rescaleRendering(renderingSize['width'], renderingSize['height'])) {
        model.filter('__treemap__');
        delete this.managedModels_[model.id];
        numModelsToHide++;
      } else {
        if (colorRange) {
          var colorVal = parseFloat(model.unwrap()[colorRange.meta]);
          if (!isNaN(colorVal)) {
            model.setNakedCss({backgroundColor:
                               this.getBackgroundColor_(colorVal,
                                                        colorRange)});
          }
        }
        model.rendering.move(Math.round(t), Math.round(l));
      }
    }
    if (slice.direction() == rhizo.layout.treemap.TreeMapDirection.HOR) {
      l += length;
    } else {
      t += length;
    }
  }
  return numModelsToHide;
};

rhizo.layout.TreeMapLayout.prototype.getBackgroundColor_ = function(colorVal,
                                                                    colorRange) {
  var channels = ['r', 'g', 'b'];
  var outputColor = {};
  for (var i = 0; i < channels.length; i++) {
    var channel = channels[i];
    outputColor[channel] = this.colorMin_[channel] +
      (this.colorMax_[channel] - this.colorMin_[channel])*
      (colorVal - colorRange.min)/(colorRange.max - colorRange.min);
  }
  return 'rgb(' + Math.round(outputColor.r) + ',' +
      Math.round(outputColor.g) + ',' +
      Math.round(outputColor.b) + ')';
};

rhizo.layout.TreeMapLayout.prototype.getRemainderContainer_ = function(
    remainderContainer, slice) {
  var sliceSpan = slice.span();
  if (slice.direction() == rhizo.layout.treemap.TreeMapDirection.HOR) {
    return {width: remainderContainer.width,
            height: remainderContainer.height - sliceSpan};
  } else {
    return {width: remainderContainer.width - sliceSpan,
            height: remainderContainer.height};
  }
};

rhizo.layout.TreeMapLayout.prototype.cleanup = function(sameEngine,
                                                        opt_options) {
  // Restore all models to their original sizes, if we are moving to a different
  // layout engine.
  if (!sameEngine) {
    this.restoreSizesAndColors_(this.managedModels_, opt_options);
    this.managedModels_ = null;
  }
  this.project_.resetAllFilter('__treemap__');
  this.project_.alignVisibility();
};

rhizo.layout.TreeMapLayout.prototype.restoreSizesAndColors_ = function(
    managedModelsMap, opt_options) {
  for (var modelId in managedModelsMap) {
    managedModelsMap[modelId].restoreAll();
  }
};

rhizo.layout.TreeMapLayout.prototype.details = function() {
  this.areaSelector_ = rhizo.layout.metaModelKeySelector(
    this.project_, 'rhizo-treemaplayout-area');
  this.colorSelector_ = rhizo.layout.metaModelKeySelector(
    this.project_, 'rhizo-treemaplayout-color');
  this.colorSelector_.append("<option value='' selected>-</option>");
  return $("<div />").
      append("Area: ").
      append(this.areaSelector_).
      append(" Color:").
      append(this.colorSelector_);
};

rhizo.layout.TreeMapLayout.prototype.toString = function() {
  return "TreeMap";
};

// register the treemaplayout in global layout list
rhizo.layout.layouts.treemap = rhizo.layout.TreeMapLayout;
