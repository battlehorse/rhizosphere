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
import com.google.gwt.dom.client.Element;
import com.google.gwt.dom.client.Style.Position;
import com.google.gwt.event.shared.HandlerRegistration;
import com.google.gwt.json.client.JSONObject;
import com.google.gwt.json.client.JSONValue;
import com.google.gwt.user.client.DOM;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.Panel;
import com.google.gwt.user.client.ui.Widget;
import com.google.gwt.user.client.ui.WidgetCollection;

import com.rhizospherejs.gwt.client.bootstrap.Bootstrap;
import com.rhizospherejs.gwt.client.bridge.JSONObjectModelBridge;
import com.rhizospherejs.gwt.client.bridge.JSONStringModelBridge;
import com.rhizospherejs.gwt.client.bridge.JavaScriptObjectModelBridge;
import com.rhizospherejs.gwt.client.bridge.JsoBuilder;
import com.rhizospherejs.gwt.client.bridge.ModelBridge;
import com.rhizospherejs.gwt.client.handlers.FilterEvent;
import com.rhizospherejs.gwt.client.handlers.HasFilterHandlers;
import com.rhizospherejs.gwt.client.handlers.HasLayoutHandlers;
import com.rhizospherejs.gwt.client.handlers.HasReadyHandlers;
import com.rhizospherejs.gwt.client.handlers.HasSelectionHandlers;
import com.rhizospherejs.gwt.client.handlers.LayoutEvent;
import com.rhizospherejs.gwt.client.handlers.ReadyEvent;
import com.rhizospherejs.gwt.client.handlers.SelectionEvent;
import com.rhizospherejs.gwt.client.meta.AttributeBuilder;
import com.rhizospherejs.gwt.client.renderer.NativeRenderer;
import com.rhizospherejs.gwt.client.renderer.WidgetBridge;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

/**
 * Widget wrapping a Rhizosphere visualization. This is the main entry point
 * for instantiating a Rhizosphere visualization within a GWT application.
 * Learn more about Rhizosphere at
 * <a target="_blank" href="http://docs.rhizspherejs.com">
 * docs.rhizospherejs.com</a>
 *
 * <p>
 * Before attaching the visualization to the DOM, ensure that:
 * <ul>
 * <li>The Rhizosphere javascript libraries have already been injected in the
 *   DOM (see {@link RhizosphereLoader}).</li>
 * <li>The visualization has been properly configured by defining the models,
 *   metamodel and renderer the visualization will use. (see
 *   {@link Rhizosphere#addModel(Object)},
 *   {@link Rhizosphere#setMetaModel(RhizosphereMetaModel)} and
 *   {@link Rhizosphere#setRenderer(RhizosphereRenderer)}).</li>
 * </ul>
 *
 * <p>
 * To instantiate a Rhizosphere visualization:
 * <ul>
 * <li>Define the set of <strong>models</strong> to visualize. A model
 *   represents a single datapoint of the dataset you want to visualize. You
 *   can specify your models in variety of formats.</li>
 * <li>Define the visualization <strong>metamodel</strong>. A metamodel
 *   represents the formal definition of the models structure. It enumerates
 *   the set of attributes that form each model. You can both specify the
 *   metamodel manually or have Rhizosphere infer it automatically from your
 *   models.</li>
 * <li>Define the visualization <strong>renderer</strong>. The renderer is
 *   responsible for providing a visual representation of models.</li>
 * <li>Attach the widget.</li>
 * </ul>
 *
 * <p>
 * <a target="_blank" href="http://www.rhizospherejs.com/doc/devel_concepts.html">
 * Rhizosphere Concepts</a> provides additional information about the models,
 * metamodels and renderers.
 *
 * <p>
 * You can feed Rhizosphere the data to visualize in multiple formats. The most
 * natural way is to supply each datapoint (a <em>model</em> in Rhizosphere
 * terminology) as a POJO. To do so, make sure your POJO implements the
 * {@link RhizosphereModel} interface and ensure Rhizosphere is prepared to
 * receive your POJOs via {@link Rhizosphere#prepareFor(RhizosphereMapping)}
 * (this is needed because Rhizosphere uses GWT code generation to prepare the
 * necessary translation layers between your POJOs and Rhizosphere internal
 * datamodel):
 * <pre><code>
 *   rhizosphere.prepareFor(GWT.create(YourPOJO.class));
 * </code></pre>
 *
 * <p>
 * Alternatively you can define Rhizosphere models also as
 * {@code JavaScriptObject}, a {@code JSONObject}, a plain JSON String (that
 * Rhizosphere will parse into a JSON object) instances.
 *
 * <p>
 * If you use POJOs to describe your data, you can use
 * {@link RhizosphereModelAttribute} annotations to instruct Rhizosphere on how
 * to expose your data within the visualization. Rhizosphere will parse the
 * annotations to automatically assemble a suitable metamodel for your data.
 * Alternatively you can manually define the metamodel (either partially or in
 * its entirety) via the {@link RhizosphereMetaModel} class (note that manual
 * metamodel definition is the only option if you used opaque objects like
 * {@code JavaScriptObject} or {@code JSONObject} for your models).
 *
 * <p>
 * Finally, you define a renderer for your visualization by implementing the
 * {@link RhizosphereRenderer} interface.
 *
 * <p>
 * Rhizosphere can be configured an tweaked via {@link RhizosphereOptions}.
 *
 * <p>
 * Rhizosphere conforms to the Google Visualization API specifications. If you
 * want to use Rhizosphere as a Google Visualization, see
 * {@link com.rhizospherejs.gwt.client.gviz.GVizRhizosphere}.
 *
 * @see RhizosphereLoader
 * @see com.rhizospherejs.gwt.client.gviz.GVizRhizosphere
 * @param <T> The type that describes the datapoints of your dataset.
 * @author battlehorse@google.com (Riccardo Govoni)
 * @author dinoderek@google.com (Dino Derek Hughes)
 */
public class Rhizosphere<T> extends Composite
    implements HasReadyHandlers, HasFilterHandlers, HasLayoutHandlers, HasSelectionHandlers {

  /**
   * Manages the lifecycle of Rhizosphere renderings. Each datapoint of the
   * dataset visualized by Rhizosphere is rendered as a Widget which ultimately
   * is attached logically to this panel.
   *
   * The panel DOM element wraps the entire Rhizosphere visualization, but
   * renderings are physically attached to a child node (the so called
   * visualization <em>universe</em>).
   */
  private static class RhizoPanel extends Panel implements WidgetBridge {

    /**
     * The list of renderings, one for each datapoint of the dataset visualized
     * by Rhizosphere.
     */
    private WidgetCollection widgets;

    /**
     * Creates a new instance.
     */
    public RhizoPanel() {
      // Setting the panel's position style to 'relative' causes it to be
      // treated as a new positioning context for its children.
      Element container = DOM.createDiv();
      container.getStyle().setPosition(Position.RELATIVE);

      setElement(container);
      setStylePrimaryName("rhizo");

      widgets = new WidgetCollection(this);
    }

    @Override
    public void add(final Widget child) {
      child.removeFromParent();
      widgets.add(child);
      adopt(child);
    }

    @Override
    public boolean remove(final Widget child) {
      if (child.getParent() != this) {
        return false;
      }
      try {
        orphan(child);
      } finally {
        widgets.remove(child);
      }

      return true;
    }

    @Override
    public Iterator<Widget> iterator() {
      return widgets.iterator();
    }

    @Override
    public Widget processRendering(final Widget widget) {
      return widget;
    }
  }

  /**
   * Configuration options Rhizosphere will use to tweak its functionality.
   */
  private RhizosphereOptions<T> options;

  /**
   * The dataset that Rhizosphere will visualize, after conversion of each
   * datapoint into a JavaScriptObject (suitable to be passed to underlying
   * Rhizosphere js library).
   */
  private Collection<JavaScriptObject> models;

  /**
   * The bridge to convert models from the format externally provided (POJOs,
   * JavaScriptObject, JSONObject or String) to the format internally required
   * by Rhizosphere (custom tailored JavaScriptObjects).
   */
  private ModelBridge<T> modelBridge;

  /**
   * The bridge that connects renderings' manipulation that occur both on the
   * gwt and jsni sides of the visualization.
   */
  private WidgetBridge widgetBridge;

  /**
   * The visualization metamodel.
   */
  private RhizosphereMetaModel metaModel;

  /**
   * Whether custom metamodel attributes (if present) have already been added
   * to the metamodel or not.
   */
  private boolean configuredCustomMetaModel = false;

  /**
   * The visualization renderer.
   */
  private RhizosphereRenderer<T> renderer;

  /**
   * The visualization bootstrapper.
   */
  private Bootstrap bootstrap;
  
  /**
   * The visualization user agent.
   */
  private RhizosphereUserAgent<T> userAgent;

  /**
   * Creates a new instance of the visualization, with default options.
   */
  public Rhizosphere() {
    this(null);
  }

  /**
   * Creates a new instance of the visualization.
   * @param options Visualization configuration options. You cannot reuse
   *     options between different visualizations. Each visualization must have
   *     a separate instance of RhizosphereOptions.
   */
  public Rhizosphere(final RhizosphereOptions<T> options) {
    this.options = options;
    models = new ArrayList<JavaScriptObject>();

    RhizoPanel p = new RhizoPanel();
    initWidget(p);
    widgetBridge = p;

    bootstrap = Bootstrap.create(getElement(), this.options, this);
    userAgent = bootstrap.prepare();
    userAgent.bindTo(this);
  }

  /**
   * Prepares Rhizosphere to handle custom POJOs as visualization models.
   * You must invoke this method before passing your models to Rhizosphere
   * (that is, before your first call to {@link Rhizosphere#addModel(Object)}).
   *
   * If the visualization uses opaque models (JavaScriptObject, JSONObject or
   * JSON strings), it is not necessary to call this method.
   *
   * After calling this method, an automatically built
   * {@link RhizosphereMetaModel} will be available for customization via
   * {@link Rhizosphere#getMetaModel()}.
   *
   * @param mapping A class capable of converting custom POJOs to objects that
   *     Rhizosphere knows how to manage. You can create mapping instances by
   *     passing the POJO class to {@code GWT.create}, e.g.:
   *     <code>rhizo.prepareFor(GWT.create(yourPOJO.class));</code>).
   */
  public void prepareFor(final RhizosphereMapping<T> mapping) {
    prepareFor(mapping, null, null);
  }

  /**
   * Prepares Rhizosphere to handle custom POJOs as visualization model. See
   * {@link Rhizosphere#prepareFor(RhizosphereMapping)} for further details.
   *
   * @param mapping A class capable of converting custom POJOs to objects that
   *     Rhizosphere knows how to manage. You can create mapping instances by
   *     passing the POJO class to {@code GWT.create}, e.g.:
   *     <code>rhizo.prepareFor(GWT.create(yourPOJO.class));</code>).
   * @param jsoBuilder A custom {@link JsoBuilder} to convert between POJOs and
   *     JavaScriptObjects. If {@code null}, a default one will be used.
   */
  public void prepareFor(final RhizosphereMapping<T> mapping,
                         final JsoBuilder jsoBuilder) {
    prepareFor(mapping, jsoBuilder, null);
  }

  /**
   * Prepares Rhizosphere to handle custom POJOs as visualization model. See
   * {@link Rhizosphere#prepareFor(RhizosphereMapping)} for further details.
   *
   * @param mapping A class capable of converting custom POJOs to objects that
   *     Rhizosphere knows how to manage. You can create mapping instances by
   *     passing the POJO class to {@code GWT.create}, e.g.:
   *     <code>rhizo.prepareFor(GWT.create(yourPOJO.class));</code>).
   * @param jsoBuilder A custom {@link JsoBuilder} to convert between POJOs and
   *     JavaScriptObjects. If {@code null}, a default one will be used.
   * @param attributeBuilder A custom {@link AttributeBuilder} to extract
   *     metamodel information from annotated POJOs. If {@code null}, a default
   *     one will be used.
   */
  public void prepareFor(final RhizosphereMapping<T> mapping,
                         final JsoBuilder jsoBuilder,
                         final AttributeBuilder attributeBuilder) {
    modelBridge = mapping.newModelBridge(jsoBuilder);
    metaModel = mapping.newMetaModelFactory(attributeBuilder).newMetaModel();
  }

  /**
   * Alternative for {@link Rhizosphere#prepareFor(RhizosphereMapping)} to save
   * the caller from having to cast the output of {@code GWT.create}.
   * @param mapping
   */
  @SuppressWarnings("unchecked")
  public void prepareFor(final Object mapping) {
    prepareFor((RhizosphereMapping<T>) mapping, null, null);
  }

  /**
   * Alternative for {@link #prepareFor(RhizosphereMapping, JsoBuilder)} to save
   * the caller from having to cast the output of {@code GWT.create}.
   * @param mapping
   * @param jsoBuilder
   */
  @SuppressWarnings("unchecked")
  public void prepareFor(final Object mapping, final JsoBuilder jsoBuilder) {
    prepareFor((RhizosphereMapping<T>) mapping, jsoBuilder, null);
  }

  /**
   * Alternative for
   * {@link #prepareFor(RhizosphereMapping, JsoBuilder, AttributeBuilder)} to
   * save the caller from having to cast the output of {@code GWT.create}.
   * @param mapping
   * @param jsoBuilder
   * @param attributeBuilder
   */
  @SuppressWarnings("unchecked")
  public void prepareFor(final Object mapping,
                         final JsoBuilder jsoBuilder,
                         final AttributeBuilder attributeBuilder) {
    prepareFor((RhizosphereMapping<T>) mapping, jsoBuilder, attributeBuilder);
  }

  /**
   * Adds the specified model to the visualization.
   *
   * Models can be defined as JavaScriptObject, JSONObject, String (assumed to
   * represent a JSON-encoded object) or custom POJOs.
   *
   * If custom POJOs are used, Rhizosphere must first be prepared to handle
   * them via {@link #prepareFor(RhizosphereMapping)}.
   *
   * @param model The model, i.e. a datapoint of the dataset you want to
   *     visualize, to add.
   * @return An opaque reference to the model just added, that can be later
   *     used for programmatic actions that address specific models.
   * @throws com.google.gwt.json.client.JSONException If the model type is a
   *     String and it cannot be successfully converted into a JSON object.
   * @throws RhizosphereException If {@code prepareFor} was not called with the
   *     correct class before passing a custom POJO to this method.
   */
  public RhizosphereModelRef addModel(final T model) {
    ModelBridge<T> factory = getModelBridge(model);
    assert factory != null;
    if ((model instanceof CustomRhizosphereMetaModel) && !configuredCustomMetaModel) {
      assert metaModel != null;
      ((CustomRhizosphereMetaModel) model).setCustomRhizosphereMetaModelAttributes(metaModel);
      configuredCustomMetaModel = true;
    }

    JavaScriptObject jso = factory.bridge(model);
    models.add(jso);
    return RhizosphereModelRef.asModelRef(jso);
  }

  /**
   * Returns a suitable ModelBridge instance for the type of model used by the
   * visualization.
   */
  private ModelBridge<T> getModelBridge(final T model) {
    if (modelBridge == null) {
      modelBridge = tryBuildDefaultModelBridges(model);
      if (modelBridge == null) {
        throw new RhizosphereException("No Rhizosphere mapping registered for "
            + model.getClass());
      }
    }
    return modelBridge;
  }

  /**
   * Instantiate a built-in model bridge for basic model types
   * (JavaScriptObject, JSONObject, String).
   */
  private ModelBridge<T> tryBuildDefaultModelBridges(final T model) {
    if (model instanceof String) {
      return new JSONStringModelBridge().cast();
    }
    if (model instanceof JSONObject) {
      return new JSONObjectModelBridge().cast();
    }
    if (model instanceof JavaScriptObject) {
      return new JavaScriptObjectModelBridge().cast();
    }
    return null;
  }

  /**
   * Sets the visualization metamodel. If custom POJOs are used as visualization
   * models, a metamodel is automatically built based on
   * {@link RhizosphereModelAttribute} annotations found on the POJOs. It is
   * therefore not necessary to define an explicit metamodel.
   *
   * If opaque model types are used (JavaScriptObject, JSONObject, JSON string),
   * defining a metamodel is mandatory.
   *
   * @param meta The visualization metamodel.
   */
  public void setMetaModel(final RhizosphereMetaModel meta) {
    metaModel = meta;
  }

  /**
   * Returns the visualization metamodel. If custom POJOs are used as
   * visualization models, a metamodel is automatically built based on
   * {@link RhizosphereModelAttribute} annotations found on the POJOs and
   * this method can be used to access it for further customization.
   *
   * If opaque model types are used (JavaScriptObject, JSONObject, JSON string),
   * this method will return {@code null} until a metamodel is explicitly
   * provided via {@link #setMetaModel(RhizosphereMetaModel)}.
   *
   * @return The visualization metamodel.
   */
  public RhizosphereMetaModel getMetaModel() {
    return metaModel;
  }

  /**
   * Sets the visualization renderer. You can avoid setting the renderer if you
   * already provide one via {@link RhizosphereOptions} options.
   * @param renderer The visualization renderer.
   */
  public void setRenderer(final RhizosphereRenderer<T> renderer) {
    this.renderer = renderer;
  }

  /**
   * Register a handler to be notified once the visualization is ready for
   * user interaction.
   * @param handler The handler to notify.
   */
  @Override
  public HandlerRegistration addReadyHandler(ReadyEvent.Handler handler) {
    return addHandler(handler, ReadyEvent.getType());
  }

  /**
   * Register a handler to be notified whenever the visualization filtering
   * criteria change.
   * @param handler The handler to notify.
   */
  @Override
  public HandlerRegistration addFilterHandler(FilterEvent.Handler handler) {
    return addHandler(handler, FilterEvent.getType());
  }

  /**
   * Register a handler to be notified whenever the visualization layout
   * algorithm changes.
   * @param handler The handler to notify.
   */
  @Override
  public HandlerRegistration addLayoutHandler(LayoutEvent.Handler handler) {
    return addHandler(handler, LayoutEvent.getType());
  }

  /**
   * Register a handler to be notified whenever the selection status of one or
   * more visualization elements changes.
   * @param handler The handler to notify.
   */
  @Override
  public HandlerRegistration addSelectionHandler(SelectionEvent.Handler handler) {
    return addHandler(handler, SelectionEvent.getType());
  }

  /**
   * Programmatically applies a faceted filter on visualization models on the
   * given model attribute.
   * @param name The name of the Rhizosphere model attribute, as defined by
   *     {@link RhizosphereModelAttribute#name()}, the filter applies to.
   * @param value The filtering criteria. The specific format of the filtering
   *     criteria depends on the attribute kind. For example, attributes with
   *     the RANGE kind expect the criteria to be a JSONObject with two numeric
   *     {@code min} and {@code max} entries. Use a {@code null} to remove any
   *     pre-existing filter on the attribute.
   * @param cb An optional callback invoked with the outcome of the filter
   *     operation.
   */
  public void doFilter(String name, JSONValue value, RhizosphereCallback cb) {
    if (!bootstrap.isDeployed()) {
      if (cb != null) {
        cb.run(false, "Visualization is not deployed yet");
      }
      return;
    }
    userAgent.doFilter(name, value, cb);
  }

  /**
   * Programmatically applies one or more faceted filters on visualization
   * models.
   *
   * @param filters The set of filters to apply. Each key should be a valid
   *     Rhizosphere model attribute name, as defined by
   *     {@link RhizosphereModelAttribute#name()}, for a filter to apply to.
   *     Each value should represent the filtering criteria. The specific
   *     format of the filtering criteria depends on the attribute kind.
   *     For example, attributes with the RANGE kind expect the criteria to be
   *     a JSONObject with two numeric {@code min} and {@code max} entries.
   *     Use a {@code null} to remove any pre-existing filter on the attribute.
   * @param cb An optional callback invoked with the outcome of the filter
   *     operation.
   */
  public void doFilter(Map<String, JSONValue> filters, RhizosphereCallback cb) {
    if (!bootstrap.isDeployed()) {
      if (cb != null) {
        cb.run(false, "Visualization is not deployed yet");
      }
      return;
    }
    userAgent.doFilter(filters, cb);
  }

  /**
   * As {@link #doFilter(Map, RhizosphereCallback)}, with the filters defined
   * as a JSONObject instead of a Map.
   * @param filterObj The set of filters to apply.
   * @param cb An optional callback invoked with the outcome of the filter
   *     operation.
   */
  public void doFilter(JSONObject filterObj, RhizosphereCallback cb) {
    if (!bootstrap.isDeployed()) {
      if (cb != null) {
        cb.run(false, "Visualization is not deployed yet");
      }
      return;
    }
    userAgent.doFilter(filterObj, cb);
  }

  /**
   * Programmatically resets all the filters currently applied to visualization
   * models.
   * @param cb An optional callback invoked with the outcome of the filter
   *     operation.
   */
  public void doResetFilters(RhizosphereCallback cb) {
    if (!bootstrap.isDeployed()) {
      if (cb != null) {
        cb.run(false, "Visualization is not deployed yet");
      }
      return;
    }
    userAgent.doResetFilters(cb);
  }

  /**
   * Programmatically performs a selection operation on the visualization
   * models. Different types of operations can be performed. See
   * <a href="http://code.google.com/p/rhizosphere/source/browse/src/js/rhizo.selection.js">
   * rhizo.seletion.js</a> for the list of supported operations.
   *
   * @param action The type of operation to perform.
   * @param models The collection of visualization models the operation applies
   *     to. Not all operations use this parameter and it can be optionally
   *     omitted at times. Refer to the documentation above for details.
   *     Use {@code null} when unneeded.
   * @param cb An optional callback invoked with the outcome of the selection
   *     operation.
   */
  public void doSelection(String action,
                          Collection<RhizosphereModelRef> models,
                          RhizosphereCallback cb) {
    if (!bootstrap.isDeployed()) {
      if (cb != null) {
        cb.run(false, "Visualization is not deployed yet");
      }
      return;
    }
    userAgent.doSelection(action, models, cb);
  }

  /**
   * Programmatically performs a selection operation on the visualization
   * models. Different types of operations can be performed. See
   * <a href="http://code.google.com/p/rhizosphere/source/browse/src/js/rhizo.selection.js">
   * rhizo.seletion.js</a> for the list of supported operations.
   *
   * @param action The type of operation to perform.
   * @param models The collection of visualization models the operation applies
   *     to. Not all operations use this parameter and it can be optionally
   *     omitted at times. Refer to the documentation above for details.
   *     Use {@code null} when unneeded.
   * @param incremental Whether the operation should be incremental or not.
   *     Relevant only for 'hide' and 'focus' operations.
   * @param cb An optional callback invoked with the outcome of the selection
   *     operation.
   */
  public void doSelection(String action,
                          Collection<RhizosphereModelRef> models,
                          boolean incremental,
                          RhizosphereCallback cb) {
    if (!bootstrap.isDeployed()) {
      if (cb != null) {
        cb.run(false, "Visualization is not deployed yet");
      }
      return;
    }
    userAgent.doSelection(action, models, incremental, cb);
  }

  /**
   * Programmatically changes the layout algorithm to visually arrange
   * visualization models.
   *
   * @param engine The layout engine to use. Must be one the valid engine
   *     names as defined in <a href="http://code.google.com/p/rhizosphere/source/browse/src/js/rhizo.layout.js">
   *     rhizo.layout.js</a> in the {@code rhizo.layout.layouts} structure.
   *     Use {@code null} to re-use the current layout engine.
   * @param state The layout state to use. The state is the set of
   *     configuration options that each layout engine accepts to customize its
   *     behavior. The state definition is layout-specific. Use {@code null}
   *     to let the layout use its last (or default) state.
   * @param positions An optional collection of explicit positioning
   *     information for visualization models, that will override any position
   *     the layout engine would otherwise define. Leave {@code null} if
   *     unneeded.
   * @param cb An optional callback invoked with the outcome of the layout
   *     operation.
   */
  // TODO(battlehorse): Change the 'engine' string to enum.
  public void doLayout(String engine,
                       JSONObject state,
                       Collection<RhizosphereModelPosition> positions,
                       RhizosphereCallback cb) {
    if (!bootstrap.isDeployed()) {
      if (cb != null) {
        cb.run(false, "Visualization is not deployed yet");
      }
      return;
    }    
    userAgent.doLayout(engine, state, positions, cb);
  }

  /**
   * Resolves a collection of opaque model references into model instances.
   * @param modelRefs The references to resolve.
   * @return The model instances the references resolves to.
   */
  public Collection<T> resolveModelRefs(Collection<RhizosphereModelRef> modelRefs) {
    if (modelRefs == null) {
      return null;
    }
    if (modelBridge == null) {
      throw new RhizosphereException(
          "You must call addModel() at least once before resolving model ids.");
    }
    List<T> resolvedModels = new ArrayList<T>(modelRefs.size());
    for (RhizosphereModelRef modelRef : modelRefs) {
      T model = modelBridge.extractModel(modelRef);
      if (model != null) {
        resolvedModels.add(model);
      }
    }
    return resolvedModels;
  }

  /**
   * Resolves an opaque model reference into the model instance it points to.
   * @param modelRef The reference to resolve.
   * @return The model instance the reference points to.
   */
  public T resolveModelRef(RhizosphereModelRef modelRef) {
    if (modelRef == null) {
      return null;
    }
    if (modelBridge == null) {
      throw new RhizosphereException(
        "You must call addModel() at least once before resolving model ids.");
    }
    return modelBridge.extractModel(modelRef);
  }

  @Override
  protected void onLoad() {
    if (bootstrap.isDeployed()) {
      // Explicit positioning may get lost on reparenting, e.g. if the
      // widget was located inside an AbsolutePanel.
      getElement().getStyle().setPosition(Position.RELATIVE);
    } else if (!models.isEmpty()) {
      NativeRenderer<T> nativeRenderer = createNativeRenderer();
      bootstrap.deployExplicit(models, metaModel, nativeRenderer);      
    }
    super.onLoad();
  }

  /**
   * Creates a native renderer to wrap the externally provided GWT one.
   * Also binds the renderer to this visualization, a required step to ensure
   * that widgets manipulated both in GWT and jsni domains are properly managed.
   *
   * @return a NativeRenderer instance.
   * @throws RhizosphereException if no renderer has been defined, either by
   *     explicitly calling {@link #setRenderer(RhizosphereRenderer)} or via
   *     configuration options.
   */
  private NativeRenderer<T> createNativeRenderer() {
    if (renderer != null) {
      return new NativeRenderer<T>(renderer, widgetBridge, modelBridge);
    }

    NativeRenderer<T>  nativeRenderer = options.getNativeRenderer();
    if (nativeRenderer == null) {
      throw new RhizosphereException(
          "You must define a renderer for your Rhizosphere visualization.");
    }
    nativeRenderer.setModelExtractor(modelBridge);
    nativeRenderer.setWidgetBridge(widgetBridge);
    return nativeRenderer;
  }

}
