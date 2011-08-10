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

import com.google.gwt.event.shared.HandlerRegistration;
import com.google.gwt.event.shared.HasHandlers;

/**
 * Interface to track listeneres on visualization {@link ModelChangeEvent}
 * events.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public interface HasModelChangeHandlers extends HasHandlers {
  
  /**
   * Adds a {@link ModelChangeEvent} handler.
   *
   * @param handler the handler
   * @return the handler registration
   */
  HandlerRegistration addModelChangeHandler(ModelChangeEvent.Handler handler);

}
