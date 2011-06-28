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

package com.rhizospherejs.gwt.client.handlers;

import com.google.gwt.event.shared.EventHandler;
import com.google.gwt.event.shared.GwtEvent;

import com.rhizospherejs.gwt.client.RhizosphereModelRef;

import java.util.Collection;

/**
 * Event to notify that a selection operation occurred on a Rhizosphere
 * visualization.
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class SelectionEvent extends GwtEvent<SelectionEvent.Handler> {

  public interface Handler extends EventHandler {
    void onSelection(SelectionEvent event);
  }

  /**
   * The event type.
   */
  static Type<SelectionEvent.Handler> TYPE;

  private String action;
  private Collection<RhizosphereModelRef> models;
  private boolean incremental;

  private SelectionEvent(String action,
                         Collection<RhizosphereModelRef> models,
                         boolean incremental) {
    this.action = action;  // can be null.
    this.models = models;
    this.incremental = incremental;
  }

  /**
   * The operation that occurred. Different types of operations can occur.
   * See <a href="http://code.google.com/p/rhizosphere/source/browse/src/js/rhizo.selection.js">
   * rhizo.seletion.js</a> for the list of supported operations.
   * @return The operation that occurred.
   */
  public String getAction() {
    return action;
  }

  /**
   * @return Whether the selection operation was incremental or not.
   */
  public boolean isIncremental() {
    return incremental;
  }

  /**
   * @return The collection of visualization models the operation was applied
   *     to.
   */
  public Collection<RhizosphereModelRef> getModelRefs() {
    return models;
  }

  /**
   * Fires a {@link SelectionEvent} on all registered handlers in the handler
   * source.
   *
   * @param source The source of the handlers.
   * @param action The operation that occurred.
   * @param models The collection of visualization models the operation was
   *     applied to.
   * @param incremental Whether the selection operation was incremental or not.
   */
  public static void fire(HasSelectionHandlers source,
                          String action,
                          Collection<RhizosphereModelRef> models,
                          boolean incremental) {
    if (TYPE != null) {
      SelectionEvent event = new SelectionEvent(action, models, incremental);
      source.fireEvent(event);
    }
  }

  /**
   * Ensures the existence of the handler hook and then returns it.
   *
   * @return returns a handler hook
   */
  public static Type<SelectionEvent.Handler> getType() {
    if (TYPE == null) {
      TYPE = new Type<SelectionEvent.Handler>();
    }
    return TYPE;
  }

  @Override
  protected void dispatch(Handler handler) {
    handler.onSelection(this);
  }

  @Override
  public com.google.gwt.event.shared.GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE;
  }    
}
