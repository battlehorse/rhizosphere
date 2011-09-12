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
import com.google.gwt.core.client.JsArray;
import com.google.gwt.json.client.JSONNull;
import com.google.gwt.json.client.JSONObject;
import com.google.gwt.json.client.JSONValue;

import com.rhizospherejs.gwt.client.handlers.ErrorEvent;
import com.rhizospherejs.gwt.client.handlers.FilterEvent;
import com.rhizospherejs.gwt.client.handlers.LayoutEvent;
import com.rhizospherejs.gwt.client.handlers.ModelChangeEvent;
import com.rhizospherejs.gwt.client.handlers.SelectionEvent;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * The UserAgent is an high-level interface to programmatically drive a
 * Rhizosphere visualization like a user would do. This allows Rhizosphere
 * visualizations to communicate bidirectionally with any other interacting
 * third party existing in the same GWT application.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class RhizosphereUserAgent<T> { 

  private Rhizosphere<T> ownerVisualization;
  private JavaScriptObject nativeUserAgent;

  /**
   * Creates a new instance.
   * @param nativeUserAgent The native Javascript {@code rhizo.UserAgent} this
   *     class wraps.
   */
  public RhizosphereUserAgent(JavaScriptObject nativeUserAgent) {
    this.nativeUserAgent = nativeUserAgent;
  }

  /**
   * Binds this user agent to the Rhizosphere visualization that spawned it.
   * @param visualization The visualization to bind to.
   */
  void bindTo(Rhizosphere<T> visualization) {
    ownerVisualization = visualization; 
    this.nativeWireListeners(nativeUserAgent);
  }
  
  /**
   * @return The selection manager associated to the Rhizosphere visualization
   *     this user agent is bound to.
   */
  final RhizosphereSelectionManager getSelectionManager() {
    return nativeGetSelectionManager(nativeUserAgent);
  }
  
  private native RhizosphereSelectionManager nativeGetSelectionManager(
      JavaScriptObject nativeUserAgent) /*-{
    return nativeUserAgent.getProject().selectionManager();
  }-*/;

  /**
   * Performs a programmatic selection of visualization models.
   * Different types of operations can be performed. See
   * <a href="http://code.google.com/p/rhizosphere/source/browse/src/js/rhizo.selection.js">
   * rhizo.seletion.js</a> for the list of supported operations.
   *
   * @param action The type of operation to perform.
   * @param models The collection of visualization models the operation applies
   *     to. Not all operations use this parameter and it can be optionally
   *     omitted at times. Refer to the documentation above for details.
   *     Use {@code null} when unneeded.
   * @param cb An optional callback invoked with the outcome of the selection
   *     operation.
   */
  void doSelection(String action,
                   Collection<RhizosphereModelRef> models,
                   RhizosphereCallback cb) {
    doSelection(action, models, true, cb);
  }

  /**
   * Programmatically performs a selection operation on the visualization
   * models. Different types of operations can be performed. See
   * <a href="http://code.google.com/p/rhizosphere/source/browse/src/js/rhizo.selection.js">
   * rhizo.seletion.js</a> for the list of supported operations.
   *
   * @param action The type of operation to perform.
   * @param models The collection of visualization models the operation applies
   *     to. Not all operations use this parameter and it can be optionally
   *     omitted at times. Refer to the documentation above for details.
   *     Use {@code null} when unneeded.
   * @param incremental Whether the operation should be incremental or not.
   *     Relevant only for 'hide' and 'focus' operations.
   * @param cb An optional callback invoked with the outcome of the selection
   *     operation.
   */
  void doSelection(String action,
                   Collection<RhizosphereModelRef> models,
                   boolean incremental,
                   RhizosphereCallback cb) {
    JsArray<RhizosphereModelRef> modelRefs = null;
    if (models != null && !models.isEmpty()) {
      modelRefs = nativeNewJsArray();
      for (RhizosphereModelRef modelRef : models) {
        modelRefs.push(modelRef);
      }
    }
    nativeDoSelection(nativeUserAgent, action, modelRefs, incremental, cb);
  }

  private final native void nativeDoSelection(JavaScriptObject nativeUserAgent,
                                              String action, 
                                              JsArray<RhizosphereModelRef> modelRefs,
                                              boolean incremental,
                                              RhizosphereCallback cb) /*-{
    if (modelRefs) {
      for (var i = 0; i < modelRefs.length; i++) {
        modelRefs[i] = modelRefs[i].id;
      }
    }                                          
    nativeUserAgent.doSelection(action, modelRefs, incremental, function(status, details) {
      if (cb) {
        cb.@com.rhizospherejs.gwt.client.RhizosphereCallback::run(ZLjava/lang/String;)(status, details);
      }
    });
  }-*/;

  /**
   * Programmatically applies a faceted filter on visualization models on the
   * given model attribute.
   * @param key The name of the Rhizosphere model attribute, as defined by
   *     {@link RhizosphereModelAttribute#name()}, the filter applies to.
   * @param value The filtering criteria. The specific format of the filtering
   *     criteria depends on the attribute kind. For example, attributes with
   *     the RANGE kind expect the criteria to be a JSONObject with two numeric
   *     {@code min} and {@code max} entries. Use a {@code null} to remove any
   *     pre-existing filter on the attribute.
   * @param cb An optional callback invoked with the outcome of the filter
   *     operation.
   */
  void doFilter(String key, JSONValue value, RhizosphereCallback cb) {
    if (value == null) {
      value = JSONNull.getInstance();
    }
    JSONObject filterObj = new JSONObject();
    filterObj.put(key, value);
    doFilter(filterObj, cb);
  }

  /**
   * Programmatically applies one or more faceted filters on visualization
   * models.
   *
   * @param filters The set of filters to apply. Each key should be a valid
   *     Rhizosphere model attribute name, as defined by
   *     {@link RhizosphereModelAttribute#name()}, for a filter to apply to.
   *     Each value should represent the filtering criteria. The specific
   *     format of the filtering criteria depends on the attribute kind.
   *     For example, attributes with the RANGE kind expect the criteria to be
   *     a JSONObject with two numeric {@code min} and {@code max} entries.
   *     Use a {@code null} to remove any pre-existing filter on the attribute.
   * @param cb An optional callback invoked with the outcome of the filter
   *     operation.
   */
  void doFilter(Map<String, JSONValue> filters, RhizosphereCallback cb) {
    JSONObject filterObj = new JSONObject();
    for (Map.Entry<String, JSONValue> filter: filters.entrySet()) {
      filterObj.put(filter.getKey(), filter.getValue());
    }
    doFilter(filterObj, cb);
  }

  /**
   * As {@link #doFilter(Map, RhizosphereCallback)}, with the filters defined
   * as a JSONObject instead of a Map.
   * @param filterObj The set of filters to apply.
   * @param cb An optional callback invoked with the outcome of the filter
   *     operation.
   */
  void doFilter(JSONObject filterObj, RhizosphereCallback cb) {
    nativeDoFilter(nativeUserAgent, filterObj.getJavaScriptObject(), cb);
  }

  private final native void nativeDoFilter(JavaScriptObject nativeUserAgent,
                                           JavaScriptObject filterObj,
                                           RhizosphereCallback cb) /*-{
    nativeUserAgent.doFilter(filterObj, function(status, details) {
      if (cb) {
        cb.@com.rhizospherejs.gwt.client.RhizosphereCallback::run(ZLjava/lang/String;)(status, details);
      }
    });
  }-*/;

  /**
   * Programmatically resets all the filters currently applied to visualization
   * models.
   * @param cb An optional callback invoked with the outcome of the filter
   *     operation.
   */
  void doResetFilters(RhizosphereCallback cb) {
    nativeDoResetFilters(nativeUserAgent, cb);
  }

  private final native void nativeDoResetFilters(JavaScriptObject nativeUserAgent,
                                                 RhizosphereCallback cb) /*-{
    nativeUserAgent.doResetFilters(function(status, details) {
      if (cb) {
        cb.@com.rhizospherejs.gwt.client.RhizosphereCallback::run(ZLjava/lang/String;)(status, details);
      }
    });
  }-*/;

  /**
   * Programmatically changes the layout algorithm to visually arrange
   * visualization models.
   *
   * @param engine The layout engine to use. Must be one the valid engine
   *     names as defined in <a href="http://code.google.com/p/rhizosphere/source/browse/src/js/rhizo.layout.js">
   *     rhizo.layout.js</a> in the {@code rhizo.layout.layouts} structure.
   *     Use {@code null} to re-use the current layout engine.
   * @param state The layout state to use. The state is the set of
   *     configuration options that each layout engine accepts to customize its
   *     behavior. The state definition is layout-specific. Use {@code null}
   *     to let the layout use its last (or default) state.
   * @param positions An optional collection of explicit positioning
   *     information for visualization models, that will override any position
   *     the layout engine would otherwise define. Leave {@code null} if
   *     unneeded.
   * @param cb An optional callback invoked with the outcome of the layout
   *     operation.
   */
  void doLayout(String engine,
                JSONObject state,
                Collection<RhizosphereModelPosition> positions,
                RhizosphereCallback cb) {
    JsArray<RhizosphereModelPosition> modelPositions = null;
    if (positions != null && !positions.isEmpty()) {
      modelPositions = nativeNewJsArray();
      for(RhizosphereModelPosition p : positions) {
        modelPositions.push(p);
      }
    }
    nativeDoLayout(nativeUserAgent,
                   engine,
                   state != null ? state.getJavaScriptObject() : null,
                   modelPositions,
                   cb);
  }
  
  private native void nativeDoLayout(JavaScriptObject nativeUserAgent, 
                                     String engine, 
                                     JavaScriptObject state,
                                     JsArray<RhizosphereModelPosition> positions, 
                                     RhizosphereCallback cb) /*-{
    nativeUserAgent.doLayout(engine, state, positions, function(status, details) {
      if (cb) {
        cb.@com.rhizospherejs.gwt.client.RhizosphereCallback::run(ZLjava/lang/String;)(status, details);
      }    
    });
  }-*/;
  
  /**
   * Forces an out-of-band layout operation for the current layout engine and
   * state, which won't be published on the 'layout' channel. This is useful
   * when a layout is not directly requested by the user, but still necessary
   * as a consequence of other operations (such as UI resizing).
   */
  void forceLayout() {
    nativeForceLayout(nativeUserAgent);
  }
  
  private native void nativeForceLayout(JavaScriptObject nativeUserAgent) /*-{
    nativeUserAgent.getProject().layoutManager().forceLayout();
  }-*/;
  
  /**
   * Programmatically adds one model to the visualization.
   *
   * @param modelRef The model to add to the visualization. It must not be
   *     already part of it.
   * @param cb An optional callback invoked with the outcome of the model
   *     addition operation.
   */
  void addModel(RhizosphereModelRef modelRef, RhizosphereCallback cb) {
    JsArray<RhizosphereModelRef> modelRefs = nativeNewJsArray();
    if (modelRef != null) {
      modelRefs.push(modelRef);
    }
    nativeAddModels(nativeUserAgent, modelRefs, cb);
  }
  
  /**
   * Programmatically adds one or more models to the visualization.
   *
   * @param models The collection of visualization models to add to the
   *     visualization. The models must not be already part of it.
   * @param cb An optional callback invoked with the outcome of the model
   *     addition operation.
   */
  void addModels(Collection<RhizosphereModelRef> models, RhizosphereCallback cb) {
    JsArray<RhizosphereModelRef> modelRefs = null;
    if (models != null && !models.isEmpty()) {
      modelRefs = nativeNewJsArray();
      for (RhizosphereModelRef modelRef : models) {
        modelRefs.push(modelRef);
      }
    }
    nativeAddModels(nativeUserAgent, modelRefs, cb);
  }
  
  private native void nativeAddModels(JavaScriptObject nativeUserAgent,
                                        JsArray<RhizosphereModelRef> modelRefs,
                                        RhizosphereCallback cb) /*-{
    nativeUserAgent.addModels(modelRefs, function(status, details) {
      if (cb) {
        cb.@com.rhizospherejs.gwt.client.RhizosphereCallback::run(ZLjava/lang/String;)(status, details);
      }
    });
  }-*/;
  
  /**
   * Programmatically removes one model from the visualization.
   *
   * @param modelRef The model to remove.
   * @param cb An optional callback invoked with the outcome of the model
   *     removal operation.
   */
  void removeModel(RhizosphereModelRef modelRef, RhizosphereCallback cb) {
    JsArray<RhizosphereModelRef> modelRefs = nativeNewJsArray();
    if (modelRef != null) {
      modelRefs.push(modelRef);
    }
    nativeRemoveModels(nativeUserAgent, modelRefs, cb);
  }

  /**
   * Programmatically removes one or more models from the visualization.
   *
   * @param models The collection of visualization models to remove from the
   *     visualization.
   * @param cb An optional callback invoked with the outcome of the model
   *     removal operation.
   */
  void removeModels(Collection<RhizosphereModelRef> models, RhizosphereCallback cb) {
    JsArray<RhizosphereModelRef> modelRefs = null;
    if (models != null && !models.isEmpty()) {
      modelRefs = nativeNewJsArray();
      for (RhizosphereModelRef modelRef : models) {
        modelRefs.push(modelRef);
      }
    }
    nativeRemoveModels(nativeUserAgent, modelRefs, cb);    
  }

  private native void nativeRemoveModels(JavaScriptObject nativeUserAgent,
                                         JsArray<RhizosphereModelRef> modelRefs,
                                         RhizosphereCallback cb) /*-{
    nativeUserAgent.removeModels(modelRefs, function(status, details) {
      if (cb) {
        cb.@com.rhizospherejs.gwt.client.RhizosphereCallback::run(ZLjava/lang/String;)(status, details);
      }
    });
  }-*/;
  
  /**
   * Adds an error notification to the visualization. The notification will
   * not be displayed unless
   * {@link RhizosphereOptions#setShowErrorsInViewport(boolean)} is set to
   * {@code true}.
   *
   * @param errorDetails The contents of the error notification.
   * @param cb An optional callback invoked with the outcome of the error
   *     addition operation.
   */
  void addError(String errorDetails, RhizosphereCallback cb) {
    nativeAddError(nativeUserAgent, errorDetails, cb);
  }
  
  private native void nativeAddError(JavaScriptObject nativeUserAgent,
                                     String errorDetails,
                                     RhizosphereCallback cb) /*-{
    nativeUserAgent.addError([errorDetails], function(status, details) {
      if (cb) {
        cb.@com.rhizospherejs.gwt.client.RhizosphereCallback::run(ZLjava/lang/String;)(status, details);
      }
    });
  }-*/;
  
  /**
   * Remove all error notifications currently showing in the visualization.
   * @param cb An optional callback invoked with the outcome of the error
   *     removal operation.
   */
  void clearErrors(RhizosphereCallback cb) {
    nativeClearErrors(nativeUserAgent, cb);
  }
  
  private native void nativeClearErrors(JavaScriptObject nativeUserAgent,
                                        RhizosphereCallback cb) /*-{
    nativeUserAgent.clearErrors(function(status, details) {
      if (cb) {
        cb.@com.rhizospherejs.gwt.client.RhizosphereCallback::run(ZLjava/lang/String;)(status, details);
      }
    });
  }-*/;

  /**
   * Registers native listeners on all event types and binds them to callbacks
   * in java space. 
   */
  private native void nativeWireListeners(JavaScriptObject nativeUserAgent) /*-{
    nativeUserAgent.addFilterListener(function(message) {
      this.@com.rhizospherejs.gwt.client.RhizosphereUserAgent::onFilter(Lcom/google/gwt/core/client/JavaScriptObject;)(message);
    }, this);
    
    nativeUserAgent.addSelectionListener(function(message) {
      var action = message['action'] || null;
      var incremental = typeof(message['incremental']) == 'boolean' ? message['incremental'] : true;
      var models = message['models'] || [];
      for (var i = 0; i < models.length; i++) {
        models[i] = nativeUserAgent.getProject().model(models[i]).unwrap();
      }
      this.@com.rhizospherejs.gwt.client.RhizosphereUserAgent::onSelection(Ljava/lang/String;Lcom/google/gwt/core/client/JsArray;Z)(action, models, incremental);
    }, this);
    
    nativeUserAgent.addLayoutListener(function(message) {
      var engine = message['engine'] || null;
      var state = message['state'] || {};
      var positions = message['positions'] || [];
      for (var i = 0; i < positions.length; i++) {
        positions[i]['ref'] = nativeUserAgent.getProject().model(positions[i].id).unwrap();
      }
      this.@com.rhizospherejs.gwt.client.RhizosphereUserAgent::onLayout(Ljava/lang/String;Lcom/google/gwt/core/client/JavaScriptObject;Lcom/google/gwt/core/client/JsArray;)(engine, state, positions);
    }, this);

    nativeUserAgent.addModelListener(function(message) {
      var action = message['action'] || null;
      var models = message['models'];
      for (var i = 0; i < models.length; i++) {
        models[i] = models[i].unwrap();
      }
      this.@com.rhizospherejs.gwt.client.RhizosphereUserAgent::onModelChange(Ljava/lang/String;Lcom/google/gwt/core/client/JsArray;)(action, models);
    }, this);
    
    nativeUserAgent.addErrorListener(function(message) {
      if (!!message['clear']) {
        this.@com.rhizospherejs.gwt.client.RhizosphereUserAgent::onErrorsClear()();
      } else {
        var args = message['arguments'] || [];
        var errorDetails = [];
        for (var i = 0; i < args.length; i++) {
          errorDetails.push(String(args[i]));
        }
        var errorMsg = errorDetails.join(' ');
        this.@com.rhizospherejs.gwt.client.RhizosphereUserAgent::onErrorAdd(Ljava/lang/String;)(errorMsg);
      }
    }, this);
  }-*/;

  /**
   * Callback invoked when the visualization filtering criteria change.
   * @param jso The filtering criteria that changed.
   */
  private void onFilter(JavaScriptObject jso) {
    FilterEvent.fire(ownerVisualization, new JSONObject(jso));
  }

  /**
   * Callback invoked when a selection operation occurs on the visualization.
   */
  private void onSelection(String action,
                           JsArray<RhizosphereModelRef> jsModels,
                           boolean incremental) {
    List<RhizosphereModelRef> models = new ArrayList<RhizosphereModelRef>();
    for (int i = 0; i < jsModels.length(); i++) {
      models.add(jsModels.get(i));
    }
    SelectionEvent.fire(ownerVisualization, action, models, incremental);
  }

  /**
   * Callback invoked when a layout operation occurs on the visualization.
   */
  private void onLayout(String engine,
                        JavaScriptObject state,
                        JsArray<RhizosphereModelPosition> jsPositions) {
    List<RhizosphereModelPosition> positions = new ArrayList<RhizosphereModelPosition>();
    for (int i = 0; i < jsPositions.length(); i++) {
      positions.add(jsPositions.get(i));
    }
    LayoutEvent.fire(ownerVisualization, engine, new JSONObject(state), positions);
  }
  
  /**
   * Callback invoked when one or more models are added or removed from the
   * visualization.
   */
  private void onModelChange(String action, JsArray<RhizosphereModelRef> jsModels) {
    List<RhizosphereModelRef> models = new ArrayList<RhizosphereModelRef>();
    for (int i = 0; i < jsModels.length(); i++) {
      models.add(jsModels.get(i));
    }
    ModelChangeEvent.fire(ownerVisualization, action, models);
  }
  
  /**
   * Callback invoked when error notifications are cleared from the 
   * visualization.
   */
  private void onErrorsClear() {
    ErrorEvent.fire(ownerVisualization, true, null);
  }
  
  /**
   * Callback invoked when one error notification is added to the
   * visualization.
   */
  private void onErrorAdd(String errorDetails) {
    ErrorEvent.fire(ownerVisualization, false, errorDetails);
  }

  private final native <T> T nativeNewJsArray() /*-{
    return [];
  }-*/;
}
