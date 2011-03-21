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

import com.google.gwt.core.client.JavaScriptObject;

import com.rhizospherejs.gwt.client.CustomRhizosphereMetaModel;
import com.rhizospherejs.gwt.client.CustomRhizosphereModel;
import com.rhizospherejs.gwt.client.RhizosphereKind;
import com.rhizospherejs.gwt.client.RhizosphereMetaModel;
import com.rhizospherejs.gwt.client.RhizosphereModel;
import com.rhizospherejs.gwt.client.RhizosphereModelAttribute;
import com.rhizospherejs.gwt.client.bridge.JsoBuilder;
import com.rhizospherejs.gwt.client.meta.AttributeDescriptor;
import com.rhizospherejs.gwt.client.meta.HasCategories;
import com.rhizospherejs.gwt.client.meta.HasKind;
import com.rhizospherejs.gwt.client.meta.HasKindFactory;
import com.rhizospherejs.gwt.client.meta.HasLink;
import com.rhizospherejs.gwt.client.meta.HasRange;

import java.util.HashSet;
import java.util.Set;

/**
 * A POJO representing an employee, annotated so that it can be used within a
 * Rhizosphere visualization.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class Employee implements
    RhizosphereModel, CustomRhizosphereModel, CustomRhizosphereMetaModel {

  public static final int MIN_AGE = 10;
  public static final int MAX_AGE = 50;

  private static String[] getAllHobbies() {
    Set<String> allHobbies = new HashSet<String>();
    allHobbies.add("fishing");
    allHobbies.add("soccer");
    allHobbies.add("computer games");
    allHobbies.add("role playing");
    allHobbies.add("volleyball");
    allHobbies.add("swimming");
    allHobbies.add("shopping");
    allHobbies.add("paintball");
    return allHobbies.toArray(new String[allHobbies.size()]);
  }

  private String employeeId;
  private String parentEmployeeId;
  private String name;
  private int age;
  private boolean male;
  private String[] hobbies;
  private double salary;

  /**
   * Creates a new employee.
   */
  public Employee(String employeeId,
                  String parentEmployeeId,
                  String name,
                  int age,
                  boolean male,
                  String[] hobbies,
                  double salary) {
    super();
    this.employeeId = employeeId;
    this.parentEmployeeId = parentEmployeeId;
    this.name = name;
    this.age = age;
    this.male = male;
    this.hobbies = hobbies;
    this.salary = salary;
  }

  // This attribute defines the unique id assigned to each employee and should
  // not be exported to Rhizosphere metamodel (i.e., it should not be possible
  // to use this attribute in Rhizosphere layout and filter operations).
  @RhizosphereModelAttribute(modelId=true, opaque=true)
  public String getEmployeeId() {
    return employeeId;
  }

  // Defines a custom descriptor for this attribute. 
  @RhizosphereModelAttribute(label="Parent", descriptor=ParentEmployeeDescriptor.class)
  public String getParentEmployeeId() {
    return parentEmployeeId;
  }

  // This descriptor specifies that the 'parentEmployeeId' attribute should be
  // used to extract child-to-parent relationships between employees.
  static class ParentEmployeeDescriptor implements AttributeDescriptor, HasLink {
    @Override public boolean isLink() { return true; }
    @Override public String linkKey() { return null; }
  }

  // The employee name. Since no parameters are passed to the
  // RhizosphereModelAttribute annotation, defaults are used to define how this
  // attribute will surface in Rhizosphere.
  @RhizosphereModelAttribute
  public String getName() {
    return name;
  }
  
  @RhizosphereModelAttribute(descriptor=AgeDescriptor.class)
  public int getAge() {
    return age;
  }

  // Declares that the 'age' attribute should be surfaced as a range-type
  // attribute ranging from MIN_AGE to MAX_AGE.
  static class AgeDescriptor implements AttributeDescriptor, HasRange, HasKind {
    @Override public RhizosphereKind kind() { return RhizosphereKind.RANGE; }
    @Override public double maxRange() { return MAX_AGE; }
    @Override public double minRange() { return MIN_AGE; }
    @Override public double stepping() { return 0; }
    @Override public double steps() { return 0; }
  }

  @RhizosphereModelAttribute
  public boolean isMale() {
    return male;
  }

  @RhizosphereModelAttribute(descriptor=HobbiesDescriptor.class)
  public String[] getHobbies() {
    return hobbies;
  }

  // Hobbies are a category kind that can have multiple values.
  static class HobbiesDescriptor implements AttributeDescriptor, HasKind, HasCategories {
    @Override public RhizosphereKind kind() { return RhizosphereKind.CATEGORY; }
    @Override public String[] categories() { return getAllHobbies(); }
    @Override public boolean multiple() { return true; }
    @Override public boolean hierarchy() { return false; }
  }

  @RhizosphereModelAttribute(descriptor=SalaryDescriptor.class)
  public double getSalary() {
    return salary;
  }

  // Salary should be surfaced as a range-type attribute that utilizes a
  // logarithmic scale.
  static class SalaryDescriptor implements AttributeDescriptor, HasKindFactory, HasRange {

    // A factory method is used to define the kind of this attribute, which
    // gives us the opportunity to customize how the logarithmic slider will
    // show up in the UI.
    @Override public final native JavaScriptObject kindFactory() /*-{
      return function() {
        var logMeta = new $wnd.rhizo.meta.LogarithmRangeKind(2, true);
        logMeta.toHumanLabel_ = $wnd.rhizo.ui.toHumanLabel;
        return logMeta;
      };
    }-*/;
    @Override public double maxRange() { return 500000; }
    @Override public double minRange() { return 0; }
    @Override public double stepping() { return 0; }
    @Override public double steps() { return 0; }
  }

  // This method shows how you can manually define additional model attributes
  // in case the annotation-based mechanism does not cover all your needs.
  @Override
  public void setCustomRhizosphereAttributes(JsoBuilder builder) {
    builder.setInteger("numberOfHobbies", hobbies.length);
  }

  // This method shows how you can describe manually defined model attributes.
  @Override
  public void setCustomRhizosphereMetaModelAttributes(RhizosphereMetaModel metaModel) {
    metaModel.newAttribute("numberOfHobbies").
      setKind(RhizosphereKind.RANGE).
      setLabel("Number of Hobbies").
      setRange(0, 10, 0, 0);
  }
}
