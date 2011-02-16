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

package com.rhizospherejs.gwt.client;

import com.rhizospherejs.gwt.client.bridge.JsoBuilder;
import com.rhizospherejs.gwt.client.bridge.ModelBridge;
import com.rhizospherejs.gwt.client.meta.AttributeBuilder;
import com.rhizospherejs.gwt.client.meta.MetaModelFactory;

/**
 * Provides mapping functionalities between externally defined POJOs and the
 * object model Rhizosphere requires to operate.
 * 
 * Exposes factory method to create both model and metamodel builders. Model
 * builders convert between {@link RhizosphereModel} instances and suitably
 * configured JavaScriptObjects. Metamodel builders assemble metamodels from
 * {@link RhizosphereModelAttribute} annotations.
 * 
 * Instances of this class are generated via the
 * {@link com.rhizospherejs.gwt.rebind.MappingWriter} code generator.
 * 
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public interface RhizosphereMapping<T> {

  ModelBridge<T> newModelBridge(JsoBuilder jsoBuilder);
  
  MetaModelFactory newMetaModelFactory(AttributeBuilder attributeBuilder);
}
