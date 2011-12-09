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
 * An opaque representation of the visual element that depicts a model in
 * the Rhizosphere user interface, that is, one of the 'cards' shown in the
 * UI. Makes several attributes pertaining to the visual representation of a
 * Rhizosphere model available for inspection.
 * <p>
 * The contents of the rendering are filled by {@link RhizosphereRenderer} when
 * new models are added to Rhizosphere, although they are not directly
 * accessible from this class. This class currently exposes a limited subset
 * of the information available in the {@code rhizo.ui.Rendering} javascript
 * counterpart.
 * 
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class RhizosphereRendering extends JavaScriptObject {
  protected RhizosphereRendering() {}
  
  /**
   * Describes position information of a Rhizosphere rendering. In particular,
   * it indicates the position of the rendering top-left corner, with respect
   * to the visualization universe top-left corner, in pixels.
   */
  public static final class Position extends JavaScriptObject {
    protected Position() {}
    
    public final native int top() /*-{
      return this.top;
    }-*/;
      
    public final native int left() /*-{
      return this.left;
    }-*/;
  }
  
  /**
   * Describes dimension information of a Rhizosphere rendering, in pixels.
   */
  public static final class Dimensions extends JavaScriptObject {
    protected Dimensions() {}
    
    public final native int width() /*-{
      return this.width;
    }-*/;
    
    public final native int height() /*-{
      return this.height;
    }-*/;
  }

  /**
   * Returns the rendering position with respect to the Rhizosphere
   * visualization universe.
   *
   * @return The position of top-left corner of the rendering, with respect to
   *     the visualization universe top-left corner.
   */
  public final native Position getPosition() /*-{
    return this.position(); 
  }-*/;
  
  /**
   * Returns the rendering dimensions.
   *
   * @return The dimensions of this model rendering. The returned object width
   *      and height map to the outer dimensions (incl. border and such) of the
   *      rendering. The returned values are cached depending on 
   *      {@link RhizosphereOptions#setCacheDimensions(boolean)}.
   */
  public final native Dimensions getDimensions() /*-{
    return this.getDimensions();
  }-*/;
}
