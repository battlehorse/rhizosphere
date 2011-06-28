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

import com.google.gwt.core.client.JavaScriptObject;

/**
 * Simple wrapper to declare an explicit positioning of a Rhizosphere model
 * within the visualization viewport.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class RhizosphereModelPosition extends JavaScriptObject {
  protected RhizosphereModelPosition() {}

  /**
   * Creates a new position object.
   *
   * @param modelRef A reference to the model whose position is being declared.
   * @param top Top position, in pixels, of the top-left corner of the model
   *     rendering from the top-left corner of the visualization universe.
   * @param left Left position, in pixels, of the top-left corner of the model
   *     rendering from the top-left corner of the visualization universe.
   * @return A new position instance.
   */
  // NOTE that we internally hold a direct reference to the model id, since
  // this class is used directly by rhizo.layout.LayoutManager when parsing
  // layout events (and LayoutManager requires the id attribute to be present).
  public static final native RhizosphereModelPosition create(
      RhizosphereModelRef modelRef, int top, int left) /*-{
    return {ref: modelRef, id: modelRef.id, top: top, left: left};
  }-*/;

  public final native RhizosphereModelRef getModelRef() /*-{
    return this['ref'];
  }-*/;

  public final native int getTop() /*-{
    return this['top'];
  }-*/;

  public final native int getLeft() /*-{
    return this['left'];
  }-*/;
}
