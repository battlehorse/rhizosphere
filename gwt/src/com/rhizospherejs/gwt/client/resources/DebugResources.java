/*
  Copyright 2011 The Rhizosphere Authors. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

package com.rhizospherejs.gwt.client.resources;

import com.google.gwt.resources.client.ClientBundle;
import com.google.gwt.resources.client.TextResource;

/**
 * Resource enumeration for all the resources that are inlined in a GWT host
 * page containing a Rhizosphere visualization, when operating in debug mode.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public interface DebugResources extends ClientBundle {

  @Source("com/rhizospherejs/gwt/jsni/rhizosphere/shared/js/less-1.1.3.min.js")
  TextResource lessJs();
}
