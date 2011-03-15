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
import com.google.gwt.dom.client.Document;
import com.google.gwt.dom.client.Element;
import com.google.gwt.dom.client.HeadElement;
import com.google.gwt.dom.client.LinkElement;
import com.google.gwt.dom.client.Node;
import com.google.gwt.dom.client.ScriptElement;
import com.google.gwt.resources.client.TextResource;
import com.google.gwt.user.client.Window;

/**
 * Helper class used for various DOM manipulations and resource injection.
 *
 * Resource injection is heavily influenced by browser behavior and requires
 * special attention. Here is an outline about the current (Chrome 9, FF3.6,
 * FF4, Safari 5, Opera 11) status:
 * <ul>
 * <li>CSS: injection of a link element. Causes browsers to block until the
 *   style has been loaded.</li>
 * <li>JS:
 *   <ul>
 *   <li>injection of inline scripts: preserves injection ordering when
 *     executing the scripts, but makes debugging the scripts really difficult
 *     (especially in Chrome, since they do not appear in the scripts panel).
 *   </li>
 *   <li>Injection of scriptsrc tags: Chrome/Safari do not preserve injection
 *     ordering when executing the scripts.</li>
 *   <li>daisy-chained injection of scriptsrc tags: injection ordering is
 *     preserved when executing the scripts and keeps sane debugging
 *     capabilities, at the cost of increased complexity of injection code.</li>
 *   </ul></li>
 * </ul>
 * <p>
 * References:
 * <ul>
 * <li><a target="_blank"
 *        href="http://code.google.com/p/chromium/issues/detail?id=46109">
 *      Chromium bug 46109</a></li>
 * <li><a target="_blank"  
 *        href="http://code.google.com/speed/page-speed/docs/rendering.html#PutCSSInHead">
 *      Pagespeed docs about CSS placement</a></li>
 * <li><a target="_blank" 
 *        href="http://code.google.com/speed/page-speed/docs/rtt.html#PutStylesBeforeScripts">
 *      Pagespeed docs about CSS vs JS ordering</a></li>
 * <li><a target="_blank" href="http://www.browserscope.org/">Browserscope</a></li>
 * <li><a target="_blank"
 *        href="http://www.stevesouders.com/blog/2009/04/27/loading-scripts-without-blocking/">
 *      Steve Souders' "Loading scripts without blocking"</a></li>
 * <li><a target="_blank"
 *        href="http://www.stevesouders.com/blog/2008/12/27/coupling-async-scripts/">
 *      Steve Souders' "Coupling async scripts"</a></li>
 * </ul>
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
class DOMHelper {

  /**
   * References the HEAD section of the GWT host page.
   */
  private HeadElement head;

  /**
   * Returns the protocol (http or https) the GWT host page has been served
   * with.
   */
  public String getProtocol() {
    if (Window.Location.getProtocol().equals("https:")) {
      return "https:";
    }
    return "http:";
  }

  /**
   * Returns the HEAD section of the GWT host page.
   */
  private HeadElement getHead() {
    if (head == null) {
      Element elt = Document.get().getElementsByTagName("head").getItem(0);
      assert elt != null : "The host HTML page does not have a <head> element"
          + " which is required by StyleInjector";
      head = HeadElement.as(elt);
    }
    return head;
  }

  /**
   * Converts a relative path into an absolute one if needed.
   */
  private String ensurePathIsAbsolute(final String path) {
    if (path.startsWith("http")) {
      return path;
    } else {
      return GWT.getModuleBaseURL() + path;
    }
  }

  public <T extends Node> void appendToHead(T child) {
    getHead().appendChild(child);
  }

  /**
   * Injects CSS styles (via LINK element pointing to an external sheet) in the
   * GWT host page.
   *
   * @param path The relative or absolute path pointing to the stylesheet to
   *     inject.
   * @param mimeType The mimetype of the injected styles.
   */
  public void injectStyle(final String path, final String mimeType) {
    LinkElement link = Document.get().createLinkElement();
    link.setRel(mimeType);
    link.setHref(ensurePathIsAbsolute(path));
    this.appendToHead(link);
  }

  /**
   * Injects a Javascript library into the GWT host page via a SCRIPTSRC tag.
   * @param path The relative or absolute path pointing to the js code to
   *     inject.
   */
  public void injectJavascriptLibrary(final String path) {
    ScriptElement js = Document.get().createScriptElement();
    js.setType("text/javascript");
    js.setSrc(ensurePathIsAbsolute(path));
    this.appendToHead(js);
  }

  /**
   * Injects a Javascript library into the GWT host page via a SCRIPTSRC tag.
   *
   * @param path The relative or absolute path pointing to the js code to
   *     inject.
   * @param callback Callback invoked after the script contents are
   *     successfully loaded and parsed by the browser.
   */
  public void injectJavascriptLibrary(final String path, final Runnable callback) {
    nativeInjectJavascriptLibrary(ensurePathIsAbsolute(path), getHead(), callback);
  }

  /**
   * Injects multiple Javascript libraries into the GWT host page, ensuring
   * their order of insertion.
   *
   * @param path The relative or absolute paths pointing to the js libraries
   *     inject, already sorted in insertion order.
   * @param callback Callback invoked after the script contents are
   *     successfully loaded and parsed by the browser.
   */
  public void injectJavascriptLibrary(final String[] path, final Runnable callback) {
    new DOMHelper.InjectionSequence(path, callback).run();
  }

  private native void nativeInjectJavascriptLibrary(
      String absolutePath, HeadElement head, Runnable callback) /*-{
    var script = document.createElement("script");
    script.src = absolutePath;
    script.type = "text/javascript";
    script.executed = false;
    head.appendChild(script);
    script.onreadystatechange = function() {
      if ((script.readyState == 'loaded') || (script.readyState == 'complete')) {
        if (!script.executed) {
          script.executed = true;
          callback.@java.lang.Runnable::run()();
        }
      }
    };
    script.onload = function() {
      if (!script.executed) {
        script.executed = true;
        callback.@java.lang.Runnable::run()();
      }
    };
  }-*/;

  /**
   * Injects a Javascript library into the GWT host page witn an inline SCRIPT
   * tag.
   *
   * @param resource The contents to inejct.
   */
  public void injectInlineJavascriptLibrary(final TextResource resource) {
    ScriptElement js = Document.get().createScriptElement();
    js.setType("text/javascript");
    js.setInnerText(resource.getText());
    this.appendToHead(js);
  }

  /**
   * Handles injection of a list of Javascript libraries into the GWT host page
   * while guaranteeing insertion and execution order. Library <em>x</em> is
   * injected only after the browser has finished loading and parsing library
   * <em>x-1</em>.
   */
  private class InjectionSequence implements Runnable {

    private String[] paths;
    private int current;
    private Runnable callback;

    /**
     * Creates a new injection sequence.
     * @param paths The relative or absolute paths pointing to the js libraries
     *     inject, already sorted in insertion order.
     * @param callback Callback to invoke after all the libraries have been
     *     successfully injected.
     */
    public InjectionSequence(String[] paths, Runnable callback) {
      this.paths = paths;
      this.callback = callback;
      current = -1;
    }

    @Override
    public void run() {
      if (current != -1) {
        GWT.log("Injected " + paths[current]);
      }
      current++;
      if (current > paths.length - 1) {
        callback.run();
        return;
      }
      DOMHelper.this.injectJavascriptLibrary(paths[current], this);
    }
  }
}
