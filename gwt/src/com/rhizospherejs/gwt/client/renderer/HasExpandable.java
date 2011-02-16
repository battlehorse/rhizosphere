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

package com.rhizospherejs.gwt.client.renderer;

/**
 * Interface for {@link com.rhizospherejs.gwt.client.RhizosphereRenderer}
 * instances to declare whether their renderings support expanded (maximized)
 * status.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public interface HasExpandable {

  /**
   * Defines whether the renderings emitted by the
   * {@link com.rhizospherejs.gwt.client.RhizosphereRenderer} this interface
   * is attached to can be rendered in expanded (maximized) status or not.
   *
   * @param hints Rendering hints about the current visualization environment.
   * @return Whether the renderings can be expanded (maximized) or not.
   */
  boolean expandable(RenderingHints hints);

}
