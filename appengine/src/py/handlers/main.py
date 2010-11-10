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

import os.path

from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

from py import rhizoglobals

class MainHandler(webapp.RequestHandler):

    def get(self):
        template_values = rhizoglobals.DefaultTemplate(self.request)
        if rhizoglobals.HostName() == 'rhizospherejs.appspot.com':
          google_site_verification = 'vg7YwHwP3zxmOzzisjgo-3EAjtDSY4UYdd-ErlS1V4A'
        elif rhizoglobals.HostName() == 'rhizospherejs.com':
          google_site_verification = 'mevMFXIyXdTOSL8sZfxXxhS2Ewp5AAVYmB_bIs7XVrM'
        else:
          google_site_verification = 'devel'
        template_values['google_site_verification'] = google_site_verification
        path = os.path.join(os.path.dirname(__file__), '../../templates/index.html')
        self.response.out.write(template.render(path, template_values))


application = webapp.WSGIApplication(
    [('/', MainHandler),],
    debug=rhizoglobals.appenginedebug)


def main():
    run_wsgi_app(application)


if __name__ == '__main__':
    main()
