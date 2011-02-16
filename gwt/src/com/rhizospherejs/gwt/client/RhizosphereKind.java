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

import com.google.gwt.core.client.JavaScriptObject;

/**
 * Enumeration of the datatypes ('kinds' in Rhizosphere terminology) that can
 * be assigned to Rhizosphere model attributes.
 * <p>
 * A Rhizosphere kind defines both the data type of a model attribute (e.g.
 * boolean, number, string ...) and the interaction type that it exposes to the
 * user.
 * <p>
 * For example, associating a {@code RANGE} kind to a model attribute declares
 * that the attribute is numeric and that the preferred user representation is
 * in the form of a range of values (so, for example, filter controls might
 * be rendered as range sliders and layout operations can use clustering
 * logic to visualize groups of models).
 *
 * @see <a target="_blank" href="http://www.rhizospherejs.com/doc/contrib_tables.html">
 *     Rhizosphere reference tables</a>
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public enum RhizosphereKind {

  BOOLEAN {
    @Override
    public native JavaScriptObject getNativeKind() /*-{
      return $wnd.rhizo.meta.Kind.BOOLEAN;
    }-*/;
  },
  STRING {
    @Override
    public native JavaScriptObject getNativeKind() /*-{
      return $wnd.rhizo.meta.Kind.STRING;
    }-*/;
  },
  NUMBER {
    @Override
    public native JavaScriptObject getNativeKind() /*-{
      return $wnd.rhizo.meta.Kind.NUMBER;
    }-*/;
  },
  DATE {
    @Override
    public native JavaScriptObject getNativeKind() /*-{
      return $wnd.rhizo.meta.Kind.DATE;
    }-*/;
  },
  RANGE {
    @Override
    public native JavaScriptObject getNativeKind() /*-{
      return $wnd.rhizo.meta.Kind.RANGE;
    }-*/;
  },
  CATEGORY {
    @Override
    public native JavaScriptObject getNativeKind() /*-{
      return $wnd.rhizo.meta.Kind.CATEGORY;
    }-*/;
  },
  DECIMAL {
    @Override
    public native JavaScriptObject getNativeKind() /*-{
      return $wnd.rhizo.meta.Kind.DECIMAL;
    }-*/;
  },
  DECIMALRANGE {
    @Override
    public native JavaScriptObject getNativeKind() /*-{
      return $wnd.rhizo.meta.Kind.DECIMALRANGE;
    }-*/;
  },
  LOGARITHMRANGE {
    @Override
    public native JavaScriptObject getNativeKind() /*-{
      return $wnd.rhizo.meta.Kind.LOGARITHMRANGE;
    }-*/;
  },
  STRINGARRAY {  // experimental.
    @Override
    public native JavaScriptObject getNativeKind() /*-{
      return $wnd.rhizo.meta.Kind.STRINGARRAY;
    }-*/;
  };

  public abstract JavaScriptObject getNativeKind();

}
