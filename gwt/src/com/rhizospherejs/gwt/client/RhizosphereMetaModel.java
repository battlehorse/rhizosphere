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
 * Enumerates and characterizes the attributes of Rhizosphere visualization
 * models.
 * <p>
 * A metamodel formally describes the structure of Rhizosphere models. It
 * enumerates the attributes that models have, and associates them with
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
 * The above example results in the definition of a model with four attributes:
 * a <em>name</em> attribute, automatically characterized via annotation and the
 * three manually defined <em>bestColor</em>, <em>alternateColor</em> and
 * <em>worstColor</em> attributes. The manual attributes also receive a
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
 * The above example results in the definition of two attributes: a string
 * 'name' attribute and a numeric 'age' attribute that will be associated with
 * range-based UI controls in the visualization (see {@link RhizosphereKind}
 * for further info about the definition of attribute types).
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public final class RhizosphereMetaModel extends JavaScriptObject {
  
  /**
   * Enumeration of valid clustering criteria for
   * {@link Attribute#setDateClusterBy(DateClusterCriteria)} settings. 
   */
  public enum DateClusterCriteria { 
    DAY("d"),
    MONTH("m"),
    YEAR("y");
    
    private String clusterBy;
    
    DateClusterCriteria(String clusterBy) {
      this.clusterBy = clusterBy;
    }
    
    public String getClusterBy() {
      return clusterBy;
    }
  }

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

    private native void nativeSetKind(String nativeKind) /*-{
      this['kind'] = nativeKind;
    }-*/;

    /**
     * Sets the Rhizosphere kind of the attribute via factory methods.
     * <p>
     * See {@link com.rhizospherejs.gwt.client.meta.HasKindFactory} about how
     * each factory is expected to work.
     *
     * @param factory A javascript function that will return a new
     *     Rhizosphere kind instance when invoked.
     * @param uiFactory A javascript function that will return a new
     *     Rhizosphere kind user interface instance when invoked, or null
     *     if the kind should not have any user interface.
     * @return the Attribute itself, for chaining.
     */
    public Attribute setKindFromFactory(final JavaScriptObject factory,
                                        final JavaScriptObject uiFactory) {
      nativeSetKindFromFactory(factory, uiFactory);
      return this;
    }

    private native void nativeSetKindFromFactory(JavaScriptObject factory,
                                                 JavaScriptObject uiFactory) /*-{
      var kindUuid = '__kind_' + String((new Date()).valueOf()) + '_' + String(Math.random());
      $wnd.rhizo.meta.defaultRegistry.registerKindFactory(kindUuid, factory);
      if (uiFactory) {
        $wnd.rhizo.meta.defaultRegistry.registerKindUiFactory(kindUuid, uiFactory);
      }
      this['kind'] = kindUuid;
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
     *     Use {@code null} to let Rhizosphere determine the set of categories
     *     automatically based on the current set of items that are part of
     *     the visualization.
     * @param multiple Whether the attribute can have multiple categories or
     *     just one.
     * @param hierarchy Whether the categories represent a branch of a
     *     hierarchical structure and are ordered accordingly, for example
     *     {@code ["World", "Europe", "UK"]}.
     * @return the Attribute itself, for chaining.
     */
    public Attribute setCategories(
        final String[] categories, final boolean multiple, final boolean hierarchy) {
      JsArrayString jsArray = null;
      if (categories != null && categories.length > 0) {
        jsArray = JavaScriptObject.createArray().cast();
        for (String category : categories) {
          jsArray.push(category);
        }
      }
      nativeSetCategories(jsArray, multiple, hierarchy);
      return this;
    }

    private native void nativeSetCategories(
        JsArrayString categories, boolean multiple, boolean hierarchy) /*-{
      if (categories) {
        this['categories'] = categories;
      }
      this['multiple'] = multiple;
      this['isHierarchy'] = hierarchy;
    }-*/;

    /**
     * Marks this attribute as establishing a link between visualization models.
     * If set, the value this attribute will have must be the unique ID of the
     * linked model (see {@link RhizosphereModelAttribute#modelId()}).
     * <p>
     * This option is useful to establish child-to-parent relationships between
     * visualization models. When child-to-parent relationships exist between
     * visualization models, Rhizosphere can offer advanced layout operations
     * (such as hierarchical treemaps) that leverage this information.
     *
     * @param isLink Whether this attribute establishes a link to other
     *     visualization models.
     * @return the Attribute itself, for chaining.
     */
    public Attribute setLink(final boolean isLink) {
      nativeSetLink(isLink, null);
      return this;
    }

    /**
     * Marks this attribute as establishing a link between visualization models,
     * pointing to a custom model attribute other than the model unique id to
     * resolve the links.
     * 
     * @param isLink Whether this attribute establishes a link to other
     *     visualization models.
     * @param linkKey the name of the target model attribute whose value 
     *     resolves the links established by this attribute. If {@code null}, 
     *     it is assumed that the values of this model attribute will contain
     *     the unique ids of their linked models. If specified, the values of
     *     the target model attribute must be unique across all visualization
     *     models.
     * @return the Attribute itself, for chaining.
     */
    public Attribute setLink(final boolean isLink, String linkKey) {
      nativeSetLink(isLink, linkKey);
      return this;
    }

    private native void nativeSetLink(boolean isLink, String linkKey) /*-{
      this['isLink'] = isLink;
      if (isLink && linkKey) {
        this['linkKey'] = linkKey;
      }
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
     * Sets the precision an attribute of {@link RhizosphereKind#DECIMAL},
     * {@link RhizosphereKind#DECIMALRANGE} or
     * {@link RhizosphereKind#LOGARITHMRANGE} type should use when handling
     * floating point numbers. Unused for other attribute kinds.
     * 
     * @param precision The requested precision.
     * @return the Attribute itself, for chaining.
     */
    public Attribute setPrecision(final int precision) {
      nativeSetPrecision(precision);
      return this;
    }
    
    private native void nativeSetPrecision(int precision) /*-{
      this['precision'] = precision;
    }-*/;

    /**
     * Set the range of years an attribute of {@link RhizosphereKind#DATE} type
     * can have. Unused for other attribute kinds.
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
    
    /**
     * Set the clustering criteria an attribute of {@link RhizosphereKind#DATE}
     * type should use when grouping dates. Unused for other attribute kinds.
     *
     * @param criteria The grouping criteria to use.
     * @return the Attribute itself, for chaining.
     */    
    public Attribute setDateClusterBy(final DateClusterCriteria criteria) {
      nativeSetDateClusterBy(criteria.getClusterBy());
      return this;
    }
    
    private native void nativeSetDateClusterBy(String clusterBy) /*-{
      this['clusterBy'] = clusterBy;
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
