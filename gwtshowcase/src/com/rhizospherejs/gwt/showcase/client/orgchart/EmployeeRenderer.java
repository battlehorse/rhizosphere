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

package com.rhizospherejs.gwt.showcase.client.orgchart;

import com.rhizospherejs.gwt.client.RhizosphereModelRef;
import com.rhizospherejs.gwt.client.RhizosphereRenderer;
import com.rhizospherejs.gwt.client.renderer.HasExpandable;
import com.rhizospherejs.gwt.client.renderer.RenderingHints;
import com.rhizospherejs.gwt.client.renderer.RenderingOutput;

/**
 * A simple Rhizosphere renderer for Employee instances. It emits renderings
 * as raw Strings containing HTML code. Have a look at other renderers
 * defined in this sample application for more sophisticated alternatives,
 * like using GWT widgets and UiBinder templates.
 * <p>
 * The renderer uses the {@link HasExpandable} interface to declare that
 * renderings support a 'maximized' state.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class EmployeeRenderer implements RhizosphereRenderer<Employee>, HasExpandable {

  @Override
  public void render(
      Employee model, RhizosphereModelRef ref, boolean expanded, RenderingOutput helper) {
    if (expanded) {
      helper.emitHTML("<div class='rhizo-sample-expanded'>" +
          "<p><b><span style='color:" +
          (model.isMale() ? "blue" : "pink") + "'>"+
          model.getName() + "</span></b></p>" +
          "<p><span class='dim'>Age:</span>" + model.getAge() + "</p>" +
          "<p style='white-space: nowrap'>" +
          "<span class='dim'>Hobbies:</span><br />" +
          getHobbies(model) + "</p>" +
          "</div>");
    } else {
      helper.emitHTML("<div class='rhizo-sample'>" +
        "<p><b><span style='color:" +
        (model.isMale() ? "blue" : "pink") + "'>"+
        model.getName() + "</span></b></p>" +
        "</div>");
    }
  }

  public String getHobbies(Employee model) {
    if (model.getHobbies().length == 0) {
      return "Nothing";
    } else {
      String hobbies = "";
      for (int i = 0; i < model.getHobbies().length-1; i++) {
        hobbies += model.getHobbies()[i] + ", ";
      }
      hobbies += model.getHobbies()[model.getHobbies().length-1];
      return hobbies;
    }
  }

  @Override
  public boolean expandable(RenderingHints hints) {
    return true;
  }
}
