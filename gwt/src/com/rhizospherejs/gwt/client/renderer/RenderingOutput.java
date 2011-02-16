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

import com.google.gwt.dom.client.Element;
import com.google.gwt.safehtml.shared.SafeHtml;
import com.google.gwt.user.client.ui.Widget;


/**
 * Helper interface that
 * {@link com.rhizospherejs.gwt.client.RhizosphereRenderer} instances use to
 * emit and customize the renderings they produce.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public interface RenderingOutput {

  /**
   * Returns rendering hints about the current visualization environment, that
   * renderers can use to customize their behavior.
   */
  RenderingHints getRenderingHints();

  /**
   * Invoked by renderers that emit their renderings as HTML elements.
   * Renderers must invoke exactly one of the emit methods (
   * {@link #emitElement(Element)}, {@link #emitHTML(String)},
   * {@link #emitSafeHtml(SafeHtml)} or {@link #emitWidget(Widget)}) just once
   * per rendering.
   *
   * @param element The produced rendering.
   */
  void emitElement(Element element);

  /**
   * Invoked by renderers that emit their renderings as GWT widgets.
   * Renderers must invoke exactly one of the emit methods (
   * {@link #emitElement(Element)}, {@link #emitHTML(String)},
   * {@link #emitSafeHtml(SafeHtml)} or {@link #emitWidget(Widget)}) just once
   * per rendering.
   *
   * @param widget The produced rendering.
   */
  void emitWidget(Widget widget);

  /**
   * Invoked by renderers that emit their renderings as Strings (that must
   * parse into correct HTML).
   * Renderers must invoke exactly one of the emit methods (
   * {@link #emitElement(Element)}, {@link #emitHTML(String)},
   * {@link #emitSafeHtml(SafeHtml)} or {@link #emitWidget(Widget)}) just once
   * per rendering.
   *
   * @param html The produced rendering.
   */
  void emitHTML(String html);

  /**
   * Invoked by renderers that emit their renderings as SafeHtml.
   * Renderers must invoke exactly one of the emit methods (
   * {@link #emitElement(Element)}, {@link #emitHTML(String)},
   * {@link #emitSafeHtml(SafeHtml)} or {@link #emitWidget(Widget)}) just once
   * per rendering.
   *
   * @param html The produced rendering.
   */
  void emitSafeHtml(SafeHtml html);

  /**
   * Registers an element as drag handler.
   * <p>
   * Renderings produced by a renderer can be dragged within the Rhizosphere
   * user interface. By default, the user can drag a rendering by starting
   * the drag operation from any point within the rendering (the entire
   * rendering act as a drag handler). This may cause some conflicts in mouse
   * event handling depending on the contents of the rendering.
   * <p>
   * Renderings can therefore have custom drag handlers. To use custom drag
   * handlers have the renderer class implement the
   * {@link HasCustomDragHandlers} interface and invoke this method on any
   * element that should act as drag handler.
   *
   * @param dragHandler An element that can act as drag handler.
   */
  void addDragHandler(Element dragHandler);

  /**
   * Registers an widget as drag handler.
   * <p>
   * Renderings produced by a renderer can be dragged within the Rhizosphere
   * user interface. By default, the user can drag a rendering by starting
   * the drag operation from any point within the rendering (the entire
   * rendering act as a drag handler). This may cause some conflicts in mouse
   * event handling depending on the contents of the rendering.
   * <p>
   * Renderings can therefore have custom drag handlers. To use custom drag
   * handlers have the renderer class implement the
   * {@link HasCustomDragHandlers} interface and invoke this method on any
   * widget that should act as drag handler.
   *
   * @param dragHandler A widget that can act as drag handler.
   */
  void addDragHandler(Widget dragHandler);
}
