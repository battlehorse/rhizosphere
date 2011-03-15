/*
  Copyright 2008 The Rhizosphere Authors. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

(function() {
  var Person = function(id, name, parentName, age, male, hobbies, salary) {
    this.id = id;
    this.name = name;
    this.parentName = parentName;
    this.age = age;
    this.male = male;
    this.hobbies = hobbies;
    this.salary = salary;
  };

  Person.prototype.toString = function() {
    return this.name + "(" + this.age + ")";
  };


  var models = [
    new Person('1', 'john', '', 30, true, ['fishing', 'soccer'], 100),
    new Person('2', 'mark', 'john', 20, true, ['fishing', 'soccer'], 200),
    new Person('3', 'battlehorse', 'john', 20, true,
               ['computer games', 'soccer'], 300),
    new Person('4', 'sara', 'battlehorse', 25, false, ['fishing', 'soccer'], 100),
    new Person('5', 'jennifer', 'battlehorse', 25, false, ['fishing', 'soccer'], 200),
    new Person('6', 'dave', 'mark', 25, true, [ 'computer games'], 300),
    new Person('7', 'carl', 'mark', 25, true, ['cycling' , 'soccer'], 100),
    new Person('8', 'aaron', 'dave', 25, true, [ ], 100),
    new Person('9', 'lucy', 'dave', 35, false, ['soccer'], 150),
    new Person('10', 'jacob', 'carl', 40, true, [], 230)
  ];

  var metamodel = {
    name: { kind: rhizo.meta.Kind.STRING, label: "Name" },
    age: { kind: rhizo.meta.Kind.RANGE, label: "Age", min: 20, max: 40, stepping: 1},
    male: { kind: rhizo.meta.Kind.BOOLEAN, label: "Male" },
    hobbies: { kind: rhizo.meta.Kind.CATEGORY, label: "Hobbies" ,
               categories: [ 'fishing', 'soccer', 'computer games' , 'cycling'],
               multiple: true},
    salary: {kind: rhizo.meta.Kind.RANGE, label: "Salary", min:100, max: 300},
    parentName: { kind: rhizo.meta.Kind.STRING, label: "Parent", isLink: true, linkKey: 'name'}
  };

  var renderer = {
    render: function(model, expanded, renderingHints) {
      if (renderingHints.small) {
        return $("<div class='rhizo-sample'>" +
                 "<p><b><span style='color:" +
                 (model.male ? "blue" : "pink") + "'>"+
                 model.name + "</span></b></p>" +
                 "</div>");
      } else {
        return $("<div class='rhizo-sample'>" +
                 "<p><b><span style='color:" +
                 (model.male ? "blue" : "pink") + "'>"+
                 model.name + "</span></b></p>" +
                 "<p><span class='dim'>Age:</span>" + model.age + "</p>" +
                 "<p style='white-space: nowrap'>" +
                 "<span class='dim'>Hobbies:</span><br />" +
                 (model.hobbies.length > 0 ? model.hobbies : "Nothing") + "<p>" +
                 "</div>");
      }
    },
    cacheDimensions: true
  };

  // uncomment to try the autorenderer here, either with or
  // without defaults ( third parameter )
  // renderer = new rhizo.autorender.AR(metamodel, models, true, 2);

  {{ jsonp_callback }}({
      'renderer': renderer,
      'metamodel': metamodel,
      'models': models});
})();
