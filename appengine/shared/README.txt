This directory contains third-party libraries used by the AppEngine instance
that serves Rhizosphere documentation and demos.

Since AppEngine is not a core part of the Rhizosphere library, some of the
libraries contained here are not included by default, but must be installed
separately.

This list enumerates the expected content of this directory. See the
Contributors section on http://rhizospherejs.appspot.com/doc for further info.

Shared contents:
atom/, gdata/ :
  Python GData client. Used by some Rhizosphere demos and showcase applications.
  You can copy these directories from the Python GData client library,
  available at http://code.google.com/p/gdata-python-client/

  They are referenced via symlink from ../src/atom and ../src/gdata.

