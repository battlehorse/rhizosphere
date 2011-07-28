/**
  @license
  Copyright 2011 The Rhizosphere Authors. All Rights Reserved.

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
 * @fileOverview Defines a simple EventBus to support a publish/subscribe
 * message dispatching mechanism within the Rhizosphere framework (and between
 * the Rhizosphere framework and the outside world).
 * @author Riccardo Govoni (battlehorse@google.com)
 */

// RHIZODEP=rhizo
namespace("rhizo.eventbus");


/**
 * Global uuid counter to tag and identify each EventBus subscriber or
 * publisher.
 * @type {number}
 * @private
 */
rhizo.eventbus.nextParticipantUuid_ = 0;


/**
 * Name of the property containing the subscriber/publisher uuid (automatically
 * attached to new subscribers/publishers when they interact with the
 * EventBus).
 * @type {string}
 * @private
 */
rhizo.eventbus.uuidKey_ = '__rhizo_event_uuid';


/**
 * An EventBus exposes a publish/subscribe message dispatching mechanism based
 * on named channels.
 *
 * NOTE that although the EventBus exposes a completely asynchronous API, the
 * current implementation uses synchronous delivery of messages.
 * @constructor
 */
rhizo.eventbus.EventBus = function() {
  /**
   * @private
   * @type {!Object.<string, rhizo.eventbus.Channel_>}
   */
  this.channels_ = {};
};

/**
 * Destroys the EventBus.
 */
rhizo.eventbus.EventBus.prototype.destroy = function() {
  this.channels_ = {};
};

/**
 * Adds a subscriber to the requested channel.
 * @param {string} channel The channel to subscribe to.
 * @param {!function(Object)} subscriberCallback The callback to invoke whenever
 *     a message is published on the channel. The callback receives the message
 *     as the only parameter.
 * @param {!Object} subscriber The subscriber object, typically the object that
 *     owns the subscriberCallback. The callback will be invoked with
 *     'subscriber' as the this scope.
 * @param {boolean=} opt_committed Whether the subscriber should receive
 *     message notifications while they are 'in flight' or 'committed'. Channel
 *     messages may command mutations on Rhizosphere entities that subscribers
 *     might want to query. Requesting notification on commit guarantees the
 *     subscriber to be notified after mutations have been applied. Defaults to
 *     'in flight'.
 */
rhizo.eventbus.EventBus.prototype.subscribe = function(
    channel, subscriberCallback, subscriber, opt_committed) {
  this.getChannel_(channel).addSubscriber(
      subscriberCallback, subscriber, opt_committed);
};

/**
 * Removes a subscriber from a given channel
 * @param {string} channel The channel to unsubscribe from.
 * @param {!Object} subscriber The subscriber to remove.
 */
rhizo.eventbus.EventBus.prototype.unsubscribe = function(channel, subscriber) {
  if (!(channel in this.channels_)) {
    return;
  }
  this.channels_[channel].removeSubscriber(subscriber);
};

/**
 * Adds a preprocessor to the requested channel. A preprocessor inspects and
 * manipulates published messages before they are delivered to any subscriber,
 * and can veto the delivery of a message.
 *
 * Preprocessors are executed in strict sequential order.
 *
 * @param {string} channel The channel to add the preprocessor to.
 * @param {!function(Object, function())} preprocessorCallback The callback is
 *     invoked whenever a new message is published on the channel. It receives
 *     the message as the first parameter and a response function as the
 *     second. The response function accepts 2 parameters: a boolean indicating
 *     whether the message can be published or not and a details string to
 *     describe the reason for veto (if any).
 * @param {!Object} preprocessor The object owning the callback. The callback
 *     will be invoked with 'preprocessor' as the this scope.
 * @param {boolean=} opt_first Whether this preprocessor should be inserted
 *     at the beginning of the current queue of preprocessors for this channel,
 *     rather than at the end (default).
 */
rhizo.eventbus.EventBus.prototype.addPreprocessor = function(
    channel, preprocessorCallback, preprocessor, opt_first) {
  this.getChannel_(channel).addPreprocessor(
      preprocessorCallback, preprocessor, opt_first);
};

/**
 * Removes a preprocessor from a given channel.
 * @param {string} channel The channel to remove the preprocessor from.
 * @param {!Object} preprocessor The preprocessor to remove.
 */
rhizo.eventbus.EventBus.prototype.removePreprocessor = function(
    channel, preprocessor) {
  if (!(channel in this.channels_)) {
    return;
  }
  this.channels_[channel].removePreprocessor(preprocessor);
};

/**
 * Publishes a message on the channel.
 * @param {string} channel The channel to publish to.
 * @param {!Object} message The message to publish.
 * @param {function(boolean, string=)=} opt_callback Optional callback invoked
 *     after the message has been dispatched to all subscribers (but not
 *     necessarily after the subscribers processed it). It receives two
 *     parameters: a boolean indicating whether the message was successfully
 *     published and a string containing the details in case the message was
 *     not published.
 * @param {Object=} opt_sender The message sender. If present, the EventBus
 *     guarantees the message won't be routed back to the sender if it happens
 *     to be a subscriber on the same channel it is publishing to. If present,
 *     it will be the 'this' scope for opt_callback.
 */
rhizo.eventbus.EventBus.prototype.publish = function(
    channel, message, opt_callback, opt_sender) {
  if (!(channel in this.channels_)) {
    opt_callback && opt_callback.call(opt_sender, true);
    return;
  }
  this.channels_[channel].publish(message, opt_callback, opt_sender);
};

rhizo.eventbus.EventBus.prototype.getChannel_ = function(channel) {
  if (!(channel in this.channels_)) {
    this.channels_[channel] = new rhizo.eventbus.Channel_(channel);
  }
  return this.channels_[channel];
};


/**
 * An EventBus channel.
 * @private
 * @constructor
 */
rhizo.eventbus.Channel_ = function(name) {
  /**
   * The channel name.
   * @type {string}
   * @private
   */
  this.name_ = name;

  /**
   * The channel preprocessors, keyed by their unique identifier on the
   * eventbus.
   * @type {!Object.<number, function()>}
   * @private
   */
  this.preprocessors_ = {};

  /**
   * The channel preprocessors, in execution order.
   * @type {!Array.<function()>}
   * @private
   */
  this.preprocessorsOrder_ = [];

  /**
   * The channel subscribers, keyed by their unique identifier on the eventbus,
   * that will be notified as soon as messages are published ('in flight'
   * notification phase).
   * @type {!Object.<number, function()>}
   * @private
   */
  this.subscribers_ = {};

  /**
   * The channel subscribers, keyed by their unique identifier on the eventbus,
   * that will be notified after the mutations driven by published messages
   * have been committed ('committed' notification phase).
   * @type {!Object.<number, function()>}
   * @private
   */
  this.commitSubscribers_ = {};
};

/**
 * Adds a subscriber to the channel.
 * @param {!function(Object)} subscriberCallbackThe callback to invoke whenever
 *     a message is published on the channel. The callback receives the message
 *     as the only parameter.
 * @param {!Object} subscriber The subscriber object, typically the object that
 *     owns the subscriberCallback. The callback will be invoked with
 *     'subscriber' as the this scope.
 * @param {boolean=} opt_committed Whether the subscriber should receive
 *     message notifications while they are 'in flight' or 'committed'.
 */
rhizo.eventbus.Channel_.prototype.addSubscriber = function(
    subscriberCallback, subscriber, opt_committed) {
  this.add_(
      !!opt_committed ? this.commitSubscribers_ : this.subscribers_,
      subscriberCallback, subscriber);
};

/**
 * Adds a preprocessor to the requested channel.
 *
 * @param {!function(Object, function())} preprocessorCallback The callback is
 *     invoked whenever a new message is published on the channel. It receives
 *     the message as the first parameter and a response function as the
 *     second. The response function accepts 2 parameters: a boolean indicating
 *     whether the message can be published or not and a details string to
 *     describe the reason for veto (if any).
 * @param {!Object} preprocessor The object owning the callback. The callback
 *     will be invoked with 'preprocessor' as the this scope.
 * @param {boolean=} opt_first Whether this preprocessor should be inserted
 *     at the beginning of the current queue of preprocessors for this channel,
 *     rather than at the end (default).
 */
rhizo.eventbus.Channel_.prototype.addPreprocessor = function(
    preprocessorCallback, preprocessor, opt_first) {
  var cb = this.add_(this.preprocessors_, preprocessorCallback, preprocessor);
  if (!!opt_first) {
    this.preprocessorsOrder_.splice(0, 0, cb);
  } else {
    this.preprocessorsOrder_.push(cb);
  }
};

/**
 * Removes a subscriber from the channel.
 * @param {!Object} subscriber The subscriber to remove.
 */
rhizo.eventbus.Channel_.prototype.removeSubscriber = function(subscriber) {
  this.remove_(this.subscribers_, subscriber);
  this.remove_(this.commitSubscribers_, subscriber);
};

/**
 * Removes a preprocessor from the channel.
 * @param {!Object} preprocessor The preprocessor to remove.
 */
rhizo.eventbus.Channel_.prototype.removePreprocessor = function(preprocesssor) {
  var cb = this.remove_(this.preprocessors_, preprocesssor);
  for (var i = 0; i < this.preprocessorsOrder_.length; i++) {
    if (cb == this.preprocessorsOrder_[i]) {
      this.preprocessorsOrder_.splice(i, 1);
      return;
    }
  }
};

/**
 * Publishes a message on the channel.
 *
 * @param {Object} message The message to publish.
 * @param {function(boolean, string=)=} opt_callback Optional callback invoked
 *     after the message has been dispatched to all subscribers (but not
 *     necessarily after the subscribers processed it). It receives two
 *     parameters: a boolean indicating whether the message was successfully
 *     published and a string containing the details in case the message was
 *     not published.
 * @param {Object=} opt_sender The message sender. If present, the channel
 *     guarantees the message won't be routed back to the sender if it happens
 *     to be a subscriber on this same channel. If present,
 *     it will be the 'this' scope for opt_callback.
 */
rhizo.eventbus.Channel_.prototype.publish = function(
    message, opt_callback, opt_sender) {
  message = message || {};
  var preprocessorsQueue = this.preprocessorsOrder_.slice(0);
  this.preprocess_(message, preprocessorsQueue, jQuery.proxy(
      function(valid, details) {
    if (!valid) {
      opt_callback && opt_callback.call(opt_sender, false, details);
    } else {
      this.send_(message, opt_callback, opt_sender);
    }
  }, this));
};

/**
 * Hands a message to a queue of preprocessor, proceeding through them in
 * sequential order. Executes the callback as soon as one preprocessor rejects
 * the message or the entire queue has been executed.
 *
 * @param {!Object} message The message to preprocess.
 * @param {Array.<!function()>} preprocessorsQueue The queue of preprocessors to
 *     execute.
 * @param {!function(boolean, string=)} callback The callback invoked either at
 *     the end of the queue or as soon as one preprocessor rejects the message.
 *     It takes two parameters: a boolean indicating the message rejection
 *     status and an optional string containing details.
 * @private
 */
rhizo.eventbus.Channel_.prototype.preprocess_ = function(
    message, preprocessorsQueue, callback) {
  if (preprocessorsQueue.length == 0) {
    callback(true);
    return;
  }
  var preprocesssor = preprocessorsQueue[0];
  preprocesssor(message, jQuery.proxy(function(valid, details) {
    if (!valid) {
      callback(false, details);
    } else {
      this.preprocess_(message, preprocessorsQueue.slice(1), callback);
    }
  }, this));
};

/**
 * Sends a message to all the channel subscribers, minus the sender.
 * @param {!Object} message The message to send.
 * @param {function(boolean, string=)=} opt_callback The callback to invoke
 *     after the message has been delivered to all the subscribers.
 * @param {Object=} opt_sender The message sender, if any.
 * @private
 */
rhizo.eventbus.Channel_.prototype.send_ = function(
    message, opt_callback, opt_sender) {
  this.sendToSubscriberPool_(message, this.subscribers_, opt_sender);
  this.sendToSubscriberPool_(message, this.commitSubscribers_, opt_sender);
  opt_callback && opt_callback.call(opt_sender, true);
};

/**
 * Sends  a message to a given pool of subscribers, excluding the sender if
 * part of the pool.
 * @param {!Object} message The message to send.
 * @param {!Object.<number, function()>} pool The pool of subscribers to target.
 * @param {Object=} opt_sender The message sender, if any.
 */
rhizo.eventbus.Channel_.prototype.sendToSubscriberPool_ = function(
    message, pool, opt_sender) {
  for (var subscriberId in pool) {
    if (opt_sender && subscriberId == opt_sender[rhizo.eventbus.uuidKey_]) {
      continue;
    }
    pool[subscriberId](message);
  }
};

/**
 * Adds one subscriber/preprocessor to the channel.
 * @param {!Object} pool The pool to add the object to.
 * @param {!function()} callback The subscriber/preprocessor callback to add.
 * @param {!Object} source The callback owner.
 * @return {!function()} The applied callback, i.e. the callback already tied to
 *     its source scope.
 * @private
 */
rhizo.eventbus.Channel_.prototype.add_ = function(pool, callback, source) {
  if (typeof(source[rhizo.eventbus.uuidKey_]) == 'undefined') {
    source[rhizo.eventbus.uuidKey_] = rhizo.eventbus.nextParticipantUuid_++;
  }
  var uuid = source[rhizo.eventbus.uuidKey_];
  pool[uuid] = function() { callback.apply(source, arguments); };
  return pool[uuid];
};

/**
 * Removes one subscriber/preprocessor callback from the channel.
 * @param {!Object} pool The pool to remove the callback from.
 * @param {Object} source The owner of the subscriber/preprocessor callback to
 *     remove.
 * @return {?function()} The removed callback (in applied form), if any.
 */
rhizo.eventbus.Channel_.prototype.remove_ = function(pool, source) {
  if (typeof(source[rhizo.eventbus.uuidKey_]) == 'undefined') {
    return null;
  }
  var cb = pool[source[rhizo.eventbus.uuidKey_]];
  delete pool[source[rhizo.eventbus.uuidKey_]];
  return cb;
};
