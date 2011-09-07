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

import com.rhizospherejs.gwt.client.renderer.NativeRenderer;

/**
 * Rhizosphere configuration options. Refer to
 * <a target="_blank" href="http://www.rhizospherejs.com/doc/contrib_tables.html">
 * Rhizosphere reference tables</a> for a more complete explanation of each
 * option, including defaults.
 * <p>
 * Instances of this class cannot be reused across multiple visualizations. Each
 * visualization must be given its dedicated {@code RhizosphereOptions}
 * instance.
 *
 * @param <T> The models' type of the Rhizosphere visualization these options
 *     will be given to.
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class RhizosphereOptions<T> extends JavaScriptObject {
  protected RhizosphereOptions() {}

  /**
   * A map of constraints for the area that Rhizosphere will use to lay out
   * models' renderings.
   */
  public static final class LayoutConstraints extends JavaScriptObject {
    protected LayoutConstraints() {}

    public LayoutConstraints bottom(double bottom) {
      nativeSetContraint("bottom", bottom);
      return this;
    }

    public LayoutConstraints top(double top) {
      nativeSetContraint("top", top);
      return this;
    }

    public LayoutConstraints left(double left) {
      nativeSetContraint("left", left);
      return this;
    }

    public LayoutConstraints right(double right) {
      nativeSetContraint("right", right);
      return this;
    }

    public LayoutConstraints width(double width) {
      nativeSetContraint("width", width);
      return this;
    }

    public LayoutConstraints height(double height) {
      nativeSetContraint("height", height);
      return this;
    }

    private native void nativeSetContraint(String key, double value) /*-{
      this[key] = value;
    }-*/;
  }
  
  /**
   * Enumeration of logging levels that the Rhizosphere visualization can use
   * for client-side logging. All Rhizosphere logs are directed to the
   * browser console, if available.
   */
  public enum LogLevel {
    /**
     * Deepest level of logging, for debug purposes.
     */
    DEBUG,
    
    /**
     * Intermediate logging level that discards lowest level debug messages.
     */
    INFO,
    
    /**
     * Intermediate logging level that discards debug and informational
     * messages.
     */
    WARN, 
    
    /**
     * Excludes all debugging information, but retains timings and performance
     * profiling logs.
     */
    TIME, 
    
    /**
     * Default log level. Only error messages that require user attention are
     * logged.
     */
    ERROR;
  }
  
  /**
   * Enumeration of selection modes that the Rhizosphere visualization allows. 
   */
  public enum SelectionMode {
    /**
     * No selection gestures are allowed on the visualization.
     */
    NONE,
    
    /**
     * Only model selection by clicking on model renderings (or other UI
     * elements that allow click-based selection, like layout headers) is
     * allowed.
     */
    CLICK,
    
    /**
     * Only box selection by drawing selection boxes in the visualization
     * viewport is allowed.
     */
    BOX,
    
    /**
     * All supported selection modes are allowed. 
     */
    ALL
  }
  
  /**
   * Enumeration of the panning modes that the Rhizosphere visualization allows
   * for scrolling and panning gestures.
   */
  public enum PanningMode {
    /**
     * No panning or scrolling is allowed. The visualization viewport is fixed
     * and any overflows will be hidden.
     */
    NONE,
    
    /**
     * Native panning of the visualization viewport based on system scrollbars.
     */
    NATIVE,
    
    /**
     * Emulated limitless 2D panning of the visualization viewport.
     */
    INFINITE
  }

  /**
   * Creates a new options instance.
   * @param <T> The models type for the Rhizosphere visualization these options
   *     will be given to.
   * @return The options instance.
   */
  public static <T> RhizosphereOptions<T> create() {
    return JavaScriptObject.createObject().cast();
  }

  /**
   * Allow the visualization to extract parameters from the current document
   * location URL.
   */
  public final native void setAllowConfigFromUrl(boolean allowConfigFromUrl) /*-{
    this['allowConfigFromUrl'] = allowConfigFromUrl;
  }-*/;
  
  /**
   * Sets the logging level for the Rhizosphere library.
   *
   * @param level The log level to use.
   */
  public final void setLogLevel(LogLevel level) {
    if (level == null) {
      level = LogLevel.ERROR;
    }
    nativeSetLogLevel(level.toString().toLowerCase());
  }
  
  private native void nativeSetLogLevel(String level) /*-{
    this['logLevel'] = level;
  }-*/;

  /**
   * Whether Rhizosphere should use animation to smooth transitions such as
   * layouts and dynamic filtering. 
   */
  public final native void setEnableAnims(boolean enableAnims) /*-{
    this['enableAnims'] = enableAnims;
  }-*/;

  /**
   * Whether to use HTML5 History (if supported by the browser) to keep track 
   * of Rhizosphere state.
   */
  public final native void setEnableHTML5History(boolean enableHTML5History) /*-{
    this['enableHTML5History'] = enableHTML5History;
  }-*/;
  
  /**
   * Whether to display some form of load indicator (such as a progress bar)
   * while the Rhizosphere visualization is loading.
   */
  public final native void setEnableLoadingIndicator(boolean enableLoadingIndicator) /*-{
    this['enableLoadingIndicator'] = enableLoadingIndicator;
  }-*/;
  
  /**
   * Whether to allow the dragging of visualization models within the
   * visualization viewport.
   */
  public final native void setEnableDragAndDrop(boolean enableDragAndDrop) /*-{
    this['enableDragAndDrop'] = enableDragAndDrop;
  }-*/;
  
  /**
   * Sets the visualization selection mode.
   */
  public final void setSelectionMode(SelectionMode selectionMode) {
    nativeSetSelectionMode(selectionMode.name().toLowerCase());
  }
  
  private native void nativeSetSelectionMode(String selectionMode) /*-{
    this['selectionMode'] = selectionMode;
  }-*/;
  
  /**
   * Sets the visualization panning mode.
   */
  public final void setPanningMode(PanningMode panningMode) {
    nativeSetPanningMode(panningMode.name().toLowerCase());
  }
  
  private native void nativeSetPanningMode(String panningMode) /*-{
    this['panningMode'] = panningMode;
  }-*/;
  
  /**
   * Whether user-visible notifications should be displayed in the visualization
   * viewport in response to visualization errors.
   */
  public final native void setShowErrorsInViewport(boolean showErrorsInViewport) /*-{
    this['showErrorsInViewport'] = showErrorsInViewport;
  }-*/;

  /**
   * Whether Rhizosphere should cache renderings' dimensions. Greatly improves
   * layout performance, but may result in layout bugs if the models you are
   * visualizing change their rendering dimensions arbitrarily after the
   * visualization initialization.
   */
  public final native void setCacheDimensions(boolean cacheDimensions) /*-{
    this['cacheDimensions'] = cacheDimensions;
  }-*/;

  /**
   * Forces Rhizosphere UI to adapt itself to the specified target platform.
   */
  public final native void setPlatform(String platform) /*-{
    this['platform'] = platform;
  }-*/;

  /**
   * Forces Rhizosphere UI to adapt itself to the specified target device,
   * bypassing device detection from the user-agent.
   */
  public final native void setDevice(String device) /*-{
    this['device'] = device;
  }-*/;

  /**
   * Forces Rhizosphere UI to use the specified layout template and chrome.
   */
  public final native void setTemplate(String template) /*-{
    this['template'] = template;
  }-*/;

  /**
   * Returns a configurable set of layout constraints, that Rhizosphere will
   * enforce during layout operations.
   */
  public final native LayoutConstraints getLayoutConstraints() /*-{
    if (!('layoutConstraints' in this)) {
      this['layoutConstraints'] = {};
    }
    return this['layoutConstraints'];
  }-*/;

  /**
   * Sets the visualization metamodel. Metamodels set via options take
   * precedence over the other ones (both automatically inferred and explicitly
   * provided to {@link Rhizosphere} instances).
   */
  public final native void setMetaModel(RhizosphereMetaModel metamodel) /*-{
    this['metamodel'] = metamodel;
  }-*/;

  /**
   * Sets a visualization metamodel fragment. The fragment will be merged with
   * the main visualization metamodel (either automatically inferred or
   * explicitly given to the {@link Rhizosphere} instance these options are
   * bound to).
   * <p>
   * Metamodel configuration defined here takes precedence, hence this method
   * can be used to customize and tweak the default metamodel adopted by the
   * visualization.
   */
  public final native void setMetaModelFragment(RhizosphereMetaModel metamodel) /*-{
    this['metamodelFragment'] = metamodel;
  }-*/;

  /**
   * Sets the visualization renderer. Renderer set via options take
   * precedence over the other ones.
   * @param renderer
   */
  public final void setRenderer(RhizosphereRenderer<T> renderer) {
    // Immediately create a NativeRenderer that will then bound to a specific
    // visualization (for widget life cycle management) at deploy time.
    NativeRenderer<T> nr = new NativeRenderer<T>(renderer, null, null);
    nativeSetRenderer(nr, nr.toJavaScriptObject());
  }

  private native void nativeSetRenderer(NativeRenderer<T> nr, JavaScriptObject renderer) /*-{
    this['__rhizosphere_nativeRenderer'] = nr;
    this['renderer'] = renderer;
  }-*/;

  /**
   * Returns the native renderer associated to the received renderer, if any.
   * Should not be invoked by anyone outside the Rhizosphere framework. 
   */
  public final native NativeRenderer<T> getNativeRenderer() /*-{
    return this['__rhizosphere_nativeRenderer'];
  }-*/;

  /**
   * Defines which column in a Google Visualization DataTable represents the
   * 'master' field that should be used in Rhizosphere models' renderings.
   * 
   * This option is only useful to customize the automatic renderer used by
   * {@link com.rhizospherejs.gwt.client.gviz.GVizRhizosphere} when no explicit
   * renderer is provided.
   */
  public final native void setAutoRendererMaster(String arMaster) /*-{
    this['arMaster'] = arMaster;
  }-*/;

  /**
   * Defines which column in a Google Visualization DataTable should be used
   * to generate the 'size' scaling and legend.
   * 
   * This option is only useful to customize the automatic renderer used by
   * {@link com.rhizospherejs.gwt.client.gviz.GVizRhizosphere} when no explicit
   * renderer is provided.
   */  
  public final native void setAutoRendererSize(String arSize) /*-{
    this['arSize'] = arSize;
  }-*/;

  /**
   * Defines which column in a Google Visualization DataTable should be used
   * to generate the 'color' scaling and legend.
   * 
   * This option is only useful to customize the automatic renderer used by
   * {@link com.rhizospherejs.gwt.client.gviz.GVizRhizosphere} when no explicit
   * renderer is provided.
   */
  public final native void setAutoRendererColor(String arColor) /*-{
    this['arColor'] = arColor;
  }-*/;

  /**
   * Whether the 'master', 'size' and 'color' fields should be automatically
   * located when no explicitly specified.
   * 
   * This option is only useful to customize the automatic renderer used by
   * {@link com.rhizospherejs.gwt.client.gviz.GVizRhizosphere} when no explicit
   * renderer is provided.
   */
  public final native void setAutoRendererDefaults(boolean arDefaults) /*-{
    this['arDefaults'] = arDefaults;
  }-*/;

  /**
   * Defines how many fields (columns) from a Google Visualization DataTable
   * should be displayed in Rhizosphere models' renderings.
   * 
   * This option is only useful to customize the automatic renderer used by
   * {@link com.rhizospherejs.gwt.client.gviz.GVizRhizosphere} when no explicit
   * renderer is provided.
   */
  public final native void setAutoRendererNumFields(int arNumFields) /*-{
    this['arNumFields'] = arNumFields;
  }-*/;
}
