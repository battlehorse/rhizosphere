#!/usr/bin/env python

import os.path

from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

from py import rhizoglobals

class MainHandler(webapp.RequestHandler):

    def get(self):
        template_values = {}
        path = os.path.join(os.path.dirname(__file__), '../../templates/index.html')
        self.response.out.write(template.render(path, template_values))


application = webapp.WSGIApplication(
    [('/', MainHandler),],
    debug=rhizoglobals.debug)


def main():
    run_wsgi_app(application)


if __name__ == '__main__':
    main()
