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

import com.rhizospherejs.gwt.client.bridge.JsoBuilder;

/**
 * Allows POJOs used as Rhizosphere models to expose custom attributes not
 * handled by the annotation-based mechanism provided by
 * {@link RhizosphereModelAttribute}.
 * <p>
 * Rhizosphere internally uses custom tailored JavaScriptObjects to represent
 * visualization models. POJOs can export their attributes to the
 * visualization in 2 ways. Either automatically by annotating relevant fields
 * with the {@link RhizosphereModelAttribute} annotation, or manually via this
 * interface.
 * <p>
 * POJOs marked with this interface will pass the additional attributes defined
 * in {@link #setCustomRhizosphereAttributes(JsoBuilder)} to the generated
 * JavaScriptObject model.
 * <p>
 * Attributes defined via this interface will exist in addition to other
 * attributes automatically defined via annotations.
 * <p>
 * For example, the following class:
 * <pre><code>
 * public class Person implements CustomRhizosphereModel {
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
 * }
 * </code></pre>
 * <p>
 * Defines a Rhizosphere model with 4 attributes: a <em>name</em> attribute,
 * automatically derived via annotation and the three <em>bestColor</em>,
 * <em>alternateColor</em>, <em>worstColor</em> manually exported via the
 * CustomRhizosphereModel interface.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public interface CustomRhizosphereModel extends RhizosphereModel {

  /**
   * Enrich the Rhizosphere model built from the POJO this interface is
   * attached to with additional attributes.
   *
   * @param builder Helper class to set additional attributes on the Rhizosphere
   *     model extracted from the POJO.
   */
  void setCustomRhizosphereAttributes(JsoBuilder builder);
}
