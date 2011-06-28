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

package com.rhizospherejs.gwt.showcase.client;

import com.google.gwt.core.client.EntryPoint;
import com.google.gwt.dom.client.Style.Unit;
import com.google.gwt.event.logical.shared.SelectionEvent;
import com.google.gwt.event.logical.shared.SelectionHandler;
import com.google.gwt.event.logical.shared.ValueChangeEvent;
import com.google.gwt.event.logical.shared.ValueChangeHandler;
import com.google.gwt.user.client.History;
import com.google.gwt.user.client.ui.DockLayoutPanel;
import com.google.gwt.user.client.ui.RootLayoutPanel;
import com.google.gwt.user.client.ui.TabLayoutPanel;

import com.rhizospherejs.gwt.showcase.client.books.BooksTab;
import com.rhizospherejs.gwt.showcase.client.gviz.GoogleVisualizationTab;
import com.rhizospherejs.gwt.showcase.client.intro.IntroTab;
import com.rhizospherejs.gwt.showcase.client.orgchart.OrgChartTab;
import com.rhizospherejs.gwt.showcase.client.resources.Resources;

/**
 * Demo application entry point.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class ShowcaseEntryPoint implements EntryPoint {

  @Override
  public void onModuleLoad() {
    // Injects styles shared by all tabs.
    Resources.INSTANCE.tabsCss().ensureInjected();

    // Create the main tab layout.
    final TabLayoutPanel tabs = new TabLayoutPanel(2, Unit.EM);
    tabs.setStyleName(Resources.INSTANCE.tabsCss().rhizosphereTabs(), true);
    tabs.add(new IntroTab(), "Introduction");
    tabs.add(OrgChartTab.get(), "Org Chart demo");
    tabs.add(BooksTab.get(), "Google Books demo");
    tabs.add(GoogleVisualizationTab.get(), "Google Visualization API demo");

    DockLayoutPanel dock = new DockLayoutPanel(Unit.EM);
    dock.addNorth(new HeaderBar(), 5);
    dock.add(tabs);

    // History management.
    tabs.addSelectionHandler(new SelectionHandler<Integer>(){
      @Override
      public void onSelection(SelectionEvent<Integer> event) {
        String tabid = "";
        switch (event.getSelectedItem()) {
          case 0:
            tabid = "intro";
            break;
          case 1:
            tabid = "orgchart";
            break;
          case 2:
            tabid = "books";
            break;
          case 3:
            tabid = "gviz";
            break;
          default:
        }
        if (tabid.length() > 0) {
          History.newItem(tabid);
        }
      }});

    History.addValueChangeHandler(new ValueChangeHandler<String>() {
      @Override
      public void onValueChange(ValueChangeEvent<String> event) {
        String historyToken = event.getValue();
        tabs.selectTab(tabNumberFromToken(historyToken));
      }
    });
    
    tabs.selectTab(tabNumberFromToken(History.getToken()));
    RootLayoutPanel.get().add(dock);
  }
  
  private int tabNumberFromToken(String historyToken) {
    if (historyToken.equals("intro") || historyToken.length() == 0) {
      return 0;
    } else if (historyToken.equals("orgchart")) {
      return 1;
    } else if (historyToken.equals("books")) {
      return 2;
    } else if (historyToken.equals("gviz")) {
      return 3;
    }
    return 0;  // unrecognized token
  }

}
