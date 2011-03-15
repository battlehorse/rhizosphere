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
import com.google.gwt.core.client.JsArrayMixed;
import com.google.gwt.core.client.JsDate;

import com.rhizospherejs.gwt.client.RhizosphereKind;
import com.rhizospherejs.gwt.rebind.BridgeType;

import java.util.Date;

/**
 * Exposes methods that {@link ModelBridge} instances can use to convert a POJOs
 * into JavaScriptObject instances that the Rhizosphere javascript library can
 * use as model representations.
 * <p>
 * A {@link ModelBridge} uses a JsoBuilder to wrap a JavaScriptObject and
 * invokes its setter methods to convert a POJO into a JavaScriptObject.
 * <p>
 * JsoBuilder methods are annotated and structured to map Java types to
 * equivalent types supported by the Rhizosphere library.
 * <p>
 * Rhizosphere can be instructed to use custom JsoBuilders if the default one
 * doesn't fit all conversion needs (see
 * {@link com.rhizospherejs.gwt.client.Rhizosphere#prepareFor(
 * com.rhizospherejs.gwt.client.RhizosphereMapping, JsoBuilder)}).
 * Subclasses should override #setObject(String, Object) and
 * #setObjectArray(String, Object[]) to define their custom conversion logic
 * for Java types that are unsupported by the default JsoBuilder.
 * <p>
 * <strong>NOTE</strong>: the code generator already support array types for
 * any native type, but Rhizosphere does not yet. Hence we do not expose any
 * array setters here.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class JsoBuilder {

  private JavaScriptObject target;

  /**
   * Sets the JavaScriptObject that this builder will populate.
   */
  public final void setTarget(JavaScriptObject target) {
    this.target = target;
  }

  /**
   * Sets an integer on the target JavaScriptObject.
   * @param attribute The name of the variable that will store the value.
   * @param value
   */
  @BridgeType(rhizosphereKind = RhizosphereKind.NUMBER)
  public final native void setInteger(String attribute, int value) /*-{
    this.@com.rhizospherejs.gwt.client.bridge.JsoBuilder::target[attribute] = value;
  }-*/;

  /**
   * Sets a float on the target JavaScriptObject.
   * @param attribute The name of the variable that will store the value.
   * @param value
   */
  @BridgeType(rhizosphereKind = RhizosphereKind.DECIMAL)
  public final native void setFloat(String attribute, float value) /*-{
    this.@com.rhizospherejs.gwt.client.bridge.JsoBuilder::target[attribute] = value;
  }-*/;

  /**
   * Sets a double on the target JavaScriptObject.
   * @param attribute The name of the variable that will store the value.
   * @param value
   */
  @BridgeType(rhizosphereKind = RhizosphereKind.DECIMAL)
  public final native void setDouble(String attribute, double value) /*-{
    this.@com.rhizospherejs.gwt.client.bridge.JsoBuilder::target[attribute] = value;
  }-*/;

  /**
   * Sets a boolean on the target JavaScriptObject.
   * @param attribute The name of the variable that will store the value.
   * @param value
   */
  @BridgeType(rhizosphereKind = RhizosphereKind.BOOLEAN)
  public final native void setBoolean(String attribute, boolean value) /*-{
    this.@com.rhizospherejs.gwt.client.bridge.JsoBuilder::target[attribute] = value;
  }-*/;

  /**
   * Sets a String on the target JavaScriptObject.
   * @param attribute The name of the variable that will store the value.
   * @param value
   */
  @BridgeType(rhizosphereKind = RhizosphereKind.STRING)
  public final native void setString(String attribute, String value) /*-{
    this.@com.rhizospherejs.gwt.client.bridge.JsoBuilder::target[attribute] = value;
  }-*/;

  /**
   * Sets a Date on the target JavaScriptObject.
   * @param attribute The name of the variable that will store the value.
   * @param value
   */
  @BridgeType(rhizosphereKind = RhizosphereKind.DATE)
  public final void setDate(String attribute, Date value) {
    nativeSetObject(target, attribute, JsDate.create(value.getTime()));
  }

  /**
   * Sets a JavaScriptObject on the target JavaScriptObject.
   * @param attribute The name of the variable that will store the value.
   * @param value
   */
  @BridgeType
  public final native void setJavaScriptObject(String attribute, JavaScriptObject value) /*-{
    this.@com.rhizospherejs.gwt.client.bridge.JsoBuilder::target[attribute] = value;
  }-*/;

  /**
   * Sets an opaque object on the target JavaScriptObject.
   * @param attribute The name of the variable that will store the value.
   * @param value
   */
  @BridgeType
  public final native void setObject(String attribute, Object value) /*-{
    this.@com.rhizospherejs.gwt.client.bridge.JsoBuilder::target[attribute] = value;
  }-*/;

  /**
   * Sets an opaque array of objects on the target JavaScriptObject.
   * @param attribute The name of the variable that will store the value.
   * @param value
   */
  @BridgeType
  public void setObjectArray(String attribute, Object[] value) {
    nativeSetObject(target, attribute, convertToJsArrayObject(value));
  }

  private native void nativeSetObject(JavaScriptObject target,
                                      String attribute,
                                      JavaScriptObject value) /*-{
    target[attribute] = value;
  }-*/;

  private JsArrayMixed convertToJsArrayObject(Object[] value) {
    if (value == null) {
      return null;
    }
    JsArrayMixed array = JavaScriptObject.createArray().cast();
    for (int i = 0; i < value.length; i++) {
      nativeArrayPush(array, value[i]);
    }
    return array;
  }

  private native void nativeArrayPush(JsArrayMixed array, Object value) /*-{
    array.push(value);
  }-*/;
}
