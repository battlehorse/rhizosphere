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

import com.google.gwt.core.ext.Generator;
import com.google.gwt.core.ext.GeneratorContext;
import com.google.gwt.core.ext.TreeLogger;
import com.google.gwt.core.ext.UnableToCompleteException;
import com.google.gwt.core.ext.typeinfo.JClassType;
import com.google.gwt.core.ext.typeinfo.NotFoundException;
import com.google.gwt.core.ext.typeinfo.TypeOracle;

import java.io.PrintWriter;

/**
 * Code generator that generates
 * {@link com.rhizospherejs.gwt.client.RhizosphereMapping} implementations from
 * {@link com.rhizospherejs.gwt.client.RhizosphereModel} subclasses.
 * <p>
 * The purpose of this generator is to let Rhizosphere users use their custom
 * POJOs to define the datasets Rhizosphere will visualize.
 * <p>
 * Rhizosphere defines a dataset as a set of <em>models</em> (each model
 * represents a single datapoint of the dataset) and an associated
 * <em>metamodel</em> (to contain the dataset metadata). Rhizosphere internally
 * uses custom tailored JavaScriptObjects to represent both models and
 * metamodels.
 * <p>
 * The generator parses POJOs marked with the
 * {@link com.rhizospherejs.gwt.client.RhizosphereModel} interface, associated
 * {@link com.rhizospherejs.gwt.client.RhizosphereModelAttribute} annotations
 * and related interfaces and emits implementations of
 * {@link com.rhizospherejs.gwt.client.RhizosphereMapping} which are capable of
 * transforming user provided POJOs into Rhizosphere-compatible models and
 * metamodel instances.
 * <p>
 * Code generation proceeds as follows:
 * <ul>
 * <li>{@link BridgeCapabilities} determine which Java types can be successfully
 *   converted into Rhizosphere data types.</li>
 * <li>{@link ModelInspector} analyzes the user-defined POJO and identifies
 *   all the attributes that must be exposed within Rhizosphere, along with
 *   the associated metadata.</li>
 * <li>{@link MappingWriter} uses the information extracted by the previous 2
 *   steps a generates factories capable of converting user-provided POJOs into
 *   Rhizosphere-compatible JavaScriptObjects.</li>
 * </ul>
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class RhizosphereGenerator extends Generator {

  @Override
  public String generate(TreeLogger logger, GeneratorContext context, String requestedClass)
      throws UnableToCompleteException {
    TypeOracle oracle = context.getTypeOracle();
    JClassType modelType;
    try {
      modelType = oracle.getType(requestedClass);
    } catch (NotFoundException e) {
      logger.log(TreeLogger.ERROR, "Unable to find class type for " + requestedClass + ":" + e);
      throw new UnableToCompleteException();
    }

    BridgeCapabilities bridgeCapabilities = new BridgeCapabilities(
        logger.branch(TreeLogger.TRACE, "Initializing BridgeCapabilities."), oracle).configure();
    ModelInspector inspector = new ModelInspector(
        logger.branch(TreeLogger.TRACE, "Initializing ModelInspector."), 
        oracle,
        modelType,
        bridgeCapabilities).configure();

    String mappingPackageName = modelType.getPackage().getName();
    String mappingClassName = MappingWriter.getMappingClassName(modelType.getSimpleSourceName());
    PrintWriter pw = context.tryCreate(logger, mappingPackageName, mappingClassName);
    if (pw == null) {
      logger.log(TreeLogger.INFO, mappingClassName + " already exists. Nothing to do.");
      return mappingPackageName + "." + mappingClassName;
    }

    MappingWriter writer = new MappingWriter(
        logger.branch(TreeLogger.TRACE, "Initializing MappingWriter."),
        pw,
        mappingPackageName,
        modelType.getSimpleSourceName(),
        bridgeCapabilities,
        inspector);
    writer.write();
    context.commit(logger, pw);
    return mappingPackageName + "." + mappingClassName;
  }
}
