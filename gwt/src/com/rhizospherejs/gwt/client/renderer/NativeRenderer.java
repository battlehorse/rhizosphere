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
import com.google.gwt.dom.client.Style;
import com.google.gwt.json.client.JSONObject;
import com.google.gwt.user.client.ui.Widget;

import com.rhizospherejs.gwt.client.RhizosphereException;
import com.rhizospherejs.gwt.client.RhizosphereRenderer;
import com.rhizospherejs.gwt.client.bridge.ModelExtractor;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Bridge renderer that translates rendering instructions from
 * {@link RhizosphereRenderer} instances into a native JSNI renderer that the
 * Rhizosphere javascript library can understand. Also translates events and
 * method calls arising from JSNI into GWT land.
 * <p>
 * {@link RhizosphereRenderer} instances are free to use GWT widgets in the
 * output they produce. To ensure that these widgets are properly managed
 * according to GWT widget lifecycle expectations, this class must hold
 * references to the containing Rhizosphere visualization (itself a widget)
 * in the form of a {@link WidgetBridge} (for lifecycle events such as
 * attaching and detaching) and a {@link ModelExtractor} (for conversion between
 * Rhizosphere models defined in GWT land and their Javascript equivalents).
 * <p>
 * Since renderers can also be defined via Rhizosphere configuration options
 * (both for the plain {@link com.rhizospherejs.gwt.client.Rhizosphere}
 * visualization and the Google Visualization compatible
 * {@link com.rhizospherejs.gwt.client.gviz.GVizRhizosphere}), it becomes
 * mandatory not to share configuration options between different Rhizosphere
 * instances (enforced throughout the library).
 * <p>
 * This class is for internal use. Users of the Rhizosphere library should not
 * bother with this one.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class NativeRenderer<T> {

  /**
   * The renderer to expose via JSNI to the underlying Rhizosphere Javascript
   * library.
   */
  private RhizosphereRenderer<T> gwtRenderer;

  /**
   * Mapping between Javascript equivalents of Rhizosphere models (as resulting
   * from {@link com.rhizospherejs.gwt.client.Rhizosphere#addModel(Object,
   * com.rhizospherejs.gwt.client.RhizosphereCallback1)} and their renderings
   * (as GWT widgets).
   */
  private Map<JavaScriptObject, Widget> modelWidgetMap;

  /**
   * Bridge to ensure correct management of GWT widgets that are produced by
   * {@link #gwtRenderer} and shared between JSNI and GWT code.
   */
  private WidgetBridge widgetBridge;

  /**
   * Extractor to retrieve original visualization models from the
   * JavaScriptObject wrappers used by the underlying Javascript Rhizosphere
   * library.
   */
  private ModelExtractor<T> modelExtractor;

  /**
   * Creates a new renderer.
   *
   * @param gwtRenderer The GWT-land renderer to bridge and expose to the
   *     underlying Javascript Rhizosphere library.
   * @param widgetBridge A widget bridge to ensure correct handling of GWT
   *     widgets shared between GWT and JSNI code. Can be {@code null} and
   *     lazily defined at a later state.
   * @param extractor A model extractor to recover Rhizosphere models from their
   *     JavaScriptObject wrappers. Can be {@code null} and lazily defined at a
   *     later state.
   */
  public NativeRenderer(RhizosphereRenderer<T> gwtRenderer,
                        WidgetBridge widgetBridge,
                        ModelExtractor<T> extractor) {
    this.widgetBridge = widgetBridge;
    this.gwtRenderer = gwtRenderer;
    this.modelExtractor = extractor;
    modelWidgetMap = new HashMap<JavaScriptObject, Widget>();
  }

  /**
   * Lazily defines the widget bridge. The widget bridge can be set only once,
   * so this method will throw an exception if the bridge was already set on
   * the constructor or on a previous call to this method.
   *
   * @param bridge The widget bridge.
   * @throws RhizosphereException if a bridge is already defined for this
   *     renderer.
   */
  public void setWidgetBridge(WidgetBridge bridge) {
    if (widgetBridge != null && widgetBridge != bridge) {
      throw new RhizosphereException(
          "This renderer is already associated to a widget bridge."
          + "It cannot be changed once set. "
          + "This error may occur if you reuse the same set of configuration options "
          + "for multiple Rhizosphere instances.");
    }
    widgetBridge = bridge;
  }

  /**
   * Lazily defines the model extractor. The model extractor can be set only
   * once, so this method will throw an exception if the extractor was already
   * set on the constructor or on a previous call to this method.
   * @param extractor The model extractor.
   * @throws RhizosphereException if an extractor is already defined for this
   *     renderer.
   */
  public void setModelExtractor(ModelExtractor<T> extractor) {
    if (modelExtractor != null && modelExtractor != extractor) {
      throw new RhizosphereException(
          "This renderer is already associated to a model extractor."
          + "It cannot be changed once set. "
          + "This error may occur if you reuse the same set of configuration options "
          + "for multiple Rhizosphere instances.");
    }
    modelExtractor = extractor;
  }

  /**
   * Converts the renderer this class was instantiated with into a JSNI
   * equivalent renderer that translates rendering instructions bidirectionally
   * between GWT rendering code and the underlying Rhizosphere Javascript
   * rendering infrastructure.
   *
   * @return A native Javascript renderer.
   */
  @SuppressWarnings("deprecation")
  public JavaScriptObject toJavaScriptObject() {
    return nativeCreateJavascriptRenderer(
        this,
        gwtRenderer instanceof HasExpandable,
        gwtRenderer instanceof HasExpandableByModel<?>,
        gwtRenderer instanceof HasCustomDragHandlers,
        gwtRenderer instanceof HasCacheDimensions,
        gwtRenderer instanceof HasRescalable<?>,
        gwtRenderer instanceof HasChangeStyle<?>,
        gwtRenderer instanceof HasLegend);
  }

  private native JavaScriptObject nativeCreateJavascriptRenderer(
      NativeRenderer<T> nr,
      boolean hasExpandable,
      boolean hasExpandableByModel,
      boolean hasCustomDragHandlers,
      boolean hasCacheDimensions,
      boolean hasRescalable,
      boolean hasChangeStyle,
      boolean hasLegend) /*-{
    var renderer = {
      render: function(nakedModel, expanded, renderingHints) {
        expanded = !!expanded;
        return nr.@com.rhizospherejs.gwt.client.renderer.NativeRenderer::delegateRender(Lcom/google/gwt/core/client/JavaScriptObject;ZLcom/google/gwt/core/client/JavaScriptObject;)(nakedModel, expanded, renderingHints);
      },
      onAttach: function(nakedModel, nakedNode, attached) {
        return nr.@com.rhizospherejs.gwt.client.renderer.NativeRenderer::delegateAttach(Lcom/google/gwt/core/client/JavaScriptObject;Z)(nakedModel, attached);
      }
    };
    if (hasExpandable) {
      renderer['expandable'] = function(renderingHints) {
        return nr.@com.rhizospherejs.gwt.client.renderer.NativeRenderer::delegateExpandable(Lcom/google/gwt/core/client/JavaScriptObject;)(renderingHints);
      };
    }
    if (hasExpandableByModel) {
      renderer['expandableByModel'] = function(nakedModel, renderingHints) {
        return nr.@com.rhizospherejs.gwt.client.renderer.NativeRenderer::delegateExpandableByModel(Lcom/google/gwt/core/client/JavaScriptObject;Lcom/google/gwt/core/client/JavaScriptObject;)(nakedModel, renderingHints);
      };
    }
    if (hasCustomDragHandlers) {
      renderer['dragHandle'] = '.rhizo-drag-handle';
    }
    if (hasCacheDimensions) {
      renderer['cacheDimensions'] = nr.@com.rhizospherejs.gwt.client.renderer.NativeRenderer::delegateCacheDimensions()();
    }
    if (hasRescalable) {
      renderer['canRescaleTo'] = function(nakedModel, nakedNode, width, height) {
        return nr.@com.rhizospherejs.gwt.client.renderer.NativeRenderer::delegateCanRescaleTo(Lcom/google/gwt/core/client/JavaScriptObject;II)(nakedModel, width, height);
      };
      renderer['rescale'] = function(nakedModel, nakedNode, width, height) {
        nr.@com.rhizospherejs.gwt.client.renderer.NativeRenderer::delegateRescale(Lcom/google/gwt/core/client/JavaScriptObject;II)(nakedModel, width, height);
      };
    }
    if (hasChangeStyle) {
      renderer['changeStyle'] = function(nakedModel, nakedNode, props, opt_hintRevert) {
        // nakedNode is a jQuery object, but it's unused here so we ignore it.
        var revert = !!opt_hintRevert;
        nr.@com.rhizospherejs.gwt.client.renderer.NativeRenderer::delegateChangeStyle(Lcom/google/gwt/core/client/JavaScriptObject;Lcom/google/gwt/core/client/JavaScriptObject;Z)(nakedModel, props, revert);
      };
    }
    if (hasLegend) {
      renderer['getSizeRange'] = function() {
        return nr.@com.rhizospherejs.gwt.client.renderer.NativeRenderer::delegateGetSizeRange()();
      };
      renderer['getColorRange'] = function() {
        return nr.@com.rhizospherejs.gwt.client.renderer.NativeRenderer::delegateGetColorRange()();
      };
    }

    return renderer;
  }-*/;

  private T extractModel(JavaScriptObject jso) {
    if (modelExtractor == null) {
      throw new RhizosphereException(
          "Rhizosphere renderer must be bound to a Model extractor "
          + "to be able to convert between JSNI and gwt model representations.");
    }
    T model = modelExtractor.extractModel(jso);
    assert model != null;
    return model;
  }

  /**
   * Delegates a rendering request originated from the underlying Rhizosphere
   * Javascript library to the GWT renderer managed by this class.
   *
   * @param jso A JavaScriptObject wrapping the Rhizosphere model affected by
   *     the rendering request.
   * @param expanded Whether the rendering should be in expanded (maximized)
   *     status or not.
   * @param jsoRenderingHints Rendering hints about the current visualization
   *     environment.
   * @return an HTML element containing the produced rendering.
   */
  public Object delegateRender(JavaScriptObject jso,
                               boolean expanded,
                               JavaScriptObject jsoRenderingHints) {
    T model = extractModel(jso);
    assert model != null;
    if (widgetBridge == null) {
      throw new RhizosphereException(
          "Rhizosphere renderer must be bound to a WidgetBridge,"
          + "to avoid memory leaks when attaching/detaching widget renderings.");
    }
    RenderingOutputImpl output = new RenderingOutputImpl(
        RenderingHints.create(jsoRenderingHints), widgetBridge);
    gwtRenderer.render(model, expanded, output);
    Widget rendering = output.getRendering();
    if (rendering == null) {
      throw new RhizosphereException("Rhizosphere renderer returned a null widget");
    }
    modelWidgetMap.put(jso, rendering);
    return rendering.getElement();
  }

  /**
   * The rendering associated to the given model has been physically attached to
   * or detached from the DOM.
   *
   * @param jso A JavaScriptObject wrapping the Rhizosphere model affected by
   *     this attach notification.
   * @param attached Whether the rendering was attached to the DOM or detached
   *     from it.
   */
  public void delegateAttach(JavaScriptObject jso, boolean attached) {
    if (widgetBridge == null) {
      throw new RhizosphereException(
          "Rhizosphere renderer must be bound to a WidgetBridge,"
          + "to avoid memory leaks when attaching/detaching widget renderings.");
    }
    if (attached) {
      widgetBridge.add(modelWidgetMap.get(jso));
    } else {
      widgetBridge.remove(modelWidgetMap.get(jso));
    }
  }

  /**
   * Queries the GWT renderer managed by this class to determine whether it
   * supports expansion (maximization) of model renderings or not.
   *
   * @param jsoRenderingHints Rendering hints about the current visualization
   *     environment.
   * @return Whether the renderings produced by the GWT renderer support
   *     expansion (maximization) or not.
   */
  public boolean delegateExpandable(JavaScriptObject jsoRenderingHints) {
    return ((HasExpandable) gwtRenderer).expandable(RenderingHints.create(jsoRenderingHints));
  }

  /**
   * Queries the GWT renderer managed by this class to determine whether it
   * supports expansion (maximization) of model renderings on a model-by-model
   * basis.
   *
   * @param jso A JavaScriptObject wrapping the Rhizosphere model whose
   *     expandable capability is to be determined.
   * @param jsoRenderingHints Rendering hints about the current visualization
   *     environment.
   * @return Whether the rendering produced for the requested model supports
   *     expansion or not.
   */
  @SuppressWarnings("unchecked")
  public boolean delegateExpandableByModel(JavaScriptObject jso,
                                           JavaScriptObject jsoRenderingHints) {
    T model = extractModel(jso);
    assert model != null;
    return ((HasExpandableByModel<T>) gwtRenderer).expandableByModel(
        model, RenderingHints.create(jsoRenderingHints));
  }

  /**
   * Queries the GWT renderer managed by this class to determine whether the
   * dimensions of the produced renderings can be cached or not.
   *
   * @return Whether the dimensions of the produced renderings can be cached or
   *     not.
   */
  public boolean delegateCacheDimensions() {
    return ((HasCacheDimensions) gwtRenderer).cacheDimensions();
  }

  /**
   * Queries the GWT renderer managed by this class to determine whether a model
   * rendering can be rescaled to given dimensions.
   * @param jso A JavaScriptObject wrapping the Rhizosphere model whose
   *     rescaling is to be determined.
   * @param width The desired width after rescaling.
   * @param height The desired height after rescaling.
   * @return Whether rescaling to the desired dimensions is possible.
   */
  @SuppressWarnings("unchecked")
  public boolean delegateCanRescaleTo(JavaScriptObject jso, int width, int height) {
    T model = extractModel(jso);
    assert model != null;
    return ((HasRescalable<T>) gwtRenderer).canRescaleTo(
        model, modelWidgetMap.get(jso), width, height);
  }

  /**
   * Asks the GWT renderer managed by this class to rescale a model rendering.
   * @param jso A JavaScriptObject wrapping the Rhizosphere model whose
   *     rescaling is to be performed.
   * @param width  The desired width after rescaling.
   * @param height The desired height after rescaling.
   */
  @SuppressWarnings("unchecked")
  public void delegateRescale(JavaScriptObject jso, int width, int height) {
    T model = extractModel(jso);
    assert model != null;
    ((HasRescalable<T>) gwtRenderer).rescale(model, modelWidgetMap.get(jso), width, height);
  }

  /**
   * Asks the GWT renderer managed by this class to perform style changes to a
   * model rendering.
   * @param jso A JavaScriptObject wrapping the Rhizosphere model whose
   *     associated rendering should be restyled.
   * @param props A key-value map of the style properties to set.
   * @param revert Whether this set of changes reverts the model rendering to
   *     its original style or not.
   */
  @SuppressWarnings("unchecked")
  public void delegateChangeStyle(JavaScriptObject jso, JavaScriptObject props, boolean revert) {
    T model = extractModel(jso);
    assert model != null;
    // NOTE: relies on the style being received from JSNI to match the
    // expectations of the Style class.
    Style style = props.cast();
    Set<String> keys = new JSONObject(props).keySet();
    ((HasChangeStyle<T>) gwtRenderer).changeStyle(
        model, modelWidgetMap.get(jso), keys, style, revert);
  }

  /**
   * Asks the GWT renderer managed by this class to return a size range for
   * legend purposes.
   *
   * @return the size range.
   */
  @SuppressWarnings("deprecation")
  public JavaScriptObject delegateGetSizeRange() {
    HasLegend.Range r = ((HasLegend) gwtRenderer).getSizeRange();
    return r == null ? null : r.toJavaScriptObject();
  }

  /**
   * Asks the GWT renderer managed by this class to return a color range for
   * legend purposes.
   *
   * @return the color range.
   */
  @SuppressWarnings("deprecation")
  public JavaScriptObject delegateGetColorRange() {
    HasLegend.Range r = ((HasLegend) gwtRenderer).getColorRange();
    return r == null ? null : r.toJavaScriptObject();
  }
}
