/*
  Copyright 2010 The Rhizosphere Authors. All Rights Reserved.

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

/*
 * This file contains all the handlers and functions used by the
 * Google Code Hosting Rhizosphere showcase app.
 *
 * It contains logic to parse information extracted from the Google Code
 * Hosting issue tracker and feed it to a custom-tailored Rhizosphere
 * visualization.
 */

// Namespace
var googlecode = {
  template: {}, meta: {}
};

/**
 * The conventional owner name used when an issue is not yet assigned to
 * any owner.
 * @type {string}
 */
googlecode.UNASSIGNED_OWNER = '- Unassigned';


/**
 * The conventional reporter name used when an issue has been reported by
 * an unknown user.
 * @type {string}
 */
googlecode.UNKNOWN_REPORTER = '- Unknown';


/**
 * A custom NumberKind whose isNumeric property is suppressed, so that it
 * doesn't show up in unwanted places (such as treemaps).
 * @constructor
 */
googlecode.meta.NonNumericIdKind = function() {
  rhizo.meta.NumberKind.call(this);
};
rhizo.inherits(googlecode.meta.NonNumericIdKind, rhizo.meta.NumberKind);

googlecode.meta.NonNumericIdKind.prototype.isNumeric = function() {
  return false;
};


/**
 * Builds the visualization metamodel from the statistics built server-side
 * about the issues that were fetched from Google Code Hosting.
 */
googlecode.buildMetamodel = function(stats) {
  var metamodel = {
    id: {kind: new googlecode.meta.NonNumericIdKind(), label: 'Id'},
    summary: {kind: rhizo.meta.Kind.STRING, label: 'Summary'},
    state: {kind: rhizo.meta.Kind.CATEGORY, label: 'State',
            categories: ['open', 'closed']},
    status: {kind: rhizo.meta.Kind.CATEGORY, label: 'Status',
             categories: stats.statuses},
    stars: {kind: rhizo.meta.Kind.RANGE, label: "Stars",
            min: stats.stars.min, max: stats.stars.max },

    reporter_name: {kind: rhizo.meta.Kind.CATEGORY, label: 'Reporter',
                    categories: stats.reporters},
    owner_name: {kind: rhizo.meta.Kind.CATEGORY, label: 'Owner',
                 categories: stats.owners},

    created: {kind: new rhizo.meta.DateKind('m'),
              label: "Created",
              minYear: stats.created.minyear,
              maxYear: stats.created.maxyear },
    created_ago: {kind: rhizo.meta.Kind.RANGE,
                  label: "Created (days ago)",
                  min: 0, max: stats.created.daysago },
    updated: {kind: new rhizo.meta.DateKind('m'),
              label: "Updated",
              minYear: stats.updated.minyear,
              maxYear: stats.updated.maxyear },
    updated_ago: {kind: rhizo.meta.Kind.RANGE,
                  label: "Updated (days ago)",
                  min: 0, max: stats.updated.daysago }
  };

  if (stats.closed_date) {
    metamodel.closed_date = {kind: new rhizo.meta.DateKind('m'),
                             label: "Closed date",
                             minYear: stats.closed_date.minyear,
                             maxYear: stats.closed_date.maxyear };
  }

  for (var label_key in stats.composite_labels.names) {
    metamodel[label_key] = {
        kind: new rhizo.meta.Kind.CATEGORY,
        label: stats.composite_labels.names[label_key],
        categories: stats.composite_labels.values[label_key]
    };
  }

  if (stats.plain_labels && stats.plain_labels.length > 0) {
    metamodel.plain_labels = {kind: rhizo.meta.Kind.CATEGORY,
                              label: 'Other labels',
                              categories: stats.plain_labels };
  }
  metamodel.blocked = {kind: rhizo.meta.Kind.BOOLEAN, label: "Blocked?"};
  return metamodel;
};


/**
 * Models are dumped from the server as plain JSON strings and then converted
 * to plain Javascript objects.
 * This method converts model attributes to more complex Javascript types where
 * needed.
 */
googlecode.fixModels = function(models, stats) {
  for (var i = models.length-1; i >= 0; i--) {
    // Convert serialized dates into javascript Date objects.
    // Serialized dates are represented as [yyyy, mm, dd, days_ago] integer
    // arrays.
    var created = models[i].created;
    models[i].created_ago = created[3];
    models[i].created = new Date(created[0], created[1]-1, created[2])

    var updated = models[i].updated;
    models[i].updated_ago = updated[3];
    models[i].updated = new Date(updated[0], updated[1]-1, updated[2])

    if (stats.closed_date) {
      var closed = models[i].closed_date;
      if (closed) {
        models[i].closed_date = new Date(closed[0], closed[1]-1, closed[2]);
      }
    }
  }
};


/**
 * Returns a factory funtion to build an UI template tailored for the specific
 * needs of this visualization. In particular, it enables the broadcasting
 * component for visualization broadcasting and uses a custom logo component.
 *
 * @param {string} googlecode_project_name The name of Google Code project the
 *     visualization is about.
 * @return {function(rhizo.Project, *):rhizo.ui.component.Template} The factory
 *     function that will create template instances.
 */
googlecode.template.buildTemplate = function(googlecode_project_name) {
  return function(project, options) {
    if (project.gui().isSmall() || project.gui().isMobile()) {
      return new googlecode.template.BottomTemplate(project,
                                                    options,
                                                    'bottom',
                                                    googlecode_project_name);
    } else {
      return new googlecode.template.StandardTemplate(project,
                                                      options,
                                                      'default',
                                                      googlecode_project_name);
    }
  }
};


/**
 * Extends Rhizosphere basic Bottom template with Google Code-specific
 * customizations.
 *
 * @param {rhizo.Project} project The project this template belongs to.
 * @param {*} options Project-wide configuration options
 * @param {string} template_key The unique key that identifies the template.
 * @param {string} googlecode_project_name The name of Google Code project the
 *     visualization is about.
 * @constructor
 */
googlecode.template.BottomTemplate = function(
    project, options, template_key, googlecode_project_name) {
  this.googlecode_project_name_ = googlecode_project_name;
  rhizo.ui.component.BottomTemplate.call(this, project, options, template_key);
};
rhizo.inherits(googlecode.template.BottomTemplate,
               rhizo.ui.component.BottomTemplate);

googlecode.template.BottomTemplate.prototype.defaultComponents = function(
    project, options) {
  return [
      new rhizo.ui.component.Layout(project, options),
      new rhizo.ui.component.SelectionManager(project, options),
      new rhizo.ui.component.FilterBookContainer(project, options),
      new rhizo.broadcast.BaseComponent(project, options),
      new googlecode.template.Logo(project, options, false,
          this.googlecode_project_name_)
  ];
};


/**
 * Extends Rhizosphere basic Standard template with Google Code-specific
 * customizations.
 *
 * @param {rhizo.Project} project The project this template belongs to.
 * @param {*} options Project-wide configuration options
 * @param {string} template_key The unique key that identifies the template.
 * @param {string} googlecode_project_name The name of Google Code project the
 *     visualization is about.
 * @constructor
 */
googlecode.template.StandardTemplate = function(
    project, options, template_key, googlecode_project_name) {
  this.googlecode_project_name_ = googlecode_project_name;
  rhizo.ui.component.StandardTemplate.call(
      this, project, options, template_key);
};
rhizo.inherits(googlecode.template.StandardTemplate,
               rhizo.ui.component.StandardTemplate);

googlecode.template.StandardTemplate.prototype.defaultLeftComponents = function(
    project, options) {
  return [
      new googlecode.template.Logo(project, options, true,
          this.googlecode_project_name_),
      new rhizo.broadcast.BaseComponent(project, options),
      new rhizo.ui.component.Layout(project, options),
      new rhizo.ui.component.SelectionManager(project, options),
      new rhizo.ui.component.FilterStackContainer(project, options)
  ];
};

googlecode.template.StandardTemplate.prototype.defaultRightComponents =
    function(project, options) {
  return [
      new rhizo.ui.component.Console(project, options)
  ];
};


/**
 * A custom visualization Logo.
 *
 * @param {rhizo.Project} project The project this component belongs to.
 * @param {*} options Project-wide configuration options.
 * @param {boolean} titleless Whether this component should have a title or not.
 * @param {string} googlecode_project_name The name of Google Code project the
 *     visualization is about.
 * @constructor
 */
googlecode.template.Logo = function(project, options, titleless,
                                    googlecode_project_name) {
  rhizo.ui.component.Component.call(this, project, options, 'googlecode.template.Logo');
  this.titleless_ = titleless;
  this.googlecode_project_name_ = googlecode_project_name;
};
rhizo.inherits(googlecode.template.Logo, rhizo.ui.component.Component);

googlecode.template.Logo.prototype.title = function() {
  return this.titleless_ ? null : '?';
};

googlecode.template.Logo.prototype.render = function() {
  var panel = $('<div />', {'class': 'googlecode-project-logo'});
  var img = $('<img />', {
    src: 'http://code.google.com/p/' + this.googlecode_project_name_ + '/logo',
    error: function() {
      $(this).attr('src', '/static/showcase/code/img/defaultprojectlogo.png');
    }}).appendTo(panel);

  var header = $('<h1 />').append(
      $('<a />', {
        'href': 'http://code.google.com/p/' + this.googlecode_project_name_,
        'target': '_blank'}).text(this.googlecode_project_name_));
  header.append($('<span />', {'class': 'tag'}).text(' Issue Tracker'));
  header.appendTo(panel);

  var links = $('<p />').appendTo(panel);
  links.append('&nbsp;').append(
      $('<a />', {
        'href': 'http://code.google.com/p/' +
                this.googlecode_project_name_ +
                '/issues/list',
        'target': '_blank'}).
          text(this.googlecode_project_name_ + ' Issues'));

  var poweredbylinks = $('<p />', {'class': 'poweredby'}).appendTo(panel);
  poweredbylinks.append('Powered by ').append(
      $('<a />', {
        'href': 'http://sites.google.com/site/rhizosphereui/',
        'target': '_blank'}).
          text('Rhizosphere'));
  poweredbylinks.append(' (').append(
      $('<a />', {
        'href': 'http://www.rhizospherejs.com/doc',
        'target': '_blank'}).
          text('Help')).append(')');

  return panel.get(0);
};


/**
 * The renderer for the Google Code showcase. This renderer is tailored to
 * display issue entries extracted from the Google Code Hosting issue tracker.
 *
 * It can render each entry in two different modes:
 * - compressed: reduced amount of information displayed, limited to the issue
 *   title and id. The full amount of information will be displayed when the
 *   rendering is expanded.
 * - full: All available information regarding the issue are displayed all the
 *   time.
 *
 * @param {Object.<string, string>} composite_labels_names Key-value mapping
 *     from the javascript variable name that identifies a given issue label to
 *     its human-readable name.
 * @constructor
 */
googlecode.Renderer = function(composite_labels_names) {
  /**
   * The renderings' dimensions can be cached.
   * @type {boolean}
   */
  this.cacheDimensions = true;

  /**
   * Whether the renderer should display entries in 'compressed' or 'full' mode.
   * @type {boolean}
   * @private
   */
  this.allDetails_ = false;

  this.composite_labels_names_ = composite_labels_names;
};

/**
 * Decides whether the renderings can be expanded or not. This is true if the
 * visualization is in a 'small' setting or we are displaying a limited amount
 * of information.
 * @param {*} renderingHints The rendering hints for the visualization.
 * @return {boolean} Whether the renderer supports the expanded state or not.
 */
googlecode.Renderer.prototype.expandable = function(renderingHints) {
  return renderingHints.small || !this.allDetails_;
};

/**
 * Hints this renderer to operate in 'full' mode, where each rendering contains
 * all the available details for the issue it represents.
 */
googlecode.Renderer.prototype.renderAllDetails = function() {
  this.allDetails_ = true;
};

/**
 * Callback invoked by the rendering framework whenever the CSS attributes of
 * a specific rendering needs to be changed.
 * @param {*} node The jQuery object pointing to the rendering to modify.
 * @param {*} props A key-value map of CSS properties to set on the rendering.
 * @param {?boolean} opt_hintRevert An optional boolean hint to indicate that
 *     the rendering properties are being reverted to their original state.
 */
googlecode.Renderer.prototype.changeStyle = function(node,
                                                     props,
                                                     opt_hintRevert) {
  $(node).css(props);
  if (opt_hintRevert) {
    // We are reverting to the original style.
    $(node).removeClass('custom');
  } else {
    $(node).addClass('custom');
  }
};

/**
 * Renders a single model, representing an issue extracted from the Google Code
 * Hosting issue tracker.
 *
 * @param {*} model The plain Javascript object representing the 'issue' to
 *     render.
 * @param {boolean} expanded Whether the model should be rendered in expanded
 *     mode or not.
 * @param {*} renderingHints The rendering hints to customize model rendering.
 * @return {*} The jQuery object pointing to the model rendering.
 */
googlecode.Renderer.prototype.render = function(model,
                                                expanded,
                                                renderingHints) {
  var containerClass = this.getRenderingClass_(model, expanded, renderingHints);
  var container = $('<div />', {'class': containerClass});

  var statusbar = $('<p />', {'class': 'status'}).text(model.status);
  if (!this.shouldRenderAllDetails_(expanded, renderingHints)) {
    // The status bar is place on top of the rendering, when in compressed mode.
    statusbar.appendTo(container);
  }

  var summary = $('<p />', {'class': 'summary'}).html(model.summary).
      appendTo(container);
  var html_link = $('<a />',
      {href: model.html_link,
       target: '_blank'}).text(model.id);
  $('<span />', {'class': 'id'}).append(html_link).prependTo(summary);

  if (!this.shouldRenderAllDetails_(expanded, renderingHints)) {
    // We are done for a compressed rendering.
    return container;
  }

  // Otherwise render all the available extra info.
  statusbar.appendTo(container);
  this.renderStars_(model, container);
  this.renderDates_(model, container);
  this.renderOwnerReporter_(model, container);
  if (model.blocked) {
    this.renderBlocked_(model, container);
  }
  this.renderLabels_(model, container);
  return container;
};

/**
 * Decides whether a model should be rendered in 'full' mode or not.
 * This occurs whenever the user explicitly requested expansion on a model, or
 * when the renderer has been instructed to always operate in 'full' mode
 * (unless we are in a small rendering setting, where the 'compressed' mode
 * takes precedence).
 *
 * @param {boolean} expanded Whether the model should be rendered in expanded
 *     mode or not.
 * @param {*} renderingHints The rendering hints to customize model rendering.
 * @private
 */
googlecode.Renderer.prototype.shouldRenderAllDetails_ = function(
    expanded, renderingHints) {
  return expanded || (this.allDetails_ && !renderingHints.small);
};

/**
 * Assigns a set of master CSS classes to the rendering based on the current
 * model attributes and rendering hints.
 * @private
 */
googlecode.Renderer.prototype.getRenderingClass_ = function(model,
                                                            expanded,
                                                            renderingHints) {
  var allDetails = this.allDetails_ && !renderingHints.small;
  var containerClass = 'googlecode';
  if (model.state == 'open') {
    containerClass += ' open';
  } else {
    containerClass += ' closed';
  }

  if (!this.shouldRenderAllDetails_(expanded, renderingHints)) {
    containerClass += ' nodetail';
  }
  return containerClass;
};

/**
 * Renders the number of stars the issue has.
 * @private
 */
googlecode.Renderer.prototype.renderStars_ = function(model, container) {
  $('<p />', {'class': 'stars'}).text(model.stars).appendTo(container);
};

/**
 * Renders information about the issue published (created), updated and
 * closed date.
 * @private
 */
googlecode.Renderer.prototype.renderDates_ = function(model, container) {
  var dates = $('<p />', {'class': 'dates'});
  dates.append($('<span />', {'title': 'Created'}).
      text(this.formatDate_(model.created)));
  if (model.closed_date) {
    dates.append($('<span />', {'class': 'nextdate', 'title': 'Closed'}).
        text(this.formatDate_(model.closed_date)));
  } else if (model.updated != model.created) {
    dates.append($('<span />', {'class': 'nextdate', 'title': 'Updated'}).
        text(this.formatDate_(model.updated)));
  }
  container.append(dates);
};

/**
 * Returns a date formatted in yyyy/mm/dd.
 * @param {Date} date The date to format.
 * @return {string} The date formatted as yyyy/mm/dd.
 * @private
 */
googlecode.Renderer.prototype.formatDate_ = function(date) {
  return date.getFullYear() + '/' + (date.getMonth()+1) + '/' + date.getDate();
};

/**
 * Renders information about the issue owner and reporter.
 * @private
 */
googlecode.Renderer.prototype.renderOwnerReporter_ = function(model, container) {
  if (model.owner_name != googlecode.UNASSIGNED_OWNER ||
      model.reporter_name != googlecode.UNKNOWN_REPORTER) {
    var users = $('<p />', {'class': 'users'});
    reporter = model.reporter_name == googlecode.UNKNOWN_REPORTER ?
        '---' : model.reporter_name;
    users.append($('<span />', {'title': 'Reporter'}).text(reporter));
    if (model.owner_name != googlecode.UNASSIGNED_OWNER) {
      users.append(' ');
      users.append($('<span />', {'class': 'owner', 'title': 'Owner'}).
          text(model.owner_name));
    }
    container.append(users);
  }
};

/**
 * Renders information about other issues blocking this one.
 * @private
 */
googlecode.Renderer.prototype.renderBlocked_ = function(model, container) {
  var blocked = $('<p />', {'class': 'blocked'}).
      text(model.blocked_on.join(','));
  container.append(blocked);
};

/**
 * Renders the model labels.
 * @private
 */
googlecode.Renderer.prototype.renderLabels_ = function(model, container) {
  var labels = $('<p />', {'class': 'labels'});
  for (var label_key in this.composite_labels_names_) {
    if (model[label_key]) {
      this.renderLabel_(this.composite_labels_names_[label_key],
                        model[label_key][0],
                        labels);
    }
  }
  if (model.plain_labels) {
    for (var i = 0; i < model.plain_labels.length; i++) {
      this.renderLabel_(null, model.plain_labels[i], labels);
    }
  }
  container.append(labels);
};

/**
 * Renders a single model label, both composite or plain.
 *
 * @param {?string} opt_prefix The optional lable prefix, for a composite label.
 * @param {string} suffix The label suffix (for a composite label) or the
 *     full label name (for plain labels).
 * @param {*} container The jQuery object pointing to the container where labels
 *     should be added to.
 * @private
 */
googlecode.Renderer.prototype.renderLabel_ = function(opt_prefix,
                                                      suffix,
                                                      container) {
  var label = $('<span />', {'class': 'label'});
  if (opt_prefix) {
    $('<span />', {'class': 'prefix'}).text(opt_prefix).appendTo(label);
  }
  $('<span />', {'class': 'suffix'}).text(suffix).appendTo(label);
  container.append(label).append(' ');
};
