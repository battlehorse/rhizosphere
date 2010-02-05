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
  this.pbarPanel_ = $('<div/>', {class: 'rhizo-progressbar-panel'}).appendTo(container);
  var pbar = $('<div/>', {class: 'rhizo-progressbar'}).appendTo(this.pbarPanel_);
  this.pbar_ = pbar.progressbar({value: 1});
  this.pbarText_ = $('<div/>', {class: 'rhizo-progressbar-text'}).
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

rhizo.ui.component.Logo.prototype.render = function(container, gui, opt_options) {
 $('<div class="rhizo-header"><h1>Rhizosphere</h1><p>' +
    'by <a href="mailto:battlehorse@gmail.com">Riccardo Govoni</a> (c) 2010<br />' +
    '<a href="http://sites.google.com/site/rhizosphereui/" target="_blank">Project info</a>' +
    '&nbsp;' +
    '<a href="http://sites.google.com/site/rhizosphereui/Home/documentation" target="_blank" ' +
    'style="font-weight:bold; text-decoration: underline">I Need Help!</a>' +
    '</p></div>').appendTo(container);
};

rhizo.ui.component.Viewport = function() {};

rhizo.ui.component.Viewport.prototype.render = function(container, gui, opt_options) {
  var options = opt_options || {};

  this.viewport_ = $('<div/>', {class: 'rhizo-viewport'}).appendTo(container);
  this.universe_ = $('<div/>', {class: 'rhizo-universe'}).appendTo(this.viewport_);

  // Update the GUI object.
  gui.setViewport(this.viewport_);
  gui.setUniverse(this.universe_);

  this.scroll_trigger_ = $('<div/>', {
      class: 'rhizo-scroll-trigger',
      title: 'Click to pan around',
    }).appendTo(this.viewport_);

  this.scroll_overlay_ = $('<div />', {class: 'rhizo-scroll-overlay'}).
      css('display', 'none').appendTo(container);
  this.scroll_done_ = $('<button />', {class: 'rhizo-scroll-done'}).text('Done');
  $('<div />').append(this.scroll_done_).appendTo(this.scroll_overlay_);

  if (options.miniLayout) {
    this.viewport_.addClass('rhizo-miniRender');
    this.scroll_overlay_.addClass('rhizo-miniRender');
  } else {
    // shrink the viewport
    this.viewport_.css('left',300).css('right', 5);
  }
};

rhizo.ui.component.Viewport.prototype.activate = function(gui, opt_options) {
  this.scroll_trigger_.click(
      jQuery.proxy(rhizo.ui.component.Viewport.prototype.startScroll_, this));
  this.scroll_done_.click(
      jQuery.proxy(rhizo.ui.component.Viewport.prototype.stopScroll_, this));
};

rhizo.ui.component.Viewport.prototype.startScroll_ = function() {
  var dragDelta = {
    top: this.viewport_.offset().top +
         this.universe_.offset().top,
    left: this.viewport_.offset().left +
          this.universe_.offset().left
  };

  this.scroll_trigger_.hide();
  this.scroll_overlay_.css({
      'left': this.viewport_.css('left'),
      'top': this.viewport_.css('top'),
      'width': this.viewport_.width(),
      'height': this.viewport_.height(),
      'z-index': 99,
      'display': ''
    });

  this.scroll_overlay_.draggable({
    helper: function() {
      return $("<div />");
    },
    start: jQuery.proxy(function(ev, ui) {
      var offset = this.universe_.offset();
      this.universe_.data("top0", offset.top).data("left0", offset.left);
    }, this),
    drag: jQuery.proxy(function(ev, ui) {
      var offset = this.universe_.offset();
      var dragTop = ui.position.top +
                    this.universe_.data("top0") - dragDelta.top;
      var dragLeft = ui.position.left +
                     this.universe_.data("left0") - dragDelta.left;

      this.universe_.
          css('top', dragTop).css('bottom', -dragTop).
          css('left', dragLeft).css('right', -dragLeft);
    }, this),
    refreshPositions: false
  });
};

rhizo.ui.component.Viewport.prototype.stopScroll_ = function() {
  this.scroll_overlay_.css({
      'z-index': -1,
      'display': 'none'
    });
  this.scroll_trigger_.show();
};

rhizo.ui.component.MiniToolbar = function() {};

rhizo.ui.component.MiniToolbar.prototype.render = function(container, gui, opt_options) {
  $(
    '<span>' +
      '<a href="" onclick="return false" id="rhizo-link-help" title="Help" >?</a>' +
      '<a href="" onclick="self.resizeTo(1000,700);self.reload();" title="Maximize" class="rhizo-maximize-icon"></a>' +
    '</span>' +
    '<span class="rhizo-filters-header"><a href="" onclick="return false;" id="rhizo-link-display" >Display</a></span>' +
    '<span class="rhizo-filters-header"><a href="" onclick="return false;" id="rhizo-link-selection" >Selection</a></span>' +
    '<span class="rhizo-filters-header"><a href="" onclick="return false;" id="rhizo-link-filters" >Filters</a></span>' +
    '<span class="rhizo-filters-header"><a href="" onclick="return false;" id="rhizo-legend" style="display: none">Legend</a></span>'
    ).appendTo(container);
};

rhizo.ui.component.MiniToolbar.prototype.activate = function(gui, opt_options) {

  // TODO(battlehorse): needs fixing!
  var panels = [
    { panel: '#rhizo-update-layout', link: '#rhizo-link-display'},
    { panel: '#rhizo-selection', link: '#rhizo-link-selection'},
    { panel: '#rhizo-filter-container', link: '#rhizo-link-filters'},
    { panel: '#rhizo-help', link: '#rhizo-link-help'},
    { panel: '#rhizo-legend-panel',  link: '#rhizo-legend'}];

  panels.forEach(function(currentPanel) {
    $(currentPanel.link).click(function() {
      panels.forEach(function(p) {
        if (p.panel == currentPanel.panel) {
          $(p.panel).toggle();
          $(p.link).toggleClass('rhizo-filter-open');
        } else {
          $(p.panel).css('display', 'none');
          $(p.link).removeClass('rhizo-filter-open');
        }
      });
      return false;
    });
  });
};


rhizo.ui.component.Console = function() {};

rhizo.ui.component.Console.prototype.render = function(container, gui, opt_options) {
  gui.addComponent('rhizo.ui.component.Console', this);

  this.toggleButton_ = $('<div />', {class: 'rhizo-console-close'}).html('&#8659;');

  this.consoleHeader_ = $('<div />', {class: 'rhizo-console-header'});
  this.consoleHeader_.append(this.toggleButton_).append('Log Console');
  this.consoleHeader_.appendTo(container);

  this.consoleContents_ = $('<div />', {class: 'rhizo-console-contents'});
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

  this.toggle_ = $('<div />', {class: 'rhizo-right-pop'}).appendTo(container);
  this.rightBar_ = $('<div />', {class: 'rhizo-right'}).css('display', 'none').
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

rhizo.ui.component.RightBar.prototype.getBar = function() {
  return this.rightBar_;
};

rhizo.ui.component.Layout = function() {};

rhizo.ui.component.Layout.prototype.render = function(container, project, gui, opt_options) {
  var options = opt_options || {};

  if (!options.miniLayout) {
    $('<div />', {class: 'rhizo-filters-header'}).
        text('Display').
        appendTo(container);
  }

  this.layoutPanel_ = $('<div />').appendTo(container);
  this.layoutOptions_ = $('<div />', {class: 'rhizo-layout-extra-options'}).appendTo(this.layoutPanel_);

  if (options.miniLayout) {
    this.layoutPanel_.addClass('rhizo-floating-panel').css('display', 'none');
  }

  this.layoutSelector_ = $("<select />");
  this.detailsMap_ = {};
  if (rhizo.layout && rhizo.layout.layouts) {
    for (layout in rhizo.layout.layouts){
      var engine_ctor = rhizo.layout.layouts[layout];
      var engine = new engine_ctor(project);
      this.layoutSelector_.append($("<option value='" + layout + "'>" + engine  + "</option>"));
      if (engine.details) {
	var details = engine.details();
	this.detailsMap_[layout] = details;
	this.layoutOptions_.append(details.css("display","none"));
      }
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
    for (layout in detailsMap) {
      if (layout == $(this).val()) {
        detailsMap[layout].show("fast");
      } else {
        detailsMap[layout].hide("fast");
      }
    }
  });

  this.submit_.click(jQuery.proxy(function() {
    project.layout(this.layoutSelector_.val());
  }, this));
};

rhizo.ui.component.SelectionManager = function() {};

rhizo.ui.component.SelectionManager.prototype.render = function(container, project, gui, opt_options) {
  var options = opt_options || {};

  if (!options.miniLayout) {
    $('<div />', {class: 'rhizo-filters-header'}).
        text('Selection').
        appendTo(container);
  }

  this.selectionFilter_ = $('<div />', {class: 'rhizo-selection'}).
      appendTo(container);

  if (options.miniLayout) {
    this.selectionFilter_.addClass('rhizo-floating-panel').css('display', 'none');
  }
  this.selectButton_ = $('<button />').text('Work on selected items only');
  this.resetButton_ = $('<button />', {disabled: 'disabled'}).text('Reset');
  this.selectionFilter_.append(this.selectButton_).append(this.resetButton_);
};

rhizo.ui.component.SelectionManager.prototype.activate = function(project, gui, opt_options) {
  this.activateSelectableViewport_(project, gui, opt_options);
  this.activateButtons_(project, opt_options);
};

rhizo.ui.component.SelectionManager.prototype.activateButtons_ = function(project, opt_options) {
  this.selectButton_.click(jQuery.proxy(function(ev) {
    var countSelected = 0;
    for (id in project.allSelected()) { countSelected++ };
    if (countSelected == 0) {
      project.logger().error("No items selected");
      return;
    }

    var allUnselected = project.allUnselected();
    var countFiltered = 0;
    for (id in allUnselected) {
      allUnselected[id].filter("__selection__"); // hard-coded keyword
      countFiltered++;
    }
    // after filtering some elements, perform layout again
    project.alignVisibility();
    project.layout(null, { filter: true});
    project.unselectAll();
    this.resetButton_.
        removeAttr("disabled").
        text("Reset (" + countFiltered + " filtered)");
  }, this));


  this.resetButton_.click(function(ev) {
    project.resetAllFilter("__selection__");
    // after filtering some elements, perform layout again
    project.alignVisibility();
    project.layout(null, { filter: true});
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
  gui.viewport.selectable({
    selected: function(ev, ui) {
      if (ui.selected.id) {
        project.select(ui.selected.id);
      }
    },
    unselected: function(ev, ui) {
      if (ui.unselected.id) {
        project.unselect(ui.unselected.id);
      }
    },
    // TODO: disabled until incremental refresh() is implemented
    // autoRefresh: false,
    filter: opt_options.selectfilter,
    tolerance: 'touch',
    distance: 1
  });

  var that = this;
  gui.viewport.click(function(ev, ui) {
    if (that.isOnEmptySpace_(ev)) {
      project.unselectAll();
    }
  });
};


rhizo.ui.component.Filters = function() {};

rhizo.ui.component.Filters.prototype.render = function(container, project, gui, opt_options) {
  var options = opt_options || {};

  if (!options.miniLayout) {
    $('<div />', {class: 'rhizo-filters-header'}).
        text('Filters').
        appendTo(container);
  }

  this.filterPanel_ = $('<div />', {class: 'rhizo-filter-container'}).appendTo(container);

  this.nextFilter_ = null;
  this.prevFilter_ = null;
  if (options.miniLayout) {
    this.filterPanel_.addClass('rhizo-floating-panel').css('display', 'none');

    this.nextFilter_ = $('<span />', {class: 'rhizo-next-filter', title: 'Next filter'}).
      appendTo(this.filterPanel_);
    this.prevFilter_ = $('<span />', {class: 'rhizo-prev-filter', title: 'Previous filter'}).
      appendTo(this.filterPanel_);
  }

  var first = true;
  var metaModel = project.metaModel();
  for (key in metaModel) {
    var filter = metaModel[key].kind.renderFilter(project, metaModel[key], key);
    if (options.miniLayout) {
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
};

rhizo.ui.component.Legend = function() {};

rhizo.ui.component.Legend.prototype.render = function(container, project, gui, opt_options) {
  var options = opt_options || {};

  var sizeRange = null;
  if (project.renderer().getSizeRange) {
    sizeRange = project.renderer().getSizeRange();
  }
  var colorRange = null;
  if (project.renderer().getColorRange) {
    colorRange = project.renderer().getColorRange();
  }

  if (!options.miniLayout) {
    $('<div />', {class: 'rhizo-filters-header'}).
    text('Legend').
    appendTo(container);
  }

  this.legendPanel_ = $('<div />', {class: "rhizo-legend-panel"}).appendTo(container);

  if (options.miniLayout) {
    this.legendPanel_.addClass('rhizo-floating-panel').css('display', 'none');

    // TODO(battlehorse): this direct reference to an element declared elsewhere
    // should not be here, as it creates an underwater dependency between components. 
    $('#rhizo-legend').show();
  }

  if (sizeRange) {
    var panel = $('<div />', {class: 'rhizo-legend-size'});
    var minLabel = $('<span />', {class: 'rhizo-legend-size-min'}).html(
        sizeRange.label + ' &nbsp; ' + rhizo.ui.toHumanLabel(sizeRange.min) + ':');
    var maxLabel = $('<span />', {class: 'rhizo-legend-size-max'}).html(
        ': ' + rhizo.ui.toHumanLabel(sizeRange.max));

    panel.append(minLabel).append(
        '<span class="ar-fon-0">A</span> -- ' +
        '<span class="ar-fon-5">A</span>').
        append(maxLabel).appendTo(this.legendPanel_);
  }

  if (colorRange) {
    var panel = $('<div />', {class: 'rhizo-legend-color'});
    var minLabel = $('<span />', {class: 'rhizo-legend-color-min'}).html(
        colorRange.label + ' &nbsp; ' + rhizo.ui.toHumanLabel(colorRange.min) + ':');
    var maxLabel = $('<span />', {class: 'rhizo-legend-color-max'}).html(
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
  $(
    '<div id="rhizo-actions">' +
      '<h1>Actions</h1>' +
      '<div class="rhizo-action" id="rhizo-action-2">' +
        'Sample Action 1' +
      '</div>' +
      '<div class="rhizo-action" id="rhizo-action-1">' +
        'Sample Action 2' +
      '</div>' +
    '</div>'
    ).appendTo(container);
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

        var left = ui.absolutePosition.left - offset.left;
        if ((left + 200) > rightBorder) {
          left = rightBorder - 210;
        }

        var top = ui.absolutePosition.top - offset.top;
        if ((top + 200) > bottomBorder) {
          top = bottomBorder - 210;
        }

        var dropbox = $("<div class='rhizo-droppable-action'>" +
                        "Drop your items here to perform:<br />" +
                        actionName  +"</div>")
          .css('position', 'absolute')
          .css('top', top)
          .css('left', left)
          .css('display', 'none');

        gui.universe.append(dropbox);
        dropbox.fadeIn();
        dropbox.draggable({
          start: function() { project.toggleSelection('disable'); },
          stop: function() { project.toggleSelection('enable'); }
        });
        dropbox.droppable({
          accept: '.rhizo-model',
          drop: function(ev, ui) {
            if (!project.isSelected(ui.draggable[0].id)) {
              var id = ui.draggable[0].id;
              alert("Action applied on " + project.model(id));
              $('#' + id).move($('#'+id).data("dropTop0"),
                               $('#'+id).data("dropLeft0"));
            } else {
              var countSelected = 0;
              for (var id in project.allSelected()) { countSelected++;}
              alert("Action applied on " + countSelected + " elements");

              for (var id in project.allSelected()) {
                $('#' + id).move($('#'+id).data("dropTop0"),
                                 $('#'+id).data("dropLeft0"));
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

rhizo.ui.component.MiniTemplate = function(project) {
  this.project_ = project;
  this.gui_ = project.gui();
  this.components_ = {
    // chrome components
    LOGO: new rhizo.ui.component.Logo(),
    VIEWPORT: new rhizo.ui.component.Viewport(),
    MINITOOLBAR: new rhizo.ui.component.MiniToolbar(),

    // dynamic components
    LAYOUT: new rhizo.ui.component.Layout(),
    SELECTION_MANAGER: new rhizo.ui.component.SelectionManager(),
    FILTERS: new rhizo.ui.component.Filters(),
    LEGEND: new rhizo.ui.component.Legend()
  };
};

rhizo.ui.component.MiniTemplate.prototype.renderChrome = function(opt_options) {
  this.components_.VIEWPORT.render(this.gui_.container, this.gui_, opt_options);
  this.progress_ = new rhizo.ui.component.Progress(this.gui_.viewport);
  this.bottomBar_ = $('<div id="rhizo-bottom-bar"></div>').appendTo(this.gui_.container);

  this.progress_.update(10, 'Creating static UI...');
  this.components_.MINITOOLBAR.render(this.bottomBar_, this.gui_, opt_options);

  var help_floating_panel = $('<div id="rhizo-help" class="rhizo-floating-panel" style="display:none"></div>').appendTo(this.bottomBar_);
  this.components_.LOGO.render(help_floating_panel, this.gui_, opt_options);
  this.progress_.update(25, 'All static UI created.');
};

rhizo.ui.component.MiniTemplate.prototype.activateChrome = function(opt_options) {
  this.progress_.update(26, 'Activating static UI...');
  this.components_.VIEWPORT.activate(this.gui_, opt_options);
  this.components_.MINITOOLBAR.activate(this.gui_, opt_options);
  this.progress_.update(33, 'Loading models...');
};

rhizo.ui.component.MiniTemplate.prototype.renderDynamic = function(opt_options) {
  this.progress_.update(34, 'Creating dynamic controls...');
  this.components_.LAYOUT.render(this.bottomBar_, this.project_, this.gui_, opt_options);
  this.progress_.update(38, 'Layout engine created.');
  this.components_.SELECTION_MANAGER.render(this.bottomBar_, this.project_, this.gui_, opt_options);
  this.progress_.update(42, 'Selection manager created.');
  this.components_.FILTERS.render(this.bottomBar_, this.project_, this.gui_, opt_options);
  this.progress_.update(46, 'Filters created.');

  if (this.project_.renderer().getSizeRange ||
      this.project_.renderer().getColorRange) {
    this.components_.LEGEND.render(this.bottomBar_,
                                   this.project_,
                                   this.gui_,
                                   opt_options);
    this.progress_.update(48, 'Legend created.');
  }
};

rhizo.ui.component.MiniTemplate.prototype.activateDynamic = function(opt_options) {
  this.progress_.update(51, 'Activating dynamic controls...');
  this.components_.LAYOUT.activate(this.project_, this.gui_, opt_options);
  this.components_.SELECTION_MANAGER.activate(this.project_, this.gui_, opt_options);
  this.components_.FILTERS.activate(this.project_, this.gui_, opt_options);
  this.components_.LEGEND.activate(this.project_, this.gui_, opt_options);
  this.progress_.update(66, 'Rhizosphere controls are ready.');
};

rhizo.ui.component.MiniTemplate.prototype.done = function() {
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

  this.leftBar_= $('<div/>', {class: 'rhizo-left'}).appendTo(this.gui_.container);
  this.components_.RIGHTBAR.render(this.gui_.container, this.gui_, opt_options);

  this.progress_.update(10, 'Creating static UI...');
  this.components_.LOGO.render(this.leftBar_, this.gui_, opt_options);
  this.components_.CONSOLE.render(
      this.components_.RIGHTBAR.getBar(),
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
      this.components_.RIGHTBAR.getBar(),
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
