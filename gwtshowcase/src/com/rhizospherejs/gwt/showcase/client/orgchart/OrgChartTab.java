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

package com.rhizospherejs.gwt.showcase.client.orgchart;

import com.google.gwt.core.client.GWT;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.user.client.Timer;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.LazyPanel;
import com.google.gwt.user.client.ui.SimplePanel;
import com.google.gwt.user.client.ui.Widget;

import com.rhizospherejs.gwt.client.Rhizosphere;
import com.rhizospherejs.gwt.client.RhizosphereLoader;
import com.rhizospherejs.gwt.client.RhizosphereOptions;

/**
 * Tab that demonstrates the simplest Rhizosphere integration, visualizing a
 * fictional organizational chart.
 * <p>
 * Both the Rhizosphere models and metamodel are defined via annotations
 * on the {@link Employee} POJO. {@link EmployeeRenderer} defines the
 * renderer.
 * <p>
 * Refer to the comments in this file for further guidance.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 *
 */
public class OrgChartTab extends Composite {
  interface OrgChartTabUI extends UiBinder<Widget, OrgChartTab> {}
  private OrgChartTabUI ui = GWT.create(OrgChartTabUI.class); 

  // Wraps the tab widget into a LazyPanel, so that its contents (including
  // Rhizosphere libraries) are loaded only when the tab is activated.
  private static class LazyTab extends LazyPanel {
    @Override
    protected Widget createWidget() {
      return new OrgChartTab();
    }
  }

  public static Widget get() {
    return new LazyTab();
  }

  @UiField
  SimplePanel rhizosphereContainer;

  public OrgChartTab() {
    initWidget(ui.createAndBindUi(this));    
  }

  @Override
  protected void onLoad() {
    // Delay Rhizosphere loading by 1 ms. This splits execution between the 
    // javascript code that makes the tab visible and the following code that
    // starts the Rhizosphere visualization. This serves 2 purposes:
    // - it ensures that the widget that will contain Rhizosphere is actually
    //   visible. If not (aka, any of the parent elements of the Rhizosphere
    //   widget has a display:none style) Rhizosphere will not render properly
    //   because it won't be able to compute dimensions correctly.
    // - it breaks the Javascript execution to let the UI update and feel more
    //   responsive.
    new Timer() {
      @Override
      public void run() {
        // Ensures that Rhizosphere libraries are loaded. No-op if they have
        // already been loaded in another tab.
        RhizosphereLoader.getInstance().ensureInjected(new Runnable() {
          @Override
          public void run() {
            // Create some default options.
            RhizosphereOptions<Employee> options = RhizosphereOptions.create();
            options.setTemplate("default");
            options.setEnableHTML5History(false);

            // Create a new Rhizosphere visualization suited to display Employee objects.
            Rhizosphere<Employee> rhizosphere = new Rhizosphere<Employee>(options);

            // Makes Rhizosphere aware of the objects that we want to visualize.
            // This step is mandatory if you are using your custom POJOs as
            // Rhizosphere models.
            rhizosphere.prepareFor(GWT.create(Employee.class));

            // Defines the data to visualize.
            rhizosphere.addModel(new Employee(
                "1", null, "John", 30, true, new String[] {"fishing", "soccer"}, 400000));
            rhizosphere.addModel(new Employee(
                "2", "1", "Mark", 20, true, new String[] {"fishing", "soccer"}, 10000));
            rhizosphere.addModel(new Employee(
                "3", "1", "Battlehorse", 31, true,
                new String[] {"computer games", "soccer"}, 25000));
            rhizosphere.addModel(new Employee(
                "4", "3", "Sara", 25, false,
                new String[] {"role playing", "volleyball", "swimming"}, 100000));
            rhizosphere.addModel(new Employee(
                "5", "3", "Jennifer", 25, false, new String[] {"fishing", "role playing"}, 50000));
            rhizosphere.addModel(new Employee(
                "6", "2", "Dave", 48, true,
                new String[] {"role playing", "computer games", "swimming", "shopping"}, 75000));
            rhizosphere.addModel(new Employee(
                "7", "2", "Carl", 33, true, new String[] {"computer games", "swimming"}, 250000));
            rhizosphere.addModel(new Employee(
                "8", "6", "Aaron", 22, true, new String[] {}, 120000));
            rhizosphere.addModel(new Employee(
                "9", "6", "Lucy", 18, false, new String[] {"fishing", "swimming"}, 4000));
            rhizosphere.addModel(new Employee(
                "10", "7", "Jacob", 43, true, new String[] {"paintball", "soccer"}, 90000));

            // Sets the renderer that will visualize each Employee.
            rhizosphere.setRenderer(new EmployeeRenderer());

            // Configure Rhizosphere to use all available space within its
            // container.
            rhizosphere.setWidth("100%");
            rhizosphere.setHeight("100%");
            rhizosphereContainer.add(rhizosphere);
          }
        });
        
      }
    }.schedule(1);
  }
  
}
