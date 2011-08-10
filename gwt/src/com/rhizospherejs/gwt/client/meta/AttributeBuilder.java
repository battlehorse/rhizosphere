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

import com.rhizospherejs.gwt.client.RhizosphereKind;
import com.rhizospherejs.gwt.client.RhizosphereMetaModel.Attribute;

/**
 * Exposes methods to fill
 * {@link com.rhizospherejs.gwt.client.RhizosphereMetaModel.Attribute} instances
 * from {@link AttributeDescriptor} specifications. The {@link MetaModelFactory}
 * uses it to assemble {@link com.rhizospherejs.gwt.client.RhizosphereMetaModel}
 * from annotated POJOs.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class AttributeBuilder {

  /**
   * Sets a metamodel attribute given its descriptor.
   *
   * @param target The attribute to set.
   * @param descriptor The attribute descriptor.
   * @param attrName The attribute name, that is, the javascript variable name
   *     that the attribute will be assigned to in the metamodel.
   * @param attrLabel The user-visible attribute label. Ignored if the
   *     descriptor implements the {@link HasLabel} interface. If {@code null}
   *     the label will be generated from the attribute name.
   * @param kind The attribute kind. Ignored if the descriptor implements either
   *     the {@link HasKind} or {@link HasKindFactory} interfaces.
   */
  public void fillAttribute(Attribute target,
                            AttributeDescriptor descriptor,
                            String attrName,
                            String attrLabel,
                            RhizosphereKind kind) {
    setKind(target, descriptor, kind);
    setLabel(target, descriptor, attrName, attrLabel);
    setStandardParameters(target, descriptor);
    setCustomParameters(target, descriptor);
  }

  /**
   * Sets the attribute kind.
   */
  protected void setKind(Attribute target, AttributeDescriptor descriptor, RhizosphereKind kind) {
    if (descriptor instanceof HasKind) {
      target.setKind(((HasKind) descriptor).kind());
    } else if (descriptor instanceof HasKindFactory) {
      target.setKindFromFactory(
        ((HasKindFactory) descriptor).kindFactory(),
        ((HasKindFactory) descriptor).kindUiFactory());
    } else {
      target.setKind(kind);
    }
  }

  /**
   * Sets the attribute label.
   */
  protected void setLabel(
      Attribute target, AttributeDescriptor descriptor, String attrName, String attrLabel) {
    String label;
    if (descriptor instanceof HasLabel) {
      label = ((HasLabel) descriptor).label();
    } else if (attrLabel != null) {
      label = attrLabel;
    } else {
      assert attrName != null;
      label = Character.toUpperCase(attrName.charAt(0)) + attrName.substring(1);
    }
    target.setLabel(label);
  }

  /**
   * Sets all the remaining known parameters an attribute might have.
   */
  protected void setStandardParameters(Attribute target, AttributeDescriptor descriptor) {
    if (descriptor instanceof HasCategories) {
      target.setCategories(
          ((HasCategories) descriptor).categories(),
          ((HasCategories) descriptor).multiple(),
          ((HasCategories) descriptor).hierarchy());
    }

    if (descriptor instanceof HasLink) {
      target.setLink(((HasLink) descriptor).isLink(),
                     ((HasLink) descriptor).linkKey());
    }

    if (descriptor instanceof HasRange) {
      target.setRange(((HasRange) descriptor).minRange(), 
                      ((HasRange) descriptor).maxRange(),
                      ((HasRange) descriptor).stepping(),
                      ((HasRange) descriptor).steps());
    }
    
    if (descriptor instanceof HasPrecision) {
      target.setPrecision(
        ((HasPrecision) descriptor).precision());
    }

    if (descriptor instanceof HasYearRange) {
      target.setYearRange(
          ((HasYearRange) descriptor).minYear(),
          ((HasYearRange) descriptor).maxYear());
    }
    
    if (descriptor instanceof HasDateClusterBy) {
      target.setDateClusterBy(
          ((HasDateClusterBy) descriptor).clusterBy());
    }
  }

  /**
   * Sets any additional attribute custom parameters.
   */
  protected void setCustomParameters(Attribute target, AttributeDescriptor descriptor) {
    if (descriptor instanceof HasCustomParameters) {
      ((HasCustomParameters) descriptor).setCustomParameters(target);
    }
  }
}
