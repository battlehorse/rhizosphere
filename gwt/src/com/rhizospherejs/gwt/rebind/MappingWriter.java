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
import com.google.gwt.user.rebind.ClassSourceFileComposerFactory;
import com.google.gwt.user.rebind.SourceWriter;

import com.rhizospherejs.gwt.rebind.BridgeCapabilities.BridgeMethod;
import com.rhizospherejs.gwt.rebind.ModelInspector.MappableMethod;

import java.io.PrintWriter;

/**
 * Writes the source code of
 * {@link com.rhizospherejs.gwt.client.RhizosphereMapping} instances.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class MappingWriter {

  /**
   * Returns the name of the generated
   * {@link com.rhizospherejs.gwt.client.RhizosphereMapping} class given
   * the className of the {@link com.rhizospherejs.gwt.client.RhizosphereModel}
   * it is being generated for.
   *
   * @param modelClassName The name of the RhizosphereModel subclass the
   *     generator is currently processing.
   * @return The name of the generated RhizosphereMapping instance.
   */
  public static String getMappingClassName(String modelClassName) {
    return modelClassName + "Mapping";
  }

  private ModelInspector inspector;
  private BridgeCapabilities bridgeCapabilities;
  private PrintWriter pw;
  private TreeLogger logger;
  private String packageName;
  private String className;
  private String modelClassName;

  MappingWriter(
      TreeLogger logger, 
      PrintWriter pw,
      String packageName,
      String modelClassName,
      BridgeCapabilities bridgeCapabilities,
      ModelInspector inspector) {
    this.logger = logger;
    this.packageName = packageName;
    this.modelClassName = modelClassName;
    this.className = getMappingClassName(modelClassName);
    this.pw = pw;
    this.bridgeCapabilities = bridgeCapabilities;
    this.inspector = inspector;
  }

  private SourceWriter getSourceWriter() {
    ClassSourceFileComposerFactory composerFactory =
        new ClassSourceFileComposerFactory(packageName, className);

    composerFactory.addImport("com.google.gwt.core.client.JavaScriptObject");   
    composerFactory.addImport("com.rhizospherejs.gwt.client.RhizosphereKind");
    composerFactory.addImport("com.rhizospherejs.gwt.client.RhizosphereMapping");
    composerFactory.addImport("com.rhizospherejs.gwt.client.RhizosphereMetaModel");
    composerFactory.addImport("com.rhizospherejs.gwt.client.RhizosphereMetaModel.Attribute");
    composerFactory.addImport("com.rhizospherejs.gwt.client.bridge.ModelBridge");
    composerFactory.addImport("com.rhizospherejs.gwt.client.meta.MetaModelFactory");
    composerFactory.addImport("com.rhizospherejs.gwt.client.meta.AttributeDescriptor");
    composerFactory.addImport(ModelInspector.CUSTOM_ATTRIBUTES_INTERFACE);
    composerFactory.addImport(BridgeCapabilities.JSO_BUILDER_CLASS);    
    composerFactory.addImport(BridgeCapabilities.METAMODEL_ATTRIBUTE_BUILDER_CLASS);     

    composerFactory.addImplementedInterface("RhizosphereMapping<" +  modelClassName + ">");

    return composerFactory.createSourceWriter(this.pw);
  }

  public void write() {
    SourceWriter sw = getSourceWriter();
    writeModelBridgeFactoryMethod(sw);
    sw.println();
    writeMetaModelFactoryInterfaceImpl(sw);
    sw.println();
    writeModelBridgeImpl(sw);
    sw.println();
    writeMetaModelFactoryImpl(sw);
    sw.commit(logger);
  }

  private void writeModelBridgeFactoryMethod(SourceWriter sw) {
    sw.println("@Override");
    sw.println("public ModelBridge<%s> newModelBridge(%s jsoBuilder) {",
        modelClassName, BridgeCapabilities.JSO_BUILDER_CLASS);
    sw.indent();
    sw.println("return new %sModelBridge(jsoBuilder);", modelClassName);
    sw.outdent();
    sw.println("}");
  }

  private void writeMetaModelFactoryInterfaceImpl(SourceWriter sw) {
    sw.println("@Override");
    sw.println("public MetaModelFactory newMetaModelFactory(%s attrBuilder) {",
        BridgeCapabilities.METAMODEL_ATTRIBUTE_BUILDER_CLASS);
    sw.indent();
    sw.println("return new %sMetaModelFactory(attrBuilder);", modelClassName);
    sw.outdent();
    sw.println("}");
  }

  private void writeModelBridgeImpl(SourceWriter sw) {
    sw.println("private static final class %sModelBridge extends ModelBridge<%s> {",
        modelClassName, modelClassName);
    sw.indent();

    sw.println("public %sModelBridge(%s jsoBuilder) {",
        modelClassName, BridgeCapabilities.JSO_BUILDER_CLASS);
    sw.indentln("super(jsoBuilder);");
    sw.println("}");
    sw.println();

    sw.println("@Override");
    sw.println("protected JavaScriptObject bridgeInternal(%s in, %s jsoBuilder) {",
        modelClassName, BridgeCapabilities.JSO_BUILDER_CLASS);
    sw.indent();

    sw.println("JavaScriptObject target = JavaScriptObject.createObject();");
    sw.println("jsoBuilder.setTarget(target);");

    for (MappableMethod modelMethod : inspector.getMappableModelMethods()) {
      BridgeMethod bridgeMethod = bridgeCapabilities.getBridgeMethod(modelMethod.getReturnType());
      sw.println("jsoBuilder.%s(\"%s\", in.%s());",
          bridgeMethod.getName(), modelMethod.getAttributeName(), modelMethod.getName());
    }

    MappableMethod modelIdGeneratorMethod = inspector.getModelIdGeneratorMethod(); 
    if (modelIdGeneratorMethod != null) {
      BridgeMethod bridgeMethod = bridgeCapabilities.getBridgeMethod(
          modelIdGeneratorMethod.getReturnType());
      sw.println();
      sw.println("jsoBuilder.%s(\"%s\", in.%s());",
          bridgeMethod.getName(), "id", modelIdGeneratorMethod.getName());
    }

    if (inspector.modelUsesCustomAttributes()) {
      sw.println("((%s) in).setCustomRhizosphereAttributes(jsoBuilder);",
          ModelInspector.CUSTOM_ATTRIBUTES_INTERFACE);
    }

    sw.println("return target;");

    // Close bridgeInternal() method
    sw.outdent();
    sw.println("}");

    // Close class definition
    sw.outdent();
    sw.println("}");
  }

  private void writeMetaModelFactoryImpl(SourceWriter sw) {
    sw.println("private static final class %sMetaModelFactory extends MetaModelFactory {",
        modelClassName);
    sw.indent();

    sw.println("public %sMetaModelFactory() {", modelClassName);
    sw.indentln("super();");
    sw.println("}");
    sw.println();

    sw.println("public %sMetaModelFactory(%s attrBuilder) {",
        modelClassName, BridgeCapabilities.METAMODEL_ATTRIBUTE_BUILDER_CLASS);
    sw.indentln("super(attrBuilder);");
    sw.println("}");
    sw.println();

    sw.println("@Override");
    sw.println("protected void fillMetaModelAttributes("
        + "RhizosphereMetaModel metaModel, AttributeBuilder attrBuilder) {");
    sw.indent();

    sw.println("Attribute attr;");
    sw.println("AttributeDescriptor descriptor;");
    sw.println("RhizosphereKind kind;");
    for (MappableMethod modelMethod : inspector.getMappableModelMethods()) {
      if (!modelMethod.contributesToMetaModel()) {
        continue;
      }
      String labelParameter = modelMethod.getAttributeLabel() != null ?
          "\"" + modelMethod.getAttributeLabel() + "\"" : "null";
      sw.println("attr = metaModel.newAttribute(\"%s\");", modelMethod.getAttributeName());
      sw.println("descriptor = new %s();", modelMethod.getAttributeDescriptorClassName());
      sw.println("kind = RhizosphereKind.valueOf(RhizosphereKind.class, \"%s\");",
          bridgeCapabilities.getBridgeMethod(modelMethod.getReturnType()).
              getRhizosphereKind().name());
      sw.println("attrBuilder.fillAttribute(attr, descriptor, \"%s\", %s, kind);",
          modelMethod.getAttributeName(), labelParameter);
      sw.println();
    }

    sw.outdent();
    sw.println("}");

    sw.outdent();
    sw.println("}");
  }
}
