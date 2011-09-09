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

import com.google.gwt.user.client.Timer;
import com.google.gwt.user.client.ui.DeckPanel;
import com.google.gwt.user.client.ui.LazyPanel;
import com.google.gwt.user.client.ui.ProvidesResize;
import com.google.gwt.user.client.ui.RequiresResize;
import com.google.gwt.user.client.ui.Widget;

/**
 * Helper panel to simplify the addition of a Rhizosphere visualization in a
 * GWT application, hiding all the steps necessary to inject the Rhizosphere
 * APIs in the GWT application.
 * 
 * <p>
 * The panel behaves like a {@code LazyPanel}, and therefore lazily injects the
 * Rhizosphere APIs only when it becomes visible, improving application startup
 * latency and GWT payload size. In addition, while the Rhizosphere libraries
 * injection is in progress, the panel will show a customizable 'loading in
 * progress' widget (such as an hourglass icon), which will be dismissed as
 * soon as Rhizosphere finishes loading.
 *
 * <p>
 * To following snippet shows how you can use the panel in conjunction with a
 * UIBinder template:
 * <pre><code>
 * &ltui:UiBinder xmlns:ui='urn:ui:com.google.gwt.uibinder'
 *     xmlns:g='urn:import:com.google.gwt.user.client.ui'
 *     xmlns:r='urn:import:com.rhizospherejs.gwt.client'&gt;
 *   &lt;r:RhizosphereLazyPanel
 *       width="100%" height="100%" ui:field="rhizospherePanel"&gt;
 *   &lt;/r:RhizosphereLazyPanel&gt;
 * &lt;/ui:UiBinder&gt;
 * </code></pre>
 * <pre><code>
 * &#64;UiField
 * RhizosphereLazyPanel&lt;Employee&gt; rhizospherePanel;
 * 
 * &#64;UiFactory
 * RhizosphereLazyPanel&lt;Employee&gt; createRhizospherePanel() {
 *   RhizosphereLazyPanel&lt;Employee&gt; panel = 
 *       new RhizosphereLazyPanel&lt;Employee&gt;(
 *           new Image("loading_icon.gif"),
 *           new RhizosphereBuilder());
 *   panel.setLoadingDelayMillis(200);
 *   return panel;
 * }
 * 
 * private class RhizosphereBuilder
 *     implements RhizosphereLazyPanel.RhizosphereBuilder&lt;Employee&gt; {
 * 
 *   public Rhizosphere&lt;Employee&gt; build() {
 *     Rhizosphere&lt;Employee&gt; r = new Rhizosphere&lt;Employee&gt;();
 *     // ... your code here
 *     return r;
 *   }
 * }
 * </code></pre>
 * 
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class RhizosphereLazyPanel<T> extends LazyPanel implements RequiresResize, ProvidesResize {
  
  /**
   * Builder interface the {@link RhizosphereLazyPanel} delegates the actual
   * Rhizosphere visualization building to.
   */
  public interface RhizosphereBuilder<T> {
    
    /**
     * Builds a Rhizosphere instance and returns it.
     * @return A newly built Rhizosphere instance.
     */
    Rhizosphere<T> build();
  }
  
  /**
   * Widget to temporarily show in the panel while Rhizosphere libraries are
   * injected in the GWT host page.
   */
  private Widget loadingWidget;
  
  /**
   * Builder instance that will assemble a Rhizosphere instance to fit inside
   * the panel
   */
  private RhizosphereBuilder<T> builder;
  
  /**
   * The Rhizosphere instance contained within the panel.
   */
  private Rhizosphere<T> rhizosphere;
  
  /**
   * Whether the Google CDN should be used as possible to load Rhizosphere
   * libraries and its dependencies.
   */
  private boolean useGoogleCDN;
  
  /**
   * The visual theme that Rhizosphere will use.
   */
  private String theme;
  
  /**
   * The amount of time to wait, since the start of the Rhizosphere libraries
   * injection, before showing the {@link #loadingWidget}.
   * The purpose of this timer is to avoid flickering of the
   * {@link #loadingWidget} if Rhizosphere libraries load quickly enough. By
   * default it's set to 200ms.
   */
  private int loadingDelayMillis = 200;
  
  /**
   * Creates a new panel to host a Rhizosphere visualization.
   *
   * @param loadingWidget Widget to temporarily show in the panel while
   *     Rhizosphere libraries are injected in the GWT host page.
   * @param builder Builder that will assemble a Rhizosphere instance to fit
   *     inside the panel.
   */
  public RhizosphereLazyPanel(Widget loadingWidget, RhizosphereBuilder<T> builder) {
    this.loadingWidget = loadingWidget;
    this.builder = builder;
  }
  
  /**
   * Creates a new panel to host a Rhizosphere visualization.
   *
   * @param loadingWidget Widget to temporarily show in the panel while
   *     Rhizosphere libraries are injected in the GWT host page.
   * @param builder Builder that will assemble a Rhizosphere instance to fit
   *     inside the panel.
   * @param theme The visual theme that Rhizosphere will use. 
   * @param useGoogleCDN Whether the Google CDN should be used as possible to
   *     load Rhizosphere libraries and its dependencies.
   * @param loadingDelayMillis The amount of time to wait, since the start of
   *     the Rhizosphere libraries injection, before showing the loading widget.
   *     The purpose of this timer is to avoid flickering of the loading
   *     widget if Rhizosphere libraries load quickly enough.
   */
  public RhizosphereLazyPanel(Widget loadingWidget,
                              RhizosphereBuilder<T> builder,
                              String theme,
                              boolean useGoogleCDN,
                              int loadingDelayMillis) {
    this.loadingWidget = loadingWidget;
    this.theme = theme;
    this.useGoogleCDN = useGoogleCDN;
    this.builder = builder;
    this.loadingDelayMillis = loadingDelayMillis > 0 ? loadingDelayMillis : 1;
  }
  
  /**
   * Uses Google CDN to load Rhizosphere libraries and its dependencies as much
   * as possible.
   * @param useGoogleCDN Whether the Google CDN should be used as possible to
   * load Rhizosphere libraries and its dependencies.
   */
  public void setUseGoogleCDN(final boolean useGoogleCDN) {
    this.useGoogleCDN = useGoogleCDN;
  }
  
  /**
   * Sets the visual theme that Rhizosphere will use. Note that this method
   * does _not_ perform validation, so it's up to the caller to verify that
   * the specified theme actually exists.
   * <p>
   * This setting is ignored if Rhizosphere libraries have already been
   * injected in the GWT host page when this panel is created. See
   * {@link RhizosphereLoader#setTheme(String)} for further info. 
   *
   * @param theme The name of the theme to use.
   */
  public void setTheme(String theme) {
    this.theme = theme;
  }  
  
  /**
   * Sets the amount of time to wait, since the start of the Rhizosphere
   * libraries injection, before showing the loading widget.
   * The purpose of this timer is to avoid flickering of the loading widget if
   * Rhizosphere libraries load quickly enough.
   * 
   * @param loadingDelayMillis Amount of time to wait before showing the
   *     loading widget.
   */  
  public void setLoadingDelayMillis(int loadingDelayMillis) {
    this.loadingDelayMillis = loadingDelayMillis > 0 ? loadingDelayMillis : 1;
  }
  
  /**
   * Returns the Rhizosphere instance hosted within this panel.
   * @return The Rhizosphere instance hosted within this panel, or {@code null}
   *     if the instance has not been created yet.
   */
  public Rhizosphere<T> getRhizosphere() {
    return rhizosphere;
  }
  
  @Override
  protected Widget createWidget() {
    final DeckPanel loadingPanel = new DeckPanel();
    loadingPanel.setWidth("100%");
    loadingPanel.setHeight("100%");
    loadingPanel.add(loadingWidget);
    
    final Timer timer = new Timer() {
      @Override
      public void run() {
        loadingPanel.showWidget(0);
      }
    };
    timer.schedule(loadingDelayMillis);
    RhizosphereLoader loader = RhizosphereLoader.getInstance();
    loader.setUseGoogleCDN(useGoogleCDN);
    if (theme != null) {
      loader.setTheme(theme);
    }
    loader.ensureInjected(new Runnable() {
      @Override
      public void run() {
        rhizosphere = builder.build();
        if (rhizosphere != null) {
          timer.cancel();
          loadingPanel.add(rhizosphere);
          loadingPanel.showWidget(1);
        }
      }
    });
    
    return loadingPanel;
  }
  
  @Override
  public void onResize() {
    if (loadingWidget instanceof RequiresResize) {
      ((RequiresResize) loadingWidget).onResize();
    }
    if (rhizosphere != null) {
      rhizosphere.onResize();
    }
  }
}
