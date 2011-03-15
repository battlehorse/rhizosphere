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

import com.google.gwt.user.client.ui.Widget;

/**
 * Propagates events that originate in JSNI code and affect a Widget lifecycle
 * back into GWT space, to avoid memory leaks.
 * <p>
 * {@link com.rhizospherejs.gwt.client.RhizosphereRenderer} lets the developer
 * define Rhizosphere renderings (the visual representation of each Rhizosphere
 * model) as GWT Widgets. These widgets are half managed by GWT code and half
 * managed by JSNI code. In detail:
 * <ul>
 * <li>Renderings' widgets are created in GWT land,</li>
 * <li>their logical parent is the Rhizosphere visualization hosting them,</li>
 * <li>they process attach and detach notifications (including the ones
 *   cascading from the attachment/detachment of the container visualization)
 *   in GWT land, but</li>
 * <li>they are physically attached and removed from the DOM in JSNI code.</li>
 * </ul>
 * <p>
 * As a consequence this interface propagates notifications of physical DOM
 * attach and detach from JSNI to GWT land, so that GWT implementors can
 * complete the process by issuing the calls for logical attach/detach.
 * <p>
 * This class is for internal use and it's probably useless to everybody else
 * outside the Rhizosphere library.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public interface WidgetBridge {

  /**
   * Invoked when a Widget has been physically attached to a Rhizosphere
   * visualization DOM tree. The implementor should perform the matching
   * logical attach.
   *
   * @param widget The widget that was attached.
   */
  void add(Widget widget);

  /**
   * Invoked when a Widget has been physically removed from a Rhizosphere
   * visualization DOM tree. The implementor should perform the matching
   * logical detach.
   *
   * @param widget The widget that was removed.
   * @return Whether the logical detach was successful or not.
   */
  boolean remove(Widget widget);

  /**
   * Provides a hook to instrument widgets as soon as they are emitted by
   * a {@link com.rhizospherejs.gwt.client.RhizosphereRenderer}.
   *
   * @param widget The widget emitted by a
   *     {@link com.rhizospherejs.gwt.client.RhizosphereRenderer} instance.
   * @return Either the same input widget or a new widget that wraps it.
   */
  Widget processRendering(Widget widget);
}
