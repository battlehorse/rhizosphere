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

import com.rhizospherejs.gwt.client.RhizosphereException;

/**
 * Default implementation for the {@link RenderingOutput} interface.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
class RenderingOutputImpl implements RenderingOutput {

  /**
   * Extension to the HTML widget to also accept an HTML element as input.
   */
  private static class HTML extends com.google.gwt.user.client.ui.HTML {

    public HTML(String html) {
      super(html);
    }

    public HTML(SafeHtml html) {
      super(html);
    }

    public HTML(Element element) {
      super(element);
    }
  }

  private RenderingHints renderingHints;

  /**
   * The rendering produced by the renderer this class is assigned to.
   */
  private Widget rendering;

  /**
   * A widget bridge that ensures the {@link #rendering} widget will be managed
   * according to GWT widget lifecycle expectations.
   */
  private WidgetBridge widgetBridge;

  public RenderingOutputImpl(RenderingHints renderingHints, WidgetBridge widgetBridge) {
    this.renderingHints = renderingHints;
    this.widgetBridge = widgetBridge;
  }

  @Override
  public void emitElement(Element element) {
    emitWidget(new HTML(element));
  }

  @Override
  public void emitHTML(String html) {
    emitWidget(new HTML(html));
  }

  @Override
  public void emitSafeHtml(SafeHtml html) {
    emitWidget(new HTML(html));
  }

  @Override
  public void emitWidget(Widget widget) {
    if (rendering != null) {
      throw new RhizosphereException(
          "emitWidget() called more than once within a Rhizosphere rendering.");
    }
    // Setting the rhizo-stop-propagation class on the emitted widget ensures
    // that certain events (such as clicks) do not bubble up into the
    // Rhizosphere rendering model, where they could be mis-handled (for
    // example triggering model selection).
    widget.setStyleName("rhizo-stop-propagation", true);
    rendering = widgetBridge.processRendering(widget);
  }

  @Override
  public void addDragHandler(Element dragHandler) {
    dragHandler.addClassName("rhizo-drag-handle");
  }

  @Override
  public void addDragHandler(Widget dragHandler) {
    dragHandler.setStyleName("rhizo-drag-handle", true);
  }

  @Override
  public RenderingHints getRenderingHints() {
    return renderingHints;
  }

  public Widget getRendering() {
    return rendering;
  }
}
