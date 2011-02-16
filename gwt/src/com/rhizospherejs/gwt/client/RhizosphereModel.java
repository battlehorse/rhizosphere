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

package com.rhizospherejs.gwt.client;


/**
 * Marker interface that identifies POJOs to use as Rhizopshere visualization
 * models.
 * <p>
 * A <em>model</em> represents a single datapoint of the dataset you want to
 * visualize in Rhizosphere. To use custom POJOs as visualization models follow
 * these steps:
 * <ul>
 * <li>Mark the POJOs with this interface.</li>
 * <li>Identify all the POJO fields that need to be exposed in Rhizosphere
 *   and mark their getters with the {@link RhizosphereModelAttribute}
 *   annotation. Refer to the annotation documentation for further info.</li>
 * <li>If the annotation based configuration is not enough for the
 *   visualization requirements, have the POJOs also implement
 *   {@link CustomRhizosphereModel} and, if needed,
 *   {@link CustomRhizosphereMetaModel}</li>
 * <li>Prepare Rhizosphere to receive instances of the configured POJOs via
 *   {@link Rhizosphere#prepareFor(RhizosphereMapping)}.</li>
 * <li>Feed Rhizosphere with POJO instances via
 *   {@link Rhizosphere#addModel(Object)} and attach the visualization widget
 *   to your GWT app.
 * </ul>
 * <p>
 * Rhizosphere internally uses custom tailored JavaScriptObjects to represent
 * visualization models. The information provided by the steps above guide
 * Rhizosphere conversion process from custom POJOs to JavaScriptObjects that
 * can be understood by the underlying Rhizosphere native javascript library.
 * 
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public interface RhizosphereModel {}
