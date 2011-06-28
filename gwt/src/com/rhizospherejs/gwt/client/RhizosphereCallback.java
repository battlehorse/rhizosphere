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

/**
 * Callback interface to collect the outcome of programmatic requests sent to
 * a Rhizosphere visualization.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public interface RhizosphereCallback {

  /**
   * Executes the callback.
   *
   * @param status Whether the programmatic request this callback is associated
   *     with was successfully dispatched or not.
   * @param details If the programmatic request was not dispatched, the details
   *     for the error that occurred. {@code null} otherwise.
   */
  void run(boolean status, String details);
}
