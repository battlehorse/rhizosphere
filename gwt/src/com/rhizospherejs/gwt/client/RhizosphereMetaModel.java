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

import com.google.gwt.core.client.JavaScriptObject;
import com.google.gwt.core.client.JsArrayString;

/**
 * Enumerates and characterize the attributes of Rhizosphere visualization
 * models.
 * <p>
 * A metamodel formally describes the structure of Rhizosphere models. It
 * enumerates the attributes that models have, and associate them with
 * information that Rhizosphere will use to configure the visualization
 * behavior and capabilities.
 * <p>
 * A RhizosphereMetaModel is structured as a collection of
 * {@link com.rhizospherejs.gwt.client.RhizosphereMetaModel.Attribute}
 * instances. Each
 * {@link com.rhizospherejs.gwt.client.RhizosphereMetaModel.Attribute} describes
 * the characteristics of a
 * matching attribute that is expected to be present on each model which
 * is part of the visualization.
 * <p>
 * Metamodels can be built automatically (by Rhizosphere) or manually (by the
 * developer using the Rhizosphere visualization) depending on the
 * circumstances.
 * <h4>Automatic metamodel generation</h4> 
 * When custom POJOs are used to define Rhizosphere models (via the
 * {@link RhizosphereModel} interface), then the associated metamodel can
 * be defined in-place on the POJOs using {@link RhizosphereModelAttribute}
 * annotations. A RhizosphereMetaModel instance will then be automatically
 * created by Rhizosphere during the preparation phase (see
 * {@link Rhizosphere#prepareFor(RhizosphereMapping)}).
 * <p>
 * Additional customization needs can be defined in 2 ways:
 * <ul>
 * <li>Retrieve the generated metamodel via {@link Rhizosphere#getMetaModel()}
 *   and modify it using the methods provided by this class.</li>
 * <li>Have visualization models implement the
 *   {@link CustomRhizosphereMetaModel} interface. Customizations defined there
 *   will be automatically included in the generated metamodel.</li>
 * </ul>
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
 *
 * <h4>Manual metamodel generation</h4>
 * When opaque objects (like JavaScriptObject, JSONObject and JSON strings) are
 * used as model representations, the associated metamodel must be explicitly
 * built from scratch and fed to Rhizosphere via
 * {@link Rhizosphere#setMetaModel(RhizosphereMetaModel)}.
 * <p>
 * Consider the following example:
 * <pre><code>
 * // Opaque model definition
 * public class Person extends JavaScriptObject {
 *   protected Person() {}
 *
 *   public static Person create(String name, int age) {
 *     Person p = JavaScriptObject.createObject().cast();
 *     nativeSetFields(p, name, age);
 *     return p;
 *   }
 *
 *   private static native void nativeSetFields(Person p, String name, int age) /&#42;-{
 *     p['name'] = name;
 *     p['age'] = age;
 *   }-&#42;/;
 * }
 *
 * // At visualization creation time.
 * RhizosphereMetaModel meta = RhizosphereMetaModel.create();
 * Attribute nameAttr = meta.newAttribute("name");
 * nameAttr.setLabel("Name").setKind(RhizosphereKind.STRING);
 *
 * Attribute ageAttr = meta.newAttribute("age");
 * ageAttr.setLabel("Age").setKind(RhizosphereKind.RANGE).setRange(0, 100, -1, -1);
 *
 * Rhizosphere&lt;Person&gt; r = new Rhizosphere&lt;Person&gt;();
 * r.setMetaModel(meta);
 * r.addModel(Person.create("John", 25));
 * r.addModel(Person.create("Sara", 21));
 * //...
 * </code></pre>
 * <p>
 * The above example results in the definition of 2 attributes: a string 'name'
 * attribute and a numeric 'age' attribute that will be associated with
 * range-based UI controls in the visualization (see {@link RhizosphereKind}
 * for further info about the definition of attribute types).
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public final class RhizosphereMetaModel extends JavaScriptObject {

  /**
   * A single metamodel attribute.
   */
  public static final class Attribute extends JavaScriptObject {
    protected Attribute() {}

    private static Attribute create() {
      return JavaScriptObject.createObject().cast();
    }

    /**
     * Sets the {@link RhizosphereKind} of the attribute.
     *
     * @param kind The attribute kind.
     * @return the Attribute itself, for chaining.
     */
    public Attribute setKind(final RhizosphereKind kind) {
      nativeSetKind(kind.getNativeKind());
      return this;
    }

    private native void nativeSetKind(JavaScriptObject nativeKind) /*-{
      this['kind'] = nativeKind;
    }-*/;

    /**
     * Sets the {@link RhizosphereKind} of the attribute via a factory method.
     *
     * @param factory A javascript function that will return a new
     *     RhizosphereKind when invoked.
     * @return the Attribute itself, for chaining.
     */
    public Attribute setKindFromFactory(final JavaScriptObject factory) {
      nativeSetKindFromFactory(factory);
      return this;
    }

    private native void nativeSetKindFromFactory(JavaScriptObject factory) /*-{
      this['kind'] = factory();
    }-*/;

    /**
     * Sets the attribute user-visible label.
     * @param label The attribute label.
     * @return the Attribute itself, for chaining.
     */
    public Attribute setLabel(final String label) {
      nativeSetLabel(label);
      return this;
    }

    private native void nativeSetLabel(String label) /*-{
      this['label'] = label;
    }-*/;

    /**
     * Sets the set of values an attribute of {@link RhizosphereKind#CATEGORY}
     * kind can have. Unused for other attribute kinds.
     *
     * @param categories The set of categories the attribute values can have.
     * @param multiple Whether the attribute can have multiple categories or
     *     just one.
     * @return the Attribute itself, for chaining.
     */
    public Attribute setCategories(final String[] categories, final boolean multiple) {
      JsArrayString jsArray = JavaScriptObject.createArray().cast();
      for (String category : categories) {
        jsArray.push(category);
      }
      nativeSetCategories(jsArray, multiple);
      return this;
    }

    private native void nativeSetCategories(JsArrayString categories, boolean multiple) /*-{
      this['categories'] = categories;
      this['multiple'] = multiple;
    }-*/;

    /**
     * Marks this attribute as establishing a parent-child relationship between
     * visualization models. If set, the values Rhizosphere models will have for
     * this attribute must point to the unique id of the parent model (see
     * {@link RhizosphereModelAttribute#modelId()}).
     * <p>
     * When parent-child relationships exist within visualization models,
     * Rhizosphere can offer advanced layout operations (such as hierarchical
     * treemaps) that leverage this information.
     *
     * @param isParent Whether this attribute establishes a parent-child
     *     relationship.
     * @return the Attribute itself, for chaining.
     */
    public Attribute setParent(final boolean isParent) {
      nativeSetParent(isParent);
      return this;
    }

    private native void nativeSetParent(boolean isParent) /*-{
      this['isParent'] = isParent;
    }-*/;

    /**
     * Sets the range of values an attribute of {@link RhizosphereKind#RANGE}
     * type (and other equivalent types) can have. Unused for other attribute
     * kinds.
     *
     * @param min The minimum value the attribute can have.
     * @param max The minimum maximum the attribute can have.
     * @param stepping The stepping of the attribute range. Use -1 if not
     *     relevant.
     * @param steps The step size of the attribute range. Use -1 if not
     *     relevant.
     * @return the Attribute itself, for chaining.
     */
    public Attribute setRange(final double min,
                              final double max,
                              final double stepping,
                              final double steps) {
      nativeSetRange(min, max, stepping, steps);
      return this;
    }

    private native void nativeSetRange(double min, double max, double stepping, double steps) /*-{
      this['min'] = min;
      this['max'] = max;
      if (stepping > 0) {
        this['stepping'] = stepping;
      }
      if (steps > 0) {
        this['steps'] = steps;
      }
    }-*/;

    /**
     * Set the range of years an attribute of {@link RhizosphereKind#DATE} can
     * have. Unused for other attribute kinds.
     *
     * @param minYear The minimum year the attribute can have.
     * @param maxYear The maximum year the attribute can have.
     * @return the Attribute itself, for chaining.
     */
    public Attribute setYearRange(final int minYear, final int maxYear) {
      nativeSetYearRange(minYear, maxYear);
      return this;
    }

    private native void nativeSetYearRange(int minYear, int maxYear) /*-{
      this['minYear'] = minYear;
      this['maxYear'] = maxYear;
    }-*/;
  }

  protected RhizosphereMetaModel() {}

  /**
   * Creates a new meta model.
   */
  public static RhizosphereMetaModel create() {
    return JavaScriptObject.createObject().cast();
  }

  /**
   * Adds a new attribute with the given name on the metamodel. If an attribute
   * with the same name already exists it will be overwritten.
   *
   * @param name The attribute name.
   * @return The attribute instance.
   */
  public Attribute newAttribute(final String name) {
    Attribute attr = Attribute.create();
    nativeSetAttribute(name, attr);
    return attr;
  }

  private final native void nativeSetAttribute(String name, Attribute attr) /*-{
    this[name] = attr;
  }-*/;
}
