#!/usr/bin/env python
#
# Copyright 2009 Riccardo Govoni battlehorse@gmail.com
#
# Licensed under the Apache License, Version 2.0 (the &quot;License&quot;);
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an &quot;AS IS&quot; BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# = Module Description
# ====================
#
# Handy script to generate a packed and minified version (for production use)
# of the Rhizosphere bundle.
# The Closure Compiler (http://code.google.com/closure/compiler/) is used for
# minification. The script can run using a locally installed compiler, or
# the publicly available on at closure-compiler.appspot.com.
# Can also generate a graph of Rhizosphere dependencies using the DOT language
# (see http://www.graphviz.org/).
#
# = Rhizosphere Dependencies Management
# =====================================
#
# Rhizosphere source files use a simple dependency management system that this
# script exploits in order to generate a correct bundle.
# Each source file represents a package (whose name is derived from the file
# name, e.g. rhizo.ui.js defines the 'rhizo.ui' package). Each package may
# depend on multiple others.
# To declare a dependency, each Rhizosphere source file must contain a comment
# line that reads like:
#
#   RHIZODEP=rhizo.base,rhizo.ui
#
# Each entry in the comma-separated list describes an explicit dependency for
# the file that declares it (e.g.: 'rhizo.ui' declares that this file depends on
# rhizo.ui.js).
#
# Dependencies can be of two kinds:
# - load-time: dependencies derived only from js code that executes immediately
#   when each file is loaded,
# - run-time: dependencies derived from js code in any part of the file, which
#   might also execute after all the js payload has been loaded.
#
# You are expected to always declare run-time dependencies in RHIZODEP headers.
#
# (Note that this script technically would only require load-time ones, since
# they are only used to ensure correct load ordering of the various js files in
# the packed version).
#
# = Sample commandlines
# =====================
#
# Generates a packed and minified bundle using the online JS Compiler:
#
# ./packer.py --online
#
# Generates a packed and minified bundle using a local JS Compiler, pointing to
# a custom location both for the Java binary and the JSCompiler jar file:
#
# ./packer.py \
# --java=/System/Library/Frameworks/JavaVM.framework/Versions/1.6/Commands/java \
# --compiler=../../../jscompiler/compiler.jar
#
# Generates a dependency graph:
#
# ./packer.py --graphviz | dot -Tpng > rhizosphere_deps.png
#
# = Generated output
# ==================
#
# This script generates two files:
# - rhizo.bundle.js : contains all Rhizosphere source code, uncompressed.
# - rhizo.pack.js : contains all Rhizosphere source code, compressed and
#   minified. Suitable for production use of the Rhizosphere library.

import httplib
import optparse
import os.path
import re
import subprocess
import sys
import urllib


def ReadCommandLineFlags():
  """Reads command line flags.

  Returns:
    A tuple of (options, args) as returned by optparse.OptionParser.parse_args()
  """
  usage = ('usage: %prog [options]\n\n'
    'Generates a packed and minified version of the Rhizosphere bundle.\n'
    'Optionally, generates a dependency graph of Rhizosphere packages using '
    'the DOT language.')
  parser = optparse.OptionParser(usage=usage)
  parser.add_option('--online',
                    action='store_true', dest='online', default=False,
                    help='Uses the online compiler via REST APIs.'
                    'Defaults to false.')
  parser.add_option('--compiler',
                    dest='compiler', default='./compiler.jar',
                    help='Path to the JS Compiler jar file.'
                    'Defaults to ./compiler.jar')
  parser.add_option('-d', '--directory',
                    dest='dir', default='./src',
                    help='Directory containing the files to compile.'
                    'Defaults to the src/ directory. Will look only for'
                    'files matching the pattern "rhizo.*js"')
  parser.add_option('--graphviz',
                    action='store_true', dest='graphviz', default=False,
                    help='Builds a DOT graph of the dependencies instead of '
                    'compiling. Defaults to false.')
  parser.add_option('-o', '--output_directory',
                    dest='output_directory', default='./lib/js',
                    help='Output directory where to put generated files.'
                    'Defaults to ./lib/js/')
  parser.add_option('--exclude_all_extra',
                    action='store_true', dest='exclude_all_extra',
                    default=False,
                    help='Exclude all the \'extra\' components from packing.'
                    'Defaults to false.')
  parser.add_option('--exclude',
                    dest='exclude', default='',
                    help='Comma separated list of filenames to exclude from '
                    'packing. Defaults to the empty list.')
  parser.add_option('--java',
                    dest='java', default='java',
                    help='Path to the java binary (JavaSE 6 minimum).'
                    'Defaults to "java".')
  return parser.parse_args()


def AddRhizoFiles(arg, dirname, names):
  """Collects all Rhizosphere javascript files in a given directory.

  Includes all files that match the 'rhizo.*\.js', with the exclusion of
  packed versions (which are generated by this script) and samples.

  Args:
    arg: A dict containing the keys 'files' (where rhizosphere javascript files
        are added), 'exclude_all_extra' (whether all the extra components should
        be skipped), 'exclude_set' (set of specific files to skip).
    dirname: The path of the directory being visited.
    names: The names of the files in the directory.

  """
  if arg['exclude_all_extra'] and dirname.endswith('extra'):
    sys.stderr.write('Skipping all files in %s\n' % dirname)
    return

  for exclude_file in arg['exclude_set']:
    if exclude_file in names:
      names.remove(exclude_file)
      sys.stderr.write('Skipping %s\n' % os.path.join(dirname, exclude_file))
  if '.hg' in names:
    names.remove('.hg')

  arg['files'].extend(
      [os.path.join(dirname, name)
          for name in names if re.match('rhizo.*\\.js', name)])


def AddPackageDeps(package_deps, filename):
  """Extracts package dependencies from a given file.

  First converts the filename into the name of the package it represents.
  Then inspects the contents of the file, looking for dependencies declared
  using a RHIZODEP comment line like the following:

  // RHIZODEP=rhizo.base,rhizo.ui

  which declares a dependency on packages rhizo.base and rhizo.ui. An additional
  dependency mapping is then added to 'package_deps'.

  Args:
    package_deps: A dict mapping a package name to a set of packages it
        depends upon. E.g.: {'rhizo.foo': set(['rhizo.ui', 'rhizo.base'])}
    filename: The name of the file being processed.
  """
  f = open(filename, 'r')
  src_packge = os.path.basename(filename).replace('.js', '')
  package_deps[src_packge] = set()
  try:
    for line in f:
      m = re.search('RHIZODEP *= *(.+)', line)
      if m:
        package_deps[src_packge] = set(
            [dep.strip() for dep in m.group(1).split(',')])
        break
  finally:
    f.close()


def LinearizeDependencies(package_deps):
  """Linearizes a dependency map.

  Tries to convert the dependency map into a sequence of packages, so that
  each element in the sequence depends only on the ones before it (not
  necessarily all of them). Returns None if such conversion is not possible
  (e.g.: a dependency cycle is found).

  Args:
    package_deps: A dict mapping a package name to a set of packages it
         depends upon. E.g.: {'rhizo.foo': set(['rhizo.ui', 'rhizo.base'])}

  Returns:
    A list of linearized package dependencies, from the base packages (not
    depending on anything) to the leaf ones (depending on all the previous
    ones), or None if the dependency map can't be linearized (e.g. a dependency
    cycle exists).
  """
  full_linear_deps = []
  while package_deps:
    linear_deps = []
    for source, targets in package_deps.iteritems():
      if not targets:
        linear_deps.append(source)

    for source in linear_deps:
      del package_deps[source]
      for targets in package_deps.values():
        if source in targets:
          targets.remove(source)

    if not linear_deps:
      print 'You have a dependency cycle: %s' % package_deps
      return
    else:
      full_linear_deps.extend(linear_deps)
  return full_linear_deps


def RenderDot(package_deps):
  """Prints a dependency graph in DOT format.

  Args:
    package_deps: A dict mapping a package name to a set of packages it
        depends upon. E.g.: {'rhizo.foo': set(['rhizo.ui', 'rhizo.base'])}
  """
  print 'digraph G {'
  for source, deps in package_deps.iteritems():
    for dep in deps:
      print '"%s" -> "%s";' % (source, dep)
  print '}'


def GenerateBundleContents(linear_deps, pkg_to_file_map):
  """Generates a bundle containing all Rhizosphere source code.

  Loads all Rhizosphere source files and groups them together in a single
  bundle, respecting the dependencies order when concatenating the contents of
  each file together.

  Args:
    linear_deps: A sequence of linearized packages.
    pkg_to_file_map: A dict mapping package names to the files defining them.

  Returns:
    A list of strings containing the bundle contents (one line per sequence
    item).
  """
  contents = []
  for pkgname in linear_deps:
    rhizo_file = pkg_to_file_map[pkgname]
    contents.append('/* %s */\n' % rhizo_file)
    f = open(rhizo_file, 'r')
    contents.extend(line for line in f)
    f.close()
  return contents


def WriteFile(contents, filename):
  """Writes contents into a file.

  Args:
    contents: A sequence of lines to be written.
    filename: The path to the target file.
  """
  f = open(filename, 'w')
  try:
    for line in contents:
      f.write(line)
  finally:
    f.close()


def WritePackFileOnline(bundle_contents, pack_file):
  """Packs Rhizosphere source code using the online Closure JS Compiler.

  Invokes the online Closure JS Compiler to pack all Rhizosphere source code
  and stores the results into 'pack_file'. If compilation fails for whatever
  reason (including Javascript errors in the sources), the pack file will be
  empty.

  Args:
    bundle_contents: A sequence of strings containing all Rhizosphere source
        code.
    pack_file: The name of the target pack file to produce.
  """
  params = urllib.urlencode([
      ('js_code', '\n'.join(bundle_contents)),
      ('compilation_level', 'SIMPLE_OPTIMIZATIONS'),
      ('output_format', 'text'),
      ('output_info', 'compiled_code'),
    ])
  headers = { "Content-type": "application/x-www-form-urlencoded" }
  conn = httplib.HTTPConnection('closure-compiler.appspot.com')
  conn.request('POST', '/compile', params, headers)
  response = conn.getresponse()
  data = response.read()
  WriteFile([data], pack_file)
  conn.close


def WritePackFileLocal(bundle_file, java_binary, compiler_jar, pack_file):
  """Packs Rhizosphere source code using a local Closure JS Compiler.

  Errors raised during the compilation process will appear on stderr.

  Args:
    bundle_file: The path to a file containing all Rhizosphere source code.
    java_binary: The path to a JavaSE6 java binary.
    compiler_jar: The path to the Closure JS Compiler jar file.
    pack_file: The name of the target pack file to produce.
  """
  retcode = subprocess.call([
      java_binary,
      '-jar', compiler_jar,
      '--js', bundle_file,
      '--js_output_file', pack_file,
      '--compilation_level', 'SIMPLE_OPTIMIZATIONS'])
  print 'Local compilation done with status: %s' % retcode


def main():
  # Parse command line
  (options, args) = ReadCommandLineFlags()

  # Identify all Rhizosphere source files
  rhizo_files = []
  exclude_set = set(options.exclude.split(','))
  os.path.walk(options.dir, AddRhizoFiles,
               {'files': rhizo_files,
                'exclude_all_extra': options.exclude_all_extra,
                'exclude_set': exclude_set})

  # Map file names to packages
  rhizo_packages = {}
  for rhizo_file in rhizo_files:
    rhizo_packages[os.path.basename(rhizo_file).replace('.js', '')] = rhizo_file

  # Build the dependencies map
  dependencies = {}
  for rhizo_file in rhizo_packages.values():
    AddPackageDeps(dependencies, rhizo_file)

  # Optionally, print the dependency map in DOT format and quit.
  if options.graphviz:
    RenderDot(dependencies)
    return

  # Linearize the set of dependencies
  all_dep_seq = LinearizeDependencies(dependencies)
  if not all_dep_seq:  # linearization failed
    return

  # Bundle all the source code together in the correct order
  # (according to the dependency map previously built).
  bundle_contents = GenerateBundleContents(all_dep_seq, rhizo_packages)

  # Write the bundle file.
  print 'Generating bundle file...'
  bundle_file = os.path.join(options.output_directory, 'rhizo.bundle.js')
  WriteFile(bundle_contents, bundle_file)

  # Generate the pack file, either using a local or an online Closure Compiler.
  pack_file = os.path.join(options.output_directory, 'rhizo.pack.js')
  if options.online:
    print 'Calling online JS compiler...'
    WritePackFileOnline(bundle_contents, pack_file)
  else:
    print 'Calling local JS compiler...'
    WritePackFileLocal(bundle_file, options.java, options.compiler, pack_file)
  print 'Done.'


if __name__ == '__main__':
  main()
