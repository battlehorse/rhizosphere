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
 * Event to notify that one or more visualization errors have occurred on
 * the visualization, or have been cleared from it.
 * <p>
 * This event is supported only by
 * {@link com.rhizospherejs.gwt.client.Rhizosphere} instances. If you are
 * accessing Rhizosphere as a Google Visualization via
 * {@link com.rhizospherejs.gwt.client.gviz.GVizRhizosphere} you should then
 * rely on {@link com.rhizospherejs.gwt.client.gviz.ErrorHandler.ErrorEvent}.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class ErrorEvent extends GwtEvent<ErrorEvent.Handler> {

  /**
   * Implemented by objects that handle {@link ErrorEvent}.
   */
  public interface Handler extends EventHandler {
    void onError(ErrorEvent event);
  }
  
  /**
   * The event type
   */
  static Type<ErrorEvent.Handler> TYPE;
  private String details;
  private boolean cleared;
  
  private ErrorEvent(boolean cleared, String details) {
    // Ignore error details (if any), if errors are being cleared.
    this.details = cleared ? null : details;
    this.cleared = cleared;
  }
  
  public boolean errorsCleared() {
    return cleared;
  }
  
  public String getDetails() {
    return details;
  }
  
  /**
   * Fires an {@link ErrorEvent} on all registered handlers in the handler
   * source.
   *
   * @param source the source of the handlers
   * @param cleared Whether the errors have been cleared from the visualization
   *     or a new one is being added.
   * @param details The error details, if a new error is being added. 
   */
  public static void fire(HasFilterHandlers source, boolean cleared, String details) {
    if (TYPE != null) {
      ErrorEvent event = new ErrorEvent(cleared, details);
      source.fireEvent(event);
    }
  }

  /**
   * Ensures the existence of the handler hook and then returns it.
   *
   * @return returns a handler hook
   */
  public static Type<ErrorEvent.Handler> getType() {
    if (TYPE == null) {
      TYPE = new Type<ErrorEvent.Handler>();
    }
    return TYPE;
  }

  @Override
  protected void dispatch(Handler handler) {
    handler.onError(this);
  }

  @Override
  public com.google.gwt.event.shared.GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE;
  }  
}
