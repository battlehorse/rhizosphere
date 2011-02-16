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
import com.google.gwt.json.client.JSONException;
import com.google.gwt.json.client.JSONObject;
import com.google.gwt.json.client.JSONParser;

/**
 * A stock {@link ModelBridge} to convert model objects which are defined as
 * JSON Strings. When strictly parsed, the Strings must convert to valid
 * JSON Objects or JSONExceptions will be thrown.
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class JSONStringModelBridge extends ModelBridge<String> {

  public JSONStringModelBridge() {
    super(null);
  }

  //Might throw JSONException.
  @Override
  public JavaScriptObject bridgeInternal(String model, JsoBuilder builder) {
    JSONObject jsonModel = JSONParser.parseStrict(model).isObject();
    if (jsonModel == null) {
      throw new JSONException("Received model is not a JSON Object (" + model + ")");
    }
    return jsonModel.getJavaScriptObject();
  }

  @SuppressWarnings("unchecked")
  public <T> T cast() {
    return (T) this;
  }

}
