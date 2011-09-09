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

/**
 * Resource injector used when Rhizosphere is deployed in production mode.
 * All libraries are served compiled and packed into as few files as possible.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class ProdResourcesInjector implements ResourcesInjector {

  private DOMHelper domHelper = new DOMHelper();

  @Override
  public void injectRhizoCss(String theme) {
    domHelper.injectStyle("rhizosphere/lib/stylesheets/rhizo." + theme + ".css", "stylesheet");
  }

  @Override
  public void injectRhizoJavascript(Runnable callback) {
    String[] jsFiles = { "rhizosphere/lib/js/rhizo.pack.js" };
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
          domHelper.getProtocol() + "//ajax.googleapis.com/ajax/libs/jquery/1.5.1/jquery.min.js",
          domHelper.getProtocol() + 
          "//ajax.googleapis.com/ajax/libs/jqueryui/1.8.16/jquery-ui.min.js"
      };
    } else {
      jsFiles = new String[] {
          "rhizosphere/shared/js/jquery-1.5.1.min.js",
          "rhizosphere/shared/js/jquery-ui-1.8.16.custom.min.js"};
    }
    domHelper.injectJavascriptLibrary(jsFiles, callback);
  }
}
