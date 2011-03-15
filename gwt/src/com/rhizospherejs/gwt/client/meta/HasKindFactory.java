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

package com.rhizospherejs.gwt.client.meta;

import com.google.gwt.core.client.JavaScriptObject;

/**
 * Interface assigned to an {@link AttributeDescriptor} to specify the
 * Rhizosphere data type (kind) of the matching
 * {@link com.rhizospherejs.gwt.client.RhizosphereModelAttribute} via a
 * factory method.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public interface HasKindFactory {

   /**
    * Returns a factory of {@link com.rhizospherejs.gwt.client.RhizosphereKind}
    * instances.
    *
    * @return A Javascript function that will return a valid
    *     {@link com.rhizospherejs.gwt.client.RhizosphereKind}
    *     ({@code rhizo.meta.kind} instance in Rhizoshere JS code) when invoked
    *     with no arguments.
    */
  JavaScriptObject kindFactory();
}
