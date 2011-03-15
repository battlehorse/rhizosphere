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

package com.rhizospherejs.gwt.client.meta;

/**
 * Interface assigned to an {@link AttributeDescriptor} to define that its
 * matching {@link com.rhizospherejs.gwt.client.RhizosphereModelAttribute} only
 * accepts values within a defined numerical range.
 * <p>
 * Relevant only if the attribute kind is
 * {@link com.rhizospherejs.gwt.client.RhizosphereKind#RANGE} and related
 * kinds.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public interface HasRange {

    /**
     * The minimum value of the range.
     */
    public double minRange();

    /**
     * The maximum value of the range.
     */
    public double maxRange();

    /**
     * The range stepping (return 0 if not relevant).
     */
    public double stepping();

    /**
     * The range steps (return 0 if not relevant).
     */
    public double steps();
}
