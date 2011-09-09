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

import com.google.gwt.ajaxloader.client.ExceptionHelper;
import com.google.gwt.core.client.GWT;

import com.rhizospherejs.gwt.client.resources.ResourcesInjector;

import java.util.Collection;
import java.util.LinkedList;

/**
 * Loader to inject Rhizosphere javascript libraries into a GWT host page.
 * Exposes a callback mechanism to guarantee code execution after successful
 * library injection.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public final class RhizosphereLoader {

  /**
   * Singleton instance.
   */
  private static RhizosphereLoader loader = new RhizosphereLoader();

  /**
   * @return The singleton loader instance.
   */
  public static RhizosphereLoader getInstance() {
    return loader;
  }

  /**
   * Whether JS library injection is currently ongoing.
   */
  private boolean injecting = false;

  /**
   * Whether JS library injection has completed and Rhizosphere libraries
   * are successfully loaded in a GWT host page.
   */
  private boolean loaded = false;

  /**
   * Whether to use the <a href="http://code.google.com/apis/libraries/">
   * Google CDN</a> as possible to load Rhizosphere libraries and its
   * dependencies.
   */
  private boolean useGoogleCDN = false;
  
  /**
   * The visual theme that Rhizosphere will use.
   */
  private String theme = "default";

  /**
   * List of callbacks to execute once Rhizosphere libraries have been loaded.
   */
  private Collection<Runnable> callbacks;

  /**
   * Creates the singleton loader instance.
   */
  private RhizosphereLoader() {
    callbacks = new LinkedList<Runnable>();
    injecting = false;
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
   * Rhizosphere only allows a single theme to be used on any given web page
   * (there cannot be two Rhizosphere visualizations with different themes on
   * the same web page). In GWT terms, this implies that there can be only
   * one theme per GWT host page. For this reasons, the visual theme is
   * defined here at the injection stage.
   *
   * @param theme The name of the theme to use.
   */
  public void setTheme(String theme) {
    this.theme = theme;
  }

  /**
   * Registers a callback to be invoked after Rhizosphere libraries have been
   * successfully injected into a GWT host page. If Rhizosphere libraries
   * have already been injected, the callback immediately executes.
   * @param callback The callback to invoke.
   */
  public void ensureInjected(final Runnable callback) {
    if (loaded) {
      GWT.log("Rhizosphere has already been loaded. Firing callback now.");
      ExceptionHelper.runProtected(callback);
      return;
    }

    callbacks.add(callback);
    if (injecting) {
      GWT.log("Rhizosphere is currently loading...");
      return;
    }

    GWT.log("Starting Rhizosphere load sequence.");
    injecting = true;
    final ResourcesInjector resourcesFactory = GWT.create(ResourcesInjector.class);
    resourcesFactory.injectDependenciesCss(theme);
    resourcesFactory.injectRhizoCss(theme);

    Runnable dependenciesLoadedCallback = new DependenciesLoadedCallback(resourcesFactory);
    resourcesFactory.injectDependenciesJavascript(dependenciesLoadedCallback, useGoogleCDN);
  }

  @SuppressWarnings("unused")
  private void rhizosphereReady() {
    injecting = false;
    runAllCallbacks();
    callbacks.clear();
    loaded = true;
  }

  private void runAllCallbacks() {
    GWT.log("Rhizosphere loading complete. Firing " + callbacks.size() + " callbacks.");
    for (Runnable r : callbacks) {
      ExceptionHelper.runProtected(r);
    }
  }

  /**
   * Callback invoked after Rhizosphere dependencies have completed loading.
   */
  private class DependenciesLoadedCallback implements Runnable {

    private ResourcesInjector resourcesFactory;

    public DependenciesLoadedCallback(ResourcesInjector resourcesFactory) {
      this.resourcesFactory = resourcesFactory;
    }

    @Override
    public void run() {
      resourcesFactory.injectRhizoJavascript(new LoadCompleteCallback());
    }
  }

  /**
   * Callback invoked after all Rhizosphere libraries and its dependencies have
   * completed loading.
   */
  private class LoadCompleteCallback implements Runnable {

    @Override
    public void run() {
      RhizosphereLoader.this.rhizosphereReady();
    }
  }

}
