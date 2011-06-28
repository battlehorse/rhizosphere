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
import com.google.gwt.json.client.JSONObject;

import com.rhizospherejs.gwt.client.RhizosphereModelAttribute;

/**
 * Event to notify that the filtering criteria of a Rhizosphere visualization
 * have changed.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class FilterEvent extends GwtEvent<FilterEvent.Handler> {

  /**
   * Implemented by objects that handle {@link FilterEvent}.
   */
  public interface Handler extends EventHandler {
    void onFilter(FilterEvent event);
  }

  /**
   * The event type.
   */
  static Type<FilterEvent.Handler> TYPE;
  private JSONObject nativeMessage;

  private FilterEvent(JSONObject nativeMessage) {
    this.nativeMessage = nativeMessage;
  }

  /**
   * Returns an object enumerating all the filtering criteria that have
   * changed. Each key is a valid Rhizosphere model attribute name, as
   * defined by {@link RhizosphereModelAttribute#name()}, for the filter
   * criteria that changed.
   * Each value represents the new filtering criteria. The specific format of
   * the filtering criteria depends on the attribute kind. For example,
   * attributes with the RANGE kind expect the criteria to be a JSONObject with
   * two numeric {@code min} and {@code max} entries. A {@code null} value
   * represents the removal of a previously existing filtering criteria.
   *
   * @return an object enumerating all the filtering criteria that have
   *    changed.
   */
  public JSONObject getNativeMessage() {
    return nativeMessage;
  }

  /**
   * Fires a {@link FilterEvent} on all registered handlers in the handler
   * source.
   *
   * @param source the source of the handlers
   * @param nativeMessage an object enumerating all the filtering criteria that
   *    have changed.
   */
  public static void fire(HasFilterHandlers source, JSONObject nativeMessage) {
    if (TYPE != null) {
      FilterEvent event = new FilterEvent(nativeMessage);
      source.fireEvent(event);
    }
  }

  /**
   * Ensures the existence of the handler hook and then returns it.
   *
   * @return returns a handler hook
   */
  public static Type<FilterEvent.Handler> getType() {
    if (TYPE == null) {
      TYPE = new Type<FilterEvent.Handler>();
    }
    return TYPE;
  }

  @Override
  protected void dispatch(Handler handler) {
    handler.onFilter(this);
  }

  @Override
  public com.google.gwt.event.shared.GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE;
  }
}
