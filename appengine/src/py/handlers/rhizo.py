#!/usr/bin/env python

import os
import os.path

from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

from py import rhizoglobals

class RhizoHandler(webapp.RequestHandler):

    def get(self):
        debug = self.request.get('d', '0') == '1'
        template_values = {'debug': debug}
        path = os.path.join(os.path.dirname(__file__), '../../templates/rhizo.html')
        self.response.out.write(template.render(path, template_values))


class IGoogleHandler(webapp.RequestHandler):

    def get(self):
        template_values = {'hostname': 'http://%s' % os.environ['HTTP_HOST']}
        path = os.path.join(os.path.dirname(__file__), '../../templates/ig.xml')
        self.response.headers.add_header('Content-Type', 'text/xml')
        self.response.out.write(template.render(path, template_values))


application = webapp.WSGIApplication(
    [('/rhizo.html', RhizoHandler),
     ('/ig', IGoogleHandler),
    ],
    debug=rhizoglobals.debug)


def main():
    run_wsgi_app(application)


if __name__ == '__main__':
    main()
