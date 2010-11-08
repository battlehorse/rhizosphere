package com.google.rhizosphere.gviz.samples.persons.client;

import com.google.gwt.ajaxloader.client.Properties;
import com.google.gwt.ajaxloader.client.Properties.TypeException;
import com.google.gwt.core.client.JavaScriptException;
import com.google.rhizosphere.gviz.client.RhizoSphere.Renderer;

/**
 * The custom renderer for the persons sample
 * 
 * @author dinoderek
 * 
 */
public class PersonsRenderer extends Renderer {

	protected String doRender(Properties properties) {
		try {
			return "<div class=\"rhizo-autorender\">" + "<div class=\"name\">"
			    + properties.getString("name") + "</div>" + "<div class=\"age\">"
			    + properties.getNumber("age") + "</div>" + "<div class=\"subdate\">"
			    + properties.getDate("subscriptionDate") + "</div>" + "</div>";
		} catch (JavaScriptException e) {
			throw new RuntimeException(e);
		} catch (TypeException e) {
			throw new RuntimeException(e);
		}
	}

}
