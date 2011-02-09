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

    def get(self):
        # Startup options
        platform, device = rhizoglobals.IdentifyPlatformDevice(
            self.request)
        uitemplate = self.request.get('template')

        # Experimental features
        experimental = rhizoglobals.GetOptionFromUrl(self.request,
                                                     'exp', ['0', '1'])
        if experimental == '1':
          use_channels = True
        else:
          use_channels = False

        template_values = rhizoglobals.DefaultTemplate(self.request)
        template_values.update({
            'template': uitemplate,
            'device': device,
            'platform': platform,
            'use_channels': use_channels,
        })
        path = os.path.join(os.path.dirname(__file__),
                            '../../templates%s' % self.request.path)
        self.response.out.write(template.render(path, template_values))


class IGoogleHandler(webapp.RequestHandler):

    def get(self):
        template_values = rhizoglobals.DefaultTemplate(self.request)
        template_values.update({
            'hostname': 'http://%s' % os.environ['HTTP_HOST']
        })
        path = os.path.join(os.path.dirname(__file__), '../../templates/ig.xml')
        self.response.headers.add_header('Content-Type', 'text/xml')
        self.response.out.write(template.render(path, template_values))


application = webapp.WSGIApplication(
    [('/rhizo.html', RhizoHandler),
     ('/multi.html', RhizoHandler),
     ('/google_visualization.html', RhizoHandler),
     ('/ig', IGoogleHandler),
    ],
    debug=rhizoglobals.appenginedebug)


def main():
    run_wsgi_app(application)


if __name__ == '__main__':
    main()
