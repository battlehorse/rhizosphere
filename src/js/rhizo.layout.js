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

/*
To define a new layout:

- create the object

- implement the layout() function
  This is responsible for the actual layouting

- implement the toString() function
  This returns the layout name for display purposes

- implement the details() function (optional)
  This renders a piece of UI you can use to collect extra options
  for your layout

- implement the cleanup() function (optional)
  If your layout creates data structures or UI components that
  have to be cleaned up

- update the rhizo.layout.layouts structure
*/

namespace("rhizo.layout");

/**
 * Creates a dropdown control that enumerates all the metaModel keys.
 * @param {string} id
 * @return {Element} the jquery-enhanced HTML dropdown control
 */
rhizo.layout.metaModelKeySelector = function(id) {
  var select = $("<select id='" + id + "' />");
  if ($p && $p.metaModel()) {
    for (key in $p.metaModel()) {
      select.append("<option value='" + key + "'>" +
                    $p.metaModel()[key].label + "</option>");
    }
  }
  return select;
};

rhizo.layout.NoLayout = function() {};

rhizo.layout.NoLayout.prototype.layout = function(container,
                                                  supermodels,
                                                  meta,
                                                  opt_options) {};

rhizo.layout.NoLayout.prototype.toString = function() {
  return "-";
};

rhizo.layout.FlowLayout = function(opt_top, opt_left) {
  this.top = opt_top || 5;
  this.left = opt_left || 5;
};

rhizo.layout.FlowLayout.prototype.layout = function(container,
                                                    supermodels,
                                                    meta,
                                                    opt_options) {
  var maxWidth = $(container).width();
  var lineHeight = 0;

  // reorder supermodels if needed
  var order = $('#rhizo-flowlayout-order').val();
  var reverse = $('#rhizo-flowlayout-desc:checked').length > 0;
  if (order) {
    rhizo.log("Sorting by " + order);
    supermodels.sort(rhizo.meta.sortBy(order, meta[order].kind, reverse));
  }

  // layout supermodels
  for (var i = 0, len = supermodels.length; i < len; i++) {
    var r = $(supermodels[i].rendering);
    lineHeight = Math.max(lineHeight, r.height());

    if (this.left + r.width() > maxWidth) {
      this.left = 5;
      this.top += lineHeight + 5;
      lineHeight = r.height();
    }

    r.move(this.top, this.left);
    this.left += r.width() + 5;
  }
  // adjust top after last line
  this.top += lineHeight;
};

rhizo.layout.FlowLayout.prototype.cleanup = function() {
  this.top = this.left = 5;
};

rhizo.layout.FlowLayout.prototype.details = function() {
  return $("<div />").
           append("Ordered by: ").
           append(rhizo.layout.metaModelKeySelector('rhizo-flowlayout-order')).
           append(" desc?").
           append('<input type="checkbox" id="rhizo-flowlayout-desc" />');
};

rhizo.layout.FlowLayout.prototype.toString = function() {
  return "List";
};

rhizo.layout.ScrambleLayout = function() {};

rhizo.layout.ScrambleLayout.prototype.layout = function(container,
                                                        supermodels,
                                                        meta,
                                                        opt_options) {
  if (opt_options && opt_options.filter) {
    return; // re-layouting because of filtering doesn't affect the layout
  }
  var maxWidth = Math.round($(container).width()*0.3) ;
  var maxHeight = Math.round($(container).height()*0.3);

  for (var i = 0, len = supermodels.length; i < len; i++) {
    var r = $(supermodels[i].rendering);
    var top = Math.round($(container).height() / 3 +
                         Math.random()*maxHeight*2 - maxHeight);
    var left = Math.round($(container).width() / 3 +
                          Math.random()*maxWidth*2 - maxWidth);

    r.move(top, left);
  }
};

rhizo.layout.ScrambleLayout.prototype.toString = function() {
  return "Random";
};

rhizo.layout.BucketLayout = function() {
  this.internalFlowLayout_ = new rhizo.layout.FlowLayout();
  this.bucketHeaders_ = [];
};

rhizo.layout.BucketLayout.prototype.layout = function(container,
                                                      supermodels,
                                                      meta,
                                                      opt_options) {
  var reverse = $('#rhizo-bucketlayout-desc:checked').length > 0;

  // detect bucket
  var bucketBy = $('#rhizo-bucketlayout-bucket').val();
  if (!meta[bucketBy]) {
    rhizo.error("layoutBy attribute does not match any property");
    return;
  }
  rhizo.log("Bucketing by " + bucketBy);

  var clusterFunction;
  var clusterThis;
  if (meta[bucketBy].cluster) {
    clusterFunction = meta[bucketBy].cluster;
    clusterThis = meta[bucketBy];
  } else {
    clusterFunction = meta[bucketBy].kind.cluster;
    clusterThis = meta[bucketBy].kind;
  }
  var buckets = {};
  var bucketsLabels = {};

  // figure out the bucket for each model
  for (var i = 0, len = supermodels.length; i < len; i++) {
    var bucketKey = supermodels[i].unwrap()[bucketBy];
    var bucketLabel = bucketKey;
    if (clusterFunction) {
      var keyLabel = clusterFunction.call(clusterThis, bucketKey);
      bucketKey = keyLabel['key'];
      bucketLabel = keyLabel['label'];
    }
    if (!buckets[bucketKey]) {
      buckets[bucketKey] = []
      bucketsLabels[bucketKey] = bucketLabel;
    }
    buckets[bucketKey].push(supermodels[i]);
  }

  // collect unique bucketKeys
  var bucketKeys = [];
  for (bucketKey in buckets) {
    bucketKeys.push(bucketKey);
  }

  // sort bucketKeys
  bucketKeys.sort(rhizo.meta.sortByKind(meta[bucketBy].kind, reverse));

  bucketKeys.forEach(function(bucketKey) {
    this.renderBucketHeader_(container, bucketsLabels[bucketKey]);
    this.internalFlowLayout_.layout(container,
                                    buckets[bucketKey],
                                    meta,
                                    opt_options);

    // re-position for next bucket
    this.internalFlowLayout_.top += 10;
    this.internalFlowLayout_.left = 5;
  }, this);
};

rhizo.layout.BucketLayout.prototype.renderBucketHeader_ =
    function(container, header) {
  var bucketHeader = $("<div class='rhizo-bucket-header'>" +
                       header +
                       "</div>");
  bucketHeader.css('position', 'absolute').
               css('left', 5).
               css('top', this.internalFlowLayout_.top);
  this.bucketHeaders_.push(bucketHeader);
  $(container).append(bucketHeader);
  this.internalFlowLayout_.top += bucketHeader.height() + 5;
};


rhizo.layout.BucketLayout.prototype.details = function() {
  return $("<div />").
           append("Group by: ").
           append(rhizo.layout.metaModelKeySelector('rhizo-bucketlayout-bucket')).
           append(" desc?").
           append('<input type="checkbox" id="rhizo-bucketlayout-desc" />');
};

rhizo.layout.BucketLayout.prototype.cleanup = function() {
  this.internalFlowLayout_.cleanup();
  this.bucketHeaders_.forEach(function(bucketHeader) {
    $(bucketHeader).remove();
  });
  this.bucketHeaders_ = [];
};

rhizo.layout.BucketLayout.prototype.toString = function() {
  return "Buckets";
};


rhizo.layout.layouts = {
  no: new rhizo.layout.NoLayout(),
  flow: new rhizo.layout.FlowLayout(),
  scramble: new rhizo.layout.ScrambleLayout(),
  bucket: new rhizo.layout.BucketLayout()
};
