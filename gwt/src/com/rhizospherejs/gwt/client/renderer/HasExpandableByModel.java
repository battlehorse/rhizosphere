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
 * status on a model by model basis.
 *
 * Implementors of this interface must return {@code true} on the
 * {@link HasExpandable#expandable(RenderingHints)} method defined by the
 * superinterface.
 *
 * @param <T>  The models' type rendered by the
 *     {@link com.rhizospherejs.gwt.client.RhizosphereRenderer} tagged with
 *     this interface.
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public interface HasExpandableByModel<T> extends HasExpandable {

  /**
   * Defines whether the rendering associated to the given model supports
   * expanded (maximized) status or not.
   *
   * @param model The model whose rendering expansion capability is to be
   *     determined.
   * @param hints Rendering hints about the current visualization environment.
   * @return whether the rendering associated to the given model supports
   *     expanded (maximized) status or not.
   */
  boolean expandableByModel(T model, RenderingHints hints);

}
