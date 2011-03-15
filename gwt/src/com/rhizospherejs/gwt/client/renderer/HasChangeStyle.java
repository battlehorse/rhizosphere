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

import com.google.gwt.dom.client.Style;
import com.google.gwt.user.client.ui.Widget;

import java.util.Set;

/**
 * Interface for {@link com.rhizospherejs.gwt.client.RhizosphereRenderer}
 * instances to declare that their renderings can handle custom style changes.
 *
 * @param <T>  The models' type rendered by the
 *     {@link com.rhizospherejs.gwt.client.RhizosphereRenderer} this interface
 *     is attached to.
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public interface HasChangeStyle<T> {

  /**
   * Changes the style of a rendering previously emitted by the
   * {@link com.rhizospherejs.gwt.client.RhizosphereRenderer} tagged with
   * this interface.
   *
   * @param model The Rhizosphere model the rendering represents.
   * @param w The widget that was emitted by the renderer for this rendering.
   *     It will be a com.google.gwt.user.client.ui.HTML instance if the
   *     renderer emitted a raw HTML string or DOM element.
   * @param cssKeys The set of CSS attributes that the rendering should change.
   * @param style A Style object containing the values to use for the keys
   *     defined in cssKeys.
   * @param isReverting Whether this call is to revert the rendering to its
   *     original style (the one he had when he was emitted) or not.
   */
  void changeStyle(T model, Widget w, Set<String> cssKeys, Style style, boolean isReverting);

}
