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

package com.rhizospherejs.gwt.client.bridge;

import com.google.gwt.core.client.JavaScriptObject;

/**
 * Extracts the Java object that was originally used to represent a Rhizosphere
 * model (via {@link com.rhizospherejs.gwt.client.Rhizosphere#addModel(Object)})
 * from the JavaScriptObject (used in the visualization javascript library code)
 * that wraps it.
 *
 * @param <T> The models' type of the Rhizosphere visualization this extractor
 *     is attached to.
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public interface ModelExtractor<T> {

  /**
   * Extracts the Java object that was originally used to represent a
   * Rhizosphere model (via
   * {@link com.rhizospherejs.gwt.client.Rhizosphere#addModel(Object)}) from
   * the JavaScriptObject (used in the visualization javascript library code)
   * that wraps it.
   *
   * @param jso The wrapping JavaScriptObject.
   * @return The wrapped model object.
   */
  T extractModel(JavaScriptObject jso);
}
