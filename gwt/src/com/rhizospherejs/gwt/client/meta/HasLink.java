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
 * Interface assigned to an {@link AttributeDescriptor} to declare that its
 * matching {@link com.rhizospherejs.gwt.client.RhizosphereModelAttribute}
 * defines links to other Rhizosphere models.
 * <p>
 * See {@link com.rhizospherejs.gwt.client.RhizosphereMetaModel.Attribute#setLink(boolean)}.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public interface HasLink {

  /**
   * Returns whether the model attribute defines a link to other visualization
   * models.
   */
  public boolean isLink();
  
  /**
   * Defines the name of the target model attribute whose value resolves the
   * links established by this attribute. If {@code null}, it is assumed that
   * the values of model attribute identified by this interface will contain
   * the unique ids of their linked models. If specified, the values of the
   * target model attribute must be unique across all visualization models.
   *
   * @return the name of the target model attribute whose value resolves the
   *     links established by this attribute, or {@code null} if this attribute
   *     links to other models via their unique ids. 
   */
  public String linkKey();
}
