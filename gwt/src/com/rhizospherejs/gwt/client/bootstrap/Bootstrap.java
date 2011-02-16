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

package com.rhizospherejs.gwt.client.bootstrap;

import com.google.gwt.core.client.JavaScriptObject;
import com.google.gwt.core.client.JsArray;
import com.google.gwt.dom.client.Element;

import com.rhizospherejs.gwt.client.Rhizosphere;
import com.rhizospherejs.gwt.client.RhizosphereMetaModel;
import com.rhizospherejs.gwt.client.RhizosphereOptions;
import com.rhizospherejs.gwt.client.handlers.HasReadyHandlers;
import com.rhizospherejs.gwt.client.renderer.NativeRenderer;

import java.util.Collection;

/**
 * Bootstrap is responsible for initialization and deployment of a Rhizosphere
 * visualization. It wraps the native {@code rhizo.bootstrap.Bootstrap}
 * javascript object.
 * <p>
 * Initialization of a Rhizosphere visualization is divided in 2 steps: during
 * the <strong>prepare</strong> phase the visualization chrome and all the
 * other static elements are set up and rendered. During the
 * <strong>deploy</strong> phase the actual contents (the visualization models)
 * are rendered and displayed, an initial layout is chosen and filters are
 * initialized.
 * <p>
 * This class is for internal use. External users of the Rhizosphere
 * visualization should rely on {@link Rhizosphere} which hides all these
 * details.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class Bootstrap extends JavaScriptObject {
  protected Bootstrap() {}

  /**
   * Creates a new Bootstrap instance to initialize and deploy a Rhizosphere
   * visualization.
   *
   * @param container The HTML element that will contain the visualization.
   * @param options Visualization configuration options.
   * @param readyHandler A handler to notify once the visualization is ready for
   *     user interaction.
   * @return A new Bootsrap instance.
   */
  public static Bootstrap create(Element container, 
                                 RhizosphereOptions<?> options,
                                 HasReadyHandlers readyHandler) {
    return nativeCreate(container, options, readyHandler);
  }

  private static native Bootstrap nativeCreate(Element container, 
                                               JavaScriptObject options,
                                               HasReadyHandlers readyHandler) /*-{
    var callback = function() {
      @com.rhizospherejs.gwt.client.handlers.ReadyEvent::fire(Lcom/rhizospherejs/gwt/client/handlers/HasReadyHandlers;)(readyHandler);
    };
    return new $wnd.rhizo.bootstrap.Bootstrap(container, options, callback);
  }-*/;

  /**
   * Prepares the visualization container for subsequent deployment.
   */
  public final native void prepare() /*-{
    this.prepare();
  }-*/;  

  /**
   * Deploys a Rhizosphere visualization. 
   * @param models The set of models that the visualization will display.
   * @param metamodel The visualization metamodel.
   * @param renderer The visualization renderer.
   */
  public final void deployExplicit(Collection<JavaScriptObject> models,
                                   RhizosphereMetaModel metamodel,
                                   NativeRenderer<?> renderer) {
    JsArray<JavaScriptObject> jsModels = JavaScriptObject.createArray().cast();
    if (models != null) {
      for (JavaScriptObject m : models) {
        jsModels.push(m);
      }
    }
    this.nativeDeploy(
        jsModels, metamodel, renderer != null ? renderer.toJavaScriptObject() : null);
  }

  private native void nativeDeploy(JsArray<JavaScriptObject> models, 
                                   RhizosphereMetaModel metamodel,
                                   JavaScriptObject renderer) /*-{
    this.deployExplicit(models, metamodel, renderer);
  }-*/;

  /**
   * Returns whether the Rhizosphere visualization managed by this bootstrapper
   * has been deployed yet (models are visible to users) or it has only been
   * prepared (only the visualization chrome has been rendered). 
   */
  public final native boolean isDeployed() /*-{
    return this.isDeployed();
  }-*/;
}
