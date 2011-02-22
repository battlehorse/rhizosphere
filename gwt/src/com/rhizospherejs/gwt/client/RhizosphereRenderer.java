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

import com.rhizospherejs.gwt.client.renderer.RenderingOutput;

/**
 * A renderer provides a visual representation of visualization models. Each
 * datapoint in a Rhizosphere visualization is represented as a 'model'
 * instance: the renderer is responsible for converting them into a visual
 * representation that the user will be able to manipulate.
 * <p>
 * Rhizosphere models can be rendered as GWT widgets or more simply as HTML
 * elements. When GWT widgets are used, Rhizosphere guarantees a correct
 * life cycle management (attaching and detaching the widgets when required).
 * <p>
 * The minimum requirement for a renderer is to implement this interface, but
 * additional functionality and behavior can be defined by co-implementing any
 * of the interfaces defined in the
 * {@link com.rhizospherejs.gwt.client.renderer} package. For example,
 * use the {@link com.rhizospherejs.gwt.client.renderer.HasExpandable} interface
 * to define whether your renderings support expansion (maximization) or not.
 * <p>
 * An example renderer:
 * <pre><code>
 * class Person implements RhizosphereModel {
 *   private String name;
 *   private Date dateOfBirth;
 *
 *   public Person(String name, Date dateOfBirth) {
 *     this.name = name;
 *     this.dateOfBirth = dateOfBirth;
 *   }
 *
 *   public String getName() {
 *     return name;
 *   }
 *
 *   public String getDateOfBirth() {
 *     return dateOfBirth;
 *   }
 * }
 *
 * class PersonRenderer implements RhizosphereRenderer&lt;Person&gt;, HasCustomDragHandlers {
 *   public void render(Person model, boolean expanded, RenderingOutput helper) {
 *     HorizontalPanel hp = new HorizontalPanel();
 *
 *     // Create a handle that will be used to drag the widget around.
 *     Label draghandle = new Label();
 *     draghandle.setWidth("20px");
 *     draghandle.setHeight("20px");
 *     draghandle.getElement().getStyle().setBackgroundColor("#6391de");
 *     hp.add(draghandle);
 *     output.addDragHandler(draghandle);
 *
 *     // Create a panel holding the Person name and a date picker for the
 *     // Date of birth.
 *     VerticalPanel p = new VerticalPanel();
 *     Label nameLabel = new Label();
 *     nameLabel.setText(model.getName());
 *     p.add(nameLabel);
 *
 *     DatePicker datepicker = new DatePicker();
 *     datepicker.setValue(model.getDateOfBirth());
 *     p.add(datepicker);
 *     hp.add(p);
 *
 *     // Emit the root widget for this rendering.
 *     output.emitWidget(hp);
 *   }
 * }
 * </code></pre>
 *
 * @param <T>  The models' type of the Rhizosphere visualization the renderer
 *     is attached to.
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public interface RhizosphereRenderer<T> {

  /**
   * Renders a model. The renderer must call one of the emit functions exposed
   * by the {@link RenderingOutput} helper with the produced rendering.
   *
   * @param model The model to render.
   * @param expanded Whether the model should be rendered in 'expanded'
   *     (i.e. maximized) state or not. This option is always false if model
   *     expansion is not enabled. See
   *     {@link com.rhizospherejs.gwt.client.renderer.HasExpandable}.
   * @param helper Helper class the renderer must use to emit the produced
   *     rendering and configure its behavior.
   */
  void render(T model, boolean expanded, RenderingOutput helper);
}
