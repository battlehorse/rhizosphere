package com.google.rhizosphere.gviz.client;

import com.google.gwt.ajaxloader.client.Properties;
import com.google.gwt.core.client.JavaScriptObject;
import com.google.gwt.dom.client.Element;
import com.google.gwt.visualization.client.AbstractDrawOptions;
import com.google.gwt.visualization.client.visualizations.Visualization;

/**
 * RhizoSphere exposed as a standard Google Interactive Charts Widget
 * 
 * @author dinoderek@google.com
 */
public class RhizoSphere extends Visualization<RhizoSphere.Options> {
	/**
	 * RhizoSphere options
	 */
	public static class Options extends AbstractDrawOptions {

		public static Options create() {
			return JavaScriptObject.createObject().cast();
		}

		protected Options() {
			super();
		}
		// TODO add the renderer option
	}

	/**
	 * A RhizoSphere renderer. A RhizoSphere renderer takes a model object and returns an HTML string
	 * representing it in an appropriate way.
	 * <p>
	 * The Renderer will receive an object from RhizoSphere containing a property for each column of
	 * the datatable. The name of the property is the column identifier in the datatable, so it is
	 * crucial to set meaningful identifiers.
	 * <p>
	 * The Renderer will build an HTML representation of the model object and return it as a String
	 */
	public static interface Renderer {
		String render(Properties properties);
	}

	/**
	 * A simple wrapper around a Renderer that casts the JSO to a Properties and then delegates the
	 * actual rendering to the wrapped Renderer instance.
	 */
	private static class JsoRenderer {
		private final Renderer delegate;

		public JsoRenderer(Renderer delegate) {
			super();
			this.delegate = delegate;
		}

		public String render(JavaScriptObject jso) {
			Properties props = jso.cast();
			return delegate.render(props);
		}
	}

	@Override
	protected native final JavaScriptObject createJso(Element div) /*-{
		return new $wnd.rhizo.gviz.Rhizosphere(div);
	}-*/;
}
