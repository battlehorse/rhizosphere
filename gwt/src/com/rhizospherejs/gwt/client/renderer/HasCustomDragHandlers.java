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
 * instances to declare that their renderings use custom drag handlers.
 *
 * A renderer must have this interface whenever it uses
 * {@link RenderingOutput#addDragHandler(com.google.gwt.user.client.ui.Widget)}
 * (or other overloaded versions) during the rendering process.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public interface HasCustomDragHandlers {

}
