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

package com.rhizospherejs.gwt.client.meta;


/**
 * Marker interface to identify classes that can describe Rhizosphere model
 * attributes (see
 * {@link com.rhizospherejs.gwt.client.RhizosphereModelAttribute}).
 * Classes implementing this interface should also implement one or more of the
 * other {@code HasXX} interfaces defined in the
 * {@link com.rhizospherejs.gwt.client.meta}  package, for each specific
 * characteristic of the attribute they describe.
 * <p>
 * An example attribute descriptor:
 * <pre><code>
 * public class GroceryObject implements RhizosphereModel {
 *   private String name;
 *   private int amount;
 *
 *   &#064;RhizosphereModelAttribute(descriptor = AmountMetaData.class)
 *     public int getAmount() {
 *       return amount;
 *     }
 *
 *   public static class AmountMetaData implements
 *       AttributeDescriptor, HasKind, HasLabel, HasRange {
 *
 *     &#064;Override
 *     public RhizosphereKind kind() {
 *       return RhizosphereKind.RANGE;
 *     }
 *
 *     &#064;Override
 *     public String label() {
 *       return "The Amount";
 *     }
 *
 *     &#064;Override
 *     public double maxRange() {
 *       return 100;
 *     }
 *
 *     &#064;Override
 *     public double minRange() {
 *       return 50;
 *     }
 *
 *     &#064;Override
 *     public double stepping() {
 *       return 0;
 *     }
 *
 *     &#064;Override
 *     public double steps() {
 *       return 5;
 *     }
 *   }
 * }
 * </code></pre>
 * <p>
 * The above example declares that the {@code amount} field of the sample model
 * is of type {@link com.rhizospherejs.gwt.client.RhizosphereKind#RANGE}, has
 * a given label and its values can extend within the specified range.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public interface AttributeDescriptor {

  public static class EMPTY_DESCRIPTOR implements AttributeDescriptor {}

}
