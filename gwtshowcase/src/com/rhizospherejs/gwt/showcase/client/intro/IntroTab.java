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

package com.rhizospherejs.gwt.showcase.client.intro;

import com.google.gwt.core.client.GWT;
import com.google.gwt.dom.client.DivElement;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.user.client.ui.Widget;

/**
 * Intro tab. Contains only welcome text and links to the Rhizosphere
 * documentation.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class IntroTab extends Widget {
  interface IntroTabUI extends UiBinder<DivElement, IntroTab> {}
  private static IntroTabUI ui = GWT.create(IntroTabUI.class);
  
  public IntroTab() {
    setElement(ui.createAndBindUi(this));
  }

}
