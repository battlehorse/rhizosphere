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

import com.rhizospherejs.gwt.client.RhizosphereMetaModel;

/**
 * Abstract factory class to assemble {@link RhizosphereMetaModel} instances.
 * <p>
 * Implementations are code-generated to match the model types sent to
 * {@link com.rhizospherejs.gwt.client.Rhizosphere#addModel(Object, 
 * com.rhizospherejs.gwt.client.RhizosphereCallback1)}.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public abstract class MetaModelFactory {

  private AttributeBuilder builder;

  /**
   * Creates a new factory with a default attribute builder.
   */
  public MetaModelFactory() {
    this(null);
  }

  /**
   * Creates a new factory with a custom attribute builder.
   */
  public MetaModelFactory(AttributeBuilder builder) {
    if (builder == null) {
      builder = new AttributeBuilder();
    }
    this.builder = builder;
  }

  /**
   * Creates a new metamodel instance.
   */
  public final RhizosphereMetaModel newMetaModel() {
    RhizosphereMetaModel metaModel = RhizosphereMetaModel.create();
    fillMetaModelAttributes(metaModel, builder);
    return metaModel;
  }
  
  protected abstract void fillMetaModelAttributes(
      RhizosphereMetaModel metaModel, AttributeBuilder builder);

}
