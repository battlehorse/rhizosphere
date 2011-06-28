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
 * <p>
 * To use this interface you should be familiar with Rhizosphere Javascript
 * APIs to be able to write correct factory implementations. Start with
 * <a href="http://code.google.com/p/rhizosphere/source/browse/src/js/rhizo.meta.js">
 * rhizo.meta.js</a> and
 * <a href="http://code.google.com/p/rhizosphere/source/browse/src/js/rhizo.ui.meta.js">
 * rhizo.ui.meta.js</a> for a primer on Rhizosphere kinds system and how to
 * extend it with custom kinds. 
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public interface HasKindFactory {

   /**
    * Returns a factory method to generate the Rhizosphere kind (model
    * attribute type in Rhizosphere terminology) instance for the
    * {@link com.rhizospherejs.gwt.client.RhizosphereMetaModel.Attribute} this
    * interface describes. See
    * <a href="http://code.google.com/p/rhizosphere/source/browse/src/js/rhizo.meta.js">
    * rhizo.meta.js</a> for more info about how to define kind instances.
    *
    * @return A Javascript function that will return a valid Rhizosphere kind
    *     instance when invoked with no arguments.
    */
  JavaScriptObject kindFactory();
  
  /**
   * Returns a factory method to generate the Rhizosphere kind user interface
   * instance for the
   * {@link com.rhizospherejs.gwt.client.RhizosphereMetaModel.Attribute} this
   * interface describes. See
   * <a href="http://code.google.com/p/rhizosphere/source/browse/src/js/rhizo.ui.meta.js">
   * rhizo.ui.meta.js</a> for more info about how to define kind user
   * interfaces.
   *
   * @return A Javascript function that will return a valid Rhizosphere kind
   *     user interface instance when invoked with 2 arguments: the
   *     {@code rhizo.Project} instance the user interface will belong to and
   *     the name of the
   *     {@link com.rhizospherejs.gwt.client.RhizosphereMetaModel} attribute
   *     the factory is bound to. Return {@code null} if the generated kind
   *     should not have a user interface.
   */
  JavaScriptObject kindUiFactory();
}
