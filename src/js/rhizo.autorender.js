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

// RHIZODEP=rhizo.meta
namespace("rhizo.autorender");

rhizo.autorender.AR = function(metamodel,
                               models,
                               opt_fallbackToDefaults,
                               opt_numfields) {
                                 
  this.metamodel_ = metamodel;
  this.metamodelFields_ = 0;
  for (var f in this.metamodel_) {
    this.metamodelFields_++;
  }
    
  this.fallbackToDefaults_ = typeof(opt_fallbackToDefaults) == 'undefined' ?
                             true : opt_fallbackToDefaults;
  this.locateFields_();

  var autoShownFields = 0; // counts the number of fields that will always show
                           // independently on opt_numfields
  if (this.sizeField_) {
    this.sizeRange_ = this.locateMinMax_(models, this.sizeField_);
    autoShownFields++;
  }

  if (this.colorField_) {
    this.colorRange_ = this.locateMinMax_(models, this.colorField_);
    autoShownFields++;    
  }
  
  this.numfields_ = typeof(opt_numfields) == 'undefined' ? 
      5 : 
      Math.max(opt_numfields, autoShownFields);
};

rhizo.autorender.AR.prototype.getSizeRange = function() {
  return this.sizeRange_;
};

rhizo.autorender.AR.prototype.getColorRange = function() {
  return this.colorRange_;
};

rhizo.autorender.AR.prototype.locateFields_ = function() {
  for (key in this.metamodel_) {
    this.masterField_ = this.masterField_ ||
                        this.getArField_(key, 'master', 'true');
    this.sizeField_ = this.sizeField_ ||
                      this.getArField_(key, 'bind', 'size');
    this.colorField_ = this.colorField_ ||
                       this.getArField_(key, 'bind', 'color');
  }
  this.locateDefaultFields_();
};

rhizo.autorender.AR.prototype.getArField_ = function(key, property, value) {
  if (this.metamodel_[key].ar) {
    var propVal = this.metamodel_[key].ar[property];
    if (propVal && propVal.toString().indexOf(value) != -1) {
      return key;
    }
  }
  return null;
};

rhizo.autorender.AR.prototype.locateDefaultFields_ = function() {
  for (key in this.metamodel_) {
    // master Field is by default the first one
    if (!this.masterField_) {
      this.masterField_ = key;
    }

    if (!this.fallbackToDefaults_) {
      break;
    }

    // size Field is the first numeric field
    if (!this.sizeField_ &&
          (this.metamodel_[key].kind == rhizo.meta.Kind.NUMBER ||
          this.metamodel_[key].kind == rhizo.meta.Kind.RANGE)) {
      this.sizeField_ = key;
      continue;
    }

    // color Field is the next numeric field, or the first one if
    // size is explicitly bound
    if (this.sizeField_) {
      if (!this.colorField_ &&
            (this.metamodel_[key].kind == rhizo.meta.Kind.NUMBER ||
            this.metamodel_[key].kind == rhizo.meta.Kind.RANGE)) {
        this.colorField_ = key;
      }
    }
  }
};

rhizo.autorender.AR.prototype.locateMinMax_ = function(models, key) {
  if (this.metamodel_[key].kind == rhizo.meta.Kind.RANGE) {
    return { min: this.metamodel_[key].min ,
             max: this.metamodel_[key].max ,
             label: this.metamodel_[key].label };
  } else {
    // number Kind
    // iterate over models to figure out min and max
    var modelMin = Number.POSITIVE_INFINITY;
    var modelMax = Number.NEGATIVE_INFINITY;
    $.each(models, function(i, model) {
      modelMin = Math.min(modelMin, model[key]);
      modelMax = Math.max(modelMax, model[key]);
    });
    return { min: modelMin, max: modelMax, label: this.metamodel_[key].label};
  }
};

rhizo.autorender.AR.prototype.getClass_ = function(value,
                                                   range,
                                                   miniLayout,
                                                   identifier) {
  // 0 to 5 scale
  var size = parseInt(((value - range.min) / (range.max - range.min))*5.0, 10);
  return 'ar-' + identifier + '-' + size.toString() + (miniLayout ? 'm' : '');
};


rhizo.autorender.AR.prototype.getFontClass_ = function(value,
                                                       range,
                                                       miniLayout,
                                                       master) {
  return this.getClass_(value, range, miniLayout, 'fon');
};

rhizo.autorender.AR.prototype.getColorClass_ = function(value,
                                                        range,
                                                        miniLayout) {
  return this.getClass_(value, range, miniLayout, 'col');
};

rhizo.autorender.AR.prototype.renderSingleModelKey_ = function(key, value) {
  var html = [];
  html.push('<p><span class="rhizo-autorender-label">');
  html.push(this.metamodel_[key].label);
  html.push('</span>: ');
  html.push(value);
  html.push('</p>');
  return html.join('');
};

/**
  Detects whether the renderings produced by this renderer can be expanded
  or not. 
  If it is in miniLayout mode:
    then only the masterField is shown and expandable is true if there are
    additional fields.
  If it is NOT in miniLayout mode:
    then expandable is true if there are more fields, in addition to the
    ones are already shown (numfields_) plus the masterField (that is always
    shown).
 */
rhizo.autorender.AR.prototype.expandable = function(opt_options) {
  var miniLayout = opt_options && opt_options.miniLayout;
  var threshold = miniLayout ? 1 :  this.numfields_ + 1;
  return this.metamodelFields_ > threshold;
};

rhizo.autorender.AR.prototype.render = function(model, 
                                                expanded, 
                                                opt_options) {
  var miniLayout = opt_options && opt_options.miniLayout;

  var colorClass = 'ar-col-0' + (miniLayout ? 'm' : '');
  if (this.colorField_) {
    colorClass = this.getColorClass_(model[this.colorField_],
                                     this.colorRange_,
                                     miniLayout);
  }

  var fontClass = 'ar-fon-0' + (miniLayout ? 'm' : '');
  if (this.sizeField_) {
    fontClass = this.getFontClass_(model[this.sizeField_],
                                   this.sizeRange_,
                                   miniLayout);
  }

  if (miniLayout && !expanded) {
    return $("<div class='" + colorClass + "'>" +
             "<span class='" + fontClass + "'>" +
             model[this.masterField_] + "</span>" +
             "</div>");
  } else {
    html = [];
    html.push("<div class='" + colorClass + "'>");
    html.push("<span class='" + fontClass + "'>" +
              model[this.masterField_] + "</span>");

    var count = 0;
    if (this.sizeField_) {
      html.push(this.renderSingleModelKey_(this.sizeField_,
                                           model[this.sizeField_]));
      count++
    }

    if (this.colorField_ && this.colorField_ != this.sizeField_) {
      html.push(this.renderSingleModelKey_(this.colorField_,
                                           model[this.colorField_]));
      count++;
    }

    for (key in this.metamodel_) {
      if (count >= this.numfields_ && !expanded) {
        break;
      }
      if (key != this.sizeField_ &&
          key != this.colorField_ &&
          key != this.masterField_) {
        count++;
        html.push(this.renderSingleModelKey_(key, model[key]));
      }
    }
    html.push("</div>")
    return $(html.join(''));
  }
};
