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

/**
 * Event to notify that a Rhizosphere visualization is ready for user
 * interaction.
 * <p>
 * This is event is supported only by
 * {@link com.rhizospherejs.gwt.client.Rhizosphere} instances. If you are
 * accessing Rhizosphere as a Google Visualization via
 * {@link com.rhizospherejs.gwt.client.gviz.GVizRhizosphere} you should then
 * rely on GViz own
 * {@link com.google.gwt.visualization.client.events.ReadyHandler.ReadyEvent}.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class ReadyEvent extends GwtEvent<ReadyEvent.Handler> {

  /**
   * Implemented by objects that handle {@link ReadyEvent}.
   */
  public interface Handler extends EventHandler {
    void onReady(ReadyEvent event);
  }

  /**
   * The event type.
   */
  static Type<ReadyEvent.Handler> TYPE;

  /**
   * Fires a {@link ReadyEvent} on all registered handlers in the handler
   * source.
   *
   * @param source the source of the handlers
   */
  public static void fire(HasReadyHandlers source) {
    if (TYPE != null) {
      ReadyEvent event = new ReadyEvent();
      source.fireEvent(event);
    }
  }

  /**
   * Ensures the existence of the handler hook and then returns it.
   *
   * @return returns a handler hook
   */
  public static Type<ReadyEvent.Handler> getType() {
    if (TYPE == null) {
      TYPE = new Type<ReadyEvent.Handler>();
    }
    return TYPE;
  }

  @Override
  protected void dispatch(Handler handler) {
    handler.onReady(this);
  }

  @Override
  public com.google.gwt.event.shared.GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE;
  }
}
