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

		/**
		 * Sets the renderer for the model elements of Rhizosphere. If no Renderer is set, the automatic 
		 * renderer will be used.
		 */
		public final native void setRenderer(Renderer renderer) /*-{
			this.renderer = {};
			this.renderer.render = function(pars) {
				return @com.google.rhizosphere.gviz.client.RhizoSphere.Options::onRender(Lcom/google/rhizosphere/gviz/client/RhizoSphere$Renderer;Lcom/google/gwt/core/client/JavaScriptObject;)
			    (renderer, pars);
			};
		}-*/;

		/**
		 * This static callback is needed to circumvent JSNI limitations: no instance fields in JSO
		 * objects, Java object passed to JS are opaque.
		 */
		public static String onRender(Renderer renderer, JavaScriptObject params) {
			Properties props = params.cast();
			String result = renderer.render(props);
			return result;
		}
	}

	/**
	 * A RhizoSphere renderer that takes a model object and returns an HTML string
	 * representing it in an appropriate way.
	 * <p>
	 * The Renderer will receive an object from RhizoSphere containing a property for each column of
	 * the datatable. The name of the property is the column identifier in the datatable, so it is
	 * crucial to set meaningful identifiers.
	 * <p>
	 * The Renderer will build an HTML representation of the model object and return it as a String
	 */
	public static abstract class Renderer {
		protected abstract String doRender(Properties properties);

		public String render(JavaScriptObject jso) {
			Properties props = jso.cast();
			return doRender(props);
		}
	}

	@Override
	protected native final JavaScriptObject createJso(Element div) /*-{
		return new $wnd.rhizo.gviz.Rhizosphere(div);
	}-*/;
}
