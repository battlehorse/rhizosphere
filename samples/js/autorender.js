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

namespace("sample");

sample.Number = function(id, name) {
  this.id = id;
  this.name = name;
  this.val = parseInt(this.id, 10);
  this.inverse = 10 - this.val;
};

sample.Number.prototype.toString = function() {
  return this.name;
};


var models = [
  new sample.Number("1", "one"),
  new sample.Number("2", "two"),
  new sample.Number("3", "three"),
  new sample.Number("4", "four"),
  new sample.Number("5", "five"),
  new sample.Number("6", "six"),
  new sample.Number("7", "seven"),
  new sample.Number("8", "eight"),
  new sample.Number("9", "nine"),
  new sample.Number("10", "ten")
];

var metamodel = {
  name: { kind: rhizo.meta.Kind.STRING, label: "Name" , ar: { master: true} },
  val: { kind: rhizo.meta.Kind.RANGE, label: "Value", min: 1, max: 10, stepping: 1, ar: {bind: 'size'}},
  inverse: { kind: rhizo.meta.Kind.NUMBER, label: "Inverse", ar: {bind: 'color'}}
};

var renderer = new rhizo.autorender.AR(metamodel, models, true, 0);

{{ jsonp_callback }}({
  'renderer': renderer,
  'metamodel': metamodel,
  'models': models});
