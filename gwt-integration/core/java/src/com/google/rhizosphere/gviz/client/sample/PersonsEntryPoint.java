package com.google.rhizosphere.gviz.client.sample;

import java.util.Date;

import com.google.gwt.core.client.EntryPoint;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.RootPanel;
import com.google.gwt.visualization.client.AbstractDataTable.ColumnType;
import com.google.gwt.visualization.client.DataTable;
import com.google.rhizosphere.gviz.client.RhizoSphere;

public class PersonsEntryPoint implements EntryPoint {
	public void onModuleLoad() {
		final DataTable table = DataTable.create();
		table.addColumn(ColumnType.STRING, "Name", "name");
		table.addColumn(ColumnType.NUMBER, "Age", "age");
		table.addColumn(ColumnType.DATE, "Subscription start", "subscriptionDate");
		for (int i = 0; i<100; i++) {
			int ri = table.addRow();
			table.setValue(ri, 0, "Name " + i);
			table.setValue(ri, 1, 100 - i);
			table.setValue(ri, 2, new Date());
		}
		final Button rhizoButton = new Button("Rhizosphere!");
		RootPanel.get("rhizoButtonContainer").add(rhizoButton);
		final RhizoSphere rhizo = new RhizoSphere();
		RootPanel.get("rhizoContainer").add(rhizo);
		rhizoButton.addClickHandler(new ClickHandler() {
			public void onClick(ClickEvent event) {
				RhizoSphere.Options options = RhizoSphere.Options.create();		
				rhizo.draw(table, options);
			}
		});
	}
}
