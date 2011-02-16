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
import com.google.gwt.json.client.JSONObject;

/**
 * A stock {@link ModelBridge} to convert model objects which are defined as
 * JSONObjects.
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class JSONObjectModelBridge extends ModelBridge<JSONObject> {

  public JSONObjectModelBridge() {
    super(null);
  }

  @Override
  public JavaScriptObject bridgeInternal(JSONObject model, JsoBuilder builder) {
    return model.getJavaScriptObject();
  }

  @SuppressWarnings("unchecked")
  public <T> T cast() {
    return (T) this;
  }
}
