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
 * A ModelBridge is responsible for converting a Java object representing a
 * Rhizosphere model into a JavaScriptObject that the Rhizosphere javascript
 * library can use. Since ModelBridge also implements {@link ModelExtractor},
 * it is also capable of the reverse process of extracting the original Java
 * instance from a generated JavaScriptObject.
 * <p>
 * Apart from a few stock model bridges for generic cases (see
 * {@link JavaScriptObjectModelBridge}), all model bridges will be
 * code-generated to match the model types sent to
 * {@link com.rhizospherejs.gwt.client.Rhizosphere#addModel(Object)}.
 *
 * @param <T> The models' type that this bridge can convert.
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public abstract class ModelBridge<T> implements ModelExtractor<T> {

  /**
   * A JavaScriptObject builder that the bridge might use for the conversion
   * process.
   */
  private JsoBuilder builder;

  /**
   * Creates a new instance.
   * @param builder A JavaScriptObject builder that the bridge might use to
   *     assemble JavaScriptObject instances. If {@code null}, the default
   *     {@link JsoBuilder} is used.
   */
  public ModelBridge(JsoBuilder builder) {
    if (builder == null) {
      builder = new JsoBuilder();
    }
    this.builder = builder;
  }

  /**
   * Converts a Java object representing a Rhizosphere model into a
   * JavaScriptObject that the Rhizosphere javascript library can use.
   *
   * @param model The object to convert.
   * @return The generated JavaScriptObject.
   */
  public JavaScriptObject bridge(T model) {
    JavaScriptObject jsModel = bridgeInternal(model, builder);
    bindJsToModel(jsModel, model);
    ensureModelId(jsModel);
    return jsModel;
  }

  /**
   * Subclasses to implement to define their custom conversion logic.
   *
   * @param model The model object to convert to JavaScriptObject.
   * @param builder A JavaScriptObject builder that subclasses can use to
   *     assemble the output JavaScriptObject.
   * @return The generated JavaScriptObject.
   */
  protected abstract JavaScriptObject bridgeInternal(T model, JsoBuilder builder);

  @Override
  public T extractModel(JavaScriptObject jso) {
    return nativeExtractModel(jso);
  }

  /**
   * Ensures that the generated JavaScriptObject has an assigned id (mandatory
   * for any Rhizosphere model object).
   */
  private final native void ensureModelId(JavaScriptObject model) /*-{
    if (!model['id']) {
      model['id'] = model['__gwt_ObjectId'];
    }
  }-*/;

  /**
   * Stores a reference to the original wrapped object into the generated
   * JavaScriptObject.
   */
  private final native void bindJsToModel(JavaScriptObject target, T model) /*-{
    target['__rhizosphere_Model'] = model;
  }-*/;

  /**
   * Extracts the original model object from the wrapping JavaScriptObject.
   */
  private native T nativeExtractModel(JavaScriptObject jso) /*-{
    return jso['__rhizosphere_Model'];
  }-*/;
}
