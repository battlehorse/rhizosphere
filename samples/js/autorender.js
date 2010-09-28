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
  var Number = function(id, name) {
    this.id = id;
    this.name = name;
    this.val = parseInt(this.id, 10);
    this.inverse = 10 - this.val;
  };

  Number.prototype.toString = function() {
    return this.name;
  };

  var models = [
    new Number("1", "one"),
    new Number("2", "two"),
    new Number("3", "three"),
    new Number("4", "four"),
    new Number("5", "five"),
    new Number("6", "six"),
    new Number("7", "seven"),
    new Number("8", "eight"),
    new Number("9", "nine"),
    new Number("10", "ten")
  ];

  var metamodel = {
    name: { kind: rhizo.meta.Kind.STRING, label: "Name" , ar: { master: true} },
    val: { kind: rhizo.meta.Kind.RANGE, label: "Value",
           min: 1, max: 10, stepping: 1, ar: {bind: 'size'}},
    inverse: { kind: rhizo.meta.Kind.NUMBER, label: "Inverse", ar: {bind: 'color'}}
  };

  var renderer = new rhizo.autorender.AR(metamodel, models, true, 0);

  {{ jsonp_callback }}({
      'renderer': renderer,
      'metamodel': metamodel,
      'models': models});
})();
