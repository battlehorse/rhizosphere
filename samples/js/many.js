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
  };

  SampleObject.prototype.toString = function() {
    return this.id;
  };

  var models = [];
  for (var i = 1; i <= 1000; i++) {
    models.push(new SampleObject('' + i));
  }

  var metamodel = {
    id: { kind: rhizo.meta.Kind.STRING, label: "Id" }
  };

  var renderer = {
    render: function(model) {
      var backgroundColor = 150 + (parseInt(model.id, 10) % 100);
      return $("<div style='background-color: rgb(150, 150, " +
               backgroundColor +
               ")' ><p style='padding: 2px'>" + model.id + "</p></div>");
    }
  };

  {{ jsonp_callback }}({
      'renderer': renderer,
      'metamodel': metamodel,
      'models': models
  });
})();
