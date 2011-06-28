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

import com.rhizospherejs.gwt.client.RhizosphereModelPosition;

import java.util.Collection;

/**
 * Event to notify that a layout operation occurred on a Rhizosphere
 * visualization. This includes both changes to the layout algorithm and
 * manual model repositionings by the user.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class LayoutEvent extends GwtEvent<LayoutEvent.Handler> {

  public interface Handler extends EventHandler {
    void onLayout(LayoutEvent event);
  }

  /**
   * The event type.
   */
  static Type<LayoutEvent.Handler> TYPE;

  private String engine;
  private JSONObject state;
  private Collection<RhizosphereModelPosition> positions;

  private LayoutEvent(String engine,
                      JSONObject state,
                      Collection<RhizosphereModelPosition> positions) {
    this.engine = engine;
    this.state = state;
    this.positions = positions;
  }

  /**
   * @return The layout engine currently in use by the visualization.
   *     The returned string is one the valid engine names as defined in
   *     <a href="http://code.google.com/p/rhizosphere/source/browse/src/js/rhizo.layout.js">
   *     rhizo.layout.js</a> in the {@code rhizo.layout.layouts} structure.
   */
  public String getEngine() {
    return engine;
  }

  /**
   * @return The current layout engine state. The state is the set of
   *     configuration options that each layout engine accepts to customize its
   *     behavior. The state definition is layout-specific. 
   */
  public JSONObject getState() {
    return state;
  }

  /**
   * @return An collection of explicit positioning of visualization models,
   *     that overrides the default position otherwise computed by the
   *     layout engine.
   */
  public Collection<RhizosphereModelPosition> getPositions() {
    return positions;
  }

  /**
   * Fires a {@link LayoutEvent} on all registered handlers in the handler
   * source.
   *
   * @param source the source of the handlers
   * @param engine The layout engine to use, or {@code null} to reuse the
   *     current one.
   * @param state The layout state to use, or {@code null} to reuse the current
   *     one.
   * @param positions An optional collection of explicit positioning
   *     information for visualization models, that will override any position
   *     the layout engine would otherwise define. Leave {@code null} if
   *     unneeded.
   */
  public static void fire(HasLayoutHandlers source,
                          String engine,
                          JSONObject state,
                          Collection<RhizosphereModelPosition> positions) {
    if (TYPE != null) {
      LayoutEvent event = new LayoutEvent(engine, state, positions);
      source.fireEvent(event);
    }
  }

  /**
   * Ensures the existence of the handler hook and then returns it.
   *
   * @return returns a handler hook
   */
  public static Type<LayoutEvent.Handler> getType() {
    if (TYPE == null) {
      TYPE = new Type<LayoutEvent.Handler>();
    }
    return TYPE;
  }

  @Override
  protected void dispatch(Handler handler) {
    handler.onLayout(this);
  }

  @Override
  public com.google.gwt.event.shared.GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE;
  }  

}
