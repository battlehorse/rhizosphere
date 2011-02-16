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

package com.rhizospherejs.gwt.rebind;

import com.google.gwt.core.ext.TreeLogger;
import com.google.gwt.core.ext.UnableToCompleteException;
import com.google.gwt.core.ext.typeinfo.JArrayType;
import com.google.gwt.core.ext.typeinfo.JClassType;
import com.google.gwt.core.ext.typeinfo.JMethod;
import com.google.gwt.core.ext.typeinfo.JPrimitiveType;
import com.google.gwt.core.ext.typeinfo.JType;
import com.google.gwt.core.ext.typeinfo.NotFoundException;
import com.google.gwt.core.ext.typeinfo.TypeOracle;

import com.rhizospherejs.gwt.client.CustomRhizosphereModel;
import com.rhizospherejs.gwt.client.RhizosphereModel;
import com.rhizospherejs.gwt.client.RhizosphereModelAttribute;

import java.util.LinkedList;
import java.util.List;

/**
 * Analyzes a POJO class implementing {@link RhizosphereModel} and identifies
 * all the attributes that must be ported and exposed into a Rhizosphere
 * visualization built from it.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class ModelInspector {

  /**
   * Annotation that identifies POJO attributes to port onto Rhizosphere models.
   */
  private static final Class<RhizosphereModelAttribute> ATTRIBUTE_ANNOTATION =
    RhizosphereModelAttribute.class;

  /**
   * Interface declaring that POJOs use custom attribute mapping in addition
   * to the automated annotation-based one.
   */
  public static final String CUSTOM_ATTRIBUTES_INTERFACE = CustomRhizosphereModel.class.getName();

  /**
   * Class type of the POJO tagged with {@link RhizosphereModel} interface.
   */
  private JClassType modelType;

  /**
   * Class type of {@link #CUSTOM_ATTRIBUTES_INTERFACE}.
   */
  private JClassType customAttributesInterfaceType;

  private TreeLogger logger;
  private BridgeCapabilities bridgeCapabilities;

  /**
   * List of POJO methods that are annotated with {@link #ATTRIBUTE_ANNOTATION}
   * and identify attributes that must be exposed in the generated Rhizosphere
   * model.
   */
  private List<MappableMethod> modelMethods;

  /**
   * Whether the POJO uses custom attribute mapping or not.
   */
  private boolean useCustomAttributes;

  /**
   * Accessor method that extracts an attribute from a POJO implementing
   * {@link RhizosphereModel} and that needs to be ported to the
   * Rhizosphere model.
   */
  public static class MappableMethod {

    /**
     * The POJO method that contains the attribute to port.
     */
    private JMethod method;

    /**
     * The name that the attribute will have on the Rhizosphere model (that is
     * the name of the javascript field it will be assigned to), as specified
     * by {@link RhizosphereModelAttribute#name()}.
     */
    private String attributeName;

    /**
     * The user-visible label the attribute will have in Rhizosphere, as
     * specified by {@link RhizosphereModelAttribute#label()}.
     */
    private String attributeLabel;

    /**
     * The attribute descriptor associated to the attribute to port.
     */
    private String attributeDescriptorClassName;

    /**
     * Creates a new mappable method.
     * @param method A method of the POJO implementing {@link RhizosphereModel}.
     */
    public MappableMethod(JMethod method) {
      this.method = method;
      extractAttributeName();
      extractAttributeLabel();
      extractAttributeDescriptorClassName();
    }

    private void extractAttributeName() {
      String explicitName = method.getAnnotation(ATTRIBUTE_ANNOTATION).name();
      if (explicitName.length() > 0) {
        attributeName = explicitName;
        return;
      }
      String methodName = method.getName();
      if (methodName.startsWith("is") && methodName.length() > 3) {
        attributeName = Character.toLowerCase(methodName.charAt(2)) + methodName.substring(3);
      } else if (methodName.startsWith("get") && methodName.length() > 4) {
        attributeName = Character.toLowerCase(methodName.charAt(3)) + methodName.substring(4);
      } else {
        attributeName = methodName;
      }
    }

    private void extractAttributeLabel() {
      String label = method.getAnnotation(ATTRIBUTE_ANNOTATION).label();
      if (label.length() > 0) {
        attributeLabel = label;
      }
    }

    private void extractAttributeDescriptorClassName() {
      attributeDescriptorClassName =
        method.getAnnotation(ATTRIBUTE_ANNOTATION).descriptor().getCanonicalName();
    }

    /**
     * Returns the method name.
     */
    public String getName() {
      return method.getName();
    }

    /**
     * Returns the Java type of the attribute extract by this method.
     */
    public JType getReturnType() {
      return method.getReturnType();
    }

    /**
     * Returns the name that the attribute extracted by this method will have
     * on the Rhizosphere model.
     */
    public String getAttributeName() {
      return attributeName;
    }

    /**
     * Returns the user-visible label that the attribute extracted by this
     * method will have on the Rhizosphere model.
     */
    public String getAttributeLabel() {
      return attributeLabel;
    }

    /**
     * Returns the attribute descriptor of the attribute extract by this method.
     */
    public String getAttributeDescriptorClassName() {
      return attributeDescriptorClassName;
    }

    /**
     * Defines whether the attribute extracted by this method should contribute
     * to the generated Rhizosphere metamodel or should be available on the
     * model only. See {@link RhizosphereModelAttribute#opaque()}.
     */
    public boolean contributesToMetaModel() {
      return !method.getAnnotation(ATTRIBUTE_ANNOTATION).opaque();
    }

    /**
     * Defines whether the attribute extracted by this method is the unique
     * model identifier of the generated Rhizosphere model, as defined by
     * {@link RhizosphereModelAttribute#modelId()}.
     */
    public boolean isModelIdGenerator() {
      return method.getAnnotation(ATTRIBUTE_ANNOTATION).modelId();
    }
  }

  ModelInspector(TreeLogger logger,
                 TypeOracle oracle, 
                 JClassType modelType, 
                 BridgeCapabilities bridgeCapabilities) throws UnableToCompleteException {
    this.logger = logger;
    this.bridgeCapabilities = bridgeCapabilities;
    this.modelType = modelType;
    try {
      customAttributesInterfaceType = oracle.getType(CUSTOM_ATTRIBUTES_INTERFACE);
    } catch (NotFoundException e) {
      logger.log(TreeLogger.ERROR,
          "Unable to resolve custom attributes interface: " + CUSTOM_ATTRIBUTES_INTERFACE);
      throw new UnableToCompleteException();
    }
    modelMethods = new LinkedList<MappableMethod>();
  }

  /**
   * Analyzes a POJO implementing {@link RhizosphereModel} and identifies all
   * the attributes that need to be exposed in Rhizosphere, along with their
   * associated metadata.
   *
   * @return this object.
   * @throws UnableToCompleteException
   */
  public ModelInspector configure() throws UnableToCompleteException {
    logger.log(TreeLogger.TRACE,
        "Parsing model class " +
        modelType.getQualifiedSourceName() +
        " to identify exportable attributes.");

    JMethod[] methods = modelType.getInheritableMethods();
    for (JMethod method : methods) {
      if (isValidMethodSignature(method)) {
        verifyValidReturnType(method);
        logger.log(TreeLogger.DEBUG,
            "Found valid attribute for Rhizosphere model generation: " + method.getName());
        modelMethods.add(new MappableMethod(method));
      }
    }

    useCustomAttributes = modelType.isAssignableTo(customAttributesInterfaceType);

    if (modelMethods.isEmpty() && !useCustomAttributes) {
      logger.log(TreeLogger.ERROR, 
          "Cannot extract a Rhizosphere model from " + modelType.getQualifiedSourceName() +
          ". No suitable annotated methods found, and model is not using explicit mapping.");
      throw new UnableToCompleteException();
    }
    return this;
  }

  /**
   * Verifies that a POJO method has the correct signature to extract an
   * attribute from it (loosely matching the requirements of a traditional
   * getter method).
   *
   * @param method The method to inspect.
   * @return true whether the method has the correct signature.
   */
  private boolean isValidMethodSignature(JMethod method) {
    return method.isAnnotationPresent(ATTRIBUTE_ANNOTATION) &&
        method.isPublic() &&
        !method.isStatic() &&
        method.getParameters().length == 0;
  }

  /**
   * Verifies that the return type of a POJO method matches a Java type that
   * can be ported onto an equivalent Rhizosphere type.
   *
   * @param method the method to inspect.
   * @throws UnableToCompleteException if the return type cannot be converted
   *     into an equivalent Rhizosphere type.
   */
  private void verifyValidReturnType(JMethod method) throws UnableToCompleteException {
    JType returnType = method.getReturnType();
    JPrimitiveType primitiveReturnType = returnType.isPrimitive();
    if (primitiveReturnType != null) {
      verifySupportedPrimitiveReturnType(method, primitiveReturnType);
    }
    JArrayType arrayType = returnType.isArray();
    if (arrayType != null) {
      JType componentType = arrayType.getComponentType();
      if (componentType.isPrimitive() != null) {
        verifySupportedPrimitiveReturnType(method, componentType.isPrimitive());
      }
    }
  }

  private void verifySupportedPrimitiveReturnType(JMethod method, JPrimitiveType type)
      throws UnableToCompleteException {
    if (!bridgeCapabilities.getMappablePrimitiveTypes().contains(type)) {
      logger.log(TreeLogger.ERROR,
          "Method " + modelType.getQualifiedSourceName() + "::" + method.getName() +
          " returns an usupported primitive: " + type.getQualifiedSourceName());
      throw new UnableToCompleteException();
    }
  }

  /**
   * Returns the list of methods from the inspected POJO identifying an
   * attribute that should be ported onto the Rhizosphere model.
   */
  public List<MappableMethod> getMappableModelMethods() {
    return modelMethods;
  }

  /**
   * Returns whether the inspected POJO performs custom attribute mapping in
   * addition to the automated annotation-based one or not.
   */
  public boolean modelUsesCustomAttributes() {
    return useCustomAttributes;
  }

  /**
   * Returns the method whose extracted attributes identify unique Rhizosphere
   * model ids, if any, or returns {@code null} otherwise.
   */
  public MappableMethod getModelIdGeneratorMethod() {
    for (MappableMethod method: modelMethods) {
      if (method.isModelIdGenerator()) {
        return method;
      }
    }
    return null;
  }
}
