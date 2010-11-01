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

// RHIZODEP=rhizo
namespace("rhizo");

rhizo.nativeConsoleExists = function() {
  return typeof(console) !== 'undefined' && console != null;
};

rhizo.NoOpLogger = function() {};
rhizo.NoOpLogger.prototype.info = function() {};
rhizo.NoOpLogger.prototype.error = function() {};
rhizo.NoOpLogger.prototype.warn = function() {};

rhizo.NativeLogger = function() {};

rhizo.NativeLogger.prototype.info = function(message) {
  console.info(message);
};

rhizo.NativeLogger.prototype.error = function(message) {
  console.error(message);
};

rhizo.NativeLogger.prototype.warn = function(message) {
  console.warn(message);
};

rhizo.Logger = function(gui) {
  this.console_ = gui.getComponent('rhizo.ui.component.Console');
  this.rightBar_ = gui.getComponent('rhizo.ui.component.RightBar');
};

rhizo.Logger.prototype.log_ = function(message, opt_severity) {
  var severity = opt_severity || 'info';
  var highlightColor = "#888";
  switch(severity) {
    case "error":
      highlightColor = "#ff0000";
      break;
    case "warn":
      highlightColor = "#ffff00";
      break;
  }

  var d = new Date();
  var dateMsg = d.getHours() + ":" +
                d.getMinutes() + ":" +
                d.getSeconds() + " ";
  var htmlMsg = $("<p class='rhizo-log-" + severity + "'>" +
                  dateMsg + message + "</p>");

  this.console_.getContents().prepend(htmlMsg);
  if (opt_severity) {
    htmlMsg.effect("highlight", {color: highlightColor }, 1000);
  }
  if (!this.console_.getContents().is(':visible') && opt_severity) {
    if (this.rightBar_ && !this.rightBar_.isCollapsed()) {
      this.rightBar_.getToggle().effect(
          "highlight", {color: highlightColor }, 1000);
    } else {
      this.console_.getHeader().effect(
          "highlight", {color: highlightColor }, 1000);
    }
  }
};

rhizo.Logger.prototype.info = function(message) {
  this.log_(message);
};

rhizo.Logger.prototype.error = function(message) {
  this.log_(message, "error");
};

rhizo.Logger.prototype.warn = function(message) {
  this.log_(message, "warn");
};
