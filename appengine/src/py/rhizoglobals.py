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

appenginedebug=True
analytics_id='UA-18908843-1'


def DefaultTemplate(request):
  """Builds a dictionary of default template values shared by all requests."""
  return {
    # Should we serve compiled or uncompiled resources?
    'debug': request.get('d', '0') == '1',
    'logLevel': request.get('logLevel'),
    'analytics_id': analytics_id,
    'copyright_year': '2010-2011'
  }


def HostName():
  """Returns the current hostname."""
  return os.environ['HTTP_HOST']


def GetOptionFromUrl(request, optname, allowedvalues):
  """Extracts a parameter from the request.

  Args:
    request: The google.appengine.ext.webapp.Request instance containing the
        details of the request we are serving.
    optname: The name of the parameter to extract.
    allowedValues: An array of allowed values for the parameter to extract. If
        the parameter does not match any allowed values, the first one in the
        array is returned as the default value.
  """
  opt = request.get(optname)
  if opt and opt not in allowedvalues:
    return allowedvalues[0]
  return opt


def IdentifyPlatformDevice(request):
  """Identifies the user platform and device from the User-Agent header.

  The user can override the default inference by specifying overrides in the
  'platform' and 'device' URL parameters.

  Args:
    request: The google.appengine.ext.webapp.Request instance containing the
        details of the request we are serving.
  Returns:
    A (platform, device) tuple that identifies the user's platform ('mobile' or
    'default') and device ('ipad, 'iphone', 'android', etc ... ).
  """
  platform, device = None, None
  user_agent = request.headers.get('User-Agent', '').lower()
  if 'ipad' in user_agent:
    platform, device = 'mobile', 'ipad'
  elif 'iphone' in user_agent:
    platform, device = 'mobile', 'iphone'
  elif 'android' in user_agent:
    platform, device = 'mobile', 'android'

  if not platform:
    platform = GetOptionFromUrl(request, 'platform',
                                ['default', 'mobile'])
  if not device:
    device = GetOptionFromUrl(request, 'device',
                              ['default', 'ipad', 'iphone', 'android'])
  return platform, device


def IsSmartphone(platform, device):
  """Returns whether the user is accessing Rhizosphere from a smartphone."""
  return platform == 'mobile' and device in ['iphone', 'android']
