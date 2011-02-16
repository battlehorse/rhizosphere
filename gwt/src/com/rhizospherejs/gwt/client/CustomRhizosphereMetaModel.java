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
 * Allows POJOs used as Rhizosphere models to configure the metadata and
 * characteristics of custom attributes not handled by the annotation-based
 * mechanism provided by {@link RhizosphereModelAttribute}.
 * <p>
 * This interface is the companion of {@link CustomRhizosphereModel}. While
 * {@link CustomRhizosphereModel} defines the values each model should assign
 * to custom attributes, this interface define the characteristics of said
 * attributes (such as their {@link RhizosphereKind}, label, name, etc...).
 * <p>
 * Consider the following example:
 * <pre><code>
 * public class Person implements CustomRhizosphereModel, CustomRhizosphereMetaModel {
 *
 *   private String name;
 *   private String[] colorPreference;  // e.g. ["red", "pink", "green"]
 *
 *   public Person(String name, String[] colorPreference) {
 *     this.name = name;
 *     assert colorPreference.length == 3;
 *     this.colorPreference = colorPreference;
 *   }
 *
 *   &#064;RhizosphereModelAttribute
 *   public String getName() {
 *     return name;
 *   }
 *
 *   &#064;Override
 *   public void setCustomRhizosphereAttributes(JsoBuilder builder) {
 *     builder.setString("bestColor", colorPreference[0];
 *     builder.setString("alternateColor", colorPreference[1]);
 *     builder.setString("worstColor", colorPreference[2]);
 *   }
 *
 *   &#064;Override
 *   public void setCustomRhizosphereMetaModelAttributes(RhizosphereMetaModel metaModel) {
 *     String[] colors = new String[] {"red", "pink", "green", "blue"};
 *     metaModel.newAttribute("bestColor").
 *         setLabel("Best Color").
 *         setKind(RhizosphereKind.CATEGORY).
 *         setCategories(colors, false);
 *
 *     metaModel.newAttribute("alternateColor").
 *         setLabel("Alternate Color").
 *         setKind(RhizosphereKind.CATEGORY).
 *         setCategories(colors, false);
 *
 *     metaModel.newAttribute("worstColor").
 *         setLabel("Worst Color").
 *         setKind(RhizosphereKind.CATEGORY).
 *         setCategories(colors, false);
 *   }
 * }
 * </code></pre>
 * <p>
 * The above example results in the definition of a model with 4 attributes: a
 * <em>name</em> attribute, automatically characterized via annotation and the
 * three manually defined <em>bestColor</em>, <em>alternateColor</em> and
 * <em>worstColor</em> attributes. The 3 manual attributes also receive a
 * manually defined metamodel where each attribute is characterized as being
 * a CATEGORY type (see {@link RhizosphereKind} for further info about the
 * definition of attribute types).
 * <p>
 * <strong>NOTE</strong>: even though the interface defines an instance method
 * (hence it will exist on any POJO used as Rhizosphere model), it will be
 * called only once on a single POJO. Implementors should not use POJO instance
 * attributes and actually treat this interface as if it were a static method.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public interface CustomRhizosphereMetaModel {

  /**
   * Enrich the Rhizosphere metamodel built from the POJO this interface is
   * attached to with additional attributes.
   *
   * @param metaModel The current metamodel instance, already inclusive of
   *     all the attributes that could be automatically generated from
   *     {@link RhizosphereModelAttribute} annotations.
   */
  void setCustomRhizosphereMetaModelAttributes(RhizosphereMetaModel metaModel);

}
