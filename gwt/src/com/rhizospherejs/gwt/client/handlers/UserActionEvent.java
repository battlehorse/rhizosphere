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

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Event to notify that a user action occurred on the visualization.
 * These are particular actions or gestures performed by the user, such as the
 * activation or deactivation of specific UI components, the starting and
 * ending of a selection gesture and more.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class UserActionEvent extends GwtEvent<UserActionEvent.Handler> {

  public interface Handler extends EventHandler {
    void onUserAction(UserActionEvent event);
  }

  /**
   * The event type.
   */
  static Type<UserActionEvent.Handler> TYPE;

  private String action;
  private Map<String, String> details;
  private List<RhizosphereModelRef> affectedModels;

  private UserActionEvent(
      String action,
      Map<String, String> details,
      List<RhizosphereModelRef> affectedModels) {
    this.action = action;
    this.details = details;
    this.affectedModels = affectedModels;
  }

  /**
   * @return The type of action that occurred, e.g. 'selection'.
   */
  public String getAction() {
    return action;
  }

  /**
   * @return A map collecting all the action details (the contents are
   *     specific to the action that occurred).
   */
  public Map<String, String> getDetails() {
    return Collections.unmodifiableMap(details);
  }

  /**
   * @return The list of models that were affected by the user action, if
   *    any. An empty list is returned if no models were affected.
   */
  public List<RhizosphereModelRef> getAffectedModels() {
    return Collections.unmodifiableList(affectedModels);
  }

  /**
   * Returns a specific action detail.
   *
   * @param key The identifying key of the detail to retrieve.
   * @return The associated detail value, if any, or {@code null} otherwise.
   */
  public String getDetail(String key) {
    return details.get(key);
  }

  /**
   * Fires an {@link UserActionEvent} on all registered handlers in the handler
   * source.
   *
   * @param source The source of the handlers.
   * @param action The user action that occurred.
   * @param details A map collecting all the action details (the contents are
   *     specific to the action that occurred).
   * @param affectedModels A list of models affected by the user action,
   *     empty if the action does not affect any.
   */
  public static void fire(HasUserActionHandlers source,
                          String action,
                          Map<String, String> details,
                          List<RhizosphereModelRef> affectedModels) {
    if (TYPE != null) {
      UserActionEvent event = new UserActionEvent(action, details, affectedModels);
      source.fireEvent(event);
    }
  }

  /**
   * Ensures the existence of the handler hook and then returns it.
   *
   * @return returns a handler hook
   */
  public static Type<UserActionEvent.Handler> getType() {
    if (TYPE == null) {
      TYPE = new Type<UserActionEvent.Handler>();
    }
    return TYPE;
  }

  @Override
  protected void dispatch(Handler handler) {
    handler.onUserAction(this);
  }

  @Override
  public com.google.gwt.event.shared.GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE;
  }
}
