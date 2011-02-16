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

import com.google.gwt.user.client.ui.Widget;

/**
 * Interface for {@link com.rhizospherejs.gwt.client.RhizosphereRenderer}
 * instances to declare that their renderings can handle resizing.
 *
 * @param <T>  The models' type rendered by the
 *     {@link com.rhizospherejs.gwt.client.RhizosphereRenderer} this interface
 *     is attached to.
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public interface HasRescalable<T> {

  /**
   * Decides whether a rendering can be resized to the requested dimensions or
   * not.
   *
   * @param model The Rhizosphere model the rendering represents.
   * @param w The widget that was emitted by the renderer for this rendering.
   *     It will be a com.google.gwt.user.client.ui.HTML instance if the
   *     renderer emitted a raw HTML string or DOM element.
   * @param width The desired width after resize.
   * @param height The desired height after resize.
   * @return Whether the widget can be rescaled to the requested dimensions.
   */
  boolean canRescaleTo(T model, Widget w, int width, int height);

  /**
   * Resizes a rendering to the requested dimensions.
   *
   * @param model The Rhizosphere model the rendering represents.
   * @param w The widget that was emitted by the renderer for this rendering.
   *     It will be a com.google.gwt.user.client.ui.HTML instance if the
   *     renderer emitted a raw HTML string or DOM element.
   * @param width The desired width after resize.
   * @param height The desired height after resize.
   */
  void rescale(T model, Widget w, int width, int height);
}
