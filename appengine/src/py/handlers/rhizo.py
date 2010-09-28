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

import os
import os.path

from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

from py import rhizoglobals

class RhizoHandler(webapp.RequestHandler):

    def _getOptionFromUrl(self, optname, allowedvalues):
      opt = self.request.get(optname)
      if opt and opt not in allowedvalues:
        return allowedvalues[0]
      return opt

    def _getPlatformDevice(self):
      platform, device = None, None
      user_agent = self.request.headers.get('User-Agent', '').lower()
      if 'ipad' in user_agent:
          platform, device = 'mobile', 'ipad'
      if not platform:
        platform = self._getOptionFromUrl('forcePlatform',
                                          ['default', 'mobile'])
      if not device:
        device = self._getOptionFromUrl('forceDevice',
                                        ['default', 'ipad'])
      return platform, device

    def get(self):
        # Should we serve compiled or uncompiled resources?
        debug = self.request.get('d', '0') == '1'

        # Startup options
        forcePlatform, forceDevice = self._getPlatformDevice()
        forceTemplate = self._getOptionFromUrl('forceTemplate',
                                               ['default', 'bottom'])
        template_values = {'debug': debug,
                           'forceTemplate': forceTemplate,
                           'forceDevice': forceDevice,
                           'forcePlatform': forcePlatform,}
        path = os.path.join(os.path.dirname(__file__),
                            '../../templates%s' % self.request.path)
        self.response.out.write(template.render(path, template_values))


class IGoogleHandler(webapp.RequestHandler):

    def get(self):
        # Should we serve compiled or uncompiled resources?
        debug = self.request.get('d', '0') == '1'

        template_values = {'debug': debug,
                           'hostname': 'http://%s' % os.environ['HTTP_HOST']}
        path = os.path.join(os.path.dirname(__file__), '../../templates/ig.xml')
        self.response.headers.add_header('Content-Type', 'text/xml')
        self.response.out.write(template.render(path, template_values))


application = webapp.WSGIApplication(
    [('/rhizo.html', RhizoHandler),
     ('/multi.html', RhizoHandler),
     ('/ig', IGoogleHandler),
    ],
    debug=rhizoglobals.debug)


def main():
    run_wsgi_app(application)


if __name__ == '__main__':
    main()
