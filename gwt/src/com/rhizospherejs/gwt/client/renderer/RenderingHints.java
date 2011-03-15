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

package com.rhizospherejs.gwt.client.renderer;

import com.google.gwt.core.client.JavaScriptObject;

/**
 * Rendering hints about the enviroment a Rhizosphere visualization is embedded
 * into. They are typically used by
 * {@link com.rhizospherejs.gwt.client.RhizosphereRenderer} to tweak their
 * behavior depending on the environment.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class RenderingHints extends JavaScriptObject {
  protected RenderingHints() {}

  /**
   * Creates a new instance from a JSNI representation of the same hints.
   */
  static final RenderingHints create(JavaScriptObject nativeRenderingHints) {
    return nativeRenderingHints.cast();
  }

  /**
   * Returns whether the Rhizosphere visualization is currently being
   * accessed by a mobile device (a smartphone or a tablet).
   */
  public final native boolean isMobile() /*-{
    return !!this['mobile']
  }-*/;

  /**
   * Returns whether the Rhizosphere visualization is currently embedded in
   * a space-constrained container. The definition of 'small' is subjective,
   * but indicates the need to reduce the amount of information a renderer
   * displays to the minimum necessary. For example, a Rhizosphere visualization
   * might be in small mode when it is rendered within a mobile device or
   * embedded in a container with reduced display real estate (like a
   * non-maximized iGoogle gadget).
   */
  public final native boolean isSmall() /*-{
    return !!this['small'];
  }-*/;
}
