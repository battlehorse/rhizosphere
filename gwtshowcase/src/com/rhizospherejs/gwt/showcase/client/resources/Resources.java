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

package com.rhizospherejs.gwt.showcase.client.resources;

import com.google.gwt.core.client.GWT;
import com.google.gwt.resources.client.ClientBundle;
import com.google.gwt.resources.client.DataResource;
import com.google.gwt.resources.client.ImageResource;
import com.google.gwt.resources.client.ImageResource.ImageOptions;
import com.google.gwt.resources.client.ImageResource.RepeatStyle;

/**
 * Application resources.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public interface Resources extends ClientBundle {
  public static Resources INSTANCE = GWT.create(Resources.class);

  /**
   * Icon representing a person.
   */
  @Source("com/rhizospherejs/gwt/showcase/resources/person.jpg")
  @ImageOptions(height=24, width=24)
  ImageResource person();

  /**
   * Icon representing a loading spinner.
   */
  @Source("com/rhizospherejs/gwt/showcase/resources/loading_icon.gif")
  @ImageOptions(height=23, width=23)
  ImageResource loadingIcon();

  /**
   * Repeatable pattern for a drag handler.
   */
  @Source("com/rhizospherejs/gwt/showcase/resources/grippy.png")
  @ImageOptions(repeatStyle=RepeatStyle.Both)
  ImageResource grippy();

  /**
   * Styles for the Books example.
   */
  @Source("com/rhizospherejs/gwt/showcase/resources/book.css")
  public BooksCss booksCss();

  /**
   * Styles shared by the entire application.
   */
  @Source("com/rhizospherejs/gwt/showcase/resources/tabs.css")
  public TabsCss tabsCss();

  @Source("com/rhizospherejs/gwt/showcase/resources/books_texture.jpg")
  DataResource bookBackgroundTexture();
}
