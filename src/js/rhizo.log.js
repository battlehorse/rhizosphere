/**
  @license
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

/**
 * @fileOverview Rhizosphere logging facilities.
 */

// RHIZODEP=rhizo
namespace("rhizo.log");

/**
 * Creates a new logger object. The logger is tailored to target the browser
 * console, with the following additions: a log level can be configured,
 * causing all logging messages below the desired level to be silently
 * discarded. The logger can be attached to a project, in which case all (and
 * only) 'error'-level messages will published on the project event bus for
 * other listeners to react to them. Error-level messages are assumed to
 * require the user attention, so listeners can collect them for the purpose of
 * displaying visible error messages.
 *
 * @param {rhizo.Project=} opt_project The optional visualization project the
 *     logger belongs to.
 * @param {rhizo.Options=} opt_options An optional configuration object. The only
 *     setting currently used is 'logLevel' to define which log messages to
 *     ignore and which to display. The following values are accepted:
 *     'debug', 'info', 'warn', 'time', 'error'. At 'error' level only messages
 *     that require the user attention are retained. The 'time' level extends
 *     the previous one to include performance timings and application
 *     profiling. 'warn', 'info' and 'debug' levels further extend the scope of
 *     logged messages, with the last one being the most detailed.
 * @return {!Object} A logger object that exposes an API equivalent to the
 *     browser console API (see http://getfirebug.com/logging), including the
 *     standard error(), warn() and info() methods. Depending on the chosen
 *     log level, parts of the console API will be no-ops.
 */
rhizo.log.newLogger = function(opt_project, opt_options) {
  var logLevel = rhizo.log.getLogLevel(opt_options);
  var logger = {};

  var methods = 'dir dirxml count debug log info warn time timeEnd group groupEnd error'.split(' ');
  var logThresholdReached = false;
  for (var i = methods.length; i >= 0; i--) {
    logThresholdReached ?
        rhizo.log.createNoOp(methods[i], logger) :
        rhizo.log.createDelegate(methods[i], logger, window['console']);
    logThresholdReached = logThresholdReached || methods[i] == logLevel;
  }

  if (opt_project) {
    var delegate = logger['error'];
    logger['error'] = function() {
      opt_project.eventBus().publish(
          'error', 
          {arguments: Array.prototype.slice.call(arguments)});
      delegate.apply(logger, arguments);
    };
  }
  return logger;
};

/**
 * Extracts the desired log level new loggers should use.
 * @param {rhizo.Options=} opt_options The logger configuration object.
 * @return The desired log level. Defaults to 'error' if unspecified.
 */
rhizo.log.getLogLevel = function(opt_options) {
  var logLevel = 'error';
  if (opt_options && opt_options.logLevel()) {
    logLevel = opt_options.logLevel();
  }
  var chooseableLevels = {
    debug: true, info: true, warn: true, time: true, error: true};
  if (!(logLevel in chooseableLevels)) {
    logLevel = 'error';
  }
  return logLevel;
};

/**
 * Creates a pass-through delegate method from sourceLogger to targetLogger.
 *
 * @param {string} method The method to delegate.
 * @param {!Object} sourceLogger The source logger that will receive method
 *     calls.
 * @param {!Object} targetLogger The target logger the calls will be delegated
 *     to, iff it exposes the same method handling the call.
 */
rhizo.log.createDelegate = function(method, sourceLogger, targetLogger) {
  sourceLogger[method] = function() {
    targetLogger && targetLogger[method] && 
    typeof(targetLogger[method]) == 'function' &&
        targetLogger[method].apply(targetLogger, arguments);
  };
};

/**
 * Creatse a no-op method on the given logger.
 *
 * @param {string} method The no-op method to add.
 * @param {!Object} sourceLogger The logger to modify
 */
rhizo.log.createNoOp = function(method, sourceLogger) {
  sourceLogger[method] = function() {};
};

