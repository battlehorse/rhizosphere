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

(function() {

  var SampleObject = function(id) {
    this.id = id;
    this.stringid = '' + id;

    // Assign random parent ids, to be able to apply tree layouts.
    this.parentId = Math.floor(Math.random()*id);
    if (this.parentId < 1) {
      this.parentId = null;
    }
  };

  SampleObject.prototype.toString = function() {
    return this.id;
  };


  var numModels = 1000;
  var numregex = new RegExp('num=(\\d+)');
  var numresults = numregex.exec(document.location.href);
  if (numresults && numresults[1]) {
    numModels = parseInt(numresults[1], 10);
  }

  var models = [];
  for (var i = 1; i <= numModels; i++) {
    models.push(new SampleObject(i));
  }

  var metamodel = {
    id: { kind: rhizo.meta.Kind.NUMBER, label: "Id" },
    stringid: { kind: rhizo.meta.Kind.STRING, label: "Id (String)" },
    parentId: { kind: rhizo.meta.Kind.NUMBER, label: "Parent Id" }
  };

  // Note that the renderer returns raw strings instead of jQuery objects.
  // This speeds up rendering operations at startup time, which is noticeable
  // when thousands of elements are involved: a) the html of all the renderings
  // is attached to the DOM in a single pass, b) accessing CSS positioning
  // information is faster as a consequence.
  var renderer = {
    render: function(model) {
      var backgroundColor = 150 + (parseInt(model.id, 10) % 100);
      return "<div  class='rhizo-sample' style='background-color: rgb(150, 150, " +
        backgroundColor +
        ")' ><p>" + model.id + "</p></div>";
    }
  };

  {{ jsonp_callback }}({
      'renderer': renderer,
      'metamodel': metamodel,
      'models': models
  });
})();
