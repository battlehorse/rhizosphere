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
import com.google.gwt.dom.client.SpanElement;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.i18n.client.DateTimeFormat;
import com.google.gwt.i18n.client.DateTimeFormat.PredefinedFormat;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.uibinder.client.UiHandler;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.Widget;
import com.google.gwt.visualization.client.DataTable;

import com.rhizospherejs.gwt.client.gviz.GVizRhizosphere.DataTableModel;

import java.util.Date;

/**
 * A widget defined via UiBinder templates to illustrate that UiBinder templates
 * can be used to defined Rhizosphere renderings too.
 * <p>
 * Also illustrates how to retain a reference to the hosting widget so
 * that events can be propagated back to it.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class PersonWidget extends Composite {
  interface PersonUI extends UiBinder<Widget, PersonWidget> {}
  private PersonUI ui = GWT.create(PersonUI.class);

  @UiField
  SpanElement name;

  @UiField
  SpanElement height;

  @UiField
  SpanElement weight;

  @UiField
  SpanElement dob;

  @UiField
  Button deleteButton;

  // Describes the datapoint (out of the Google Visualization DataTable that
  // powers the entire Rhizosphere visualization) that this widget should
  // visualize.
  private DataTableModel model;

  // A reference to the Rhizosphere visualization to propagate events back to
  // it.
  private DataTableChangeHandler changeHandler;

  public PersonWidget(DataTableModel model, DataTableChangeHandler changeHandler) {
    this.model = model;
    this.changeHandler = changeHandler;    
    initWidget(ui.createAndBindUi(this));

    String name = model.getDataTable().getValueString(model.getRow(), 0);
    this.name.setInnerText(name);

    int weight = model.getDataTable().getValueInt(model.getRow(), 1);
    this.weight.setInnerText(String.valueOf(weight));

    int height = model.getDataTable().getValueInt(model.getRow(), 2);
    this.height.setInnerText(String.valueOf(height));

    Date dob = model.getDataTable().getValueDate(model.getRow(), 3);
    this.dob.setInnerText(DateTimeFormat.getFormat(PredefinedFormat.DATE_SHORT).format(dob));
  }

  // When a user requests to delete the datapoint this widget represents, hand
  // the event back to the containing widget so that the entire tab can be
  // updated to reflect the change.
  @UiHandler("deleteButton")
  void handleDelete(ClickEvent event) {
    ((DataTable) model.getDataTable()).removeRow(model.getRow());
    changeHandler.dataChanged();
  }

}
