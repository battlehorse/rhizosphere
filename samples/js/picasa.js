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

(function() {
  // Load an additional library we need to create photo-frame effects to 
  // thumbnails
  var e = document.createElement("script");
  e.src = "sample/cvi_instant_lib.js";
  e.type="text/javascript";
  document.getElementsByTagName("head")[0].appendChild(e);

  // Model definition
  var models = [];
  var tilts = [ 'l', 'n', 'r'];
  var Photo = function(item) {
    this.id = item.gphoto$id['$t'];
    this.author = item.author[0].name['$t'];
    this.title = item.title['$t'];
    this.summary =  item.summary['$t'];
    this.albumtitle = item.gphoto$albumtitle['$t'];
    this.thumbnail = item.media$group.media$thumbnail[0];
    this.mpixel = item.media$group.media$content[0].width * 
      item.media$group.media$content[0].height / (1024.0 * 1024.0);
    this.bigthumbnail = item.media$group.media$content[0];  
    this.tilt = tilts[Math.floor(Math.random()*tilts.length)];
  
    var regex = new RegExp("^(\\d\\d\\d\\d)-(\\d\\d)-(\\d\\d)");
    var results = regex.exec(item.published['$t']);
    this.published = new Date(
      parseInt(results[1], 10),
      parseInt(results[2], 10)-1,
      parseInt(results[3], 10));
  };

  // Renderer definition
  var renderer = {
    render: function(model, expanded, opt_options) {
      if (!expanded) {
        var container = $("<div style='padding: 5px'></div>");
        var img = $("<img src='" + model.thumbnail.url + 
                    "' width='" + model.thumbnail.width + 
                    "' height='" + model.thumbnail.height + 
                    "' />").appendTo(container);      
        cvi_instant.add(img.get(0), {tilt: model.tilt});
        $("<p style='font-size:10px'>by <b>" +  
          model.author + 
          '</b></p>').appendTo(container);
        return container;
      } else {
        return $("<div style='padding: 5px'>" +
                 "<p style='font-size:10px'>" +
                 'by <b>' +  model.author + '</b></p>' +
                 '<p>' + model.summary + '</p>' +
                 "</div>");
      }
    },
    expandable: true
  };

  // Choose a tag (either a default or extracted from the URL) to query picasa with
  var tag = 'flower';
  var tagregex = new RegExp('tag=([^&]*)');
  var tagresults = tagregex.exec(document.location.href);
  if (tagresults && tagresults[1]) {
    tag = unescape(tagresults[1]);
  }

  // Number of models to show
  var limit = 200;
  var url = 'http://picasaweb.google.com/data/feed/base/all?alt=json&kind=photo' +
     '&access=public&tag=' + tag + '&filter=1&hl=en_US&callback=?';
          
  // Fetch content from Picasa
  $.getJSON(
    url,
    function(data) {
      $.each(data.feed.entry, function(i, item) {
        if (i < limit) {
          models.push(new Photo(item));
        }
      });
    
      // Post-processing to identify model characteristics and ranges required
      // by the metaModel.
      var minResolution = 100;
      var maxResolution = 0;
      var minYear = 3000;
      var maxYear = 0;
      $.each(models, function(i, model) {
        minResolution = Math.min(minResolution, model.mpixel);
        maxResolution = Math.max(maxResolution, model.mpixel);  
        minYear = Math.min(minYear, model.published.getFullYear());
        maxYear = Math.max(maxYear, model.published.getFullYear());          
      });
    
      // Build the metamodel
      var decimalKind = new rhizo.meta.DecimalRangeKind(2);
      decimalKind.toHumanLabel_ = rhizo.ui.toHumanLabel;
    
      var metamodel = {
        author: { kind: rhizo.meta.Kind.STRING, label: "Name" },
        title: { kind: rhizo.meta.Kind.STRING, label: "Title" },
        mpixel: { kind: decimalKind, label: "Resolution (MP)", 
                  min: minResolution, max: maxResolution },
        published: { kind: new rhizo.meta.DateKind('y'), label: "Published", 
                     minYear: minYear, maxYear: maxYear }
      };
    
      // Roll everything out.
      {{ jsonp_callback }}({
          'renderer': renderer,
          'metamodel': metamodel,
          'models': models
      });
    });
})();
