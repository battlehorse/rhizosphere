/*
  Copyright 2010 The Rhizosphere Authors. All Rights Reserved.

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

// RHIZODEP=rhizo,rhizo.ui.component,rhizo.state
namespace("rhizo.broadcast");

/**
 * This file defines Rhizosphere broadcasting infrastructure. Visualizations
 * can publish their current state for other remote ones to follow.
 *
 * Broadcasting relies on existing Rhizosphere state management to distribute
 * the visualization state remotely:
 * - A 'broadcasting' visualization publishes its current state to a server.
 * - A 'follower' visualization receives notifications from the same server
 *   whenever state changes occur.
 *
 * Users can use this feature to enable a sort of 'presentation mode' for
 * visualizations.
 *
 * Broadcasting relies on AJAX and AppEngine Channel APIs respectively to send
 * and receive state changes. See appengine/src/py/handlers/broadcast.py for
 * details about the specific implementation.
 *
 * Broadcasting relies on 2 URL parameters which are shared from broadcasters to
 * all followers for them to identify and connect to the broadcasting
 * visualization:
 * - 'follow': An uuid to uniquely identify this visualization broadcasting
 *   session.
 * - 'pid': The project id of the broadcasting visualization. The following
 *   visualization must have the same pid for it to be able to follow the
 *   broadcaster.
 *
 * On the client side:
 * - both broadcasters and followers can stop/resume their activity. When
 *   following is resumed, the visualization state is updated to match the
 *   current state on the broadcasting side, reverting any local changes that
 *   may have been applied.
 * - A 'following' visualization does not explicitly disable its local controls.
 *   The follower state can therefore diverge from the broadcasting one if the
 *   user changes the local filters, selections, layout etc...
 *   It is up to the developer to roll out a restricted visualization whose UI
 *   does not permit this to happen, for example by using a custom template that
 *   disables layout, selection and filters (see rhizo.ui.component.js).
 *
 * Since broadcasting is built on top of Rhizosphere state managers, any local
 * state management feature works also for remote broadcasting. This implies,
 * for instance, that the local HTML5 history will record states received from
 * a remote broadcasting visualization. This allows a 'following' visualization
 * to replay all the operations performed remotely, even when the remote
 * broadcasting visualization is gone (or we have stopped following it).
 *
 * Broadcasting is an EXPERIMENTAL feature and as such is constrained and
 * limited in various ways:
 * - because of the use of Ajax and same-origin security policy, broadcasting
 *   will work only for visualizations that are served by the same server that
 *   is used to dispatch broadcast messages.
 *
 * - broadcasting relies on Google AppEngine Channel APIs. Any limitation that
 *   exists on the Channel API applies here too.
 *
 * - No notification exists about the number of remote users attending a given
 *   broadcasting visualization. No notification exists when new users join or
 *   leave a broadcasting visualization.
 *
 * - We do not deal with out-of-order messages.
 *
 * - Broadcasting is broken when multiple visualizations are present in a page.
 *   Since the broadcaster publishes the full state (including the state of
 *   other visualizations), this may interfere with the state of visualizations
 *   on the following side, even though they are not actively following
 *   anything.
 *
 * - Broadcasting uses unique URLs (to be shared with other participants) to
 *   let followers identify and connect to the visualization. As such,
 *   broadcasting may be impaired when the broadcaster or follower
 *   visualizations are in an embedded context, where the document URL may not
 *   be accessible / changeable.
 *
 * - Several other server-side limitations exist. See
 *   appengine/src/py/handlers/broadcast.py for details.
 */

// ToDO(battlehorse): Track the number of people attending.
// TODO(battlehorse): Detect channels closing/opening (both server and client).
// TODO(battlehorse): Handle receptoin of out-of-order states
// TODO(battlehorse): Do not broadcast the global state and/or only extract
//   the portion of state that affects the broadcast visualization, to avoid
//   corruption of other visualizations when multiple ones are present in a
//   page.

/**
 * A dual-purpose UI component to let the user start/stop broadcasting or
 * start/stop the remote following of a broadcasting visualization.
 *
 * @param {rhizo.Project} project  The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @constructor
 */
rhizo.broadcast.BaseComponent = function(project, options) {
  rhizo.ui.component.Component.call(this, project, options,
                                    'rhizo.broadcast.BaseComponent');
  this.specialized_component_ = null;
};
rhizo.inherits(rhizo.broadcast.BaseComponent, rhizo.ui.component.Component);

rhizo.broadcast.BaseComponent.prototype.title = function() {
  return 'Broadcast';
};

rhizo.broadcast.BaseComponent.prototype.render = function() {
  var broadcastPanel = $('<div />', {'class': 'rhizo-broadcast'});
  if (!rhizo.broadcast.globalTransmitter()) {
    this.project_.logger().warn(
        'Channels API not loaded. Broadcasting is disabled');
    return broadcastPanel.get(0);
  }

  // Decide whether we are following or not. If not, allow broadcasting.
  var urlParams = rhizo.util.urlParams();
  if ('follow' in urlParams && urlParams.pid == this.project_.uuid()) {
    // Start the component in following mode.
    this.specialized_component_ = new rhizo.broadcast.FollowComponent(
        this.project_, this.options_, urlParams['follow']);
  } else {
    // Start the component in broadcast mode.
    this.specialized_component_ = new rhizo.broadcast.BroadcastComponent(
        this.project_, this.options_);
  }

  broadcastPanel.append(this.specialized_component_.render());
  return broadcastPanel.get(0);
};

rhizo.broadcast.BaseComponent.prototype.metaReady = function() {
  this.specialized_component_.metaReady();
};

rhizo.broadcast.BaseComponent.prototype.ready = function() {
  this.specialized_component_.ready();
};


/**
 * A component specialed for following visualizations, that lets the user
 * stop/resume following. The componet tries to attach to the broadcasting
 * channel at startup.
 *
 * @param {rhizo.Project} project  The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @param {string} followed_channel_uuid The broadcasting channel uuid.
 * @constructor
 */
rhizo.broadcast.FollowComponent = function(project,
                                           options,
                                           followed_channel_uuid) {
  rhizo.ui.component.Component.call(this, project, options);
  this.followed_channel_uuid_ = followed_channel_uuid;
  this.following_ = false;
};
rhizo.inherits(rhizo.broadcast.FollowComponent, rhizo.ui.component.Component);

rhizo.broadcast.FollowComponent.prototype.render = function() {
  this.follow_ = $('<button />', {'disabled': 'disabled'}).text('Initializing');
  this.tip_ = $('<p />');
  return [this.follow_.get(0), this.tip_.get(0)];
};

rhizo.broadcast.FollowComponent.prototype.ready = function() {
  this.resumeFollowing_();
  this.follow_.removeAttr('disabled').click(jQuery.proxy(function() {
    if (this.following_) {
      this.stopFollowing_();
    } else {
      this.resumeFollowing_();
    }
  }, this));
};

/**
 * Resumes following the remote broadcasting visualization.
 * @private
 */
rhizo.broadcast.FollowComponent.prototype.resumeFollowing_ = function() {
  this.follow_.text('Wait ...');
  this.tip_.text('Connecting to the remote visualization...');
  rhizo.broadcast.globalTransmitter().follow(
      this.followed_channel_uuid_, true, jQuery.proxy(function(status,
                                                               text,
                                                               initial) {
    if (status) {
      // successfully following the channel.
      // The server will now send updates to us.

      // Start a binder to collect states received over the wire.
      // The project overlord is guaranteed to exist here, since the ready()
      // component phase occurs after its creation.
      var projectOverlord =
          rhizo.state.getMasterOverlord().projectOverlord(this.project_);
      var binder = new rhizo.broadcast.FollowStateBinder(
          projectOverlord, rhizo.broadcast.globalTransmitter());

      // Bind the project state to the states received over the wire.
      projectOverlord.addBinding(binder);

      if (initial && initial.state) {
        // If the broadcasting visualization is still in its initial state,
        // we won't receive any initial state here.
        rhizo.state.getMasterOverlord().setInitialState(
            rhizo.broadcast.BINDER_KEY, initial.state, true);
      }

      // Update UI.
      this.follow_.text('Stop');
      this.tip_.text('You are following a remote visualization.');

      // Flip switch.
      this.following_ = true;
    } else {
      this.follow_.text('Retry');
      this.tip_.text(text);
    }
  }, this));
};

/**
 * Stops following the remote broadcasting visualization
 * @private
 */
rhizo.broadcast.FollowComponent.prototype.stopFollowing_ = function() {
  this.follow_.text('Wait ...');
  this.tip_.text('Disconnecting from remote visualization...');
  rhizo.broadcast.globalTransmitter().follow(
      this.followed_channel_uuid_, false, jQuery.proxy(function(status, text) {
    if (status) {
      // successfully un-following the channel.
      // The server will no longer push updates to us.

      // Stop the project from receiving remote states.
      var projectOverlord =
          rhizo.state.getMasterOverlord().projectOverlord(this.project_);
      var binder = projectOverlord.removeBinding(rhizo.broadcast.BINDER_KEY);

      // Stop listening to states changes received by the transmitter.
      binder.unlisten();

      // Update UI.
      this.follow_.text('Resume');
      this.tip_.text('Resume following the visualization.');

      // Flip switch.
      this.following_ = false;
    } else {
      this.follow_.text('Retry');
      this.tip_.text(text);
    }
  }, this));
};


/**
 * A component specialed for broadcasting visualizations, that lets the user
 * start/stop broadcasting the visualization state.
 *
 * @param {rhizo.Project} project  The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @constructor
 */
rhizo.broadcast.BroadcastComponent = function(project, options) {
  rhizo.ui.component.Component.call(this, project, options);
  this.broadcasting_ = false;
};
rhizo.inherits(rhizo.broadcast.BroadcastComponent,
    rhizo.ui.component.Component);

rhizo.broadcast.BroadcastComponent.prototype.render = function() {
  this.share_ = $('<button />', {'disabled': 'disabled'}).text('Broadcast');
  this.tip_ = $('<p />').text('Let others follow this visualization.');
  this.shareUrl_ = $('<input />', {type: 'text',
                                   'class': 'rhizo-broadcast-url'});

  return [this.share_.get(0), this.tip_.get(0), this.shareUrl_.get(0)];
};

rhizo.broadcast.BroadcastComponent.prototype.ready = function() {
  this.share_.removeAttr('disabled').click(jQuery.proxy(function() {
    if (this.broadcasting_) {
      this.stopBroadcasting_();
    } else {
      this.startBroadcasting_();
    }
  }, this));
};

/**
 * Starts broadcasting.
 * @private
 */
rhizo.broadcast.BroadcastComponent.prototype.startBroadcasting_ = function() {
  this.share_.text('Wait ...');
  rhizo.broadcast.globalTransmitter().open(jQuery.proxy(function(status,
                                                                 text) {
    if (status) {  // broadcast channel successfully opened.

      // Start a binder to collect state changes that occur locally.
      var projectOverlord =
          rhizo.state.getMasterOverlord().projectOverlord(this.project_);
      var binder = new rhizo.broadcast.BroadcastStateBinder(
          projectOverlord, rhizo.broadcast.globalTransmitter());

      // Start publishing local state changes that we are notified of to the
      // transmitter.
      projectOverlord.addBinding(binder);

      // Update UI.
      // Give the user a URL that he can share with any other person that
      // wants to follow this visualization state.
      this.tip_.text('Share this URL for others to join.');
      this.share_.text('Stop');
      this.shareUrl_.
          val(rhizo.util.buildUrl(null,
                                  {follow: text, pid: this.project_.uuid()})).
          show('fast').
          focus().
          select();

      // Flip the switch.
      this.broadcasting_ = true;
    } else {  // broadcast channel couldn't be opened.
      this.tip_.text(text);
      this.share_.text('Broadcast');
    }
  }, this));
};

/**
 * Stops broadcasting.
 * @private
 */
rhizo.broadcast.BroadcastComponent.prototype.stopBroadcasting_ = function() {
  // Stop collecting local state changes.
  var projectOverlord =
      rhizo.state.getMasterOverlord().projectOverlord(this.project_);
  var binder = projectOverlord.removeBinding(rhizo.broadcast.BINDER_KEY);

  // Update UI.
  this.tip_.text('Let others follow this visualization.');
  this.share_.text('Broadcast');
  this.shareUrl_.hide().val('');

  // Flip the switch.
  this.broadcasting_ = false;
};

/**
 * Unique key that identifies that broadcasting binding among other state
 * management binders.
 * @type {string}
 */
rhizo.broadcast.BINDER_KEY = 'broadcast';

/**
 * A state manager binding that listens for state changes occurred to a
 * remote visualization and publishes them to the local state manager.
 *
 * @param {rhizo.state.ProjectOverlord} overlord The state manager for the
 *     project this binder is attached to.
 * @param {rhizo.broadcast.Transmitter} transmitter The transmitter that
 *     receives notifications of state changes occurred remotely.
 * @constructor
 */
rhizo.broadcast.FollowStateBinder = function(overlord, transmitter) {
  rhizo.state.StateBinder.call(this, overlord, rhizo.broadcast.BINDER_KEY);
  this.transmitter_ = transmitter;
  this.transmitter_.listen('__binder__', jQuery.proxy(function(data) {
    this.stateReceived_(data);
  }, this));
};
rhizo.inherits(rhizo.broadcast.FollowStateBinder, rhizo.state.StateBinder);

/**
 * Callback invoked when a remote state has been received by the transmitter.
 * @param {*} data Plain javascript object containing the remote visualization
 *     state.
 * @private
 */
rhizo.broadcast.FollowStateBinder.prototype.stateReceived_ = function(data) {
  this.overlord_.transition(this.key(), data.delta, data.state, data.replace);
};

/**
 * Stops listening for remote state changes.
 */
rhizo.broadcast.FollowStateBinder.prototype.unlisten = function() {
  this.transmitter_.unlisten('__binder__');
};

/**
 * Since we are following a remote visualization, there's nothing to do when
 * a local change occurs.
 */
rhizo.broadcast.FollowStateBinder.prototype.onTransition = function() {};


/**
 * A state manager binding that publishes local state changes for remote
 * visualizations to follow.
 *
 * @param {rhizo.state.ProjectOverlord} overlord The state manager for the
 *     project this binder is attached to.
 * @param {rhizo.broadcast.Transmitter} transmitter The transmitter that
 *     publishes notifications of state changes occurred locally.
 * @constructor
 */
rhizo.broadcast.BroadcastStateBinder = function(overlord, transmitter) {
  rhizo.state.StateBinder.call(this, overlord, rhizo.broadcast.BINDER_KEY);
  this.transmitter_ = transmitter;
};
rhizo.inherits(rhizo.broadcast.BroadcastStateBinder, rhizo.state.StateBinder);

/**
 * Publishes a local state change to the transmitter, so that it can be
 * sent to remote visualizations.
 */
rhizo.broadcast.BroadcastStateBinder.prototype.onTransition = function(
    delta, state, opt_replace) {
  this.transmitter_.publish(
      {delta: delta, state: state, replace: opt_replace || false});
};


/**
 * Wrapper around the Google AppEngine Channel APIs and other Ajax callbacks
 * used to broadcast and receive visualization states to/from remote
 * visualizations.
 *
 * @constructor
 */
rhizo.broadcast.Transmitter = function() {
  this.channel_ = null;
  this.socket_ = null;
  this.channel_uuid_ = null;

  this.listen_callbacks_ = {};
};

/**
 * Registers a listener to be notified whenever a message is received.
 * @param {string} key A unique key that identifies the listener.
 * @param {function} callback The callback that will be invoked when a message
 *     is received. It receives a single parameter, the message itself (which
 *     will be a plain untyped javascript object).
 */
rhizo.broadcast.Transmitter.prototype.listen = function(key, callback) {
  this.listen_callbacks_[key] = callback
};

/**
 * Removes a listener.
 * @param {string} key The unique key that identies the listener.
 */
rhizo.broadcast.Transmitter.prototype.unlisten = function(key) {
  delete this.listen_callbacks_[key];
};

/**
 * Instructs the transmitter to start/stop following a given channel. Once
 * following, this transmitter will receive all messages remotely published on
 * the channel.
 *
 * This method is asynchronous. The communication channel will be opened if it's
 * not open yet.
 *
 * @param {string} follow_uuid The uuid of the channel to follow.
 * @param {boolean} enable Whether to start or stop following the channel.
 * @param {function} callback Callback invoked upon success/failure of the
 *     follow operation. It receives up to 3 parameters. The first is a boolean
 *     status flag for success/failure.
 *     On failure the second parameter will contain the description of the error
 *     that occurred.
 *     On success, the second parameter is unused, and the third will contain
 *     the current channel state (i.e. the current state of the remote
 *     visualization being followed), if any.
 */
rhizo.broadcast.Transmitter.prototype.follow = function(follow_uuid, enable, callback) {
  if (!this.channel_uuid_) {
    // Try opening the channel if it's not established yet.
    this.open(jQuery.proxy(function(status, text) {
      if (!status) {
        // bubble up if we couldn't open the channel.
        callback(status, text);
      } else {
        // otherwise try again issuing the follow statement now that the channel
        // is open.
       this.follow(follow_uuid, enable, callback); 
      }
    }, this));
    return;
  }
  $.ajax({
    url: '/broadcast/follow',
    dataType: 'json',
    type: 'POST',
    data: {uuid: this.channel_uuid_, follow: follow_uuid, enable: enable ? '1' : '0'},
    error: function(xhr, status, error) {
      callback(false, 'Error changing follow status');
    },
    success: function(data, status, xhr) {
      if (data.status != 'ok') {
        callback(false, 'Error changing follow status: ' + data.status);
      } else {
        if (enable) {
          callback(true, null, JSON.parse(data.initial));
        } else {
          callback(true);
        }

      }
    }
  })
};

/**
 * Publishes a given message on the channel managed by this transmitter.
 * The channel must be opened via open() first.
 *
 * This method is asynchronous.
 *
 * @param {*} message A plain Javascript object containing the payload to
 *     publish. Must be possible to serialize it as JSON.
 * @param {function} opt_callback An optional callback function invoked upon
 *     success/failure of the publish operation. It receives 2 parameters: the
 *     first is a boolean defining success/failure, the second is an error
 *     message in case of failure.
 */
rhizo.broadcast.Transmitter.prototype.publish = function(message, opt_callback) {
  if (!this.channel_uuid_) {
    if (opt_callback) {
      opt_callback(false, 'Channel is not established yet.');
    }
    return;
  }

  $.ajax({
    url: '/broadcast/publish',
    dataType: 'json',
    type: 'POST',
    data: {uuid: this.channel_uuid_, payload: JSON.stringify(message)},
    error: function(xhr, status, error) {
      if (opt_callback) {
        opt_callback(false, 'Error publishing message');
      }
    },
    success: function(data, status, xhr) {
      if (data.status != 'ok') {
        if (opt_callback) {
          opt_callback(false, 'Error publishing message: ' + data.status);
        }
      } else {
        if (opt_callback) {
          opt_callback(true);
        }
      }
    }
  })
};

/**
 * Opens a channel for publishing / receiving messages to/from remote
 * visualizations.
 *
 * This method is asynchronous.
 *
 * @param {function} callback A callback function invoked upon
 *     success/failure of the open operation. It receives 2 parameters: the
 *     first is a boolean defining success/failure, the second is an error
 *     message in case of failure or the uuid of the opened channel in case
 *     of success.
 */
rhizo.broadcast.Transmitter.prototype.open = function(callback) {
  if (this.channel_uuid_) {
    callback(true, this.channel_uuid_);
    return;
  }
  $.ajax({
    url: '/broadcast/open',
    dataType: 'json',
    type: 'POST',
    error: function(xhr, status, error) {
      callback(false, 'Error opening channel.');
    },
    success: jQuery.proxy(function(data, status, xhr) {
      if (data.status != 'ok') {
        callback(false, 'Error opening channel: ' + data.status);
      } else {
        this.openChannel_(data.channel_token, data.channel_uuid, callback);
      }
    }, this)
  });
};

/**
 * Callback invoked whenever a message is received from the underlying channel.
 * @param {*} evt
 * @private
 */
rhizo.broadcast.Transmitter.prototype.messageReceived_ = function(evt) {
  var message = JSON.parse(evt.data);
  for (var listen_key in this.listen_callbacks_) {
    this.listen_callbacks_[listen_key](message);
  }
};

/**
 * Callback invoked after the first of the 2 handshaking steps required for
 * channel opening, once the channel has been created server side.
 *
 * @param {string} channel_token The token to create the client-side stub of the
 *     channel that has been created on the server.
 * @param {string} channel_uuid The unique id of the channel, that will be used
 *     for all future communications on the channel.
 * @param {function} callback Callback function passed on by open(), to be
 *     invoked upon success/failure of the entire open operation.
 * @private
 */
rhizo.broadcast.Transmitter.prototype.openChannel_ = function(
    channel_token, channel_uuid, callback) {
  this.channel_ = new goog.appengine.Channel(channel_token);
  this.socket_ = this.channel_.open();
  this.socket_.onopen = jQuery.proxy(function() {
    this.confirmOpenChannel_(channel_uuid, callback);
  }, this);
  this.socket_.onmessage = jQuery.proxy(this.messageReceived_, this);
};

/**
 * Issues the second request to complete the handshaking and put the channel
 * into established (working) mode. Invoked once the local client channel stub
 * has been successfully created.
 *
 * @param {string} channel_uuid The unique id of the channel, that will be used
 *     for all future communications on the channel.
 * @param {function} callback Callback function passed on by open(), to be
 *     invoked upon success/failure of the entire open operation.
 */
rhizo.broadcast.Transmitter.prototype.confirmOpenChannel_ = function(channel_uuid,
                                                                     callback) {
  $.ajax({
    url: '/broadcast/connect',
    dataType: 'json',
    data: {uuid: channel_uuid},
    type: 'POST',
    error: function(xhr, status, error) {
      callback(false, 'Error confirming channel opening.');
    },
    success: jQuery.proxy(function(data, status, xhr) {
      if (data.status != 'ok') {
        callback(false, 'Error confirming channel opening: ' + data.status);
      } else {
        this.channel_uuid_ = channel_uuid;
        callback(true, channel_uuid);
      }
    }, this)
  })
};


/**
 * The singleton transmitter that manages all communications to/from remote
 * visualizations.
 *
 * @type {rhizo.broadcast.Transmitter}
 * @private
 */
rhizo.broadcast.transmitter_ = null;
if (typeof(goog) != 'undefined' &&
    typeof(goog.appengine) != 'undefined' &&
    typeof(goog.appengine.Channel) != 'undefined') {
    rhizo.broadcast.transmitter_ = new rhizo.broadcast.Transmitter();
}


/**
 * @return {rhizo.broadcast.Transmitter} The singleton transmitter that manages
 * all communications to/from remote visualizations. Will be null if
 * message publishing/following is not enabled (for example, Google AppEngine
 * Channel APIs are not available or have not been loaded).
 */
rhizo.broadcast.globalTransmitter = function() {
  return rhizo.broadcast.transmitter_;
};