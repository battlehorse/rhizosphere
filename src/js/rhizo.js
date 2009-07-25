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

function namespace(ns) {
  var nsParts = ns.split(".");
  var root = window;

  for (var i=0; i<nsParts.length; i++) {
    if (typeof root[nsParts[i]] == "undefined") {
      root[nsParts[i]] = {};
    }
    root = root[nsParts[i]];
  }
}

namespace("rhizo.util");

rhizo.util.LOG_E_10 = Math.log(10);

/**
   Returns the log_10() of a number.
 */
rhizo.util.log10_ = function(val) {
  return Math.log(val)/rhizo.util.LOG_E_10;
};

/**
   Returns the order of magnitude of a given number.
   E.g. for a number between 100K and 1M returns 5.
   if 0 is passed in, NaN is returned.
   @param {number} num the number to evaluate.
 */
rhizo.util.orderOfMagnitude = function(num) {
  if (num == 0) {
    return Number.NaN;  
  }
  
  // The multiply/divide by 100 trick is just to get rid of rounding errors.
  // For example, in Safari/MacOs log10(1M) would result in 5.999 instead of 6
  // and consequently floored to 5. And we cannot remove floor().
  return Math.floor(Math.round(rhizo.util.log10_(Math.abs(num))*100)/100);
};