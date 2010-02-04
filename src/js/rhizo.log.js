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

// RHIZODEP=rhizo
namespace("rhizo");

/**
 * Permanently disables logging. Turns rhizo.log into a no-op.
 */
rhizo.disableLogging = function() {
  rhizo.log = function() {};
};

rhizo.log = function(message, opt_severity) {
  var severity = opt_severity || 'info';
  var highlightColor = "#888";
  switch(severity) {
    case "error":
      highlightColor = "#ff0000";
      break;
    case "warning":
      highlightColor = "#ffff00";
      break;
  }

  var d = new Date();
  var dateMsg = d.getHours() + ":" +
                d.getMinutes() + ":" +
                d.getSeconds() + " ";
  var htmlMsg = $("<p class='rhizo-log-" + severity + "'>" +
                  dateMsg + message + "</p>");

  $('#rhizo-console-contents').prepend(htmlMsg);
  if (opt_severity) {
    htmlMsg.effect("highlight", {color: highlightColor }, 1000);
  }
  if (!$('#rhizo-console-contents').is(':visible') && opt_severity) {
    if (!$('#rhizo-right').is(':visible')) {
      $('#rhizo-right-pop').effect("highlight", {color: highlightColor }, 1000);
    } else {
      $('#rhizo-console-header').effect("highlight",
                                        {color: highlightColor }, 1000);
    }
  }
};

rhizo.error = function(message) {
  rhizo.log(message, "error");
};

rhizo.warning = function(message) {
  rhizo.log(message, "warning");
}
