/*
  Copyright 2009 Riccardo Govoni battlehorse@gmail.com

  Licensed under the Apache License, Version 2.0 (the &quot;License&quot;);
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an &quot;AS IS&quot; BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

// RHIZODEP=rhizo.ui,rhizo.layout
// Components Namespace
namespace("rhizo.ui.component");

// Progress-bar to handle application startup feedback
rhizo.ui.component.Progress = function(container) {
  this.pbarPanel_ = $('<div/>', {'class': 'rhizo-progressbar-panel'}).appendTo(container);
  var pbar = $('<div/>', {'class': 'rhizo-progressbar'}).appendTo(this.pbarPanel_);
  this.pbar_ = pbar.progressbar({value: 1});
  this.pbarText_ = $('<div/>', {'class': 'rhizo-progressbar-text'}).
      text('Loading...').
      appendTo(this.pbarPanel_);
};

rhizo.ui.component.Progress.prototype.update = function(value, opt_text) {
  this.pbar_.progressbar('value', value);
  if (opt_text) {
    this.pbarText_.text(opt_text);
  }
  if (value >= 100) {
    this.destroy_();
  }
};

rhizo.ui.component.Progress.prototype.destroy_ = function() {
  if (this.pbarPanel_.is(':visible')) {
    setTimeout(jQuery.proxy(function() {
      this.pbarPanel_.fadeOut(500, function() {
        $(this).remove();
      });
    }, this), 1000);
  } else {
    this.pbarPanel_.remove();
  }
};

rhizo.ui.component.Logo = function() {};

rhizo.ui.component.Logo.prototype.getPanel = function() {
  return this.headerPanel_;
};

rhizo.ui.component.Logo.prototype.render = function(container, gui, opt_options) {
  var options = opt_options || {};
  gui.addComponent('rhizo.ui.component.Logo', this);
  this.headerPanel_ = $('<div />', {'class': 'rhizo-header'}).html(
      '<h1>Rhizosphere</h1><p>' +
      'by <a href="mailto:battlehorse@gmail.com">Riccardo Govoni</a> (c) 2010<br />' +
      '<a href="http://sites.google.com/site/rhizosphereui/" target="_blank">Project info</a>' +
      '&nbsp;' +
      '<a href="http://sites.google.com/site/rhizosphereui/Home/documentation" target="_blank" ' +
      'style="font-weight:bold; text-decoration: underline">I Need Help!</a>' +
      '</p>').appendTo(container);

  if (options.touchLayout) {
    this.headerPanel_.addClass('rhizo-floating-panel').css('display', 'none');
  }
};

rhizo.ui.component.Viewport = function() {};

rhizo.ui.component.Viewport.prototype.render = function(container, gui, opt_options) {
  var options = opt_options || {};

  this.viewport_ = $('<div/>', {'class': 'rhizo-viewport'}).appendTo(container);
  this.universe_ = $('<div/>', {'class': 'rhizo-universe'}).appendTo(this.viewport_);

  // Update the GUI object.
  gui.setViewport(this.viewport_);
  gui.setUniverse(this.universe_);

  if (options.touchLayout) {
    this.viewport_.addClass('rhizo-miniRender');
  } else {
    // shrink the viewport
    this.viewport_.css('left',300).css('right', 5);
  }
};

rhizo.ui.component.Viewport.prototype.activate = function(gui, opt_options) {
  gui.viewport.draggable({
    helper: function() {
      return $("<div />").appendTo(gui.viewport);
    },
    start: function(ev, ui) {
      var position = gui.universe.position();
      gui.universe.data("top0", position.top).data("left0", position.left);
    },
    drag: function(ev, ui) {
      // Computes where to reposition the universe pane from the delta movement
      // of the drag helper.
      //
      // - gui.universe.data({top0, left0}) points to the relative position of
      //   the universe (in respect to the viewport) at the start of the drag
      //   movement.
      // - ui.position.{top,left} points to the relative position of the drag
      //   helper (in respect to the viewport) at the current instant.
      var dragTop = ui.position.top + gui.universe.data("top0");
      var dragLeft = ui.position.left + gui.universe.data("left0");
      
      var snapDistance = 15;
      if (Math.abs(ui.position.left) <= snapDistance) {
        dragLeft = gui.universe.data("left0");
      }
      if (Math.abs(dragLeft) <= 15) {
        dragLeft = 0;
      }

      gui.moveUniverse({top: dragTop, left: dragLeft});
    },
    refreshPositions: false
  });

  // Mousewheel (or trackpad) based panning.
  $(gui.viewport).mousewheel(
    function (evt, deltaX, deltaY) {
      gui.panUniverse(deltaY, deltaX, evt.timeStamp);
  });
};

rhizo.ui.component.MiniToolbar = function() {};

rhizo.ui.component.MiniToolbar.prototype.render = function(container, project, gui, opt_options) {
  var span = $('<span />').appendTo(container);
  this.resizeLink_ = $('<a/>', {href: '#', title: 'Maximize', 'class': 'rhizo-maximize-icon'}).
    appendTo(span);

  this.components_ = [
    {component: 'rhizo.ui.component.Layout', title: 'Display', 'class': ''},
    {component: 'rhizo.ui.component.SelectionManager', title: 'Selection', 'class': ''},
    {component: 'rhizo.ui.component.Filters', title: 'Filters', 'class': ''},
    {component: 'rhizo.ui.component.Legend', title: 'Legend', 'class': ''},
    {component: 'rhizo.ui.component.Logo', title: '?', 'class': 'rhizo-link-help'}
  ];
  this.components_ = jQuery.grep(
    this.components_,
    function(c) {
      return gui.getComponent(c.component) ? true : false;
    });
  for (var i = 0; i < this.components_.length; i++) {
    this.components_[i].link = this.createLink_(this.components_[i].title,
                                                this.components_[i]['class'],
                                                container);
    this.components_[i].panel = gui.getComponent(this.components_[i].component).getPanel();
  }
};

rhizo.ui.component.MiniToolbar.prototype.createLink_ = function(text, className, container) {
  var span = $('<span />', {'class': 'rhizo-filters-header'}).appendTo(container);
  var link = $('<a/>', {href:  '#', title: text, 'class': className}).text(text).appendTo(span);
  return link;
};

rhizo.ui.component.MiniToolbar.prototype.activate = function(project, gui, opt_options) {
  this.resizeLink_.click(function() {
    self.resizeTo(1000, 700);
    self.location.reload();
    return false;
  });

  jQuery.each(this.components_, jQuery.proxy(function(i, currentComponent) {
    currentComponent.link.click(jQuery.proxy(function() {
      jQuery.each(this.components_, function(j, comp) {
        if (comp == currentComponent) {
          $(comp.panel).toggle();
          $(comp.link).toggleClass('rhizo-filter-open');
        } else {
          $(comp.panel).css('display', 'none');
          $(comp.link).removeClass('rhizo-filter-open');
        }
      });
      return false;
    }, this));
  }, this));
};


rhizo.ui.component.Console = function() {};

rhizo.ui.component.Console.prototype.render = function(container, gui, opt_options) {
  gui.addComponent('rhizo.ui.component.Console', this);

  this.toggleButton_ = $('<div />', {'class': 'rhizo-console-close'}).html('&#8659;');

  this.consoleHeader_ = $('<div />', {'class': 'rhizo-console-header'});
  this.consoleHeader_.append(this.toggleButton_).append('Log Console');
  this.consoleHeader_.appendTo(container);

  this.consoleContents_ = $('<div />', {'class': 'rhizo-console-contents'});
  this.consoleContents_.appendTo(container);
};

rhizo.ui.component.Console.prototype.activate = function(gui, opt_options) {
  this.toggleButton_.click(jQuery.proxy(function() {
    if (this.consoleContents_.is(":visible")) {
      this.consoleContents_.slideUp("slow", jQuery.proxy(function() {
        this.toggleButton_.html("&#8659;");
        this.consoleContents_.empty();
      }, this));
    } else {
      this.consoleContents_.slideDown("slow", jQuery.proxy(function() {
        this.toggleButton_.html("&#8657;");
      }, this));
    }
  }, this));
};

rhizo.ui.component.Console.prototype.getContents = function() {
  return this.consoleContents_;
};

rhizo.ui.component.Console.prototype.getHeader = function() {
  return this.consoleHeader_;
};

rhizo.ui.component.RightBar = function() {};

rhizo.ui.component.RightBar.prototype.render = function(container, gui, opt_options) {
  gui.addComponent('rhizo.ui.component.RightBar', this);

  this.toggle_ = $('<div />', {'class': 'rhizo-right-pop'}).appendTo(container);
  this.rightBar_ = $('<div />', {'class': 'rhizo-right'}).css('display', 'none').
      appendTo(container);
};

rhizo.ui.component.RightBar.prototype.activate = function(gui, opt_options) {
  this.toggle_.click(jQuery.proxy(function() {
    if (this.rightBar_.is(":visible")) {
      this.toggle_.css('right', 0);
      gui.viewport.css('right', 5);
      this.rightBar_.css('display', 'none');
    } else {
      gui.viewport.css('right', 135);
      this.toggle_.css('right', 130);
      this.rightBar_.css('display', '');
    }
  }, this));
};

rhizo.ui.component.RightBar.prototype.getToggle = function() {
  return this.toggle_;
};

rhizo.ui.component.RightBar.prototype.getPanel = function() {
  return this.rightBar_;
};

rhizo.ui.component.Layout = function() {};

rhizo.ui.component.Layout.prototype.getPanel = function() {
  return this.layoutPanel_;
};

rhizo.ui.component.Layout.prototype.render = function(container, project, gui, opt_options) {
  gui.addComponent('rhizo.ui.component.Layout', this);
  var options = opt_options || {};

  if (!options.touchLayout) {
    $('<div />', {'class': 'rhizo-filters-header'}).
        text('Display').
        appendTo(container);
  }

  this.layoutPanel_ = $('<div />').appendTo(container);
  this.layoutOptions_ = $('<div />', {'class': 'rhizo-layout-extra-options'}).appendTo(this.layoutPanel_);

  if (options.touchLayout) {
    this.layoutPanel_.addClass('rhizo-floating-panel').css('display', 'none');
  }

  this.layoutSelector_ = $("<select />");
  this.detailsMap_ = {};
  var layoutEngines = project.layoutEngines();
  for (var layoutEngineName in layoutEngines) {
    var layoutEngine = layoutEngines[layoutEngineName];
    this.layoutSelector_.append(
      $("<option value='" + layoutEngineName + "' " +
        (project.currentLayoutEngineName() == layoutEngineName ? "selected" : "") +
        ">" + layoutEngine  + "</option>"));
    if (layoutEngine.details) {
	var details = layoutEngine.details();
	this.detailsMap_[layoutEngineName] = details;
        if (project.currentLayoutEngineName() != layoutEngineName) {
          details.css("display","none");
        }
        this.layoutOptions_.append(details);
    }
  }

  this.submit_ = $('<button />').text('Update');
  this.layoutPanel_.prepend(this.submit_).
      prepend(this.layoutSelector_).
      prepend("Keep items ordered by: ");
};

rhizo.ui.component.Layout.prototype.activate = function(project, gui, opt_options) {
  var detailsMap = this.detailsMap_;
  this.layoutSelector_.change(function(ev) {
    for (var layout in detailsMap) {
      if (layout == $(this).val()) {
        detailsMap[layout].show("fast");
      } else {
        detailsMap[layout].hide("fast");
      }
    }
  });

  this.submit_.click(jQuery.proxy(function() {
    // TODO(battlehorse): forceAlign should be true only if there are
    // uncommitted filters (i.e. GREY models).
    project.layout(this.layoutSelector_.val(), {forcealign:true});
  }, this));
};

rhizo.ui.component.SelectionManager = function() {};

rhizo.ui.component.SelectionManager.prototype.getPanel = function() {
  return this.selectionPanel_;
};

rhizo.ui.component.SelectionManager.prototype.render = function(container, project, gui, opt_options) {
  gui.addComponent('rhizo.ui.component.SelectionManager', this);

  var options = opt_options || {};

  if (!options.touchLayout) {
    $('<div />', {'class': 'rhizo-filters-header'}).
        text('Selection').
        appendTo(container);
  }

  this.selectionPanel_ = $('<div />', {'class': 'rhizo-selection'}).
      appendTo(container);

  if (options.touchLayout) {
    this.selectionPanel_.addClass('rhizo-floating-panel').css('display', 'none');
  }

  this.selection_trigger_ = $('<div />', {
      'class': 'rhizo-selection-trigger',
      'title': 'Start selecting items'}).appendTo(gui.viewport);

  this.selectButton_ = $('<button />').text('Work on selected items only');
  this.resetButton_ = $('<button />', {disabled: 'disabled'}).text('Reset');
  this.selectionPanel_.append(this.selectButton_).append(this.resetButton_);
};

rhizo.ui.component.SelectionManager.prototype.activate = function(project, gui, opt_options) {
  this.activateSelectableViewport_(project, gui, opt_options);
  this.activateButtons_(project, opt_options);
};

rhizo.ui.component.SelectionManager.prototype.activateButtons_ = function(project, opt_options) {
  //TODO(battlehorse): consolidate this filtering operations inside Project.
  this.selectButton_.click(jQuery.proxy(function(ev) {
    var countSelected = 0;
    for (var id in project.allSelected()) { countSelected++; };
    if (countSelected == 0) {
      project.logger().error("No items selected");
      return;
    }

    var allUnselected = project.allUnselected();
    var countFiltered = 0;
    for (var id in allUnselected) {
      allUnselected[id].filter("__selection__"); // hard-coded keyword
      countFiltered++;
    }

    // after filtering some elements, perform layout again
    project.alignFx();
    project.layout(null, {filter: true, forcealign: true});
    project.unselectAll();
    this.resetButton_.
        removeAttr("disabled").
        text("Reset (" + countFiltered + " filtered)");
  }, this));


  this.resetButton_.click(function(ev) {
    project.resetAllFilter("__selection__");
    project.alignFx();
    // after filtering some elements, perform layout again
    project.layout(null, {filter: true, forcealign: true});
    $(this).attr("disabled","disabled").text("Reset");
  });
};

/**
   Checks whether an event was raised on empty space, i.e. somewhere in the
   viewport, but not on top of any models or any other elements.

   Since the viewport and the universe may be not on top of each other, the
   method checks whether any of the two is the original target of the event.

   @params {Event} the event to inspect.
   @returns {boolean} true if the click occurred on the viewport, false
     otherwise.
 */
rhizo.ui.component.SelectionManager.prototype.isOnEmptySpace_ = function(evt) {
  return $(evt.target).hasClass('rhizo-viewport') ||
         $(evt.target).hasClass('rhizo-universe');
};

rhizo.ui.component.SelectionManager.prototype.activateSelectableViewport_ =
    function(project, gui, opt_options) {
  this.selection_trigger_.click(function() {
    project.gui().toggleSelectionMode();
    if (project.gui().isSelectionModeOn()) {
      $(this).attr('title', 'Stop selecting items');
    } else {
      $(this).attr('title', 'Start selecting items');
    }
  });

  gui.viewport.selectable({
    disabled: true,  // initially disabled.
    selected: function(ev, ui) {
      var selected_id = $(ui.selected).data("id");
      if (selected_id) {
        project.select(selected_id);
      }
    },
    unselected: function(ev, ui) {
      var unselected_id = $(ui.unselected).data("id");
      if (unselected_id) {
        project.unselect(unselected_id);
      }
    },
    // TODO: disabled until incremental refresh() is implemented
    // autoRefresh: false,
    filter: opt_options.selectfilter,
    tolerance: 'touch',
    distance: 1
  });

  gui.viewport.click(jQuery.proxy(function(ev, ui) {
    if (this.isOnEmptySpace_(ev)) {
      project.unselectAll();
    }
  }, this));
};


rhizo.ui.component.Filters = function() {};

rhizo.ui.component.Filters.prototype.getPanel = function() {
  return this.filterPanel_;
};

rhizo.ui.component.Filters.prototype.render = function(container, project, gui, opt_options) {
  gui.addComponent('rhizo.ui.component.Filters', this);
  var options = opt_options || {};

  if (!options.touchLayout) {
    $('<div />', {'class': 'rhizo-filters-header'}).
        text('Filters').
        appendTo(container);
  }

  this.filterPanel_ = $('<div />', {'class': 'rhizo-filter-container'}).appendTo(container);

  this.nextFilter_ = null;
  this.prevFilter_ = null;
  this.hideLink_ = null;
  if (options.touchLayout) {
    this.filterPanel_.addClass('rhizo-floating-panel').css('display', 'none');

    this.nextFilter_ = $('<span />', {'class': 'rhizo-next-filter', title: 'Next filter'}).
      appendTo(this.filterPanel_);
    this.prevFilter_ = $('<span />', {'class': 'rhizo-prev-filter', title: 'Previous filter'}).
      appendTo(this.filterPanel_);
    this.hideLink_ = $('<a />', {'href': '#', 'class': 'rhizo-autocommit-link'}).text('Apply').
      appendTo(this.filterPanel_);
    if (project.isFilterAutocommit()) {
      this.hideLink_.css('display', 'none');
    }
  }

  var autocommitPanel = $('<div />', {'class': 'rhizo-filter rhizo-autocommit-panel'}).
      appendTo(this.filterPanel_);
  this.autocommit_ = $('<input />', {type: 'checkbox',
                                     checked: project.isFilterAutocommit()}).
    appendTo(autocommitPanel);
  $('<span>Autocommit</span>').appendTo(autocommitPanel);
  this.hideButton_ = $('<button />', {disabled: project.isFilterAutocommit()}).
      text('Apply filters').appendTo(autocommitPanel);

  var first = true;
  var metaModel = project.metaModel();
  for (key in metaModel) {
    var filter = metaModel[key].kind.renderFilter(project, metaModel[key], key);
    if (options.touchLayout) {
      if (first) {
        first = false;
      } else {
        filter.css('display', 'none');
      }
    }
    this.filterPanel_.append(filter);
  }
};

rhizo.ui.component.Filters.prototype.activate = function(project, gui, opt_options) {
  // Every single filter implementation auto-activates itself when created.
  // Here we only need to activate the navigation between filters.
  if (this.nextFilter_) {
    this.nextFilter_.click(function() {
      var current = $('.rhizo-filter:visible');
      var next = current.next('.rhizo-filter:hidden').eq(0);
      if (next.length > 0) {
        // cannot use hide/show otherwise safari clips rendering
        current.css('display', 'none');
        next.css('display', '');
      }
    });
  }

  if (this.prevFilter_) {
    this.prevFilter_.click(function() {
      var current = $('.rhizo-filter:visible');
      var prev = current.prev('.rhizo-filter:hidden').eq(0);
      if (prev.length > 0) {
        // cannot use hide/show otherwise safari clips rendering
        current.css('display', 'none');
        prev.css('display', '');
      }
    });
  }

  this.autocommit_.click(jQuery.proxy(function(ev) {
    var checked = $(ev.target).is(':checked');
    if (checked) {
      this.hideButton_.attr('disabled', 'disabled');
      if (this.hideLink_) {
        this.hideLink_.css('display', 'none');
      }
    } else {
      this.hideButton_.removeAttr('disabled');
      if (this.hideLink_) {
        this.hideLink_.css('display', '');
      }
    }
    project.enableFilterAutocommit(checked);
  }, this));

  this.hideButton_.click(function() {
    project.commitFilter();
  });
  if (this.hideLink_) {
    this.hideLink_.click(function() {
      project.commitFilter();
    });
  }
};

rhizo.ui.component.Legend = function() {};

rhizo.ui.component.Legend.prototype.getPanel = function() {
  return this.legendPanel_;
};

rhizo.ui.component.Legend.prototype.render = function(container, project, gui, opt_options) {
  gui.addComponent('rhizo.ui.component.Legend', this);
  var options = opt_options || {};

  var sizeRange = null;
  if (project.renderer().getSizeRange) {
    sizeRange = project.renderer().getSizeRange();
  }
  var colorRange = null;
  if (project.renderer().getColorRange) {
    colorRange = project.renderer().getColorRange();
  }

  if (!options.touchLayout) {
    $('<div />', {'class': 'rhizo-filters-header'}).
    text('Legend').
    appendTo(container);
  }

  this.legendPanel_ = $('<div />', {'class': "rhizo-legend-panel"}).appendTo(container);

  if (options.touchLayout) {
    this.legendPanel_.addClass('rhizo-floating-panel').css('display', 'none');
  }

  if (sizeRange) {
    var panel = $('<div />', {'class': 'rhizo-legend-size'});
    var minLabel = $('<span />', {'class': 'rhizo-legend-size-min'}).html(
        sizeRange.label + ' &nbsp; ' + rhizo.ui.toHumanLabel(sizeRange.min) + ':');
    var maxLabel = $('<span />', {'class': 'rhizo-legend-size-max'}).html(
        ': ' + rhizo.ui.toHumanLabel(sizeRange.max));

    panel.append(minLabel).append(
        '<span class="ar-fon-0">A</span> -- ' +
        '<span class="ar-fon-5">A</span>').
        append(maxLabel).appendTo(this.legendPanel_);
  }

  if (colorRange) {
    var panel = $('<div />', {'class': 'rhizo-legend-color'});
    var minLabel = $('<span />', {'class': 'rhizo-legend-color-min'}).html(
        colorRange.label + ' &nbsp; ' + rhizo.ui.toHumanLabel(colorRange.min) + ':');
    var maxLabel = $('<span />', {'class': 'rhizo-legend-color-max'}).html(
        ': ' + rhizo.ui.toHumanLabel(colorRange.max));

    panel.append(minLabel).append(
        '<span class="ar-col-0 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;' +
        '<span class="ar-col-1 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;' +
        '<span class="ar-col-2 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;' +
        '<span class="ar-col-3 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;' +
        '<span class="ar-col-4 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;' +
        '<span class="ar-col-5 ar-col-legend">&nbsp; &nbsp;</span>&nbsp;').
        append(maxLabel).appendTo(this.legendPanel_);
  }
};

rhizo.ui.component.Legend.prototype.activate = function(project, gui, opt_options) {};

rhizo.ui.component.Actions = function() {};

rhizo.ui.component.Actions.prototype.render = function(container, project, gui, opt_options) {
  var actionsContainer = $('<div />', {'class': 'rhizo-actions'}).
    append($("<h1 />").text('Actions')).appendTo(container);

  // Create 2 sample actions
  for (var i = 0; i < 2; i++) {
    $('<div />', {'class': 'rhizo-action'}).text('Sample Action ' + (i+1)).appendTo(actionsContainer);
  }
};

rhizo.ui.component.Actions.prototype.activate = function(project, gui, opt_options) {
  if ($('.rhizo-action').length > 0) {
    $('.rhizo-action').draggable({helper: 'clone'});
    gui.universe.droppable({
      accept: '.rhizo-action',
      drop: function(ev, ui) {
        var offset = gui.universe.offset();
        var rightBorder = gui.universe.width();
        var bottomBorder = gui.universe.height();

        var actionName = ui.draggable.text();

        var left = ui.offset.left - offset.left;
        if ((left + 200) > rightBorder) {
          left = rightBorder - 210;
        }

        var top = ui.offset.top - offset.top;
        if ((top + 200) > bottomBorder) {
          top = bottomBorder - 210;
        }

        var dropbox = $("<div class='rhizo-droppable-action'>" +
                        "Drop your items here to perform:<br />" +
                        actionName  +"</div>").css({top: top, left: left});

        gui.universe.append(dropbox);
        dropbox.fadeIn();
        dropbox.draggable();
        dropbox.droppable({
          accept: '.rhizo-model',
          drop: function(ev, ui) {
            var id = ui.draggable.data("id");
            if (!project.isSelected(id)) {
              alert("Action applied on " + project.model(id));
              ui.draggable.move(ui.draggable.data("dropTop0"),
                                ui.draggable.data("dropLeft0"));
            } else {
              var countSelected = 0;
              var all_selected = project.allSelected();
              for (var id in all_selected) { countSelected++;}
              alert("Action applied on " + countSelected + " elements");

              for (var id in all_selected) {
                all_selected[id].rendering.move(
                  all_selected[id].rendering.data("dropTop0"),
                  all_selected[id].rendering.data("dropLeft0"));
              }
              project.unselectAll();
            }
          }
        });

        dropbox.dblclick(function() {
          dropbox.remove();
          return false;
        });
      }
    });
  }
};

rhizo.ui.component.TouchTemplate = function(project) {
  this.project_ = project;
  this.gui_ = project.gui();
  this.components_ = {
    // chrome components
    LOGO: new rhizo.ui.component.Logo(),
    VIEWPORT: new rhizo.ui.component.Viewport(),

    // dynamic components
    LAYOUT: new rhizo.ui.component.Layout(),
    SELECTION_MANAGER: new rhizo.ui.component.SelectionManager(),
    FILTERS: new rhizo.ui.component.Filters(),
    LEGEND: new rhizo.ui.component.Legend(),
    MINITOOLBAR: new rhizo.ui.component.MiniToolbar()
  };
};

rhizo.ui.component.TouchTemplate.prototype.renderChrome = function(opt_options) {
  this.components_.VIEWPORT.render(this.gui_.container, this.gui_, opt_options);
  this.progress_ = new rhizo.ui.component.Progress(this.gui_.viewport);

  this.progress_.update(10, 'Creating static UI...');
  this.bottomBar_ = $('<div />', {'class': "rhizo-bottom-bar"}).appendTo(this.gui_.container);
  this.components_.LOGO.render(this.bottomBar_, this.gui_, opt_options);
  this.progress_.update(25, 'All static UI created.');
};

rhizo.ui.component.TouchTemplate.prototype.activateChrome = function(opt_options) {
  this.progress_.update(26, 'Activating static UI...');
  this.components_.VIEWPORT.activate(this.gui_, opt_options);
  this.progress_.update(33, 'Loading models...');
};

rhizo.ui.component.TouchTemplate.prototype.renderDynamic = function(opt_options) {
  this.progress_.update(34, 'Creating dynamic controls...');
  this.components_.LAYOUT.render(this.bottomBar_, this.project_, this.gui_, opt_options);
  this.progress_.update(36, 'Layout engine created.');
  this.components_.SELECTION_MANAGER.render(this.bottomBar_, this.project_, this.gui_, opt_options);
  this.progress_.update(40, 'Selection manager created.');
  this.components_.FILTERS.render(this.bottomBar_, this.project_, this.gui_, opt_options);
  this.progress_.update(44, 'Filters created.');

  if (this.project_.renderer().getSizeRange ||
      this.project_.renderer().getColorRange) {
    this.components_.LEGEND.render(this.bottomBar_,
                                   this.project_,
                                   this.gui_,
                                   opt_options);
    this.progress_.update(46, 'Legend created.');
  }

  // All other components must be in place before creating the toolbar.
  this.components_.MINITOOLBAR.render(this.bottomBar_, this.project_, this.gui_, opt_options);
  this.progress_.update(48, 'Toolbar created.');
};

rhizo.ui.component.TouchTemplate.prototype.activateDynamic = function(opt_options) {
  this.progress_.update(51, 'Activating dynamic controls...');
  this.components_.LAYOUT.activate(this.project_, this.gui_, opt_options);
  this.components_.SELECTION_MANAGER.activate(this.project_, this.gui_, opt_options);
  this.components_.FILTERS.activate(this.project_, this.gui_, opt_options);
  this.components_.LEGEND.activate(this.project_, this.gui_, opt_options);
  this.components_.MINITOOLBAR.activate(this.project_, this.gui_, opt_options);
  this.progress_.update(66, 'Rhizosphere controls are ready.');
};

rhizo.ui.component.TouchTemplate.prototype.done = function() {
  this.progress_.update(100, 'Rhizosphere ready!');
};



rhizo.ui.component.StandardTemplate = function(project) {
  this.project_ = project;
  this.gui_ = project.gui();
  this.components_ = {
    // chrome components
    LOGO: new rhizo.ui.component.Logo(),
    VIEWPORT: new rhizo.ui.component.Viewport(),
    RIGHTBAR: new rhizo.ui.component.RightBar(),
    CONSOLE: new rhizo.ui.component.Console(),

    // dynamic components
    LAYOUT: new rhizo.ui.component.Layout(),
    SELECTION_MANAGER: new rhizo.ui.component.SelectionManager(),
    FILTERS: new rhizo.ui.component.Filters(),
    LEGEND: new rhizo.ui.component.Legend(),
    ACTIONS: new rhizo.ui.component.Actions()
  };
};

rhizo.ui.component.StandardTemplate.prototype.renderChrome = function(opt_options) {
  this.components_.VIEWPORT.render(this.gui_.container, this.gui_, opt_options);
  this.progress_ = new rhizo.ui.component.Progress(this.gui_.viewport);

  this.leftBar_= $('<div/>', {'class': 'rhizo-left'}).appendTo(this.gui_.container);
  this.components_.RIGHTBAR.render(this.gui_.container, this.gui_, opt_options);

  this.progress_.update(10, 'Creating static UI...');
  this.components_.LOGO.render(this.leftBar_, this.gui_, opt_options);
  this.components_.CONSOLE.render(
      this.components_.RIGHTBAR.getPanel(),
      this.gui_,
      opt_options);
  this.progress_.update(25, 'All static UI created.');
};

rhizo.ui.component.StandardTemplate.prototype.activateChrome = function(opt_options) {
  this.progress_.update(26, 'Activating static UI...');

  this.components_.RIGHTBAR.activate(this.gui_, opt_options);
  this.components_.CONSOLE.activate(this.gui_, opt_options);
  this.components_.VIEWPORT.activate(this.gui_, opt_options);
  this.progress_.update(33, 'Loading models...');
};

rhizo.ui.component.StandardTemplate.prototype.renderDynamic =
    function(opt_options) {
  this.progress_.update(34, 'Creating dynamic controls...');
  this.components_.LAYOUT.render(this.leftBar_, this.project_, this.gui_, opt_options);
  this.progress_.update(38, 'Layout engine created.');
  this.components_.SELECTION_MANAGER.render(this.leftBar_, this.project_, this.gui_, opt_options);
  this.progress_.update(42, 'Selection manager created.');
  this.components_.FILTERS.render(this.leftBar_, this.project_, this.gui_, opt_options);
  this.progress_.update(46, 'Filters created.');

  if (this.project_.renderer().getSizeRange ||
      this.project_.renderer().getColorRange) {
    this.components_.LEGEND.render(this.leftBar_,
                                   this.project_,
                                   this.gui_,
                                   opt_options);
    this.progress_.update(48, 'Legend created.');
  }
  this.components_.ACTIONS.render(
      this.components_.RIGHTBAR.getPanel(),
      this.project_,
      this.gui_,
      opt_options);
  this.progress_.update(50, 'Actions created');
};

rhizo.ui.component.StandardTemplate.prototype.activateDynamic =
    function(opt_options) {
  this.progress_.update(51, 'Activating dynamic controls...');
  this.components_.LAYOUT.activate(this.project_, this.gui_, opt_options);
  this.components_.SELECTION_MANAGER.activate(this.project_, this.gui_, opt_options);
  this.components_.FILTERS.activate(this.project_, this.gui_, opt_options);
  this.components_.LEGEND.activate(this.project_, this.gui_, opt_options);
  this.components_.ACTIONS.activate(this.project_, this.gui_, opt_options);
  this.progress_.update(66, 'Rhizosphere controls are ready.');
};

rhizo.ui.component.StandardTemplate.prototype.done = function() {
  this.progress_.update(100, 'Rhizosphere ready!');
};
