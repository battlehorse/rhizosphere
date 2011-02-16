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

import com.rhizospherejs.gwt.client.meta.AttributeDescriptor;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Method annotation to expose POJO getters as attributes of Rhizosphere
 * models.
 * <p>
 * When POJOs are used to define Rhizosphere models (by implementing the
 * {@link RhizosphereModel} interface), each field that needs to  be exported to
 * the generated Rhizosphere model should have its getter annotated with this
 * annotation.
 * <p>
 * Methods can be annotated with this annotation if they satisfy these
 * requirements: public, not static, must not accept any argument, must have
 * a non-void return type. Examples:
 * <pre><code>
 *   public String getName();        // valid
 *   public int amount();            // valid
 *   public int[] getColor();        // valid (although no equivalent Rhizosphere types exists, see below).
 *   public static double size();    // NOT valid, static
 *   protected String getAddress();  // NOT valid, non public
 *   public void nothing();          // NOT valid, void return type
 *   public String getAddress(String zipCode);  // NOT valid, accepts arguments.
 * </code></pre>
 * <p>
 * Any method annotated with this annotation will map to an exported attribute
 * on the generated Rhizosphere model with the following characteristics:
 * <ul>
 * <li>The attribute name (i.e. the assigned javascript variable name) is
 *   derived from the method name (removing {@code get} or {@code is}
 *   prefixes if present), unless an explicit name is defined via
 *   {@link #name()} or {@link #descriptor()}.
 *   Examples: A {@code getColor()} method will result in a {@code color}
 *   attribute, {@code isHappy()} will result in {@code happy} and
 *   {@code preferredIceCream()} will result in {@code preferredIceCream}.</li>
 * <li>The attribute user-visible label is similarly derived from the method
 *   name, unless an explicit label is defined via {@link #label()} or
 *   {@link #descriptor()}. Examples: A {@code getColor()} method will result in
 *   a {@code Color} label.</li>
 * <li>The attribute type is derived from the method return type. If the
 *   method return type matches one of the supported Rhizosphere types (string,
 *   number, dates, etc...) the equivalent Rhizosphere type will be used,
 *   otherwise the attribute will be exported to an opaque object (not
 *   accessible from the native Rhizosphere js library code). Refer to the
 *   exposed setters in {@link com.rhizospherejs.gwt.client.bridge.JsoBuilder}
 *   for the list of supported Rhizosphere types.
 * </ul>
 * <p>
 * Unless explicitly forbidden via the {@link #opaque()} option, annotated
 * attributes will also exported to the visualization metamodel. Therefore the
 * attribute will be included also in Rhizosphere UI controls, such as
 * <a target="_blank" href="http://www.rhizospherejs.com/doc/users_overview.html#filters">
 * dynamic filters</a> and
 * <a target="_blank" href="http://www.rhizospherejs.com/doc/users_overview.html#layout">
 * layout selectors</a>.
 * <p>
 * All the above aspects can be customized by declaring an explicit
 * {@link #descriptor()} bound to each exported attribute.
 * <p>
 * Consider the following example:
 * <pre><code>
 * public class Person implements RhizosphereModel {
 *
 *   private String name;
 *   private String address;
 *   private Date dateOfBirth;
 *   private int heightInCm;
 *   private double weightInKg;
 *
 *   public Person(String name, String address, Date dateOfBirth, int heightInCm, double weightInKg) {
 *     this.name = name;
 *     this.address = address;
 *     this.dateOfBirth = dateOfBirth;
 *     this.heightInCm = heightInCm;
 *     this.weightInKg = weightInKg;
 *   }
 *
 *   &#064;RhizosphereModelAttribute
 *   public String getName() {
 *     return name;
 *   }
 *
 *   &#064;RhizosphereModelAttribute(name="height", label="Height (cm)")
 *   public int getHeightInCm() {
 *     return heightInCm;
 *   }
 *
 *   &#064;RhizosphereModelAttribute(name="weight", label="Weight (kg)")
 *   public double getWeightInKg() {
 *     return weightInKg;
 *   }
 *
 *   &#064;RhizosphereModelAttribute(descriptor=DOBDescriptor.class)
 *   public Date getDateOfBirth() {
 *     return dateOfBirth;
 *   }
 *
 *   &#064;RhizosphereModelAttribute(opaque=true)
 *   public String address() {
 *     return address;
 *   }
 * }
 * </code></pre>
 * <p>
 * It will result in the following Rhizosphere model and metamodel attributes:
 * <ul>
 * <li>A 'name' attribute of type string.</li>
 * <li>An 'height' and 'weight' numeric attributes with custom labels.</li>
 * <li>A 'dateOfBirth' attribute with a custom descriptor</li>
 * <li>An 'address' attribute of type string that will not be exposed to the
 *   metamodel.</li>
 * </ul>
 * <p>
 * Because of the {@code opaque} setting, dynamic filters will be generated for
 * the 'name', 'height', 'weight' and 'dateOfBirth' attributes, but not for the
 * 'address' one. The same will apply for the configuration of layout options.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface RhizosphereModelAttribute {

  /**
   * Define the name (that is, the assigned javascript variable name) of the
   * exported Rhizosphere attribute. If omitted, will be automatically
   * generated from the name of the annotated method.
   */
  String name() default "";

  /**
   * Define the user-visible label of the exported attribute. If omitted, will
   * be automatically generated from the name of the annotated method.
   */
  String label() default "";

  /**
   * Defines a descriptor class for this attribute. Descriptors offer an higher
   * degree of customization in defining the characteristics of the exported
   * attribute, in particular for the generation of the associated metamodel
   * entry (which drives several aspects of the Rhizosphere UI such as
   * dynamic filters and layouts).
   */
  Class<? extends AttributeDescriptor> descriptor() default AttributeDescriptor.EMPTY_DESCRIPTOR.class;

  /**
   * Defines whether this attribute should be opaque with respect to metamodel
   * generation. An opaque attribute will not be present in the visualization
   * UI controls such as dynamic filters and layout controls. 
   */
  boolean opaque() default false;

  /**
   * Specifies that this method uniquely identifies the generated model among
   * all the others in the same visualization. Each Rhizosphere model must
   * be identifiable by an id that must be unique among all the models part of
   * the same visualization. If undefined, Rhizosphere will provide an
   * autogenerated id. Autogenerated ids are not guaranteed to be stable
   * across separate visualization deployments, so explicit ids should be
   * defined whenever a Rhizosphere model must remain uniquely addressable over
   * time.
   */
  boolean modelId() default false;
}
