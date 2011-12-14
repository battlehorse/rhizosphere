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

package com.rhizospherejs.gwt.showcase.client.gviz;

import com.google.gwt.core.client.GWT;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.KeyPressEvent;
import com.google.gwt.i18n.client.DateTimeFormat;
import com.google.gwt.i18n.client.DateTimeFormat.PredefinedFormat;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.uibinder.client.UiHandler;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.user.client.ui.LazyPanel;
import com.google.gwt.user.client.ui.SimplePanel;
import com.google.gwt.user.client.ui.TextBox;
import com.google.gwt.user.client.ui.Widget;
import com.google.gwt.user.datepicker.client.DateBox;
import com.google.gwt.visualization.client.AbstractDataTable.ColumnType;
import com.google.gwt.visualization.client.DataTable;
import com.google.gwt.visualization.client.DataView;
import com.google.gwt.visualization.client.LegendPosition;
import com.google.gwt.visualization.client.VisualizationUtils;
import com.google.gwt.visualization.client.visualizations.ScatterChart;

import com.rhizospherejs.gwt.client.RhizosphereKind;
import com.rhizospherejs.gwt.client.RhizosphereLoader;
import com.rhizospherejs.gwt.client.RhizosphereMetaModel;
import com.rhizospherejs.gwt.client.RhizosphereModelRef;
import com.rhizospherejs.gwt.client.RhizosphereOptions;
import com.rhizospherejs.gwt.client.RhizosphereOptions.LogLevel;
import com.rhizospherejs.gwt.client.gviz.GVizRhizosphere;
import com.rhizospherejs.gwt.client.gviz.GVizRhizosphere.DataTableModel;
import com.rhizospherejs.gwt.client.gviz.GVizRhizosphere.GVizRenderer;
import com.rhizospherejs.gwt.client.renderer.RenderingOutput;

import java.util.Date;

/**
 * Tab that demonstrates Rhizosphere integration with the Google Visualization
 * API. This demo feeds both a Google Visualization chart and a Rhizosphere
 * visualization via a shared Google Visualization DataTable.
 * <p>
 * In this case Rhizosphere is accessed via the {@link GVizRhizosphere} class,
 * which automatically defines the visualization models and metamodel from the
 * undelying Google Visualization DataTable. A custom renderer is provided.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class GoogleVisualizationTab extends Composite implements DataTableChangeHandler {
  interface GoogleVisualizationTabUI extends UiBinder<Widget, GoogleVisualizationTab> {}
  private GoogleVisualizationTabUI ui = GWT.create(GoogleVisualizationTabUI.class);

  // Wraps the tab widget into a LazyPanel, so that its contents (including
  // Rhizosphere libraries) are loaded only when the tab is activated.
  private static class LazyTab extends LazyPanel {
    @Override
    protected Widget createWidget() {
      return new GoogleVisualizationTab();
    }
  }
  
  public static Widget get() {
    return new LazyTab();
  }

  @UiField
  TextBox nameInput;

  @UiField
  TextBox weightInput;

  @UiField
  TextBox heightInput;

  @UiField
  Button submitButton;

  @UiField
  DateBox dobInput;

  @UiField
  SimplePanel chartContainer;

  @UiField
  SimplePanel rhizosphereContainer;

  @UiField
  Label message;

  // Google Visualization scatter plot and associated options.
  private ScatterChart scatterChart;
  private ScatterChart.Options scatterChartOptions;

  // Rhizosphere visualization and associated options. Note that the
  // parameterized type for the options class must match the model type
  // dictated by a Rhizosphere visualizations that is built from Google
  // Visualization DataTables.
  private GVizRhizosphere rhizosphere;
  private RhizosphereOptions<GVizRhizosphere.DataTableModel> rhizosphereOptions;

  // The shared Google Visualization DataTable that powers both the scatterchart
  // and Rhizosphere.
  private DataTable dataTable;

  private GoogleVisualizationTab() {
    initWidget(ui.createAndBindUi(this));
    dobInput.setValue(new Date());
    dobInput.setFormat(
        new DateBox.DefaultFormat(DateTimeFormat.getFormat(PredefinedFormat.DATE_SHORT)));

    // Ensures that both the Google Visualization APIs and Rhizosphere libraries
    // are loaded.
    VisualizationUtils.loadVisualizationApi(new Runnable() {
      @Override
      public void run() {
        RhizosphereLoader loader = RhizosphereLoader.getInstance();
        loader.setTheme("blue");
        loader.ensureInjected(new Runnable() { 
          @Override
          public void run() {
            // Populate the DataTable with some sample data.
            initDataTable();

            // Setup configuration options for both Rhizosphere and the
            // scatterplot.
            initOptions();

            DataView view = DataView.create(dataTable);
            view.setColumns(new int[] {1, 2});
            scatterChart = new ScatterChart(view, scatterChartOptions);
            chartContainer.clear();
            chartContainer.add(scatterChart);

            rhizosphere = new GVizRhizosphere(dataTable, rhizosphereOptions);
            rhizosphere.setWidth("400px");
            rhizosphere.setHeight("400px");
            rhizosphereContainer.clear();
            rhizosphereContainer.add(rhizosphere);
          }
        });
      }
    }, "corechart");
  }

  // Handler triggered when the user requests to add a new datapoint to the
  // visualizations.
  @UiHandler("submitButton")
  void createNewPerson(ClickEvent event) {
    message.setText("");
    String name = nameInput.getValue();
    Date dob = dobInput.getValue();
    int weight, height;
    try {
      weight = Integer.parseInt(weightInput.getValue());
      height = Integer.parseInt(heightInput.getValue());
      
    } catch(NumberFormatException nfe) {
      weight = -1;
      height = -1;
    }
    if (name.length() == 0 || weight <= 0 || height <= 0 || dob == null) {
      message.setText("Please specify a valid name, weight, height and date of birth.");
    } else {

      // If the data is well-formed, add a new row to the DataTable and update
      // the visualizations.
      dataTable.addRow();
      int rowIndex = dataTable.getNumberOfRows()-1;
      dataTable.setValue(rowIndex, 0, name);
      dataTable.setValue(rowIndex, 1, weight);
      dataTable.setValue(rowIndex, 2, height);
      dataTable.setValue(rowIndex, 3, dob);
      dataChanged();      
    }
    nameInput.setValue("");
    heightInput.setValue("");
    weightInput.setValue("");
    dobInput.setValue(new Date());
    nameInput.setFocus(true);
  }

  // Ensures that only numeric values can be entered for weight and height.
  @UiHandler({"weightInput", "heightInput"})
  void keyPressedOnNumericField(KeyPressEvent event) {
    if (!Character.isDigit(event.getCharCode())) {
      ((TextBox) event.getSource()).cancelKey();
    }
  }

  // Update the visualizations after a change in the underlying DataTable.
  @Override
  public void dataChanged() {
    DataView view = DataView.create(dataTable);
    view.setColumns(new int[] {1, 2});
    scatterChart.draw(view, scatterChartOptions);
    rhizosphere.draw(dataTable, GVizRhizosphere.Options.wrap(rhizosphereOptions));
  }

  // Define the underlying DataTable.
  @SuppressWarnings("deprecation")
  private void initDataTable() {
    dataTable = DataTable.create();

    // Columns have explicit ids so that they can addressed by Rhizosphere code
    // (see metamodel definition below).
    dataTable.addColumn(ColumnType.STRING, "Name", "name");
    dataTable.addColumn(ColumnType.NUMBER, "Weight", "weight");
    dataTable.addColumn(ColumnType.NUMBER, "Height", "height");
    dataTable.addColumn(ColumnType.DATE, "Date Of Birth", "dob");
    dataTable.addRows(5);
    dataTable.setValue(0, 0, "Bob");
    dataTable.setValue(0, 1, 8);
    dataTable.setValue(0, 2, 65);
    dataTable.setValue(0, 3, new Date(109, 9, 16));

    dataTable.setValue(1, 0, "Alice");
    dataTable.setValue(1, 1, 4);
    dataTable.setValue(1, 2, 56);
    dataTable.setValue(1, 3, new Date(110, 11, 4));

    dataTable.setValue(2, 0, "Mary");
    dataTable.setValue(2, 1, 11);
    dataTable.setValue(2, 2, 72);
    dataTable.setValue(2, 3, new Date(109, 6, 21));
    
    dataTable.setValue(3, 0, "Victoria");
    dataTable.setValue(3, 1, 3);
    dataTable.setValue(3, 2, 51);
    dataTable.setValue(3, 3, new Date(110, 3, 28));
    
    dataTable.setValue(4, 0, "Robert");
    dataTable.setValue(4, 1, 6);
    dataTable.setValue(4, 2, 60);
    dataTable.setValue(4, 3, new Date(108, 2, 3));
  }

  private void initOptions() {
    // Scatterplot options
    scatterChartOptions = ScatterChart.Options.create();
    scatterChartOptions.setWidth(400);
    scatterChartOptions.setHeight(400);
    scatterChartOptions.setLegend(LegendPosition.NONE);
    scatterChartOptions.setTitleX("Weight (kg)");
    scatterChartOptions.setTitleY("Height (cm)");

    // Rhizosphere options.
    rhizosphereOptions = RhizosphereOptions.create();

    // Defines a custom renderer via configuration options.
    rhizosphereOptions.setRenderer(new PersonRenderer(this));
    rhizosphereOptions.setCacheDimensions(true);
    rhizosphereOptions.setEnableHTML5History(false);
    rhizosphereOptions.setEnableLoadingIndicator(false);
    rhizosphereOptions.setLogLevel(LogLevel.DEBUG);

    // Enhance the metamodel Rhizosphere automatically generates from the
    // DataTable. In particular, configure Rhizosphere to use a Date data type
    // and selector for the 'dob' column.
    RhizosphereMetaModel meta = RhizosphereMetaModel.create();
    meta.newAttribute("dob").
      setKind(RhizosphereKind.DATE).
      setLabel("Date of Birth");

    // Extend the automatically generated metamodel with the provided info.
    rhizosphereOptions.setMetaModelFragment(meta);
  }

  // A renderer to customize how each entry in the DataTable should be
  // visualized. Since we are dealing with Google Visualization data, the
  // renderer extends GVizRenderer.
  public static class PersonRenderer implements GVizRenderer {

    private DataTableChangeHandler changeHandler;

    public PersonRenderer(DataTableChangeHandler changeHandler) {
      this.changeHandler = changeHandler;
    }

    @Override
    public void render(
        DataTableModel model, RhizosphereModelRef ref, boolean expanded, RenderingOutput helper) {
      // Delegate rendering code to PersonWidget, to show that UiBinder templates
      // can be used within Rhizosphere too.
      helper.emitWidget(new PersonWidget(model, changeHandler));
    }
  }
}
