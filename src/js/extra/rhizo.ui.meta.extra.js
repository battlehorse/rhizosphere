/**
  @license
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

/**
 * @fileOverview User interfaces for Rhizosphere additional metamodel Kinds
 * defined in rhizo.meta.extra.js
 */

// RHIZODEP=rhizo,rhizo.meta.extra,rhizo.ui.meta
namespace('rhizo.ui.meta');

// Register the DECIMAL kind to use same UI as the basic text filter.
rhizo.meta.defaultRegistry.registerKindUi(
    rhizo.meta.Kind.DECIMAL, rhizo.ui.meta.TextKindUi);

// Register both the DECIMALRANGE and LOGARITHMRANGE kind to use same UI as the
// basic range filter.
rhizo.meta.defaultRegistry.registerKindUi(
    rhizo.meta.Kind.DECIMALRANGE, rhizo.ui.meta.RangeKindUi);
rhizo.meta.defaultRegistry.registerKindUi(
    rhizo.meta.Kind.LOGARITHMRANGE, rhizo.ui.meta.RangeKindUi);

// Register the STRINGARRAY kind to use same UI as the basic text filter.
rhizo.meta.defaultRegistry.registerKindUi(
    rhizo.meta.Kind.STRINGARRAY, rhizo.ui.meta.TextKindUi);
