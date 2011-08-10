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
 * Event to notify that one or more
 * {@link com.rhizospherejs.gwt.client.RhizosphereModel} have been added or
 * removed from the visualization.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class ModelChangeEvent extends GwtEvent<ModelChangeEvent.Handler> {

  /**
   * Implemented by objects that handle {@link ModelChangeEvent}.
   */
  public interface Handler extends EventHandler {
    void onModelChange(ModelChangeEvent event);
  }
  
  /**
   * The event type
   */
  static Type<ModelChangeEvent.Handler> TYPE;
  private String action;
  private Collection<RhizosphereModelRef> models;  

  private ModelChangeEvent(String action, Collection<RhizosphereModelRef> models) {
    this.models = models;
    this.action = action;
  }
  
  /**
   * The operation that occurred, either addition or removal of models.
   * @return The operation that occurred. Either 'add' or 'remove'.
   */
  public String getAction() {
    return action;
  }
  
  /**
   * @return The collection of visualization models that was either added or
   *     removed from the visualization, depending on {@code getAction}.
   */
  public Collection<RhizosphereModelRef> getModelRefs() {
    return models;
  }
  
  /**
   * Fires a {@link ModelChangeEvent} on all registered handlers in the handler
   * source.
   *
   * @param source the source of the handlers
   * @param action The action that occurred (model addition or removal).
   * @param models The collection of visualization models that was affected by
   *     the operation.
   */
  public static void fire(HasFilterHandlers source, String action, Collection<RhizosphereModelRef> models) {
    if (TYPE != null) {
      ModelChangeEvent event = new ModelChangeEvent(action, models);
      source.fireEvent(event);
    }
  }

  /**
   * Ensures the existence of the handler hook and then returns it.
   *
   * @return returns a handler hook
   */
  public static Type<ModelChangeEvent.Handler> getType() {
    if (TYPE == null) {
      TYPE = new Type<ModelChangeEvent.Handler>();
    }
    return TYPE;
  }

  @Override
  protected void dispatch(Handler handler) {
    handler.onModelChange(this);
  }

  @Override
  public com.google.gwt.event.shared.GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE;
  }  

}
