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
 * Event to notify that a Rhizosphere visualization has completed
 * initialization is ready for user interaction.
 * <p>
 * This event is supported only by
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
  private boolean success;
  private String errorDetails;
  
  private ReadyEvent(boolean success, String errorDetails) {
    this.success = success;
    this.errorDetails = errorDetails;
  }
  
  /**
   * Returns whether Rhizosphere initialization was successful or not.
   *
   * @return Whether Rhizosphere initialization was successful or not.
   */
  public boolean isSuccess() {
    return success;
  }

  /**
   * If Rhizosphere initialization was not successful, returns a details
   * message explaining what went wrong.
   *
   * @return A details message describing Rhizosphere initialization failures,
   *     or {@code null} if initialization was successful.
   */
  public String getErrorDetails() {
    return isSuccess() ? null : errorDetails;
  }

  /**
   * Fires a {@link ReadyEvent} on all registered handlers in the handler
   * source.
   *
   * @param source the source of the handlers
   * @param success Whether the visualization successfully initialized or not.
   * @param errorDetails Details about initialization failures, or {@code null}
   *     if {@code success} is {@code true}.
   */
  public static void fire(HasReadyHandlers source, boolean success, String errorDetails) {
    if (TYPE != null) {
      ReadyEvent event = new ReadyEvent(success, errorDetails);
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
