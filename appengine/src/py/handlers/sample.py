#!/usr/bin/env python

import os.path

from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

from py import rhizoglobals

class ScriptHandler(webapp.RequestHandler):
    def get(self):
        jsfile = self.request.path.replace('/sample/', '')
        jsonp_callback = self.request.get('jsonp', 'jsonp_callback')
        template_values = {'jsonp_callback': jsonp_callback}
        path = os.path.join(os.path.dirname(__file__),
                            '../../static/samples/js/%s' % jsfile)
        self.response.headers.add_header('Content-Type', 'text/javascript')
        self.response.out.write(template.render(path, template_values))


application = webapp.WSGIApplication(
    [('/sample/.*', ScriptHandler),],
    debug=rhizoglobals.debug)


def main():
    run_wsgi_app(application)


if __name__ == '__main__':
    main()
