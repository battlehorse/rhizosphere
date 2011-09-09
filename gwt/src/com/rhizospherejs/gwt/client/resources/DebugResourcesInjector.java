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

package com.rhizospherejs.gwt.client.resources;

import com.google.gwt.core.client.GWT;

/**
 * Resource injector used when Rhizosphere is deployed in development mode.
 * All libraries are served uncompiled and unbundled. Styles are computed on
 * the fly from their LESS source.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class DebugResourcesInjector implements ResourcesInjector {

  private DOMHelper domHelper = new DOMHelper();

  private DebugResources resources = GWT.create(DebugResources.class);

  @Override
  public void injectRhizoCss(String theme) {
    domHelper.injectStyle(
        "rhizosphere/src/stylesheets/" + theme + "/rhizo.less", "stylesheet/less");
    domHelper.injectInlineJavascriptLibrary(resources.lessJs());
  }

  @Override
  public void injectRhizoJavascript(Runnable callback) {
    String[] jsFiles = {
        "rhizosphere/src/js/rhizo.js",
        "rhizosphere/src/js/rhizo.options.js",
        "rhizosphere/src/js/rhizo.eventbus.js",        
        "rhizosphere/src/js/rhizo.jquery.js",
        "rhizosphere/src/js/rhizo.log.js",
        "rhizosphere/src/js/rhizo.state.js",
        "rhizosphere/src/js/rhizo.base.js",
        "rhizosphere/src/js/rhizo.meta.js",
        "rhizosphere/src/js/extra/rhizo.meta.extra.js",
        "rhizosphere/src/js/rhizo.meta.manager.js",
        "rhizosphere/src/js/rhizo.selection.js",
        "rhizosphere/src/js/rhizo.layout.manager.js",
        "rhizosphere/src/js/rhizo.layout.shared.js",
        "rhizosphere/src/js/rhizo.layout.js",
        "rhizosphere/src/js/rhizo.layout.tree.js",
        "rhizosphere/src/js/rhizo.layout.treemap.js",
        "rhizosphere/src/js/rhizo.model.js",
        "rhizosphere/src/js/rhizo.model.loader.js",
        "rhizosphere/src/js/rhizo.model.manager.js",
        "rhizosphere/src/js/rhizo.autorender.js",
        "rhizosphere/src/js/rhizo.gviz.js",
        "rhizosphere/src/js/rhizo.ui.js",
        "rhizosphere/src/js/rhizo.ui.gui.js",
        "rhizosphere/src/js/rhizo.ui.layout.js",
        "rhizosphere/src/js/rhizo.ui.meta.js",
        "rhizosphere/src/js/extra/rhizo.ui.meta.extra.js",
        "rhizosphere/src/js/rhizo.ui.component.js",
        "rhizosphere/src/js/extra/rhizo.keyboard.js",
        "rhizosphere/src/js/extra/rhizo.broadcast.js",
        "rhizosphere/src/js/rhizo.bootstrap.js"
    };
    domHelper.injectJavascriptLibrary(jsFiles, callback);
  }

  @Override
  public void injectDependenciesCss(String theme) {
    domHelper.injectStyle(
        "rhizosphere/src/stylesheets/" + theme + "/jquery-ui-1.8.16.custom.css", "stylesheet");
  }
 
  @Override
  public void injectDependenciesJavascript(final Runnable callback, boolean useGoogleCDN) {
    String[] jsFiles;
    if (useGoogleCDN) {
      // TODO(battlehorse): replace with use com.google.gwt.ajaxloader.client.AjaxLoader once
      // this issue is solved: http://code.google.com/p/gwt-google-apis/issues/detail?id=306.
      jsFiles = new String[] {
          domHelper.getProtocol() + "//ajax.googleapis.com/ajax/libs/jquery/1.5.1/jquery.js",
          domHelper.getProtocol() + "//ajax.googleapis.com/ajax/libs/jqueryui/1.8.16/jquery-ui.js"
      };
    } else {
      jsFiles = new String[] {
          "rhizosphere/shared/js/jquery-1.5.1.js",
          "rhizosphere/shared/js/jquery-ui-1.8.16.custom.js"
      };
    }
    domHelper.injectJavascriptLibrary(jsFiles, callback);
  }
}
