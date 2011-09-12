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

import java.util.ArrayList;
import java.util.List;

/**
 * The Selection Manager keeps track of which models within a Rhizosphere
 * visualization are currently selected, deselected, hidden or focused upon.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class RhizosphereSelectionManager extends JavaScriptObject {
  protected RhizosphereSelectionManager() {}
  
  /**
   * Returns the number of visualization models that are currently selected.
   *
   * @return the number of visualization models that are currently selected.
   */
  public final native int getNumSelected() /*-{
    return this.getNumSelected();
  }-*/;
  
  /**
   * Checks whether a given model is selected or not.
   *
   * @param modelRef The model to check.
   * @return Whether it is currently selected.
   */
  public final native boolean isSelected(RhizosphereModelRef modelRef) /*-{
    return this.isSelected(modelRef.id);
  }-*/;
  
  /**
   * Returns a list of all currently selected models.
   *
   * @return A list of all currently selected models. 
   */
  public final List<RhizosphereModelRef> allSelected() {
    return RhizosphereSelectionManager.toList(nativeAllSelected());
  }
  
  private native JsArray<RhizosphereModelRef> nativeAllSelected() /*-{
    var selectedMap = this.allSelected();
    var selected = [];
    for (var id in selectedMap) {
      selected.push(selectedMap[id].unwrap());
    }
    return selected;
  }-*/;
  
  /**
   * Returns a list of all currently deselected models.
   *
   * @return A list of all currently deselected models. 
   */
  public final List<RhizosphereModelRef> allDeselected() {
    return RhizosphereSelectionManager.toList(nativeAllDeselected());
  }
  
  private native JsArray<RhizosphereModelRef> nativeAllDeselected() /*-{
    var deselectedMap = this.allSelected();
    var deselected = [];
    for (var id in deselectedMap) {
      deselected.push(deselectedMap[id].unwrap());
    }
    return deselected;
  }-*/;
  
  /**
   * Returns the number of currently focused models. In Rhizosphere terminology
   * a model is focused when it was not affected by the user explicit request
   * to to hide some models from view (hence remaining 'focused'). 
   *
   * @return The number of currently focused models.
   */
  public final native int getNumFocused() /*-{
    return this.getNumFocused();
  }-*/;
  
  /**
   * Returns the number of currently hidden models. A Rhizosphere user can
   * explicitly decide to temporarily hide any visualization model from view.
   *
   * @return The number of currently hidden models.
   */
  public final native int getNumHidden() /*-{
    return this.getNumHidden();
  }-*/;
  
  /**
   * Returns the list of all currently focused models. In Rhizosphere
   * terminology a model is focused when it was not affected by the user
   * explicit request to to hide some models from view (hence remaining
   * 'focused'). 
   *
   * @return The list of all currently focused models.
   */  
  public final List<RhizosphereModelRef> allFocused() {
    return RhizosphereSelectionManager.toList(nativeAllFocused());
  }
  
  private native JsArray<RhizosphereModelRef> nativeAllFocused() /*-{
    var focusedMap = this.allFocused();
    var focused = [];
    for (var id in focusedMap) {
      focused.push(focusedMap[id].unwrap());
    }
    return focused;
  }-*/;
  
  /**
   * Returns the list of currently hidden models. A Rhizosphere user can
   * explicitly decide to temporarily hide any visualization model from view.
   *
   * @return The list of currently hidden models.
   */
  public final List<RhizosphereModelRef> allHidden() {
    return RhizosphereSelectionManager.toList(nativeAllHidden());
  }
  
  private native JsArray<RhizosphereModelRef> nativeAllHidden() /*-{
    var hiddenMap = this.allHidden();
    var hidden = [];
    for (var id in hiddenMap) {
      hidden.push(hiddenMap[id].unwrap());
    }
    return hidden;
  }-*/;
  
  private static List<RhizosphereModelRef> toList(JsArray<RhizosphereModelRef> refs) {
    List<RhizosphereModelRef> models = new ArrayList<RhizosphereModelRef>();
    for (int i = 0; i < refs.length(); i++) {
      models.add(refs.get(i));
    }
    return models;
  }
}
