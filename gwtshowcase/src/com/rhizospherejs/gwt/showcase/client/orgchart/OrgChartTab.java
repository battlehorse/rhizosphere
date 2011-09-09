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
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.json.client.JSONBoolean;
import com.google.gwt.json.client.JSONNumber;
import com.google.gwt.json.client.JSONObject;
import com.google.gwt.json.client.JSONValue;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.uibinder.client.UiHandler;
import com.google.gwt.user.client.Timer;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.LazyPanel;
import com.google.gwt.user.client.ui.SimplePanel;
import com.google.gwt.user.client.ui.TextArea;
import com.google.gwt.user.client.ui.Widget;

import com.rhizospherejs.gwt.client.Rhizosphere;
import com.rhizospherejs.gwt.client.RhizosphereCallback;
import com.rhizospherejs.gwt.client.RhizosphereCallback1;
import com.rhizospherejs.gwt.client.RhizosphereLoader;
import com.rhizospherejs.gwt.client.RhizosphereModelPosition;
import com.rhizospherejs.gwt.client.RhizosphereModelRef;
import com.rhizospherejs.gwt.client.RhizosphereOptions;
import com.rhizospherejs.gwt.client.RhizosphereOptions.LogLevel;
import com.rhizospherejs.gwt.client.handlers.FilterEvent;
import com.rhizospherejs.gwt.client.handlers.LayoutEvent;
import com.rhizospherejs.gwt.client.handlers.ReadyEvent;
import com.rhizospherejs.gwt.client.handlers.SelectionEvent;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

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

  /**
   * A simple callback thats log in a user visible text area the outcome of
   * any programmatic action performed on the Rhizosphere visualization.
   */
  private class LogCallback implements RhizosphereCallback {
    @Override
    public void run(boolean status, String details) {
      appendLog("Status: " + status + ", details: " + details);
    }
  }

  @UiField
  SimplePanel rhizosphereContainer;

  /**
   * User visible text area where all events collected from the visualization
   * are dumped, to demonstrate how it is possible to collect interaction
   * events from the Rhizosphere visualization.
   */
  @UiField
  TextArea logArea;
  
  @UiField
  Button resetFilters, salaryFilter, salaryGenderFilter, select, layout, layoutPositions,
      createError, clearErrors;

  private Rhizosphere<Employee> rhizosphere;

  /**
   * References to a couple of visualization datapoints to demonstrate direct
   * referencing of specific visualization objects.
   */
  private RhizosphereModelRef sara, jennifer;

  private LogCallback logCallback = new LogCallback();

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
        RhizosphereLoader loader = RhizosphereLoader.getInstance();
        loader.setTheme("blue");
        loader.ensureInjected(new Runnable() {
          @Override
          public void run() {
            // Create some default options.
            RhizosphereOptions<Employee> options = RhizosphereOptions.create();
            options.setTemplate("default");
            options.setLogLevel(LogLevel.DEBUG);
            options.setEnableHTML5History(false);

            // Create a new Rhizosphere visualization suited to display Employee objects.
            rhizosphere = new Rhizosphere<Employee>(options);

            // Makes Rhizosphere aware of the objects that we want to visualize.
            // This step is mandatory if you are using your custom POJOs as
            // Rhizosphere models.
            rhizosphere.prepareFor(GWT.create(Employee.class));

            // Sets the renderer that will visualize each Employee.
            rhizosphere.setRenderer(new EmployeeRenderer());

            // Configure Rhizosphere to use all available space within its
            // container.
            rhizosphere.setWidth("100%");
            rhizosphere.setHeight("100%");
            
            // Attach event listeners for all supported Rhizosphere events, and
            // dump event contents in a textarea.
            // A production application would use the event contents to keep
            // other parts of the application in sync with actions occurring
            // within Rhizosphere.

            // React to 'ready' events.
            rhizosphere.addReadyHandler(new ReadyEvent.Handler() {
              @Override
              public void onReady(ReadyEvent event) {
                if (event.isSuccess()) {
                  addModels();
                  enableActionButtons();
                }
              }
            });

            // React to filtering of visualization datapoints.
            rhizosphere.addFilterHandler(new FilterEvent.Handler() {
              @Override
              public void onFilter(FilterEvent event) {
                StringBuilder sb = new StringBuilder("Filter: ");
                for (String key: event.getNativeMessage().keySet()) {
                  sb.append(key).
                    append(':').
                    append(event.getNativeMessage().get(key).toString()).
                    append(' ');
                }
                appendLog(sb.toString());
              }
            });

            // React to selections of datapoints.
            rhizosphere.addSelectionHandler(new SelectionEvent.Handler() {
              @Override
              public void onSelection(SelectionEvent event) {
                StringBuilder sb = new StringBuilder("Selection: ");
                sb.append("action=").append(event.getAction());
                sb.append(",incremental=").append(event.isIncremental());
                sb.append(",models=");
                for (Employee e : rhizosphere.resolveModelRefs(event.getModelRefs())) {
                  sb.append(e.getName()).append(',');
                }
                appendLog(sb.toString());
              }
            });

            // React to changes in the visualization layout algorithm.
            rhizosphere.addLayoutHandler(new LayoutEvent.Handler() {
              @Override
              public void onLayout(LayoutEvent event) {
                StringBuilder sb = new StringBuilder("Layout: ");
                sb.append("engine=").append(event.getEngine());
                sb.append(",state=").append(event.getState().toString());
                sb.append(",positions=");
                for (RhizosphereModelPosition p : event.getPositions()) {
                  sb.append("(name:").append(
                      rhizosphere.resolveModelRef(p.getModelRef()).getName());
                  sb.append(",top:").append(p.getTop());
                  sb.append(",left:").append(p.getLeft()).append("),");
                }
                appendLog(sb.toString());
              }
            });

            rhizosphereContainer.add(rhizosphere);
          }
        });
        
      }
    }.schedule(1);
  }

  private void appendLog(String log) {
    logArea.setValue(log + '\n' + logArea.getValue());
  }
  
  private void addModels() {
    // Defines the data to visualize.
    List<Employee> employees = new LinkedList<Employee>();
    employees.add(new Employee(
        "1", null, "John", 30, true, new String[] {"fishing", "soccer"}, 400000));
    employees.add(new Employee(
        "2", "1", "Mark", 20, true, new String[] {"fishing", "soccer"}, 10000));
    employees.add(new Employee(
        "3", "1", "Battlehorse", 31, true,
        new String[] {"computer games", "soccer"}, 25000));
    employees.add(new Employee(
        "4", "3", "Sara", 25, false, 
        new String[] {"role playing", "volleyball", "swimming"}, 100000));
    employees.add(new Employee(
        "5", "3", "Jennifer", 25, false,
        new String[] {"fishing", "role playing"}, 50000));
    employees.add(new Employee(
        "6", "2", "Dave", 48, true,
        new String[] {"role playing", "computer games", "swimming", "shopping"}, 75000));
    employees.add(new Employee(
        "7", "2", "Carl", 33, true, new String[] {"computer games", "swimming"}, 250000));
    employees.add(new Employee(
        "8", "6", "Aaron", 22, true, new String[] {}, 120000));
    employees.add(new Employee(
        "9", "6", "Lucy", 18, false, new String[] {"fishing", "swimming"}, 4000));
    employees.add(new Employee(
        "10", "7", "Jacob", 43, true, new String[] {"paintball", "soccer"}, 90000));
    
    // Add a set of models via the bulk addModels() method and register a
    // callback to get hold of some models' references.    
    rhizosphere.addModels(employees, new RhizosphereCallback1<List<RhizosphereModelRef>>() {

      @Override
      public void run(boolean success, String details, List<RhizosphereModelRef> refs) {
        if (success) {
          sara = refs.get(3);
          jennifer = refs.get(4);
        }
      }
    });
  }

  /**
   * Enable buttons for programmatic interaction with the visualization only
   * once the visualization is ready.
   */
  private void enableActionButtons() {
    resetFilters.setEnabled(true);
    salaryFilter.setEnabled(true);
    salaryGenderFilter.setEnabled(true);
    select.setEnabled(true);
    layout.setEnabled(true);
    layoutPositions.setEnabled(true);
    createError.setEnabled(true);
    clearErrors.setEnabled(true);
  }

  // All the following handlers demonstrate how to issue programmatic commands
  // to the Rhizosphere visualization for filtering, selection and layout operations.
  @UiHandler("resetFilters")
  void resetFilters(ClickEvent event) {
    rhizosphere.doResetFilters(logCallback);
  }

  @UiHandler("salaryFilter")
  void applySalaryFilter(ClickEvent event) {
    JSONObject salaryRange = new JSONObject();
    salaryRange.put("min", new JSONNumber(50000));
    salaryRange.put("max", new JSONNumber(250000));
    rhizosphere.doFilter("salary", salaryRange, logCallback);
  }

  @UiHandler("salaryGenderFilter")
  void applySalaryAgeFilter(ClickEvent event) {
    Map<String, JSONValue> filters = new HashMap<String, JSONValue>();
    JSONObject salaryRange = new JSONObject();
    salaryRange.put("min", new JSONNumber(50000));
    salaryRange.put("max", new JSONNumber(250000));
    filters.put("salary", salaryRange);

    JSONBoolean gender = JSONBoolean.getInstance(true);
    filters.put("male", gender);
    rhizosphere.doFilter(filters, logCallback);
  }

  @UiHandler("select")
  void selectSaraAndJennifer(ClickEvent event) {
    List<RhizosphereModelRef> selected = new ArrayList<RhizosphereModelRef>();
    selected.add(sara);
    selected.add(jennifer);
    rhizosphere.doSelection("select", selected, logCallback);
  }

  @UiHandler("layout")
  void applyRandomLayout(ClickEvent event) {
    rhizosphere.doLayout("scramble", null, null, logCallback);
  }

  @UiHandler("layoutPositions")
  void moveSara(ClickEvent event) {
    List<RhizosphereModelPosition> positions = new ArrayList<RhizosphereModelPosition>();
    positions.add(RhizosphereModelPosition.create(sara, 400, 300));
    rhizosphere.doLayout(null, null, positions, logCallback);
  }
  
  @UiHandler("createError")
  void addError(ClickEvent event) {
    rhizosphere.addError("Error message!", null);
  }
  
  @UiHandler("clearErrors")
  void removeAllErrors(ClickEvent event) {
    rhizosphere.clearErrors(null);
  }
}
