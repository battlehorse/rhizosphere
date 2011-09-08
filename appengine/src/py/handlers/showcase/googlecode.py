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

import base64
import datetime
import os.path
import re

_GDATA_LIBS_FOUND = True

try:
  import gdata.auth
  import gdata.service
  import gdata.alt.appengine
except ImportError:
  _GDATA_LIBS_FOUND = False

from google.appengine.api import urlfetch
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

from py import rhizoglobals
from py.models import googlecode


class BaseHandler(webapp.RequestHandler):
  """Base class with common methods."""

  def _GetGDataClient(self):
    client = gdata.service.GDataService(server='code.google.com',
                                        source='Rhizosphere')
    gdata.alt.appengine.run_on_appengine(client)
    return client

  def _Respond(self, template_file, template_values):
    path = os.path.join(os.path.dirname(__file__),
                        '../../../templates/showcase/code/%s' % template_file)
    self.response.out.write(template.render(path, template_values))

  def _RespondError(self, error_msg):
    template_values = rhizoglobals.DefaultTemplate(self.request)
    template_values.update({'error': error_msg})
    self._QueryStringToTemplate(template_values)

    platform, device = rhizoglobals.IdentifyPlatformDevice(self.request)
    smartphone = rhizoglobals.IsSmartphone(platform, device)

    if smartphone:
      self._Respond('codeindexmobile.html', template_values)
    else:
      self._Respond('codeindex.html', template_values)

  def _QueryStringToTemplate(self, template_values):
    qs = dict((qp, self.request.get(qp)) for qp in self.request.arguments())
    template_values['qs'] = qs


class AuthHandler(BaseHandler):
  """Callback for AuthSub requests to access a user private feeds."""

  def _ExtractAndSaveToken(self, client):
    auth_token = gdata.auth.extract_auth_sub_token_from_url(self.request.url)
    if not auth_token:
      return None

    session_token = client.upgrade_to_session_token(auth_token)
    if session_token and users.get_current_user():
      client.token_store.add_token(session_token)
    elif session_token:
      client.current_token = session_token
    return session_token

  def get(self):
    client = self._GetGDataClient()
    session_token = self._ExtractAndSaveToken(client)
    if not session_token:
      # The user hasn't granted access to his feeds.
      self._RespondError('Cannot fulfill the request without '
                         'access to your Google Code data.')
      return

    # Sets the auth token in a cookie that will live to the end of the
    # browser session.
    client.current_token = session_token
    self.response.headers.add_header(
        'Set-Cookie',
        'stk=%s' % base64.b64encode(client.GetAuthSubToken()))

    # scrub the AuthSub-specific query parameters.
    query_string = []
    for query_param in self.request.arguments():
      if query_param not in ['token', 'auth_sub_scopes']:
        query_string.append('%s=%s' % (query_param, self.request.get(query_param)))

    # Redirect back to the fetch handler.
    self.redirect('/showcase/code/rhizo?%s' % '&'.join(query_string))


class FetchHandler(BaseHandler):
  """Fetches issues from Google Code and feeds them to a Rhizosphere viz."""

  def _RedirectToAuthSub(self, client):
    next_url = 'http://%s/showcase/code/auth?%s' % (
        rhizoglobals.HostName(), self.request.query_string)
    scope = 'http://code.google.com/feeds/issues'
    auth_sub_url = client.GenerateAuthSubURL(
      next_url, scope, secure=False, session=True)
    self.response.set_status(302)
    self.response.headers['Location'] = auth_sub_url
    self.response.clear()
    return

  def _GetDateParam(self, param):
    date_str = self.request.get(param)
    if not date_str:
      return None
    m = re.search('(\d+)([wmd])', date_str)
    if not m:
      return None
    multiplier = {'w': 7, 'm': 31, 'd': 1}
    days_ago = int(m.group(1))*multiplier[m.group(2)]
    target_date = datetime.datetime.now() - datetime.timedelta(days_ago)
    return target_date.strftime('%Y-%m-%dT%H:%M:%S')

  def _GetParams(self):
    project = self.request.get('p')
    if not project:
      self._RespondError('You must specify a project name.')
      return None

    detail = self.request.get('det')
    if detail not in ['all', 'compressed']:
      detail = 'compressed'

    if self.request.get('n') == 'max':
      num_results = 10000
    else:
      num_results = self.request.get_range('n', 1, 10000, 1000)

    canned_query = self.request.get('can')
    if canned_query not in ['all', 'open', 'owned', 'reported',
                            'starred', 'new', 'to-verify']:
      canned_query = 'all'

    created_min = self._GetDateParam('pub')
    updated_min = self._GetDateParam('upd')

    return {
        'project': project,
        'detail': detail,
        'num_results': num_results,
        'canned_query': canned_query,
        'created_min': created_min,
        'updated_min': updated_min,
        }

  def _BuildFeedUrl(self, params):
    feed_url = '/feeds/issues/p/%s/issues/full?max-results=%d&can=%s' % (
        params['project'], params['num_results'], params['canned_query'])
    if params.get('created_min'):
      feed_url = '%s&published-min=%s' % (feed_url, params['created_min'])
    if params.get('updated_min'):
      feed_url = '%s&updated-min=%s' % (feed_url, params['updated_min'])
    return feed_url

  def get(self):
    client = self._GetGDataClient()
    if 'stk' in self.request.cookies:
      token = gdata.auth.AuthSubToken()
      token.set_token_string(base64.b64decode(self.request.cookies['stk']))
      client.current_token = token

    params = self._GetParams()
    if not params:
      # Params are malformed.
      return

    if (params['canned_query'] in ['owned', 'reported', 'starred'] and
        not client.GetAuthSubToken()):
      # We need the user credentials to retrieve this kind of feeds.
      self._RedirectToAuthSub(client)
      return

    try:
      feed_url = self._BuildFeedUrl(params)
      feed = client.GetFeed(feed_url)
    except urlfetch.DownloadError, er:
      if 'timed out' in er[0]:
        self._RespondError('The request timed out. Try again in a few seconds, '
                           'or set the advanced options to extract fewer '
                           'issues.')
      else:
        self._RespondError(
            'An error occurred while fetching %s project data. '
            'Try again in a few seconds, or set the advanced options to '
            'extract fewer issues. (%s)' %
            (params['project'], er))
      return
    except urlfetch.Error, er:
      self._RespondError(
          'An error occurred while fetching %s project data. '
          'Try again in a few seconds, or set the advanced options to '
          'extract fewer issues. (%s)' %
          (params['project'], er))
      return
    except gdata.service.RequestError, er:
      if er[0]['status'] == 404:
        self._RespondError('Project %s does not exist' % params['project'])
      else:
        self._RespondError(
          'Unable to fetch %s project data: %s' % (
              params['project'], er[0]['body']))
      return

    issues = [ googlecode.Issue(entry) for entry in feed.entry]
    if not len(issues):
      self._RespondError('Your query didn\'t return any result.')
      return

    template_values = rhizoglobals.DefaultTemplate(self.request)
    template_values.update(params)
    if self.request.get('gdatadebug') == '1':
      template_values['issues'] = issues
      self._Respond('codedebug.html', template_values)
    else:
      platform, device = rhizoglobals.IdentifyPlatformDevice(self.request)
      smartphone = rhizoglobals.IsSmartphone(platform, device)
      jsonifier = googlecode.JSONHelper()
      json_issues = [jsonifier.IssueToJSON(issue) for issue in issues]
      stats = googlecode.IssueStats()
      stats.Compute(issues)
      json_stats = jsonifier.StatsToJSON(stats)
      template_values.update({'issues': json_issues,
                              'stats': json_stats,
                              'theme': 'default',
                              'platform': platform,
                              'device': device,
                              'smartphone': smartphone})
      self._Respond('coderhizo.html', template_values)


class WelcomeHandler(BaseHandler):
  """Serves the welcome page to the Google Code Hosting showcase app."""

  def get(self):
    template_values = rhizoglobals.DefaultTemplate(self.request)
    if not _GDATA_LIBS_FOUND:
      self._RespondError("GData libraries not found. "
                         "Have you included the GData libraries?")
      return

    platform, device = rhizoglobals.IdentifyPlatformDevice(self.request)
    smartphone = rhizoglobals.IsSmartphone(platform, device)
    if smartphone:
      self._Respond('codeindexmobile.html', template_values)
    else:
      self._Respond('codeindex.html', template_values)


application = webapp.WSGIApplication(
    [('/showcase/code', WelcomeHandler),
     ('/showcase/code/', WelcomeHandler),
     ('/showcase/code/rhizo', FetchHandler),
     ('/showcase/code/auth', AuthHandler),],
    debug=rhizoglobals.appenginedebug)


def main():
    run_wsgi_app(application)


if __name__ == '__main__':
    main()
