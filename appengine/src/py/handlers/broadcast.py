#!/usr/bin/env python
#
# Copyright 2010 The Rhizosphere Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Handlers for Rhizosphere visualization broadcasting infrastructure.

The handlers defined here respond to messages issued by Rhizosphere
visualizations to start/stop broadcasting their state and start/stop following
other visualizations.

The current implementation only allows for 1-to-many publishing of visualization
state, so is closer to 'presentation' mode rather than collaborative editing.

Two types of visualizations exist for the purpose of this module:
- broadcasters: Visualizations that are publishing their current state.
- followers: Visualizations that are following the state exported by a
    broadcaster.

The handlers defined here are responsible for connecting the two together and
distributing incoming messages from broadcasters to all the attached followers.

Rhizosphere uses AppEngine Channels API as the downstream communication channel
(to send notifications to visualization instances), and plain ajax POST requests
for the upstream communication channel (for visualizations to issue commands
back).

As such, this limits the broadcasting feature to visualizations that are hosted
within the same AppEngine instance that exposes these handlers (because of ajax
same-origin security policy).

Broadcasting is public. Anyone with the correct link will be able to follow a
broadcasting visualization.

Messages in both directions are serialized as JSON objects.

Both broadcasters and followers use a 2-step handshaking:
1a. the visualization issues a /broadcast/open request.
1b. the server creates a channel and acknowledges with the created channel id.
2a. the visualization creates a client-side stub and issues a /broadcast/connect
    message.
2b. the server transitions the channel into the established status and
    acknowledges.
2c. the visualization receives the acknowledgement and is now ready to post
    messages.

At this point, broadcasters and followers differentiate:
- broadcasters use the /broadcast/publish endpoint to distribute their current
  state to followers
- followers use the /broadcast/follow endpoint to start/stop following given
  publishers.

NOTE that this is an prototype implementation of visualization broadcasting,
done for the purpose of demoing the feature. As such, it contains quite a few
issues. Most notably:

- memcache is used to maintain visualizations' state (instead of the datastore).
  Visualization state may disappear without notice (likely causing client-side
  bugs).
- visualization state is not managed under transactional constraints. Race
  conditions exist that will cause losses/discrepancies in the visualization
  state and/or in the list of connected clients to a given visualization.
"""
# TODO(battlehorse): replace memcache with datastore + transactions.

import logging
import uuid

from django.utils import simplejson

from google.appengine.api import channel
from google.appengine.api import memcache
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

from py import rhizoglobals

class BroadcastBase(webapp.RequestHandler):
  """Base class with common functionality shared by handlers in this module."""

  def respond(self, json_dict):
    self.response.headers['Content-Type'] = 'application/json'
    self.response.out.write(simplejson.dumps(json_dict))

  def respond_error(self, error_msg):
    self.respond({'status': error_msg})

  def respond_ok(self, extra_info=None):
    resp = {'status': 'ok'}
    if extra_info:
      resp.update(extra_info)
    self.respond(resp)

  def restore_channel(self):
    """Restores a channel and the associated viz state from memcache."""
    channel_uuid = self.request.get('uuid')
    if not channel_uuid:
      logging.error('missing channel UUID in request')
      self.respond_error('missing channel UUID')
      return None, None
    channel_payload = memcache.get(channel_uuid)
    if not channel_payload:
      logging.error('channel %s no longer in memcache' % channel_uuid)
      self.respond_error('channel not found in memcache')
      return None, None
    return channel_uuid, channel_payload

  def save_channel_payload(self, channel_uuid, channel_payload):
    """Saves a channel to memcache."""
    if (not memcache.set(channel_uuid, channel_payload, time=60*15)):
      logging.error('unable to memcache the channel %s' % channel_uuid)
      self.respond_error('unable to memcache the channel.')
      return False
    return True

class OpenBroadcastHandler(BroadcastBase):
  """Responds to requests to open a new communication channel.

  This is issued both by broadcasters and followers.
  """

  def post(self):
    channel_uuid = uuid.uuid4().hex  # random UUID
    channel_payload = {
      'listeners': {},
      'viz_state': {},
      'channel_state': 'open'
    }
    if self.save_channel_payload(channel_uuid, channel_payload):
      channel_token = channel.create_channel(channel_uuid)
      self.respond_ok({'channel_token': channel_token,
                       'channel_uuid': channel_uuid})

class ConnectBroadcastHandler(BroadcastBase):
  """Responds to requests to confirm an 'open' communication channel.

  This is the second step required to establish a channel, issued both by
  broadcasters and followers.
  """

  def post(self):
    channel_uuid, channel_payload = self.restore_channel()
    if not channel_uuid:
      return

    channel_payload['channel_state'] = 'established'
    if self.save_channel_payload(channel_uuid, channel_payload):
      self.respond_ok()

class PublishBroadcastHandler(BroadcastBase):
  """Responds to requests to publish a visualization state.

  A publisher issues this message to upload its current visualization state
  server side and have it distributed to all known followers.
  """

  def post(self):
    channel_uuid, channel_payload = self.restore_channel()
    if not channel_uuid:
      return

    if channel_payload['channel_state'] != 'established':
      logging.error('Publishing on an unestablished channel: %s' % channel_uuid)
      self.respond_error('channel is not established yet')
      return

    received_state = simplejson.loads(self.request.get('payload'))
    channel_payload['viz_state'] = received_state

    if not self.save_channel_payload(channel_uuid, channel_payload):
      return

    # The list of listeners may contain stale entries, if a listener forgot
    # to unregister itself.
    for listener_uuid in channel_payload['listeners'].iterkeys():
      try:
        channel.send_message(listener_uuid, simplejson.dumps(received_state))
      except channel.Error:
        logging.error('Error while sendinng message from %s to %s' % (
          channel_uuid, listener_uuid))

    self.respond_ok()

class FollowBroadcastHandler(BroadcastBase):
  """Responds to requests to follow/unfollow a visualization.

  A follower issues this message to start/stop following a broadcaster. Upon
  following the client receives back the current visualization state to sync
  itself.
  """

  def post(self):
    channel_uuid, channel_payload = self.restore_channel()
    if not channel_uuid:
      return

    if channel_payload['channel_state'] != 'established':
      logging.error('Following on an unestablished channel: %s' % channel_uuid)
      self.respond_error('channel is not established yet')
      return

    follow_uuid = self.request.get('follow')
    follow_channel_payload = memcache.get(follow_uuid)
    if not follow_channel_payload:
      self.respond_error('Channel to follow not found.')
      logging.error('Channel to follow not found: %s' % follow_uuid)
      return

    enable = self.request.get('enable') == '1'
    if enable:
      logging.debug('%s is following %s' % (channel_uuid, follow_uuid))
      follow_channel_payload['listeners'][channel_uuid] = True
    else:
      logging.debug('%s stopped following %s' % (channel_uuid, follow_uuid))
      del follow_channel_payload['listeners'][channel_uuid]

    if self.save_channel_payload(follow_uuid, follow_channel_payload):
      if enable:
        self.respond_ok(
            {'initial': simplejson.dumps(follow_channel_payload['viz_state'])})
      else:
        self.respond_ok()


application = webapp.WSGIApplication(
  [('/broadcast/open', OpenBroadcastHandler),
   ('/broadcast/connect', ConnectBroadcastHandler),
   ('/broadcast/publish', PublishBroadcastHandler),
   ('/broadcast/follow', FollowBroadcastHandler),],
  debug=rhizoglobals.appenginedebug)


def main():
  run_wsgi_app(application)


if __name__ == '__main__':
    main()