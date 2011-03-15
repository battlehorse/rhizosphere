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
import com.google.gwt.core.ext.typeinfo.JClassType;
import com.google.gwt.core.ext.typeinfo.JMethod;
import com.google.gwt.core.ext.typeinfo.JPrimitiveType;
import com.google.gwt.core.ext.typeinfo.JType;
import com.google.gwt.core.ext.typeinfo.NotFoundException;
import com.google.gwt.core.ext.typeinfo.TypeOracle;

import com.rhizospherejs.gwt.client.RhizosphereKind;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Enumerates the supported mapping capabilities between Java types and
 * equivalent Rhizosphere types for the purpose of converting POJOs into custom
 * tailored JavaScriptObjects usable as Rhizosphere models.
 * <p>
 * {@link #JSO_BUILDER_CLASS} enumerates methods to assemble a Rhizosphere model
 * from Java values and types. This class analyzes {@link #JSO_BUILDER_CLASS}
 * and builds a mapping between a Java type and an associated method that
 * can port values of that type onto a Rhizosphere model.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class BridgeCapabilities {

  /**
   * Annotation that describes the mapping between a Java type and
   * the equivalent {@link com.rhizospherejs.gwt.client.RhizosphereKind}.
   */
  private static final Class<BridgeType> BRIDGE_TYPE_ANNOTATION = BridgeType.class;

  /**
   * Name of the class that is capable on setting Java values onto
   * Rhizosphere-compatible JavaScript objects (basically a Java-to-JavaScript
   * bridge that adheres to Rhizosphere conventions).
   */
  public static final String JSO_BUILDER_CLASS = "com.rhizospherejs.gwt.client.bridge.JsoBuilder";

  /**
   * Name of the class that is capable of assembling a Rhizosphere metamodel
   * from an annotated Java POJO.
   */
  public static final String METAMODEL_ATTRIBUTE_BUILDER_CLASS =
      "com.rhizospherejs.gwt.client.meta.AttributeBuilder";

  /**
   * A method of {@link BridgeCapabilities#JSO_BUILDER_CLASS} that can port
   * a specific Java type onto a Rhizosphere model object.
   */
  public static class BridgeMethod {
    private JMethod method;
    private RhizosphereKind rhizosphereKind;

    /**
     * Creates a new bridge method.
     * @param method A {@link BridgeCapabilities#JSO_BUILDER_CLASS} method.
     */
    public BridgeMethod(JMethod method) {
      this.method = method;
      rhizosphereKind = method.getAnnotation(BRIDGE_TYPE_ANNOTATION).rhizosphereKind();
    }

    /**
     * Returns the {@link RhizosphereKind} that this method is capable of
     * setting.
     */
    public RhizosphereKind getRhizosphereKind() {
      return rhizosphereKind;
    }

    /**
     * Returns the Java type that this method is capable of porting onto a
     * Rhizosphere model object.
     */
    public JType getTargetType() {
      return method.getParameters()[1].getType();
    }

    /**
     * Returns the method name.
     */
    public String getName() {
      return method.getName();
    }
  }

  /**
   * Enumerates all the brige methods, keying them by the name of the Java
   * type that they can handle.
   */
  private Map<String, BridgeMethod> bridgeMethods;

  /**
   * Fallback method that will be used to port instances of unsupported Java
   * types onto Rhizosphere model objects.
   */
  private BridgeMethod objectFallbackMethod;

  /**
   * Fallback method that will be used to port arrays of unsupported Java types
   * onto Rhizosphere model objects.
   */
  private BridgeMethod objectArrayFallbackMethod;

  private TypeOracle oracle;
  private TreeLogger logger;

  BridgeCapabilities(TreeLogger logger, TypeOracle oracle) {
    this.logger = logger;
    this.oracle = oracle;
    bridgeMethods = new HashMap<String, BridgeMethod>();
  }

  /**
   * Analyzes {@link #JSO_BUILDER_CLASS} and builds a mapping between Java types
   * and associated methods that can port values of those types onto a
   * Rhizosphere model object.
   *
   * @return this object.
   * @throws UnableToCompleteException
   */
  public BridgeCapabilities configure() throws UnableToCompleteException {
    logger.log(TreeLogger.TRACE,
        "Parsing bridge class " + JSO_BUILDER_CLASS + " to extract mapping methods.");
    JClassType builderType;
    try {
      builderType = oracle.getType(JSO_BUILDER_CLASS);
    } catch (NotFoundException e) {
      logger.log(TreeLogger.ERROR,
          "Unable to build the bridge methods map. Is the builder class "
          + JSO_BUILDER_CLASS
          + " missing?");
      throw new UnableToCompleteException();
    }

    for (JMethod method : builderType.getInheritableMethods()) {
      if (isValidBridgeMethod(method)) {
        BridgeMethod bridgeMethod = new BridgeMethod(method);
        String targetType = bridgeMethod.getTargetType().getQualifiedSourceName();

        bridgeMethods.put(targetType, bridgeMethod);
        if (targetType.equals("java.lang.Object")) {
          objectFallbackMethod = bridgeMethod;
        }
        if (targetType.equals("java.lang.Object[]")) {
          objectArrayFallbackMethod = bridgeMethod;
        }
      }
    }
    if (objectFallbackMethod == null) {
      logger.log(TreeLogger.ERROR, "Unable to find fallback method for Object types");
      throw new UnableToCompleteException();
    }
    if (objectArrayFallbackMethod == null) {
      logger.log(TreeLogger.ERROR, "Unable to find fallback method for Object[] types");
      throw new UnableToCompleteException();
    }
    return this;
  }

  /**
   * Verifies that a method on {@link #JSO_BUILDER_CLASS} has the correct
   * signature to be used as a bridge method to port Java types onto Rhizosphere
   * objects.
   *
   * @param method The method to inspect.
   * @return true whether the method is a valid bridge method.
   */
  private boolean isValidBridgeMethod(final JMethod method) {
    return method.isAnnotationPresent(BRIDGE_TYPE_ANNOTATION) &&
        method.isPublic() &&
        !method.isStatic() &&
        method.getParameters().length == 2 &&
        method.getParameters()[0].getType().getQualifiedSourceName().equals("java.lang.String");
  }

  /**
   * Returns the set of primitive types that can be ported between POJOs and
   * Rhizosphere models.
   */
  public Set<JPrimitiveType> getMappablePrimitiveTypes() {
    Set<JPrimitiveType> mappablePrimitiveTypes = new HashSet<JPrimitiveType>();
    for (BridgeMethod method : bridgeMethods.values()) {
      JPrimitiveType primitiveType = method.getTargetType().isPrimitive();
      if (primitiveType != null) {
        mappablePrimitiveTypes.add(primitiveType);
      }
    }

    return mappablePrimitiveTypes;
  }

  /**
   * Returns the {@link #JSO_BUILDER_CLASS} method capable of porting the given
   * Java type onto a Rhizosphere model object.
   *
   * @param argumentType The Java type to port.
   * @return The bridge method capable of porting it.
   */
  public BridgeMethod getBridgeMethod(final JType argumentType) {
    BridgeMethod method = bridgeMethods.get(argumentType.getQualifiedSourceName());
    if (method != null) {
      return method;
    }
    return argumentType.isArray() != null ? objectArrayFallbackMethod : objectFallbackMethod;
  }
}
