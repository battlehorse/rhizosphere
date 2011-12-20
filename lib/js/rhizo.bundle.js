/* ./src/js/rhizo.jquery.xselectable.js */
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
 * NOTE: this is a raw copy of the xselectable jQuery plugin available at
 * https://github.com/battlehorse/jquery-xselectable. Update the code that
 * follows when the plugin changes.
 */

// NO CHANGES BELOW THIS LINE

/*
 * A jQuery plugin that mimics jQuery UI 'selectable' (see
 * http://jqueryui.com/demos/selectable/) while adding significant extras:
 *
 * - Selection works over Flash embeds. Flash embeds would normally swallow
 *   click events, causing the selection gesture not to terminate if the mouse
 *   were to be released within the Flash embed. This plugin separates the
 *   selection box from the selectable elements via glass panels to fix that.
 *
 * - Scrolling support. When the selectable container overflows the window
 *   viewport or the selectable elements overflow the selectable viewable
 *   viewport (causing scrollbars to appear on it) and the selection box is
 *   dragged toward the viewport borders, the viewport (either the document
 *   or the selectable) is scrolled accordingly to let the selection gesture
 *   continue until the viewport scrolling limits are hit.
 *   Scrolling management is pluggable, which allows for different scrolling
 *   implementations (in addition to the default one which relies on native
 *   browser scrolling functionality). For example, a Google Maps-like endless
 *   scrolling can be easily implemented.
 *
 * - Selection does not inadvertently trigger when the mouse down event
 *   occurs over scrollbars. See http://bugs.jqueryui.com/ticket/4441.
 *
 * - The plugin doesn't require any of jQuery UI machinery, but can be used
 *   directly on top of jQuery, possibly reducing the javascript payload used in
 *   the hosting page.
 *
 * The plugin semantics are similar to jQuery UI 'selectable' ones but not the
 * same. While it's fairly straightforward to replace jQuery UI plugin for
 * this, this pluging is not 100% compatible drop-in replacement due to a number
 * of differences:
 *
 * - The plugin deals only with box-selection. Single element selection by
 *   clicking on a selectable element must be implemented externally.
 *
 * - Multiple non-adjacent selections are not supported.
 *
 * - Not all of jQuery UI 'selectable' options are supported -- e.g. 'delay',
 *   'tolerance:fit' and refresh management.
 *
 * - Only event-based notification of plugin actions (selection start and stop,
 *   change in selected elements) is supported. Callback-based notification is
 *   not supported.
 *
 * - Only one 'selected' and 'unselected' event pair is fired at the end of the
 *   selection gesture, pointing to an array of all selected, unselected
 *   elements (contrary to jQuery UI plugin firing a separate event for each
 *   selected, unselected item).
 *
 * - Manual refresh management is delegated to external functionality (if the
 *   delevoper wants to adopt it) for better granularity: the developer becomes
 *   responsible for tracking the positions of all selectable elements (contrary
 *   to the jQuery UI plugin which only allows the developer to trigger a manual
 *   refresh, that will recompute all selectable elements' positions in bulk).
 *
 * - Different class prefixes are used for selectable statuses.
 *
 * Refer to http://github.com/battlehorse/jquery-xselectable for further info,
 * documentation and demos.
 */
(function ( $, window, document, undefined ) {

  var pluginName = 'xselectable';

  /**
   * Default configuration options. Can be overriden at plugin initialization
   * time or later using the 'option' method.
   */
  var defaultOptions = {

    // Tolerance, in pixels, for when selecting should start. If specified,
    // selecting will not start until after mouse is dragged beyond distance.
    distance: 0,

    // Whether the selectable behavior is enabled or not.
    disabled: false,

    // Prevents selecting if you start on elements matching the selector.
    cancel: ':input,option',

    // The matching child elements will be made able to be selected.
    filter: '*',

    // The minimum pixel distance, from the scrolling viewport border that
    // should trigger scrolling.
    scrollingThreshold: 100,

    // A multiplier to increase/decrease scrolling speed.
    scrollSpeedMultiplier: 1,

    // Custom scroller implementation. If null, the default one is used.
    //
    // The default scroller relies on native browser scrolling functionality
    // and deals with two specific cases (possibly concurrently):
    // - the selection container overflows the browser window viewport: the
    //   browser window is scrolled to let the selection box expand until it
    //   hits the selection container margins.
    // - the selectable content overflows the selection container viewport
    //   (causing the container to have scrollbars): the selectable content is
    //   scrolled to let the selection box expand until it hits the selectable
    //   content  margins.
    // Both conditions can happen at the same time, in which case the former
    // is addressed first, then the latter.
    //
    // If provided, it must be a function that accepts the element upon which
    // the plugin is applied and returns an object implementing the required
    // scroller methods (getScrollableElement, getScrollableDistance, scroll,
    // getScrollOffset, getScrollBorders). See 'contentScroller' for details.
    scroller: null,

    // Custom positioner implementation. The positioner is responsible for
    // computing selectable elements' positions when the selection gesture
    // starts, in order to correctly compute when the selection box touches
    // a selectable element.
    //
    // The default implementation computes selectables' positions via offset
    // measurement. This works accurately if the element the plugin applies to
    // (the selection container) is their offset parent.
    //
    // The default implementation recomputes selectables' positions every time
    // the selection gesture starts. This may be inefficient when many
    // selectable elements are present.
    //
    // Custom implementations may be provided to overcome the above
    // limitations. If provided, it must be a function that accepts a
    // selectable element (i.e. any element matching the 'filter' option) and
    // return an object containing the 'top', 'left', 'width', and 'height'
    // properties.
    //
    // 'top' and 'left' must define the distance, in pixels, of the top-left
    // corner of the selectable from the top-left corner of the selection
    // container, accurate at the time the call is made. 'width' and 'height'
    // must define the outer width and height (including border, but not
    // margin) of the selectable element.
    positioner: null
  };

  /**
   * A scroller to handle native document (browser window) scrolling when the
   * selection container overflows the window viewport. It triggers when the
   * selection box comes close to the browser window borders.
   *
   * @param {!Element} el The selection container, i.e. the element to which the
   *     plugin is applied to.
   */
  var documentScroller = function(el) {

    // Dimensions of the selection container
    var containerDimensions = $(el).data(pluginName).containerDimensions;

    // Browser window viewport dimensions
    var width = typeof(window.innerWidth) == 'number' ?
        window.innerWidth : document.documentElement.clientWidth;
    var height = typeof(window.innerHeight) == 'number' ?
        window.innerHeight : document.documentElement.clientHeight;

    // Browser document length
    var documentWidth = document.documentElement.scrollWidth,
        documentHeight = document.documentElement.scrollHeight;

    /**
     * @return {!Element} The DOM element which is scrolled when this scroller
     *     operates. For this scroller it's the documentElement or body.
     */
    function getScrollableElement() {
      return document.documentElement;
    }

    /**
     * Returns the top, right, bottom and left positions of the viewport
     * borders that should trigger scrolling when the selection box is dragged
     * close to them.
     *
     * @return {!Array.<number>} Positions of the scrolling viewport borders,
     *     respectively in the following order: top, right, bottom, left. All
     *     positions are relative to the top-left corner of the document.
     */
    function getScrollBorders() {
      var scrollTop = typeof(window.pageYOffset) == 'number' ?
          window.pageYOffset : document.documentElement.scrollTop;
      var scrollLeft = typeof(window.pageXOffset) == 'number' ?
          window.pageXOffset : document.documentElement.scrollLeft;

      return [scrollTop, scrollLeft + width, scrollTop + height, scrollLeft];
    }

    /**
     * Returns the available distance the scrolling viewport can still be
     * scrolled before reaching the selection container margins: even if the
     * document could scroll further past the selection container margins,
     * dragging the selection box does not cause further scrolling once the
     * selection container margins are in view.
     *
     * @return {!Array.<number>} Available scrolling distances (in px),
     *     respectively from the following margins: top, right, bottom, left.
     */
    function getScrollableDistances() {
      var scrollTop = typeof(window.pageYOffset) == 'number' ?
          window.pageYOffset : document.documentElement.scrollTop;
      var scrollLeft = typeof(window.pageXOffset) == 'number' ?
          window.pageXOffset : document.documentElement.scrollLeft;
      return [
          Math.max(scrollTop - containerDimensions.top, 0), 
          Math.max(
              containerDimensions.left + containerDimensions.width
              - scrollLeft - width, 0),
          Math.max(
              containerDimensions.top + containerDimensions.height
              - scrollTop - height, 0),
          Math.max(scrollLeft - containerDimensions.left, 0)];
    }

    /**
     * Scrolls the browser window viewport by the required amount.
     *
     * @param {string} scrollAxis The scrolling axis, either 'vertical' or
     *     'horizontal'.
     * @param {number} shift The scrolling amount, in pixels. If positive the
     *     scrolling direction should be downward / rightward. If negative,
     *     upward / leftward.
     */
    function scroll(scrollAxis, shift) {
      if (scrollAxis == 'vertical') {
        window.scrollBy(0, shift);
      } else {
        window.scrollBy(shift, 0);
      }
    }

    /**
     * Returns the offset, in pixels, that should be added to selectable
     * elements' positions (as computed by the plugin 'positioner'), to take
     * into account scrolling. This is not relevant when native browser
     * scrolling is used.
     *
     * @return {!Object.<string, number>} An object containing the 'top' and
     *     'left' properties, pointing respectively to the top and left offset
     *     to add.
     */
    function getScrollOffset() {
      return {top: 0, left: 0};
    }

    return {
      getScrollableElement: getScrollableElement,
      getScrollBorders: getScrollBorders,
      getScrollableDistances: getScrollableDistances,
      scroll: scroll,
      getScrollOffset: getScrollOffset,

      // Chain this scroller to the contentScroller, so that it starts
      // triggering as soon as document scrolling terminates.
      next: contentScroller(el)
    };
  };

  /**
   * Content scroller. It scrolls the selection container viewport using
   * native browser scrolling mechanisms whenever the selection box comes
   * close to the viewport borders and the selectable content overflows the
   * selection container viewport.
   *
   * @param {!Element} el The selection container, i.e. the element to which the
   *     plugin is applied to.
   */
  var contentScroller = function(el) {

    var containerDimensions = $(el).data(pluginName).containerDimensions;

    /**
     * Returns the available distance the selection container viewport can
     * still be scrolled before reaching the selection container margins.
     *
     * @return {!Array.<number>} Available scrolling distances, respectively
     *     from the following borders: top, right, bottom, left.
     */
    function getScrollableDistances() {
      return [
        el.scrollTop,
        el.scrollWidth - el.scrollLeft - containerDimensions.width,
        el.scrollHeight - el.scrollTop - containerDimensions.height,
        el.scrollLeft
      ];
    }

    /**
     * Scrolls the selection container viewport by the required amount.
     *
     * @param {string} scrollAxis The scrolling axis, either 'vertical' or
     *     'horizontal'.
     * @param {number} shift The scrolling amount, in pixels. If positive the
     *     scrolling direction should be downward / rightward. If negative,
     *     upward / leftward.
     */
    function scroll(scrollAxis, shift) {
      var property = scrollAxis == 'vertical' ? 'scrollTop' : 'scrollLeft';
      el[property] += shift;
    }

    /**
     * Returns the offset, in pixels, that should be added to selectable
     * elements' positions (as computed by the plugin 'positioner'), to take
     * into account scrolling.
     *
     * This is not relevant when native browser scrolling is used, but comes
     * into play when scrolling is emulated via container offsets (for Google
     * Maps-like scrolling behavior).
     *
     * @return {!Object.<string, number>} An object containing the 'top' and
     *     'left' properties, pointing respectively to the top and left offset
     *     to add.
     */
    function getScrollOffset() {
      return {top: 0, left: 0};
    }

    return {
      getScrollableDistances: getScrollableDistances,
      scroll: scroll,
      getScrollOffset: getScrollOffset
    };
  };

  /**
   * @return {!Element} The default DOM element which is assumed to be
   *     scrolled when this scroller operates, if the scroller does not
   *     specify any in its 'getSrollableElement' method. The default is the
   *     the selection container itself.
   */
  var getDefaultScrollableElement = function() {
    return this;
  };

  /**
   * Returns the default top, right, bottom and left positions of the viewport
   * borders that should trigger scrolling when the selection box is dragged
   * close to them, if the scroller does not specify any in its
   * 'getScrollBorders' method.
   *
   * @return {!Array.<number>} Positions of the scrolling viewport borders,
   *     respectively in the following order: top, right, bottom, left. All
   *     positions are relative to the top-left corner of the document. The
   *     default are the border positions of the selection container itself.
   */
  var getDefaultScrollBorders = function() {
    var containerDimensions = $(this).data(pluginName).containerDimensions;
    return [
        containerDimensions.top,
        containerDimensions.left + containerDimensions.width,
        containerDimensions.top + containerDimensions.height,
        containerDimensions.left];
  };

  /**
   * Default positioner. It computes selectable elements' positions, necessary
   * to identify selected elements as the selection box is dragged around.
   *
   * This default implementation computes selectables' positions via offset
   * measurement. This works accurately if the element the plugin applies to
   * (the selection container) is their offset parent.
   *
   * @param {!Element} selectable A selectable element, i.e. any element
   *     matching the plugin 'filter' option.
   * @return {!Object.<string, number>} An object containing the 'top', 'left',
   *     'width' and 'height' properties. 'top' and 'left' define the distance,
   *     in pixels, of the top-left corner of the selectable from the top-left
   *     corner of the selection container, accurate at the time the call is
   *     made. 'width' and 'height' define the outer width and height
   *     (including border, but not margin) of the selectable element.
   */
  var defaultPositioner = function(selectable) {
    return {
      'top': selectable.offsetTop,
      'left': selectable.offsetLeft,
      'width': selectable.offsetWidth,
      'height': selectable.offsetHeight
    };
  };

  var sign = function(i) {
    return i > 0 ? 1 : i < 0 ? -1 : 0;
  };

  /**
   * Creates the selection box and the glass panel that isolates selectable
   * elements from the selection gesture events (required to prevent Flash
   * grabbing mouseup events for selections ending on top of Flash embeds).
   */
  var createSelectionBox = function() {
    var $this = $(this),
        data = $this.data(pluginName);

    data.selectionGlass = $(
      '<div />', {'class': pluginName + '-glass'}).css({
      'position': 'absolute',
      'top': 0,
      'left': 0,
      'height': this.scrollHeight,
      'width': this.scrollWidth,
      'overflow': 'hidden'}).appendTo($this);
    data.selectionBox = $(
      '<div />', {'class': pluginName + '-box'}).css({
      'position': 'absolute'
      }).appendTo(data.selectionGlass);
  };

  /**
   * Initializes all the selectable elements' when the selection gesture
   * starts. This includes caching their current position and clearing any
   * previous selection.
   */
  var initSelectablesOnGestureStart = function() {
    var self = this,
        $this = $(this),
        data = $this.data(pluginName);

    var selectables = [];
    $this.find(data.options.filter).each(function() {
      var selectable =
        (data.options.positioner || defaultPositioner).call(self, this);
      selectable.element = this;
      selectable.selected = false;
      selectables.push(selectable);
    }).removeClass(pluginName + '-selected');
    data.selectables = selectables;
  };

  /**
   * Updates the selection box position and sizing to match the distance
   * travelled from the position where the selection gesture started and
   * the current mouse position.
   */
  var updateSelectionBox = function(evt) {
    var data = $(this).data(pluginName);
    data.selectionBoxExtents = {
      // pageX, pageY positions are relative to the document, so they need
      // to be converted to the selection container reference frame.
      'top':
          Math.min(data.startPosition.pageY, evt.pageY) -
          data.containerDimensions.top +
          this.scrollTop,
      'left':
          Math.min(data.startPosition.pageX, evt.pageX) -
          data.containerDimensions.left +
          this.scrollLeft,
      'height': Math.abs(data.startPosition.pageY - evt.pageY),
      'width': Math.abs(data.startPosition.pageX - evt.pageX)
    };
    data.selectionBox.css(data.selectionBoxExtents);
  };

  /**
   * Triggers the selection container viewport scrolling, if the selection
   * box is being dragged too close to the viewport borders.
   *
   * @param {!Event} evt The last mousemove event received.
   * @param {!Object} scroller A scroller implementation, for example
   *     'documentScroller' or 'contentScroller'.
   * @param {number?} scrollTimestamp The timestamp at which the last scrolling
   *     operation was performed. Undefined if a mouse movement occurred in
   *     between.
   */
  var updateViewportScrolling = function(evt, scroller, scrollTimestamp) {
    var $this = $(this),
        data = $this.data(pluginName),
        containerDimensions = data.containerDimensions,
        threshold = data.options.scrollingThreshold,
        scrollSpeedMultiplier = data.options.scrollSpeedMultiplier;

    if (data.scrollingTimeout) {
      window.clearTimeout(data.scrollingTimeout);
      delete data.scrollingTimeout;
    }

    // Compute a multiplier based on the actual amount of time that
    // passed since the last scrolling update, to keep scrolling speed
    // constant as if scrolling occurred at exactly 60fps.
    var scrollLagMultiplier = scrollTimestamp ?
        (new Date().getTime() - scrollTimestamp) / 16 : 1;
    var tickTimestamp = scrollTimestamp;

    var scrolled = false;
    var scrollableDistances = scroller.getScrollableDistances();
    var scrollBorders = scroller.getScrollBorders ?
        scroller.getScrollBorders() : getDefaultScrollBorders.call(this);
    var scrollableElement = scroller.getScrollableElement ?
        scroller.getScrollableElement() :
        getDefaultScrollableElement.call(this);

    var scrollMetrics = [
      { // top
        distance: Math.max(evt.pageY - scrollBorders[0], 0),
        direction: -1,
        scrollAxis: 'vertical',
        positionProperty: 'pageY'
      },
      { // right
        distance: Math.max(scrollBorders[1] - evt.pageX, 0),
        direction: 1,
        scrollAxis: 'horizontal',
        positionProperty: 'pageX'
      },
      { // bottom
        distance: Math.max(scrollBorders[2] - evt.pageY, 0),
        direction: 1,
        scrollAxis: 'vertical',
        positionProperty: 'pageY'
      },
      { // left
        distance: Math.max(evt.pageX - scrollBorders[3], 0),
        direction: -1,
        scrollAxis: 'horizontal',
        positionProperty: 'pageX'
      }
    ];

    for (var i = scrollMetrics.length - 1; i >= 0; i--) {
      var metric = scrollMetrics[i];
      var available = scrollableDistances[i];

      if (
          // We are within a minimum threshold distance from the viewport
          // border, and
          metric.distance < threshold &&

          // We still have room for scrolling, and
          available > 0 &&

            // We are moving toward the viewport border
            sign(
                data.curPosition[metric.positionProperty] -
                data.lastPosition[metric.positionProperty]) ==
                    metric.direction
        ) {

        // Compute the scrolling shift: the closer we push the mouse toward the
        // viewport border, the bigger the shift.
        var shift = metric.direction * Math.round(Math.min(
            available,
            Math.ceil((threshold - metric.distance) / 10) *
                scrollLagMultiplier * scrollSpeedMultiplier));

        // Scroll in the desired direction
        scroller.scroll(metric.scrollAxis, shift);

        if (scrollableElement == this) {
          // If we scrolled the content of the selection container, move the
          // selection box starting position in the opposite direction by the
          // same amount, to keep its origin fixed (with respect to the
          // selection container top-left corner).
          data.startPosition[metric.positionProperty] -= shift;
          data.curPosition[metric.positionProperty] -= shift;
        } else {
          // Otherwise, if a wrapping element was scrolled (assuming it wraps
          // the selection container), advance the mouse position by the same
          // amount.
          evt[metric.positionProperty] += shift;
        }

        scrolled = true;
      }
    }

    if (scrolled) {
      // If scrolling started, continue scrolling until another mouse movement
      // is detected (to handle the case when the mouse is moved toward a
      // viewport border and left stationary for the scrolling to continue at a
      // constant speed).
      data.scrollingTimeout = window.setTimeout($.proxy(
          function() { tick.call(this, evt, tickTimestamp); }, this),
          16);  // try to keep scrolling at 60fps.
    } else if (scroller.next) {
      // Delegate to a chained scroller, if present.
      updateViewportScrolling.call(this, evt, scroller.next, scrollTimestamp);
    }
  };


  /**
   * Update the selection status of all selectable elements', depending on
   * whether the selection box currently touches them or not. Triggers
   * 'selecting' and 'unselecting' events.
   */
  var markSelected = function(scroller) {
    var $this = $(this),
        data = $this.data(pluginName);

    var offset = {top: 0, left: 0};
    var scrollerChain = scroller;
    while (!!scrollerChain) {
      var scrollerOffset = scrollerChain.getScrollOffset();
      offset.top += scrollerOffset.top;
      offset.left += scrollerOffset.left;
      scrollerChain = scrollerChain.next;
    }

    for (var i = data.selectables.length - 1; i >=0 ; i--) {
      var selectable = data.selectables[i];
      if (overlap(data.selectionBoxExtents, selectable, offset)) {
        if (!selectable.selected) {
          $(selectable.element).addClass(pluginName + '-selected');
          selectable.selected = true;
          $this.trigger(
              pluginName + 'selecting',
              {'selecting': selectable.element});
        }
      } else if (selectable.selected) {
        $(selectable.element).removeClass(pluginName + '-selected');
        selectable.selected = false;
        $this.trigger(
            pluginName + 'unselecting',
            {'unselecting': selectable.element});
      }
    }
  };

  var overlap = function(rectangle1, rectangle2, offset) {
    return (
      overlap1D(rectangle1.top, rectangle1.height,
                rectangle2.top + offset.top, rectangle2.height) &&
      overlap1D(rectangle1.left, rectangle1.width,
                rectangle2.left + offset.left, rectangle2.width));
  };

  var overlap1D = function(start1, width1, start2, width2) {
    var end1 = start1 + width1, end2 = start2 + width2;
    return ((start2 >= start1 && start2 <= end1) ||
        (end2 >= start1 && end2 <= end1) ||
        (start2 <= start1 && end2 >= end1));
  };

  /**
   * Reacts to the user pressing the mouse down inside the selectable container
   * viewport, possibly initiating a selection gesture.
   */
  var onMouseDown = function(evt) {
    var $this = $(this),
        data = $this.data(pluginName);

    // Do not start selection if it's not done with the left button.
    if (evt.which != 1) {
      return;
    }

    // Prevent selection from starting on any element matched by
    // or contained within the selector specified by the 'cancel'
    // option.
    var selector =
        [data.options.cancel, data.options.cancel + ' *'].join(',');
    if (!!data.options.cancel &&
        $(evt.target).is(selector)) {
      return;
    }

    // Prevent selection if the mouse is being pressed down on a scrollbar
    // (which is still technically part of the selectable element).
    if (evt.pageX > $this.offset().left + this.clientWidth ||
        evt.pageY > $this.offset().top + this.clientHeight) {
      return;
    }

    // Record the initial position of the container, with respect to the
    // document. Also include the current border size (assuming equal
    // top/bottom and right/left border sizes).
    data.containerDimensions = {
      'top': $this.offset().top +
             ($this.outerHeight(false) - $this.innerHeight())/2,
      'left': $this.offset().left +
              ($this.outerWidth(false) - $this.innerWidth())/2,
      'width': this.clientWidth,
      'height': this.clientHeight
    };

    // Record the initial position of the mouse event, with respect to the
    // document (_not_ including the scrolling position of the selection
    // container).
    data.startPosition = {'pageX': evt.pageX, 'pageY': evt.pageY};
    data.curPosition = {'pageX': evt.pageX, 'pageY': evt.pageY};

    // Init the scroller
    data.scroller = (data.options.scroller || documentScroller).
        call(this, this);

    // Start listening for mouseup (to terminate selection), movement and
    // wheel scrolling. Mouseups and movement can occur everywhere in the
    // document, if the user moves the mouse outside the selection container.
    data.mouseupHandler = $.proxy(onMouseUp, this);
    $(document).bind('mouseup.' + pluginName, data.mouseupHandler);
    $(document).bind('mousemove.' + pluginName, $.proxy(tick, this));

    // Disable mousewheel scrolling during box selections.
    $this.bind('mousewheel.' + pluginName, function(evt) {
      evt.preventDefault(); return false;
    });

    // Prevent the default browser dragging to occur.
    evt.preventDefault();
  };

  /**
   * Updates the plugin state during a selection operation in response either to
   * mouse dragging by the user, or repeated scrolling updates because the
   * selection box is skimming the scrolling container viewport borders.
   *
   * @param {!Event} evt The last mousemove event received.
   * @param {number?} scrollTimestamp The timestamp at which the last scrolling
   *     operation was performed. Undefined if this function is being invoked
   *     in response to mouse dragging.
   */
  var tick = function(evt, scrollTimestamp) {
    var $this = $(this),
        data = $this.data(pluginName),
        scroller = data.scroller,
        distance = data.options.distance;

    // Do nothing if we haven't yet moved past the distance threshold.
    if (!data.selectionBox &&
        Math.abs(data.startPosition.pageX - evt.pageX) < distance &&
        Math.abs(data.startPosition.pageY - evt.pageY) < distance) {
      return;
    }

    data.lastPosition = data.curPosition;
    data.curPosition = {'pageX': evt.pageX, 'pageY': evt.pageY};

    if (!data.selectionBox) {
      // Trigger the selection 'start' event.
      $this.trigger(pluginName + 'start');

      // Create the selection box if we haven't created it yet.
      createSelectionBox.apply(this);

      // Compute the initial position and sizing of each selectable
      // object.
      initSelectablesOnGestureStart.apply(this);
    }

    // scroll the viewport if the mouse moves near the viewport boundaries.
    updateViewportScrolling.call(this, evt, scroller, scrollTimestamp);

    // update the selection box position and size.
    updateSelectionBox.call(this, evt);

    // mark elements as selected / deselected based on the current
    // selection box extent.
    markSelected.call(this, scroller);
  };

  /**
   * Terminates a selection gesture.
   */
  var onMouseUp = function(evt) {
    var $this = $(this),
        data = $this.data(pluginName);

    if (data.scrollingTimeout) {
      window.clearTimeout(data.scrollingTimeout);
      delete data.scrollingTimeout;
    }

    $this.unbind('mousewheel.' + pluginName);
    $(document).unbind('mousemove.' + pluginName);
    $(document).unbind('mouseup.' + pluginName, data.mouseupHandler);
    data.mouseupHandler = undefined;

    if (!!data.selectionBox) {
      data.selectionBox.remove();
      delete data.selectionBox;

      data.selectionGlass.remove();
      delete data.selectionGlass;

      var selected = [], unselected = [];
      for (var i = data.selectables.length - 1; i >= 0; i--) {
        (data.selectables[i].selected ? selected : unselected).push(
            data.selectables[i].element);
      }
      delete data.selectables;

      // If selection ever started (we moved past the threshold distance),
      // fire the completion events.
      $this.trigger(pluginName + 'selected', {'selected': selected});
      $this.trigger(pluginName + 'unselected', {'unselected': unselected});
      $this.trigger(pluginName + 'stop');
    }
  };

  // Public plugin methods.
  var methods = {

    /**
     * Actives the plugin on the given set of elements.
     *
     * @param {Object} options The plugin options.
     */
    init: function(options) {
      this.each(function() {
        $(this).data(
            pluginName,
            {'options': $.extend({}, defaultOptions, options)});
      });
      if (!!this.data(pluginName).options.disabled) {
        return this;
      }
      return methods.enable.apply(this);
    },

    /**
     * Deactives the plugin on the given set of elements, clearing any
     * additional data structures and event listeners created in the process.
     *
     * Note that deactivating the plugin while a selection operation is in
     * progress will lead to undefined results.
     */
    destroy: function() {
      methods.disable.apply(this);
      return this.removeData(pluginName);
    },

    /**
     * Enables selection gestures.
     */
    enable: function() {
      return this.each(function() {
        var $this = $(this),
            data = $this.data(pluginName);

        data.options.disabled = false;
        $this.bind('mousedown.' + pluginName, onMouseDown);
      });
    },

    /**
     * Disables selection gestures.
     */
    disable: function() {
      return this.each(function() {
        var $this = $(this),
            data = $this.data(pluginName);

        data.options.disabled = true;
        $this.unbind('.' + pluginName);
      });
    },

    /**
     * Get or set any selectable option. If no value is specified, will act as
     * a getter.
     *
     * @param {string} key The option key to get or set.
     * @param {Object=} opt_value If undefined, the method will act as a
     *     getter, otherwise the option value will be set to the given one
     *     (null values may be used to reset certain properties to their
     *     default status).
     * @return {Object?} Either the request option value (when acting as
     *     getter, or 'this' for chainability when acting as setter.
     */
    option: function(key, opt_value) {
      var options = this.first().data(pluginName).options;
      if (opt_value === undefined) {
        return options[key];
      } else {
        options[key] = opt_value;
        if (key == 'disabled') {
          (!!opt_value) ?
              methods.disable.apply(this) : methods.enable.apply(this);
        }
        return this;
      }
    }
  };

  // Method dispatcher.
  $.fn[pluginName] = function( method ) {

    if ( methods[method] ) {
      return methods[ method ].apply(
          this, Array.prototype.slice.call( arguments, 1 ));
    } else if ( typeof method === 'object' || ! method ) {
      return methods.init.apply( this, arguments );
    } else {
      $.error('Method ' +  method + ' does not exist on jQuery.' + pluginName);
    }

  };
})(jQuery, window, document);
/* ./src/js/rhizo.jquery.js */
/**
  @license
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

namespace("rhizo.jquery");

/**
 * Extends jQuery with all the additional behaviors required by Rhizosphere.
 * @param {rhizo.ui.gui.GUI} gui
 * @param {boolean} enableAnims whether the visualization can use animations to
 *     smooth UI transitions, such as applying layouts and filters.
 * @param {boolean} enableMouseWheelForPanning whether the visualization should
 *     explicitly trap mousewheel (and trackpad) events and convert them into
 *     panning requests for the visualization viewport.
 */
rhizo.jquery.init = function(gui, enableAnims, enableMouseWheelForPanning) {
  rhizo.jquery.initAnimations_(gui, enableAnims);
  if (enableMouseWheelForPanning) {
    rhizo.jquery.initMouseWheel_();
  }
};

/**
 * Extends jQuery by adding (or rewriting) animation-related functions for
 * movement and opacity.
 * 
 * TODO(battlehorse): This code is flawed when multiple visualizations are
 * present in a single page, since the first GUI object will dictate animation
 * status (via gui.noFx) for all the others.
 * See http://code.google.com/p/rhizosphere/issues/detail?id=68
 * 
 * @param {rhizo.ui.gui.GUI} gui
 * @param {boolean} enableAnims whether the visualization can use animations to
 *     smooth UI transitions, such as applying layouts and filters.
 */
rhizo.jquery.initAnimations_ = function(gui, enableAnims) {
  if ($.support.greyOut) {
    return;
  }
  $.extend($.support, {greyOut: true});

  (function($) {
    if (!enableAnims) {
      // Define non-animated move(), fadeIn() and fadeOut() functions
      $.fn.extend({
        move: function(top, left, opt_extras) {
          $(this).css(jQuery.extend({top: top, left: left}, opt_extras));
        },
        fadeIn: function() {
          $(this).css({visibility: 'visible', opacity: 1.0});
        },
        fadeOut: function(opt_callback) {
          $(this).css({visibility: 'hidden', opacity: 0.0});
          if (opt_callback) {
            opt_callback.apply(this);
          }
        },
        greyOut: function() {
          $(this).css('opacity', 0.2);
        }
      });
    } else {
      // Define move(), fadeIn() and fadeOut() functions that discards
      // animations only in case of overload.
      $.fn.extend({
        move: function(top, left, opt_extras) {
          if (gui.noFx) {
            $(this).css(jQuery.extend({top: top, left: left}, opt_extras));
          } else {
            $(this).animate(
              jQuery.extend({top: top, left: left}, opt_extras),
              {duration: 400, queue: false});
          }
        },
        fadeIn: function() {
          $(this).stop(true, true);
          if (gui.noFx) {
            $(this).css({visibility: 'visible', opacity: 1.0});
          } else {
            $(this).css('visibility', 'visible').animate({opacity: 1.0}, 400);
          }
        },
        fadeOut: function(opt_callback) {
          $(this).stop(true, true);
          if (gui.noFx) {
            $(this).css({visibility: 'hidden', opacity: 0.0});
            if (opt_callback) {
              opt_callback.apply(this);
            }
          } else {
            $(this).animate({opacity: 0.0}, {
                             duration: 400,
                             complete: function() {
                               $(this).css('visibility', 'hidden');
                               if (opt_callback) {
                                 opt_callback.apply(this);
                               }
                             }});
          }
        },
        greyOut: function() {
          $(this).stop(true, true);
          if (gui.noFx) {
            $(this).css({visibility: 'visible', 'opacity': 0.2});
          } else {
            $(this).css('visibility', 'visible').animate({opacity: 0.2}, 400);
          }
        }
      });
    }
  })(jQuery);
};

/**
 * Extends jQuery by adding mousewheel (and trackpad) tracking events.
 */
rhizo.jquery.initMouseWheel_ = function() {
  // Freely inspired by Brandon Aaron (http://brandonaaron.net)
  // jQuery MouseWheel plugin (http://github.com/brandonaaron/jquery-mousewheel),
  // which is licensed under the MIT License:
  // http://github.com/brandonaaron/jquery-mousewheel/blob/master/LICENSE.txt
  //
  // Mousewheel tracking is an horrible mess. Different browsers use different
  // conventions for the number of 'ticks' each scrolled line corresponds to.
  // In addition to that, specific platforms like MacIntel, alter the reported
  // ticks based on the acceleration of the scrolling movement.
  // 
  // Mousewheel events are also fired by multitouch trackpads (such as Mac ones)
  // which can use different number of ticks to represent fractional movement.
  // 
  // Browser-specific bugs make the entire business even more fun (such as was
  // the case of Safari 5: https://bugs.webkit.org/show_bug.cgi?id=29601).
  //
  // The following code tries to sanitize this behavior, applying the following
  // logic:
  // - The amount of 'ticks' each mousewheel event represents is ignored. Instead
  //   each event will have an associated deltaX, deltaY variables, whose only
  //   purpose is to represent the scrolling direction.
  //   x=-1: right, x=+1: left
  //   y=-1: down, y=+1: up
  //
  // - The 'intensity' of the scrolling (slow vs fast scrolling, that might
  //   affect the number of events fired per second) is attenuated by dropping
  //   events that happen too close to each other.
  //
  // As a result, handlers receive a frequency-capped stream of scrolling
  // requests, which has proven good enough for Rhizosphere purposes to simulate
  // panning.
  //
  // Tested on:
  // Linux (Ubuntu Lucid, scrolling mouse):
  //     Chrome 6, Opera 10.60, Firefox 3.6
  // Mac (OsX 10.5.8, scrolling mouse & trackpad):
  //     Safari 5.0.1, Chrome 6, Opera 10.60, Firefox 3.6 and 4(beta).
  // Windows:
  //     Untested.

  if ($.support.mouseWheel) {
    return;
  }

  $.extend($.support, {mouseWheel: true});
  (function($) {
    
    var types = ['DOMMouseScroll', 'mousewheel'];
    var lastWheelEvent = 0;
    var minTimestampDelta = 30;

    $.event.special.mousewheel = {
      setup: function() {
        if ( this.addEventListener ) {
          for ( var i=types.length; i; ) {
            this.addEventListener( types[--i], handler, false );
          }
        } else {
          this.onmousewheel = handler;
        }
      },
    
      teardown: function() {
        if ( this.removeEventListener ) {
          for ( var i=types.length; i; ) {
            this.removeEventListener( types[--i], handler, false );
          }
        } else {
          this.onmousewheel = null;
        }
      }
    };

    $.fn.extend({
      mousewheel: function(fn) {
        return fn ? this.bind("mousewheel", fn) : this.trigger("mousewheel");
      },
   
      unmousewheel: function(fn) {
        return this.unbind("mousewheel", fn);
      }
    });

    function handler(event) {
      var orgEvent = event || window.event;
      var args = [].slice.call( arguments, 1 );

      var ts = orgEvent.timeStamp || new Date().getTime();
      if ((ts - lastWheelEvent) < minTimestampDelta) {
        return false;
      }
      lastWheelEvent = ts;
      
      var deltaX = 0;
      var deltaY = 0;
      if ($.browser.webkit) {
        // Safari, Chrome can track horizontal scrolling (trackpads).
        deltaX = orgEvent.wheelDeltaX;
        deltaY = orgEvent.wheelDeltaY;
      } else if ($.browser.mozilla) {
        // Firefox can track horizontal scrolling (trackpads), but:
        // - it fires separate events (hor, vert) for diagonal movements.
        // - it reports scrolling ticks in inverted fashion.
        if (orgEvent.axis !== undefined &&
            orgEvent.axis === orgEvent.HORIZONTAL_AXIS) {
           deltaX = -orgEvent.detail;
         } else {
           deltaY = -orgEvent.detail;
         }
      } else if ($.browser.opera) {
        // No horizontal scrolling detection in Opera.
        deltaY = orgEvent.wheelDelta;
      } else {
        // MSIE and other browsers. Let's handle them in the same way as IE,
        // and detect only vertical scrolling.
        deltaY = orgEvent.wheelDelta;
      }

      // Shrink to [-1, +1].
      deltaX = deltaX > 0 ? 1 : (deltaX < 0 ? -1 : 0);
      deltaY = deltaY > 0 ? 1 : (deltaY < 0 ? -1 : 0);
      
      event = $.event.fix(orgEvent);
      event.type = "mousewheel";
      
      args.unshift(event, deltaX, deltaY);
      return $.event.handle.apply(this, args);
    }
  })(jQuery);
};
/* ./src/js/rhizo.js */
/**
  @license
  Copyright 2008 The Rhizosphere Authors. All Rights Reserved.

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

function namespace(ns) {
  var nsParts = ns.split(".");
  var root = window;

  for (var i=0; i<nsParts.length; i++) {
    if (typeof root[nsParts[i]] == "undefined") {
      root[nsParts[i]] = {};
    }
    root = root[nsParts[i]];
  }
}

namespace("rhizo");

/**
 * Inherit the prototype methods from one constructor into another.
 */
rhizo.inherits = function(childCtor, parentCtor) {
  function tempCtor() {};
  tempCtor.prototype = parentCtor.prototype;
  childCtor.prototype = new tempCtor();
  childCtor.prototype.constructor = childCtor;
};

namespace("rhizo.util");

rhizo.util.LOG_E_10 = Math.log(10);

/**
   Returns the log_10() of a number.
 */
rhizo.util.log10_ = function(val) {
  return Math.log(val)/rhizo.util.LOG_E_10;
};

/**
   Returns the order of magnitude of a given number.
   E.g. for a number between 100K and 1M returns 5.
   if 0 is passed in, NaN is returned.
   @param {number} num the number to evaluate.
 */
rhizo.util.orderOfMagnitude = function(num) {
  if (num == 0) {
    return Number.NaN;
  }

  // The multiply/divide by 100 trick is just to get rid of rounding errors.
  // For example, in Safari/MacOs log10(1M) would result in 5.999 instead of 6
  // and consequently floored to 5. And we cannot remove floor().
  return Math.floor(Math.round(rhizo.util.log10_(Math.abs(num))*100)/100);
};

/**
 * Parses an URI extracting the different parts that compose it.
 *
 * This function comes straight from Steven Levithan's parseURI library
 * (http://blog.stevenlevithan.com/archives/parseuri), released under the MIT
 * license. See the NOTICE file for further info.
 * @param {string} str The URI to parse.
 * @return {Object.<string, string>} A key-value map for all the composing
 *     parts of the parsed URI, like 'protocol', 'host', 'path' and so forth.
 */
rhizo.util.parseUri = function(str) {
  var o = rhizo.util.parseUri.options_;
  var m = o.parser[o.strictMode ? "strict" : "loose"].exec(str);
  var uri = {};
  var i   = 14;

  while (i--) uri[o.key[i]] = m[i] || "";

  uri[o.q.name] = {};
  uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
    if ($1) uri[o.q.name][$1] = $2;
  });

  return uri;
};

/**
 * Configuration options for rhizo.util.parseUri
 * @type {*}
 * @private
 */
rhizo.util.parseUri.options_ = {
  strictMode: false,
  key: ["source","protocol","authority","userInfo","user","password","host",
        "port","relative","path","directory","file","query","anchor"],
  q: {
    name:   "queryKey",
    parser: /(?:^|&)([^&=]*)=?([^&]*)/g
  },
  parser: {
    strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
    loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
  }
};

/**
 * @return {Object.<stirng, string>} A key-value map of all the URL parameters
 *     in the current document URL.
 */
rhizo.util.urlParams = function() {
  return rhizo.util.parseUri(document.location.href).queryKey;
};

/**
 * Creates a new url by adding extra query parameters to a base url.
 *
 * @param {string} opt_url The base url to build the new one from. Defaults to
 *     document.location.href if unspecified.
 * @param {Object.<string, string>} opt_extra_params A key-value map of
 *     query parameters that will be added to the url.
 * @return {string} The newly built url.
 */
rhizo.util.buildUrl = function(opt_url, opt_extra_params) {
  var url = opt_url || document.location.href;
  if (!opt_extra_params) {
    return url;
  }
  var urlData = rhizo.util.parseUri(url);
  var newUrl = [
      urlData.protocol, '://',
      urlData.authority,
      urlData.path, '?',
      urlData.query ];
  for (var key in opt_extra_params) {
    newUrl.push('&');
    newUrl.push(key);
    newUrl.push('=');
    newUrl.push(encodeURIComponent(opt_extra_params[key]))
  }
  if (urlData.anchor.length > 0) {
    newUrl.push('#');
    newUrl.push(urlData.anchor)
  }
  return newUrl.join('');
};

/**
 * Ensures that a given token is a valid jQuery selector, by escaping all the
 * problematic characters, as defined in
 * http://api.jquery.com/category/selectors/
 *
 * @param {string} token The jQuery selector (or part of it) to escape.
 * @return {string} The escaped selector.
 */
rhizo.util.escapeSelectorToken = function(token) {
  return token.replace(rhizo.util.escapeSelectorToken.regexp_, '\\$1');
};

// Regexp to match all the characters to escape: !"#$%&'()*+,./:;<=>?@[\]^`{|}~
rhizo.util.escapeSelectorToken.regexp_ = new RegExp('([!"#\\$%&\'\\(\\)\\*\\+,\\.\\/:;<=>?@\\[\\\\\\]\\^\\{\\|\\}\\~])', 'g');/* ./src/js/rhizo.selection.js */
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
 * @fileOverview Class that oversee Rhizosphere models' selection and focus
 * management.
 * @author Riccardo Govoni (battlehorse@google.com)
 */

//RHIZODEP=rhizo
namespace('rhizo.selection');


/**
 * A SelectionManager is responsible for handling selection and focus operations
 * applied to models part of a Rhizosphere visualization.
 *
 * Models can be in two states as far as selection is concerned:
 * - selected/deselected : Selection may be visually represented as an highlight
 *   of the model rendering, but both selected and deselected models remain
 *   visible in the visualization viewport.
 * - focused/hidden : The visualization can be 'focused' on a set of models.
 *   All models which are not under focus are hidden from view and not visible
 *   in the visualization viewport (They appear as filtered out, as defined
 *   by rhizo.model.SuperModel.isFiltered()).
 *
 * The two concepts are ortogonal to each other, even though they are usually
 * related as the user first selects a set of models in order to hide or focus
 * on them.
 *
 * Selection operations are triggered by publishing messages on the 'selection'
 * channel of the project eventbus. The messages are expected in the following
 * format:
 *
 * message = {
 *   action: 'select',
 *   models: ['1', '3', '10']
 * };
 *
 * message = {
 *   action: 'hide',
 *   models: ['1', '5'],
 *   incremental: false
 * };
 *
 * Where each key has the following meaning:
 *
 * - action: The action to perform. Supported ones are 'select' (selects one or
 *   more models), 'deselect' (the opposite), 'selectAll' (select all models),
 *   'deselectAll' (the opposite), 'toggle' (toggles the selection status of
 *   one or more models), 'focus' (focuses the visualization on the given
 *   models, hiding all the others), 'hide' (hides the given models from the
 *   visualization), 'resetFocus' (resets focus/hide status making all models
 *   visible).
 *
 * - models: Either one or more (in array form) model ids to apply the action
 *   to. Ignored for 'selectAll', 'deselectAll' and 'resetFocus' operations.
 *   Can be omitted for 'focus' and 'hide' operations, in which case the
 *   operation is applied to the currently selected set of models (if any).
 *   The selection manager can expand or modify the 'models' list during
 *   the message preprocessing phase to normalize it or include additional
 *   selection constraints (such as selection extensions imposed by layout
 *   engines).
 *
 * - incremental: (used only by 'focus' and 'hide' actions) Whether the
 *   operation should be incremental (in addition to other models already
 *   focused or hidden) or absolute (the 'models' list represents the full set
 *   of models to hide or focus).
 *
 * @param {!rhizo.Project} project The project this selection manager
 *     belongs to.
 * @constructor
 */
rhizo.selection.SelectionManager = function(project) {
  /**
   * @type {!rhizo.Project}
   * @private
   */
  this.project_ = project;

  /**
   * Map of all the currently selected models, keyed by their model id.
   * @type {!Object.<*, rhizo.model.SuperModel>}
   * @private
   */
  this.selectionMap_ = {};

  this.project_.eventBus().addPreprocessor(
      'selection', this.onBeforeSelection_, this, /* first */ true);
  this.project_.eventBus().subscribe('selection', this.onSelection_, this);
  this.project_.eventBus().subscribe('model', this.onModelChange_, this);
};

/**
 * Returns the number of currently selected models.
 * @return {number} The number of currently selected models.
 */
rhizo.selection.SelectionManager.prototype.getNumSelected = function() {
  var count = 0;
  for (var modelId in this.selectionMap_) {
    count++;
  }
  return count;
};

/**
 * Returns whether a given model is selected or not.
 * @param {*} id The id of the model to check.
 */
rhizo.selection.SelectionManager.prototype.isSelected = function(id) {
  return !!this.selectionMap_[id];
};

/**
 * Returns a map of all the selected models.
 * @return {!Object.<*, rhizo.model.SuperModel>} All the currently selected
 *     models, keyed by their id.
 */
rhizo.selection.SelectionManager.prototype.allSelected = function() {
  return this.selectionMap_;
};

/**
 * Returns a map of all the de-selected models.
 * @return {!Object.<*, rhizo.model.SuperModel>} All the currently deselected
 *     models, keyed by their id.
 */
rhizo.selection.SelectionManager.prototype.allDeselected = function() {
  var allDeselected = {};
  var allModels = this.project_.models();
  for (var i = allModels.length-1; i >= 0; i--) {
    var modelId = allModels[i].id;
    if (!(modelId in this.selectionMap_)) {
      allDeselected[modelId] = allModels[modelId];
    }
  }
  return allDeselected;
};

/**
 * Returns the number of focused models.
 * @return {number} The number of focused models.
 */
rhizo.selection.SelectionManager.prototype.getNumFocused = function() {
  var count = 0;
  var models = this.project_.models();
  for (var i = models.length-1; i >= 0; i--) {
    if (!models[i].isFiltered('__selection__')) {
      count++;
    }
  }
  return count;
};

/**
 * Returns the number of hidden models.
 * @return {number} The number of hidden models.
 */
rhizo.selection.SelectionManager.prototype.getNumHidden = function() {
  var count = 0;
  var models = this.project_.models();
  for (var i = models.length-1; i >= 0; i--) {
    if (models[i].isFiltered('__selection__')) {
      count++;
    }
  }
  return count;
};

/**
 * Returns a map of all the focused models.
 * @return {!Object.<*, rhizo.model.SuperModel>} All the currently focused
 *     models, keyed by their id.
 */
rhizo.selection.SelectionManager.prototype.allFocused = function() {
  var focused = {};
  var models = this.project_.models();
  for (var i = models.length-1; i >= 0; i--) {
    if (!models[i].isFiltered('__selection__')) {
      focused[models[i].id] = models[i];
    }
  }
  return focused;
};

/**
 * Returns a map of all the hidden (unfocused) models.
 * @return {!Object.<*, rhizo.model.SuperModel>} All the currently hidden
 *     models, keyed by their id.
 */
rhizo.selection.SelectionManager.prototype.allHidden = function() {
  var hidden = {};
  var models = this.project_.models();
  for (var i = models.length-1; i >= 0; i--) {
    if (models[i].isFiltered('__selection__')) {
      hidden[models[i].id] = models[i];
    }
  }
  return hidden;
};

/**
 * Callback invoked when the set of models that are part of the visualization
 * changes because of additions and removals. Updates the internal list
 * of selected models.
 *
 * @param {Object} message The received message.
 * @private
 */
rhizo.selection.SelectionManager.prototype.onModelChange_ = function(message) {
  if (message['action'] == 'remove') {
    for (var i = 0; i < message['models'].length; i++) {
      delete this.selectionMap_[message['models'][i].id];
    }
  }
};

/**
 * Preprocessing callback invoked whenever a message is published on the
 * 'selection' channel.
 *
 * It expands the input set of models to apply selection changes to, to
 * include all the affected ones. This includes, for example, selections that
 * occur when a hierarchical layout engine is applied (so that selection
 * changes on root nodes are automatically expanded to include dependent
 * models).
 *
 * For 'toggle' selections, it resolves whether the toggle is actually
 * selecting or deselecting models.
 *
 * After this preprocessing callback, the 'models' parameter of the eventbus
 * message is guaranteed to contain the complete list of model ids affected
 * by the change.
 *
 * @param {!Object} message The published message.
 * @param {!function(boolean, string=)} rspCallback Callback to invoke with the
 *     preprocessing outcome.
 * @private
 */
rhizo.selection.SelectionManager.prototype.onBeforeSelection_ = function(
    message, rspCallback) {
  switch(message['action']) {
    case 'selectAll':
      message['models'] = this.getAllModelIds_(this.project_.modelsMap());
      break;
    case 'deselectAll':
      message['models'] = this.getAllModelIds_(this.selectionMap_);
      break;
    case 'select':
    case 'deselect':
      message['models'] = this.extendSelection_(message['models']);
      break;
    case 'toggle':
      var ids = message['models'];
      if (!$.isArray(ids)) {
        ids = [ids];
      }

      // Decides whether the toggle will resolve into a 'select' or 'deselect'
      // operation.
      var allSelected = true;
      for (var i = ids.length - 1; i >= 0; i--) {
        if (!this.isSelected(ids[i])) {
          allSelected = false;
          break;
        }
      }
      message['models'] = this.extendSelection_(message['models']);
      message['action'] = allSelected ? 'deselect' : 'select';
      break;
    case 'focus':
    case 'hide':
      // Focus or hide operations that do no specify any affected models are
      // applied to the current selection.
      if (!message['models'] || message['models'].length == 0) {
        message['models'] = this.getAllModelIds_(this.selectionMap_);
      } else if (this.isIncremental_(message)) {
        message['models'] = this.extendSelection_(message['models']);
      }
      break;
    case 'resetFocus':
      message['models'] = this.getAllHiddenModels_();
      break;
    default:
      rspCallback(false, 'Invalid selection operation: ' + message['action']);
      return;
  }
  rspCallback(true);
};

/**
 * Callback invoked when a selection request is published on the 'selection'
 * channel.
 * @param {!Object} message The published message.
 * @private
 */
rhizo.selection.SelectionManager.prototype.onSelection_ = function(message) {
  this.project_.logger().time('SelectionManager::onSelection');
  switch (message['action']) {
    case 'select':  // includes 'toggle'
    case 'selectAll':
      this.select_(message['models']);
      break;
    case 'deselect':  // includes 'toggle'
    case 'deselectAll':
      this.deselect_(message['models']);
      break;
    case 'focus':
      if (message['models'].length > 0) {
        this.focus_(message['models'], this.isIncremental_(message));
        this.deselect_(this.getAllModelIds_(this.selectionMap_));
      }
      break;
    case 'hide':
      if (message['models'].length > 0) {
        this.hide_(message['models'], this.isIncremental_(message));
        this.deselect_(this.getAllModelIds_(this.selectionMap_));
      }
      break;
    case 'resetFocus':
      this.resetFocus_();
      this.deselect_(this.getAllModelIds_(this.selectionMap_));
      break;
  }
  this.project_.logger().timeEnd('SelectionManager::onSelection');
};

/**
 * Decides whether a 'focus' or 'hide' message should be incremental, i.e.
 * apply itself in addition to the already focused or hidden models, or not,
 * i.e. representing the complete list of models to be focused or hidden.
 *
 * The decision is taken based on the value of the 'incremental' message
 * option, defaulting to true if unspecified.
 *
 * @param {!Object} message The message published on the 'selection' channel.
 * @private
 */
rhizo.selection.SelectionManager.prototype.isIncremental_ = function(message) {
  return (!('incremental' in message)) || !!message['incremental'];
};

/**
 * Converts a mapping of model ids to instances into a linear array of ids.
 * @param {!Object.<*, rhizo.model.SuperModel>} modelsMap A mapping of model
 *     ids to model instances.
 * @return {!Array.<*>} The array of extracted model ids.
 * @private
 */
rhizo.selection.SelectionManager.prototype.getAllModelIds_ = function(
    modelsMap) {
  var modelIds = [];
  for (var modelId in modelsMap) {
    modelIds.push(modelId);
  }
  return modelIds;
};

/**
 * Returns the list of all models (by their ids) that are currently hidden.
 *
 * @return {!Array.<*>} The list of hidden model ids.
 */
rhizo.selection.SelectionManager.prototype.getAllHiddenModels_ = function() {
  var modelIds = [];
  var models = this.project_.models();
  for (var i = models.length-1; i >= 0; i--) {
    if (models[i].isFiltered('__selection__')) {
      modelIds.push(models[i].id);
    }
  }
  return modelIds;
};

/**
 * Extends the list of models the selection change will apply to, based on the
 * rules defined by the current layout engine. he engine may be aware of
 * relationships between models (such as hierarchies) so that selecting a model
 * should trigger the selection of dependent ones.
 *
 * @param {!(*|Array.<*>)} ids A single model id or an array of model ids.
 * @return {!Array.<*>} The extended list of affected model ids.
 * @private
 */
rhizo.selection.SelectionManager.prototype.extendSelection_ = function(ids) {
  if (!$.isArray(ids)) {
    ids = [ids];
  }
  var extension = [];
  for (var i = 0; i < ids.length; i++) {
    //  The list of models to extend may come from historical visualization
    // states, so it may contain references to model ids that are no longer
    // part of the current visualization.
    if (this.project_.model(ids[i])) {
      Array.prototype.push.apply(
          extension, this.project_.layoutManager().extendSelection(ids[i]));
    }
  }
  return extension;
};

/**
 * Selects a list of models.
 * @param {!Array.<*>} modelIds The ids of the models to select.
 * @private
 */
rhizo.selection.SelectionManager.prototype.select_ = function(modelIds) {
  for (var i = modelIds.length-1; i >= 0; i--) {
    this.selectSingle_(modelIds[i]);
  }
};

/**
 * Deselects a list of models.
 * @param {!Array.<*>} modelIds The ids of the models to deselect.
 * @private
 */
rhizo.selection.SelectionManager.prototype.deselect_ = function(modelIds) {
  for (var i = modelIds.length-1; i >= 0; i--) {
    this.deselectSingle_(modelIds[i]);
  }
};

/**
 * Selects a single model.
 * @param {*} modelId The id of the model to select.
 * @private
 */
rhizo.selection.SelectionManager.prototype.selectSingle_ = function(modelId) {
  var model = this.project_.model(modelId);
  model.setSelected(true);
  this.selectionMap_[modelId] = model;
};

/**
 * Deselects a single model.
 * @param {*} modelId The id of the model to deselect.
 * @private
 */
rhizo.selection.SelectionManager.prototype.deselectSingle_ = function(modelId) {
  var model = this.project_.model(modelId);
  model.setSelected(false);
  delete this.selectionMap_[modelId];
};

/**
 * Focuses a list of models.
 * @param {!Array.<*>} modelIds The ids of the models to focus.
 * @param {boolean} incremental Whether the focus should be incremental (in
 *     addition to other models already focused) or absolute (the input list
 *     represents the full set of models that should be focused, all the others
 *     being hidden).
 * @private
 */
rhizo.selection.SelectionManager.prototype.focus_ = function(
    modelIds, incremental) {
  // convert to map.
  var focusedIds = {};
  for (var i = modelIds.length-1; i >= 0; i--) {
    focusedIds[modelIds[i]] = true;
  }

  var filteredIds = [];
  var models = this.project_.models();
  for (i = models.length-1; i >= 0; i--) {
    if (!(models[i].id in focusedIds)) {
      filteredIds.push(models[i].id);
    }
  }
  this.hide_(filteredIds, incremental);
};

/**
 * Hides a list of models.
 * @param {!Array.<*>} modelIds The ids of the models to hide.
 * @param {boolean} incremental Whether the hiding should be incremental (in
 *     addition to other models already hidden) or absolute (the input list
 *     represents the full set of models that should be hidden, all the
 *     others being focused).
 * @private
 */
rhizo.selection.SelectionManager.prototype.hide_ = function(
    modelIds, incremental) {
  if (!incremental) {
    this.project_.filterManager().removeFilterFromModels('__selection__');
  }
  for (var i = modelIds.length-1; i >= 0; i--) {
    var model = this.project_.model(modelIds[i]);
    if (model) { model.filter('__selection__'); }
  }
  // after changing the filter status of some elements, recompute fx settings.
  this.project_.alignFx();
  // TODO(battlehorse): should be delayed when restoring a full state
  // because a layout message will be published afterward anyway.
  this.project_.layoutManager().forceLayout({filter: true});
};

/**
 * Resets the focus status of all the models, making all models focused.
 * @private
 */
rhizo.selection.SelectionManager.prototype.resetFocus_ = function() {
  if (this.project_.filterManager().removeFilterFromModels('__selection__')) {
    // If one or more models changed their filtering status, recompute fx
    // and layout.
    this.project_.alignFx();

    // TODO(battlehorse): should be delayed when restoring a full state
    // because a layout message will be published afterward anyway.
    this.project_.layoutManager().forceLayout({filter: true});
  }
};
/* ./src/js/rhizo.ui.js */
/**
  @license
  Copyright 2008 The Rhizosphere Authors. All Rights Reserved.

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

// RHIZODEP=rhizo
// UI namespace
namespace("rhizo.ui");


/**
   Converts a value to an human-readable label. If the value is not numeric,
   it is returned untouched. If it is numeric the following logic applies:
     0: is returned untouched,
     0 to 1: only the most significant digit is retained (eg: 0.123 becomes 0.1)
     1 and above: human readable label according to SI units (eg: 100K, 1.2M)
   @param {number} value the value to be converted.
 */
rhizo.ui.toHumanLabel = function(value) {
  if (typeof(value) == 'number' && value != 0) {
    var labels = [ '', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y' ];
    var order = rhizo.util.orderOfMagnitude(value);
    if (order < 0) {
      return value.toFixed(-order);
    } else if (order < 3) {
      return value;
    }
    var si = parseInt(order / 3, 10);
    var label = labels[si] || ''; // the or is for out-of-scale values
    return (value / Math.pow(10, si * 3)).toPrecision(3) + label;
  } else {
    return value;
  }
};


/**
 * Changes the visibility of a list of models in bulk.
 * @param {Array.<rhizo.model.SuperModel>} models The list of models to affect.
 * @param {rhizo.ui.Visibility} visibility The visibility renderings should
 *     fade to.
 * @param {boolean=} opt_repositionToOrigin Whether the models should also
 *     be repositioned to the viewport origin, when completely hidden.
 */
rhizo.ui.fadeAllRenderingsTo = function(
    models, visibility, opt_repositionToOrigin) {
  var nodes = [];
  for (var i = 0; i < models.length; i++) {
    nodes.push(models[i].rendering().raw_());
  }

  if (visibility == rhizo.ui.Visibility.HIDDEN) {
    $(nodes).fadeOut(function() {
      if (!!opt_repositionToOrigin) {
        for (var i = models.length-1; i >= 0; i--) {
          models[i].rendering().move(0, 0, true);
        }
      }
    });
  } else if (visibility == rhizo.ui.Visibility.VISIBLE) {
    $(nodes).fadeIn();
  } else {  // rhizo.ui.Visibility.GREY
    $(nodes).greyOut();
  }
};


/**
 * Extracts the affected model from a triggered user event.
 * @param {Event} ev
 * @param {rhizo.Project} project
 * @return {?rhizo.model.SuperModel} The affected model, or null if the
 *     event was not bound to any model.
 */
rhizo.ui.eventToModel = function(ev, project) {
  return project.model($(ev.currentTarget).data('id'));
};


/**
 * Extracts the associated model from an HTMLElement.
 * @param {HTMLElement} element
 * @param {rhizo.Project} project
 * @return {?rhizo.model.SuperModel} The associated model, or null if the
 *     element is not bound to any model.
 */
rhizo.ui.elementToModel = function(element, project) {
  return project.model($(element).data('id'));
};


/**
 * Defines the visibility states that models can have.
 * @enum {number}
 */
rhizo.ui.Visibility = {
  HIDDEN: 0,  // model filtered, filter is committed.
  GREY: 1,    // model filterer, filter is not committed yet.
  VISIBLE: 2  // model unfiltered, visible.
};


/**
 * Defines all the rendering operations supported by a RenderingPipeline.
 * @enum {string}
 */
rhizo.ui.RenderingOp = {
  // Request to add an artifact (i.e. any UI control or element which is not a
  // SuperModel) to the layout.
  ARTIFACT: 'artifact',

  // Request to move a SuperModel rendering.
  MOVE: 'move',

  // Request to resize a SuperModel rendering.
  RESIZE: 'resize',

  // Request to change the style of a SuperModel rendering.
  STYLE: 'style'
};


/**
 * A RenderingPipeline accumulates operations to be performed on the project
 * renderings, and applies all of the at once when requested.
 *
 * Typically used to accumulate all operations that are part of a layout
 * request.
 *
 * A RenderingPipeline by default keeps backup copies of the renderings
 * it modifies and subsequently restore them.
 * See also rhizo.ui.RenderingBackupManager.
 *
 * @param {rhizo.Project} project The visualization project.
 * @param {*} container The jQuery object pointing to a container where
 *     rendering artifacts will be added (typically the visualization universe).
 * @constructor
 */
rhizo.ui.RenderingPipeline = function(project, container) {
  this.project_ = project;
  this.container_ = container;

  /**
   * Maps model ids to the list of operations to be applied onto them.
   * @type {Object.<*, Array.<*>>}
   * @private
   */
  this.renderingOps_ = {};

  /**
   * The list of artifacts the must be added to the container as part of the
   * pipeline execution.
   *
   * @type {Array.<*>}
   * @private
   */
  this.artifacts_ = [];

  /**
   * jQuery object pointing to the container where all artifacts will be added
   * to.
   * @type {*}
   * @private
   */
  this.artifactLayer_ = $('<div />').
      css({'visibility': 'hidden', 'opacity': 0.0}).
      appendTo(this.container_);

  this.backupEnabled_ = true;
  this.backupManager_ = new rhizo.ui.RenderingBackupManager();
};

/**
 * Clears the pipeline.
 */
rhizo.ui.RenderingPipeline.prototype.cleanup = function() {
  this.artifactLayer_.fadeOut(function() { $(this).remove(); });
  this.artifactLayer_ = $('<div />').
      css({'visibility': 'hidden', 'opacity': 0.0}).
      appendTo(this.container_);

  this.artifacts_ = [];
  this.renderingOps_ = {};
};

/**
 * @return {?rhizo.ui.RenderingBackupManager} The backup manager associated
 *     to the pipeline, if backups are enabled.
 */
rhizo.ui.RenderingPipeline.prototype.backupManager = function() {
  return this.backupEnabled_ ? this.backupManager_ : null;
};

/**
 * Enables or disables backup functionality for the pipeline. Backups are
 * enabled by default.
 *
 * @param {boolean} enabled Whether to enable or disable backups.
 */
rhizo.ui.RenderingPipeline.prototype.setBackupEnabled = function(enabled) {
  if (!enabled) {
    this.backupManager_.clear();
  }
  this.backupEnabled_ = enabled;
};

/**
 * If backups are enabled, backs up the given model.
 * @param {*} modelId The id of the model to backup.
 * @return {boolean} if the model rendering was added to the backups.
 * @private
 */
rhizo.ui.RenderingPipeline.prototype.backup_ = function(modelId) {
  if (this.backupEnabled_) {
    return this.backupManager_.backup(
        modelId, this.project_.model(modelId).rendering());
  }
  return false;
};

/**
 * Returns the list of operations currently queued for a given model.
 * @param {*} modelId The model id.
 * @return {Array.<*>} The list of operations currently queued for the model.
 * @private
 */
rhizo.ui.RenderingPipeline.prototype.getModelOps_ = function(modelId) {
  if (!(modelId in this.renderingOps_)) {
    this.renderingOps_[modelId] = [];
  }
  return this.renderingOps_[modelId];
};

/**
 * Appends a rendering movement request to the current pipeline.
 *
 * @param {*} modelId The id of the model to move.
 * @param {number} top The top coordinate where the top-left corner of the
 *     model rendering should be moved to (with respect to the visualization
 *     universe top-left corner position).
 * @param {number} left The left coordinate where the top-left corner of the
 *     model rendering should be moved to (with respect to the visualization
 *     universe top-left corner position).
 * @param {?string} opt_elevation_key An optional elevation key to change the
 *     rendering elevation.
 * @param {?number} opt_elevation_value An optional elevation value to set
 *     elevation to, for the given elevation_key.
 * @return {rhizo.ui.RenderingPipeline} The pipeline itself, for chaining.
 */
rhizo.ui.RenderingPipeline.prototype.move = function(
    modelId, top, left, opt_elevation_key, opt_elevation_value) {
  var modelOps = this.getModelOps_(modelId);
  var op = {
    op: rhizo.ui.RenderingOp.MOVE,
    top: top,
    left: left
  };
  if (opt_elevation_key !== undefined && opt_elevation_value !== undefined) {
    this.backup_(modelId);
    op.elevation = {key: opt_elevation_key, value: opt_elevation_value};
  }
  modelOps.push(op);
  return this;
};

/**
 * Appends a rendering resize request to the current pipeline.
 * The method assumes that the rendering accepts resizing to the given size,
 * as defined by rhizo.ui.Rendering.prototype.canRescaleTo().
 *
 * @param {*} modelId The id of the model to resize.
 * @param {number} width The width (in pixels) the rendering should be resized
 *     to.
 * @param {number} height The height (in pixels) the rendering should be resized
 *     to.
 * @return {rhizo.ui.RenderingPipeline} The pipeline itself, for chaining.
 */
rhizo.ui.RenderingPipeline.prototype.resize = function(modelId, width, height) {
  this.backup_(modelId);
  this.getModelOps_(modelId).push({
    op: rhizo.ui.RenderingOp.RESIZE,
    width: width,
    height: height
  });
  return this;
};

/**
 * Appends a request to the current pipeline to change a rendering style.
 *
 * @param {*} modelId The id of the model to change.
 * @param {*} styleProps The styles to set, in the form of a plain javascript
 *     object mapping CSS property names to their target values.
 * @return {rhizo.ui.RenderingPipeline} The pipeline itself, for chaining.
 */
rhizo.ui.RenderingPipeline.prototype.style = function(modelId, styleProps) {
  this.backup_(modelId);
  this.getModelOps_(modelId).push({
    op: rhizo.ui.RenderingOp.STYLE,
    styleProps: styleProps
  });
  return this;
};

/**
 * Adds an artifact. An artifact is any HTML element which needs to be added to
 * the visualization viewport when applying the pipeline.
 *
 * Technically, artifacts are immediately added to an invisible pane when this
 * method is called, and then only displayed when the pipeline is applied.
 *
 * This allows the caller to access the true artifact dimensions immediately
 * after this method call.
 *
 * This includes, for instance, reference elements such as headers and
 * connectors, used by layouts.
 *
 * @param {*} artifact The HTML element, or jQuery object pointing to it,
 *     representing the artifact to add.
 * @return {rhizo.ui.RenderingPipeline} The pipeline itself, for chaining.
 */
rhizo.ui.RenderingPipeline.prototype.artifact =  function(artifact) {
  this.artifactLayer_.append(artifact);
  return this;
};

/**
 * Applies the pipeline, executing all the queued operations.
 *
 * @return {*} An object containing 'top', 'left', 'width' and 'height'
 *   properties, representing the area (in pixels) occupied by all the models'
 *   renderings that were part of this pipeline. The top,left coords define
 *   the offset between the top-left corner of the bounding rectangle and
 *   the top-left corner of the visualization universe.
 */
rhizo.ui.RenderingPipeline.prototype.apply = function() {
  this.project_.logger().time('RenderingPipeline::apply');
  var boundingRect = {
      top: Number.POSITIVE_INFINITY,
      left: Number.POSITIVE_INFINITY,
      width: 0,
      height: 0
  };
  for (var modelId in this.renderingOps_) {
    var ops = this.renderingOps_[modelId];
    for (var i = ops.length-1; i >= 0; i--) {
      var rendering = this.project_.model(modelId).rendering();
      switch (ops[i].op) {
        case rhizo.ui.RenderingOp.MOVE:
          rendering.move(ops[i].top, ops[i].left);
          if (ops[i].elevation) {
            rendering.pushElevation(ops[i].elevation.key,
                                    ops[i].elevation.value);
          }
          break;
        case rhizo.ui.RenderingOp.RESIZE:
          rendering.rescaleRendering(ops[i].width, ops[i].height);
          break;
        case rhizo.ui.RenderingOp.STYLE:
          rendering.setCss(ops[i].styleProps);
          break;
        default:
          throw("Unrecognized rendering op: " + ops[i].op);
      }
    }
    this.updateBoundingRectangleCorner_(rendering, boundingRect);
  }
  this.computeBoundingRectangleArea_(boundingRect);
  this.artifactLayer_.fadeIn();
  this.project_.logger().timeEnd('RenderingPipeline::apply');
  return boundingRect;
};

/**
 * Updates the bounding rectangle top-left coordinates including the position
 * of the given rendering.
 *
 * @param {rhizo.ui.Rendering} rendering The rendering under inspection.
 * @param {*} boundingRect
 * @private
 */
rhizo.ui.RenderingPipeline.prototype.updateBoundingRectangleCorner_ = function(
    rendering, boundingRect) {
  var renderingPosition = rendering.position();
  boundingRect.top = Math.min(renderingPosition.top, boundingRect.top);
  boundingRect.left = Math.min(renderingPosition.left, boundingRect.left);

};

/**
 * Updates the width and height of the bounding rectangle from the position
 * and sizes of all the renderings managed by the pipeline.
 *
 * @param {*} boundingRect
 * @private
 */
rhizo.ui.RenderingPipeline.prototype.computeBoundingRectangleArea_ = function(
    boundingRect) {
  for (var modelId in this.renderingOps_) {
    var rendering = this.project_.model(modelId).rendering();
    var renderingDimensions = rendering.getDimensions();
    var renderingPosition = rendering.position();
    boundingRect.width = Math.max(
        boundingRect.width,
        renderingDimensions.width + renderingPosition.left - boundingRect.left);
    boundingRect.height = Math.max(
        boundingRect.height,
        renderingDimensions.height + renderingPosition.top - boundingRect.top);
  }
};


/**
 * A backup manager saves Renderings original attributes and restores them once
 * any applied change is no longer needed.
 *
 * Backup managers are used to revert the changes pushed onto renderings by
 * the execution of RenderingPipelines.
 *
 * Rendering pipelines, used by layout operations, may affect the aspect
 * of Renderings, such as their size or styles (in contrast with only changing
 * their position), which will then be restored once the layout changes.
 *
 * A backup manager can be preserved through multiple consequent executions
 * of a RenderingPipeline. Depending on the condition:
 * - Only the delta of models between the two executions is restored
 *   (removed from backup models) or added to the set (such as when the same
 *   layout is applied twice).
 * - All backup models are restored (see restoreAll()).
 * - when a new RenderingPipeline is created, the set of associated backup
 *   models is initially empty and populated during the pipeline buildup.
 *
 * @constructor
 */
rhizo.ui.RenderingBackupManager = function() {

  /**
   * @type {Object.<string, rhizo.layout.treemap.RenderingBackup>}
   * @private
   */
  this.renderingBackups_ = {};
  this.numBackups_ = 0;
};

/**
 * Clears all the currently stored backups, without restoring them.
 */
rhizo.ui.RenderingBackupManager.prototype.clear = function() {
  this.renderingBackups_ = {};
  this.numBackups_ = 0;
};

/**
 * Adds a new rendering to the backup, if it is not already in there.
 * @param {*} mid The unique id of the model bound to this rendering.
 * @param {rhizo.ui.Rendering} rendering The rendering to backup.
 * @return {boolean} if the rendering was added to the backups.
 */
rhizo.ui.RenderingBackupManager.prototype.backup = function(
    mid, rendering) {
  if (!(mid in this.renderingBackups_)) {
    this.renderingBackups_[mid] =
        new rhizo.ui.RenderingBackup(rendering);
    this.numBackups_++;
    return true;
  }
  return false;
};

/**
 * Removes a rendering from the backup (if present) without restoring it.
 * @param {string} mid The id of the model whose rendering is to remove.
 */
rhizo.ui.RenderingBackupManager.prototype.removeBackup = function(
    mid) {
  if (mid in this.renderingBackups_) {
    delete this.renderingBackups_[mid];
    this.numBackups_--;
  }
};

/**
 * Partially restores the set of currently backed up models by comparing the
 * backups stored so far and all the models the are potentially going to be
 * affected. All the models that are in the former set but not in the latter
 * will be restored.
 *
 * @param {Array.<rhizo.model.SuperModel>} supermodels List of models that will
 *     be (potentially) affected from now on.
 * @param {boolean} styleReset Whether we are still required to restore all
 *     style changes on all backed up models.
 */
rhizo.ui.RenderingBackupManager.prototype.restore = function(
      supermodels, styleReset) {
  if (this.numBackups_ > 0) {
    var survivingModelIds = {};
    for (var i = 0; i < supermodels.length; i++) {
      survivingModelIds[supermodels[i].id] = true;
    }
    var restorableModels = {};
    for (var mid in this.renderingBackups_) {
      if (!(mid in survivingModelIds)) {
        restorableModels[mid] = true;
      }
    }
    this.restoreInternal_(restorableModels, true, true, true);

    if (styleReset) {
      this.restoreInternal_(
          this.renderingBackups_,
          /*sizes=*/ false, /*elevation=*/ false, /*styles=*/ true);
    }
  }
};

/**
 * Restores all the backups.
 */
rhizo.ui.RenderingBackupManager.prototype.restoreAll = function() {
  this.restoreInternal_(this.renderingBackups_, true, true, true);
  this.renderingBackups_ = {};  // just in case.
  this.numBackups_ = 0;
};

/**
 * Restores a specified set of models from their backups.
 * @param {Object.<*, rhizo.ui.RenderingBackup>} modelsMap A map of models to
 *     restore, mapping from the model id to the associated backup.
 * @param {boolean} restoreSizes Whether to restore the size of the rendering.
 * @param {boolean} restoreElevation Whether to restore the rendering elevation
 *     map.
 * @param {boolean} restoreStyles Whether to restore the styles of the
 *     rendering.
 * @private
 */
rhizo.ui.RenderingBackupManager.prototype.restoreInternal_ =
    function(modelsMap, restoreSizes, restoreElevation, restoreStyles) {
  for (var mid in modelsMap) {
    this.renderingBackups_[mid].restore(restoreSizes,
                                        restoreElevation,
                                        restoreStyles);
    if (restoreSizes && restoreElevation && restoreStyles) {
      delete this.renderingBackups_[mid];
      this.numBackups_--;
    }
  }
};


/**
 * A wrapper around a supermodel Rendering to backup relevant attributes that
 * will need to be restored once we clean up a RenderingPipeline.
 *
 * @param {rhizo.ui.Rendering} rendering The rendering to backup.
 * @constructor
 */
rhizo.ui.RenderingBackup = function(rendering) {
  this.rendering_ = rendering;
  this.originalDimensions_ = jQuery.extend({}, rendering.getDimensions());

  // NOTE: background-color is the only style that Rhizosphere layouts and
  // RenderingPipelines actually change, so we take the shortcut here of
  // tracking the initial value of just this style attribute.
  this.originalBackground_ = rendering.css('background-color');

  this.originalElevation_ = this.rendering_.cloneElevation();
};

/**
 * Restores the model managed by this backup.
 * @param {boolean} restoreSizes Whether to restore the size of the rendering.
 * @param {boolean} restoreElevation Whether to restore the rendering elevation
 *     map.
 * @param {boolean} restoreStyles Whether to restore the styles of the
 *     rendering.
 */
rhizo.ui.RenderingBackup.prototype.restore = function(
    restoreSizes, restoreElevation, restoreStyles) {
  if (restoreStyles) {
    this.rendering_.setCss({backgroundColor: this.originalBackground_},
                                /* revert hint */ true);
  }
  if (restoreSizes) {
    this.rendering_.rescaleRendering(this.originalDimensions_.width,
                                     this.originalDimensions_.height);

  }
  if (restoreElevation) {
    this.rendering_.restoreElevation(this.originalElevation_);
  }
};


/**
 * Manages a max-heap of renderings' named elevations (z-indexes when applied to
 * HTML elements). A rendering can be raised to different elevations, with
 * the highest one being the one that is effectively used.
 *
 * Base elevation is 0, and any elevation request below or equal to that
 * threshold will be ignored.
 * @param {number=} opt_offset An optional offset to apply to all elevations
 *     managed by the class.
 * @constructor
 */
rhizo.ui.Elevation = function(opt_offset) {
  this.elevations_ = {};
  this.elevation_top_ = 0;

  // An offset that will always be added to the returned elevation values.
  this.elevation_offset_ = opt_offset || 0;
};

rhizo.ui.Elevation.prototype.clone = function() {
  var el = new rhizo.ui.Elevation();
  el.elevations_ = $.extend({}, this.elevations_);
  el.elevation_top_ = this.elevation_top_;
  el.elevation_offset_ = this.elevation_offset_;
  return el;
};

/**
 * Adds a named elevation.
 * @param {string} el_key
 * @param {number} el_value
 * @return {boolean} Whether the highest elevation changed because of this
 *     addition.
 */
rhizo.ui.Elevation.prototype.add = function(el_key, el_value) {
  if (el_value <= 0) {
    return false;
  }
  this.elevations_[el_key] = el_value;
  return this.recomputeTop_();
};

/**
 * Removes a named elevation.
 * @param {string} el_key
 * @return {boolean} Whether the highest elevation changed because of this
 *     removal.
 */
rhizo.ui.Elevation.prototype.remove = function(el_key) {
  delete this.elevations_[el_key];
  return this.recomputeTop_();
};

/**
 * @return {number} The highest elevation value.
 */
rhizo.ui.Elevation.prototype.top = function() {
  return this.elevation_top_ + this.elevation_offset_;
};

/**
 * @return {boolean} Whether no named elevations are recorded yet.
 */
rhizo.ui.Elevation.prototype.empty = function() {
  return this.elevation_top_ == 0;
};

/**
 * @private
 * @return {boolean} Whether the highest elevation changed
 */
rhizo.ui.Elevation.prototype.recomputeTop_ = function() {
  var new_top_ = 0;
  for (var key in this.elevations_) {
    new_top_ = Math.max(new_top_, this.elevations_[key]);
  }
  if (new_top_ != this.elevation_top_) {
    this.elevation_top_ = new_top_;
    return true;
  }
  return false;
};

/**
 * A Rendering is a wrapper that enriches plain (naked) model renderings
 * returned from the project renderer with all the additional events,
 * functionality and goodness Rhizosphere requires.
 *
 * Three layers of rendering exist:
 * - A 'naked' rendering is the plain output of the project renderer. This is
 *   where per-project customization occurs.
 * - A 'raw' (or 'shell') rendering is a thin wrapper on the naked rendering,
 *   to simplify isolation and targeting of renderings among the other HTML
 *   elements that exist within a Rhizosphere visualization. Typically it's
 *   just a DIV wrapper around the naked renderer, with a specific CSS class
 *   assigned to it.
 * - A rhizo.ui.Rendering wraps a 'raw' rendering and exposes to the rest of
 *   Rhizosphere all the available operations that can be performed on
 *   renderings.
 *
 * @param {rhizo.model.SuperModel} model The model this rendering will be bound
 *     to.
 * @param {*} rawNode The jQuery object that manages the 'raw' rendering.
 * @param {*} renderer The project renderer.
 * @param {*} renderingHints The project rendering hints.
 * @constructor
 */
rhizo.ui.Rendering = function(model, rawNode, renderer, renderingHints) {
  this.model_ = model;
  this.id = model.id;
  this.raw_node_ = rawNode;

  /**
   * The naked rendering, as returned by the renderer render() call.
   * @type {Element}
   * @private
   */
  this.naked_node_ = rawNode.children().get(0);

  // Bind the model id to each rendering
  this.raw_node_.data('id', model.id);

  this.renderer_ = renderer;
  this.renderingHints_ = renderingHints;

  /**
   * Function to decide whether the rendering can be rescaled to the desired
   * width and height.
   * @type {function(Object, Element, number, number):boolean}
   * @private
   */
  this.rendererSizeChecker_ = null;

  /**
   * Function to rescale the rendering to the desired width and height.
   * @type {function(Object, Element, number, number):boolean}
   * @private
   */
  this.rendererRescaler_ = null;
  this.rendererStyleChanger_ = null;
  this.rendererAttachListener_ = null;
  this.setRendererHelpers_();

  this.expandable_ = false;  // Whether the rendering supports expansion or not.
  this.expanded_ = false;  // whether the rendering is expanded or not

  /**
   * The rendering position, at the time of the last move() call.
   * @type {Object.<string, number>}
   * @private
   */
  this.position_ = {};

  /**
   * Whether the rendering should cache its dimensions.
   * @type {boolean}
   * @private
   */
  this.cacheDimensions_ = false;

  /**
   * Holds a cached copy of the rendering dimensions, to avoid costly lookups
   * on the DOM nodes themselves.
   * @type {Object.<string, number>}
   * @private
   */
  this.cachedDimensions_ = {};

  // A position mark, that can be used to remember a previous position occupied
  // by the rendering.
  this.mark_ = null;

  // whether the rendering is visible or not. Multiple states might exist,
  // as defined in the rhizo.ui.Visibility enum. Renderings are initially
  // hidden, as defined in the rhizo.less stylesheet.
  this.visibility = rhizo.ui.Visibility.HIDDEN;

  /**
   * Keeps track of all z-indexes changes.
   * The offset value should match the base z-index used by Rhizosphere models.
   * @type {rhizo.ui.Elevation}
   * @private
   */
  this.elevation_ = new rhizo.ui.Elevation(50);

  /**
   * The set of rendering modes.
   * @type {Object.<string, boolean>}
   * @private
   */
  this.modes_ = {};
  this.notifyAttach_(true);
};

/**
 * @private
 */
rhizo.ui.Rendering.prototype.setRendererHelpers_ = function() {
  if (typeof(this.renderer_.canRescaleTo) == 'function') {
    this.rendererSizeChecker_ = this.renderer_.canRescaleTo;
  }
  if (typeof(this.renderer_.rescale) == 'function') {
    this.rendererRescaler_ = this.renderer_.rescale;
  }
  if (typeof(this.renderer_.changeStyle) == 'function') {
    this.rendererStyleChanger_ = this.renderer_.changeStyle;
  }
  if (typeof(this.renderer_.onAttach) == 'function') {
    this.rendererAttachListener_ = this.renderer_.onAttach;
  }
};

/**
 * @return {HTMLElement} The root node of the raw rendering, for internal
 *     use only by the rhizo.ui module.
 * @private
 */
rhizo.ui.Rendering.prototype.raw_ = function() {
  return this.raw_node_.get(0);
};


/**
 * Notifies the renderer that the rendering of a particular model has been
 * attached to or removed from the DOM. 
 * 
 * @param {boolean} attached Whether this rendering was attached to or detached
 *     from the DOM.
 * @private
 */
rhizo.ui.Rendering.prototype.notifyAttach_ = function(attached) {
  if (this.rendererAttachListener_) {
    this.rendererAttachListener_(
        this.model_.unwrap(), this.naked_node_, attached);
  }
};


/**
 * Regenerates the naked and raw renderings for the model managed by this
 * rendering.
 * @private
 */
rhizo.ui.Rendering.prototype.reRender_ = function() {
  // Detach the old rendering.
  this.notifyAttach_(false);
  this.raw_node_.children(':not(.rhizo-expand-model)').remove();  
  
  // re-render. rendered expects the naked model.
  // Must wrap in $() in case renderer returns raw strings.
  this.naked_node_ = $(this.renderer_.render(this.model_.unwrap(),
                                             this.expanded_,
                                             this.renderingHints_)).get(0);

  // keep expanded items above the others.
  // Remove any rescaling that might have been applied to the rendering.
  this.raw_node_.toggleClass('rhizo-model-expanded', this.expanded_).css(
      {width: '', height: ''});
  if (this.expanded_) {
    this.pushElevation('__expanded__', 200);
  } else {
    this.popElevation('__expanded__');
  }

  // replace the old rendering
  this.raw_node_.append(this.naked_node_);
  this.notifyAttach_(true);
  this.refreshCachedDimensions_();
};

/**
 * Notifies the rendering that it is about to be destroyed and removed from
 * the DOM. Any cleanup should occur here, before the DOM removal takes place.
 */
rhizo.ui.Rendering.prototype.beforeDestroy = function() {
  this.notifyAttach_(false);
};

/**
 * Destroys all the DOM nodes attached to this rendering.
 */
rhizo.ui.Rendering.prototype.destroy = function() {
  this.beforeDestroy();
  this.raw_node_.remove();
  this.raw_node_ = null;
};

/**
 * Moves the rendering.
 * @param {number} top The target y coordinate of the top-left corner of the
 *     rendering, relative to the universe top-left corner.
 * @param {number} left The target x coordinate of the top-left corner of the
 *     rendering, relative to the universe top-left corner.
 * @param {?boolean} opt_instant Whether the move should be instantaneous
 *   (no animations) or not.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.move = function(top, left, opt_instant) {
  if (this.position_.top == top && this.position_.left == left) {
    // Bypass any DOM manipulation if we are already in the target position.
    return this;
  }
  if (!!opt_instant) {
    this.raw_node_.css({top: top, left: left});
  } else {
    this.raw_node_.move(top, left);
  }
  this.position_ = {top: top, left: left};
  return this;
};

/**
 * Moves the rendering back to last marked position.
 * @param {?boolean} opt_instant Whether the move should be instantaneous
 *   (no animations) or not.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.moveToMark = function(opt_instant) {
  if (this.mark_ !== null) {
    this.move(this.mark_.top, this.mark_.left, opt_instant);
  }
  return this;
};

/**
 * Moves the rendering of a {top, left} delta distance from the last marked
 * position (if no mark exists, the move is relative to the universe top-left
 * corner).
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.moveFromMark = function(top, left, opt_instant) {
  if (this.mark_ != null) {
    this.move(this.mark_.top + top, this.mark_.left + left, opt_instant);
  } else {
    this.move(top, left, opt_instant);
  }
  return this;
};

/**
 * Marks the current model position.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.markPosition = function() {
  this.mark_ = {
    top: parseInt(this.raw_node_.css('top'), 10),
    left: parseInt(this.raw_node_.css('left'), 10)
  };
  return this;
};

/**
 * Discards the current mark, if any.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.unmarkPosition = function() {
  this.mark_ = null;
  return this;
};

/**
 * @return {*} A {top,left} distance from the given {top, left} position and
 *   this rendering mark position. Returns null if no mark exists.
 */
rhizo.ui.Rendering.prototype.distanceFromMark = function(top, left) {
  if (this.mark_ != null) {
    return {left: left - this.mark_.left,
            top: top - this.mark_.top};
  } else {
    return null;
  }
};

/**
 * Updates the current rendering position. This happens automatically if models
 * are always repositioned using move() or one of its derivates.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.refreshPosition = function() {
  this.position_ = {
    top: parseInt(this.raw_node_.css('top'), 10),
    left: parseInt(this.raw_node_.css('left'),10)
  };
  return this;
};

/**
 * @return {*} the {top, left} position of top-left corner of the rendering, with
 * respect to the visualization universe top-left corner.
 */
rhizo.ui.Rendering.prototype.position = function() {
  return this.position_;
};

/**
 * Toggles selection status for this rendering.
 * @param {boolean} selected Whether this rendering should be displayed as
 *     selected or not.
 */
rhizo.ui.Rendering.prototype.setSelected = function(selected) {
  if (selected) {
    this.raw_node_.addClass('xselectable-selected');
  } else {
    this.raw_node_.removeClass('xselectable-selected');
  }
};

/**
 * Enables dimension caching for this rendering.
 */
rhizo.ui.Rendering.prototype.startDimensionCaching = function() {
  this.cacheDimensions_ = true;
  this.refreshCachedDimensions_();
};

/**
 * Re-computes this rendering width and height dimensions.
 * @private
 */
rhizo.ui.Rendering.prototype.refreshCachedDimensions_ = function() {
  this.cachedDimensions_ = {
    width: this.raw_().offsetWidth,
    height: this.raw_().offsetHeight
  };
};

/**
 * @return {Object.<string, number>} The (cached?) dimensions of this model
 *     rendering. The returned object has a 'width' and 'height' property
 *     that map to the outer dimensions (incl. border and such) of the
 *     rendering.
 */
rhizo.ui.Rendering.prototype.getDimensions = function() {
  if (this.cacheDimensions_) {
    return this.cachedDimensions_;
  } else {
    return {
      width: this.raw_().offsetWidth,
      height: this.raw_().offsetHeight
    };
  }
};

/**
 * Enables expansion support.
 * @param {*} expander The UI control that will trigger expansions, to be
 *     appended to the raw rendering.
 */
rhizo.ui.Rendering.prototype.startExpandable = function(expander) {
  if (!this.expandableByModel_()) {
    return;
  }
  expander.data("id", this.id);
  this.raw_node_.append(expander);
  this.expandable_ = true;
};

/**
 * @return {boolean} Whether the specific model attached to this rendering
 *     supports expansion.
 * @private
 */
rhizo.ui.Rendering.prototype.expandableByModel_ = function() {
  if (typeof(this.renderer_.expandableByModel) == 'function') {
    return this.renderer_.expandableByModel(this.model_.unwrap(),
                                            this.renderingHints_);
  } else {
    return true;
  }
};

/**
 * Sets the expansion status of this rendering.
 * @param {boolean} expanded
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.setExpanded = function(expanded) {
  if (!this.expandable_ || this.expanded_ == expanded) {
    // already in the expected status, or expansion is not supported.
    return this;
  }
  this.expanded_ = expanded;
  this.reRender_();
  return this;
};

/**
 * Toggles the expansion status for this rendering.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.toggleExpanded = function() {
  this.expanded_ = !this.expanded_;
  this.reRender_();
  return this;
};

/**
 * Updates the rendering after a change that occurred to the underlying model.
 */
rhizo.ui.Rendering.prototype.modelChanged = function() {
  this.reRender_();
};

/**
 * Pushes an elevation request on this rendering. Re-sets the z-index of this
 * rendering if needed.
 * @param {string} elevation_key
 * @param {number} elevation_value
 */
rhizo.ui.Rendering.prototype.pushElevation = function(elevation_key,
                                                      elevation_value) {
  var zIndexChange = this.elevation_.add(elevation_key, elevation_value);
  if (zIndexChange) {
    this.raw_node_.css('z-index', this.elevation_.top());
  }
};

/**
 * Removes a named elevation from this rendering. Re-sets the z-index of this
 * rendering if needed.
 * @param {string} elevation_key
 */
rhizo.ui.Rendering.prototype.popElevation = function(elevation_key) {
  var zIndexChange = this.elevation_.remove(elevation_key);
  if (zIndexChange) {
    this.raw_node_.css(
        'z-index',
        this.elevation_.empty() ? '' : this.elevation_.top());
  }
};

/**
 * Returns a clone of the rendering current elevation map.
 *
 * This method is intended for internal use only by the rendering backup
 * features.
 *
 * @return {rhizo.ui.Elevation} A clone of the rendering current elevation map.
 */
rhizo.ui.Rendering.prototype.cloneElevation = function() {
  return this.elevation_.clone();
};

/**
 * Replaces the rendering current elevation map with another one, adjusting the
 * rendering z-index as a consequence.
 *
 * @param {rhizo.ui.Elevation} elevation The new Rendering elevation map to use.
 */
rhizo.ui.Rendering.prototype.restoreElevation = function(elevation) {
  this.elevation_ = elevation;
  this.raw_node_.css(
      'z-index',
      this.elevation_.empty() ? '' : this.elevation_.top());
};

/**
 * Checks whether the rendering can be resized to the requested dimensions.
 *
 * Resizing can fail, for example if we determine that the requested target
 * dimensions are too small for a proper rendering display.
 *
 * @param {number} width The target width.
 * @param {number} height The target height.
 * @param {?Function} opt_failure_callback callback invoked whenever the
 *   requested rescaling is not possible.
 * @return {boolean} Whether rescaling to the desired dimensions is possible.
 */
rhizo.ui.Rendering.prototype.canRescaleTo = function(width,
                                                     height,
                                                     opt_failure_callback) {
  // The raw_node_ is guaranteed to be marginless and paddingless, with a
  // 1px border (unless someone tampers the .rhizo-model class), so we
  // programmatically know that internal dimensions need to be resized
  // to a smaller extent (exactly 2px less).
  //
  // If internal width/height falls to 0px we bail out.
  if (width <= 2 || height <= 2) {
    if (opt_failure_callback) {
      opt_failure_callback();
    }
    return false;
  }

  if (this.rendererSizeChecker_) {
    // Give the original model renderer a chance to veto rescaling, if a
    // size checker has been defined.
    //
    // Like this method, the size checker too receives outer dimensions.
    var canResize = this.rendererSizeChecker_(this.model_.unwrap(),
                                              this.naked_node_,
                                              width - 2,
                                              height - 2);
    if (!canResize && opt_failure_callback) {
      opt_failure_callback();
    }
    return canResize;
  }
  return true;
};

/**
 * Resizes this rendering. By default, only the raw rendering is resized. If
 * the project renderer includes a rescaler, then the rescaler is asked to
 * resize the naked rendering too.
 *
 * This method assumes that canRescaleTo() has already been invoked and
 * successfully returned.
 *
 * @param {number} width The target width.
 * @param {number} height The target height.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.rescaleRendering = function(width,
                                                         height) {
  if (this.cacheDimensions_ &&
      this.cachedDimensions_.width == width &&
      this.cachedDimensions_.height == height) {
    // No-op, the rendering already has the required dimensions. Skip any
    // DOM manipulation.
    return this;
  }
  this.cachedDimensions_ = {width: width, height: height};
  this.raw_node_.width(width - 2).height(height - 2);
  if (this.rendererRescaler_) {
    // Give the original model renderer a chance to rescale the naked render,
    // if a rescaler has been defined.
    //
    // Like this method, the rescaler too receives outer dimensions.
    this.rendererRescaler_(this.model_.unwrap(), 
                           this.naked_node_, 
                           width - 2,
                           height - 2);
  }
  return this;
};

/**
 * Applies a set of CSS styles to the rendering. If the renderer exposes a style
 * changer, then the style changer is notified of then change too to have the
 * chance to react to it and updated the naked rendering accordingly (if
 * needed).
 *
 * @param {*} props CSS styles to apply, in the form of a plain javascript
 *     object.
 * @param {?boolean} opt_hintRevert An optional boolean hint to indicate that
 *     the rendering properties are being reverted to their original state,
 *     to cancel the effects of a previous call to this function.
 */
rhizo.ui.Rendering.prototype.setCss = function(props, opt_hintRevert) {
  if (typeof props != 'object') {
    throw 'setCss() expects a map of properties.';
  }
  this.raw_node_.css(props);
  if (this.rendererStyleChanger_) {
    this.rendererStyleChanger_(this.model_.unwrap(), 
                               this.naked_node_, 
                               props, 
                               opt_hintRevert);
  }
};

/**
 * @param {string} propName The property to extract.
 * @return {*} A CSS style extracted from the raw rendering.
 */
rhizo.ui.Rendering.prototype.css = function(propName) {
  if (typeof propName != 'string') {
    throw 'css() expects a string of the property to access.';
  }
  return this.raw_node_.css(propName);
};

/**
 * Sets the given mode. Modes are simple tags that can be applied to a
 * rendering and can alter the rendering behavior under certain conditions
 * (for example: to make the rendering behave differently during drag
 * operations).
 *
 * @param {string} mode The mode to apply.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.setMode = function(mode) {
  this.modes_[mode] = true;
  return this;
};

/**
 * Removes the given mode.
 * @param {string} mode The mode to remove.
 * @return {rhizo.ui.Rendering} this object, for chaining.
 */
rhizo.ui.Rendering.prototype.removeMode = function(mode) {
  delete this.modes_[mode];
  return this;
};

/**
 * @param {string} mode
 * @return {boolean} Whether the requested mode is on or not.
 */
rhizo.ui.Rendering.prototype.isMode = function(mode) {
  return !!this.modes_[mode];
};


/**
 * A synthetic rendering is a rendering that is not backed by a visualization
 * model but is created programmatically by the visualization framework. It is
 * used, for example, to create visualization artifacts used by specific layouts
 * like trees and treemaps.
 *
 * SyntheticRendering instances expose a subset of the same functionalities
 * exposed by rhizo.ui.Rendering, allowing for basic movement, resizing and
 * manipulation of synthetic renderings.
 *
 * @param {*} raw_node The jQuery object that wraps the 'raw' HTML elements that
 *     form the synthetic rendering contents. The raw HTML elements must
 *     already be attached to the DOM, otherwise dimension calculations for
 *     the rendering will fail.
 * @constructor
 */
rhizo.ui.SyntheticRendering = function(raw_node) {
  /**
   * @private
   * @type {*}
   */
  this.raw_node_ = raw_node;
  this.raw_node_.css('position', 'absolute');

  /**
   * The rendering position, at the time of the last move() call.
   * @type {Object.<string, number>}
   * @private
   */
  this.position_ = {};

  /**
   * Whether the rendering should cache its dimensions.
   * @type {boolean}
   * @private
   */
  this.cacheDimensions_ = true;

  /**
   * Holds a cached copy of the rendering dimensions, to avoid costly lookups
   * on the DOM nodes themselves.
   * @type {Object.<string, number>}
   * @private
   */
  this.cachedDimensions_ = {
    width: this.raw_node_.get(0).offsetWidth,
    height: this.raw_node_.get(0).offsetHeight
  };

  /**
   * Keeps track of all z-indexes changes.
   * Use the raw node current z-index as base offset.
   * @type {rhizo.ui.Elevation}
   * @private
   */
  this.elevation_ = new rhizo.ui.Elevation(
      parseInt(this.raw_node_.css('z-index'), 10));

  /**
   * Function to decide whether the rendering can be rescaled to the desired
   * width and height.
   * @type {function(Object, Element, number, number):boolean}
   * @private
   */
  this.rendererSizeChecker_ = null;

  /**
   * Function to rescale the rendering to the desired width and height.
   * @type {function(Object, Element, number, number):boolean}
   * @private
   */
  this.rendererRescaler_ = null;
};

rhizo.ui.SyntheticRendering.prototype.move = rhizo.ui.Rendering.prototype.move;

rhizo.ui.SyntheticRendering.prototype.pushElevation =
    rhizo.ui.Rendering.prototype.pushElevation;

rhizo.ui.SyntheticRendering.prototype.popElevation =
    rhizo.ui.Rendering.prototype.popElevation;

rhizo.ui.SyntheticRendering.prototype.canRescaleTo =
    rhizo.ui.Rendering.prototype.canRescaleTo;

rhizo.ui.SyntheticRendering.prototype.rescaleRendering =
    rhizo.ui.Rendering.prototype.rescaleRendering;

rhizo.ui.SyntheticRendering.prototype.getDimensions =
    rhizo.ui.Rendering.prototype.getDimensions;


/**
 * A RenderingBootstrap is responsible for building the renderings attached
 * to each model to visualize. It relies on the externally provided renderer
 * to convert each model into a 'naked' rendering, which is then wrapped in
 * a rhizo.ui.Rendering to enrich it with all the additional Rhizosphere
 * functionalities.
 *
 * @param {*} renderer Externally provided renderer, to convert models into
 *     their HTML rendering counterparts.
 * @param {!rhizo.ui.gui.GUI} gui The project gui.
 * @param {!rhizo.Project} project The project itself.
 * @constructor
 */
rhizo.ui.RenderingBootstrap = function(renderer, gui, project) {
  this.renderer_ = renderer;
  this.gui_ = gui;
  this.project_ = project;
  this.logger_ = project.logger();
};

/**
 * Converts a list of models into their HTML rendering counterparts.
 *
 * @param {!Array.<!rhizo.model.SuperModel>} models The models to generate
 *     renderings for. They must not have a rendering already.
 * @return {boolean} Whether the renderings were created successfully or not.
 */
rhizo.ui.RenderingBootstrap.prototype.buildRenderings = function(models) {
  var rawRenderings = [];
  var hasCustomDragHandle = this.getDragHandleSelector_() != null;
  for (var i = 0;  i < models.length; i++) {
    if (!!models[i].rendering()) {
      this.logger_.error("Rendering requested for a model that has already " +
                         "been rendered. Model id: " + model.id);
      return false;
    }
    this.rawrender_(models[i], rawRenderings, hasCustomDragHandle);
  }
  if (rawRenderings.length == 0) {
    this.logger_.error("No renderings.");
    return false;
  }

  var numRenderedModels = this.numRenderedModels_();
  if (typeof rawRenderings[0] == 'string') {
    // The project renderer returns raw strings.
    //
    // We concatenate everything together and add it to the DOM in a single
    // pass. We then identify back all the single renderings and bind them
    // to the model they belong to.
    this.buildFromStrings_(models, rawRenderings, numRenderedModels);
  } else {
    // The project renderer returns jQuery objects.
    //
    // We append them to the DOM one at a time and assign them to their model.
    this.buildFromShells_(models, rawRenderings);
  }
  rawRenderings = 
      this.gui_.universe.find('.rhizo-model').slice(numRenderedModels);

  // Sanity checks
  if (!this.sanityCheck_(rawRenderings, models)) {
    return false;
  }

  // Attach events and additional functionality to each rendering. This may be
  // done on the rawRenderings directly for performance reasons.
  this.decorateRenderings_(rawRenderings, models);
  return true;
};

/**
 * Returns the number of models in the current project that already have a
 * rendering attached.
 *
 * @return {number} The number of models that already have a rendering.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.numRenderedModels_ = function() {
  var numRenderedModels = 0;
  var models = this.project_.models();
  for (var i = models.length-1; i >= 0; i--) {
    numRenderedModels += models[i].rendering() == null ? 0 : 1;
  }
  return numRenderedModels;
};

/**
 * Accumulates the raw rendering for the given model to the list of all raw
 * renderings, either as a serie of HTML strings or as a jQuery object
 * (depending on what the naked renderer provides).
 *
 * @param {!rhizo.model.SuperModel} model
 * @param {Array.<*>} rawRenderings
 * @param {boolean} hasCustomDragHandle Whether the renderings will have
 *     a custom drag handler, or otherwise the entire rendering is draggable.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.rawrender_ = function(
    model, rawRenderings, hasCustomDragHandle) {
  var naked_render = this.renderer_.render(model.unwrap(),
                                           model.expanded,
                                           this.gui_.allRenderingHints());
  var renderingClass = 'rhizo-model';
  if (this.project_.options().isDragAndDropEnabled() && !hasCustomDragHandle) {
    renderingClass += ' rhizo-drag-handle';
  }
  if (typeof naked_render == 'string') {
    rawRenderings.push('<div class="');
    rawRenderings.push(renderingClass);
    rawRenderings.push('">');
    rawRenderings.push(naked_render);
    rawRenderings.push('</div>');
  } else {
    // Assume it's a jQuery object.
    var shell = $('<div />', {'class': renderingClass});
    shell.append(naked_render);
    rawRenderings.push(shell);
  }
};

/**
 * Converts HTML strings of raw renderings into rhizo.ui.Rendering objects.
 * Attaches the rendering to the visualization.
 *
 * @param {!Array.<!rhizo.model.SuperModel>} models The models to generate
 *     renderings for.
 * @param {!Array.<string>} rawRenderings The generated renderings (as an
 *     array of raw HTML strings).
 * @param {number} numRenderedModels The number of models that already have
 *     a rendering attached.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.buildFromStrings_ = function(
    models, rawRenderings, numRenderedModels) {
  this.gui_.universe.append(rawRenderings.join(''));
  this.gui_.universe.
      find('.rhizo-model').
      slice(numRenderedModels).
      each(jQuery.proxy(
        function(renderingIdx, rawRendering) {
          var model = models[renderingIdx];
          var rendering = new rhizo.ui.Rendering(
              model, $(rawRendering), this.renderer_,
              this.gui_.allRenderingHints());
          model.setRendering(rendering);
        }, this));
};

/**
 * Converts jQuery objects representing a raw rendering into rhizo.ui.Rendering
 * objects.
 *
 * @param {!Array.<!rhizo.model.SuperModel>} models The models to generate
 *     renderings for.
 * @param {!Array.<*>} rawRenderings The generated renderings (as an
 *     array of jQuery objects).
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.buildFromShells_ = function(
    models, rawRenderings) {
  for (var i = 0; i < models.length; i++) {
    this.gui_.universe.append(rawRenderings[i]);
    var rendering = new rhizo.ui.Rendering(models[i],
                                           rawRenderings[i],
                                           this.renderer_,
                                           this.gui_.allRenderingHints());
    models[i].setRendering(rendering);
  }
};

/**
 * Verifies that the number of models that were passed to the bootstrapper is
 * the same as the number of renderings that were created (both in term of
 * rhizo.ui.Rendering objects and raw HTML nodes). This ensures that rendering
 * creation has been successful.
 *
 * @param {!Array.<!HTMLElement>} rawRenderings
 * @param {!Array.<!rhizo.model.SuperModel>} models
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.sanityCheck_ = function(rawRenderings,
                                                              models) {
  if (rawRenderings.length != models.length) {
    this.logger_.error('The number of new renderings and models differ: ' +
                       rawRenderings.length + '  (raw), ' +
                       numModels + ' (models).');
    return false;
  }
  for (var i = models.length-1; i >= 0; i--) {
    if (!models[i].rendering()) {
      this.logger_.error('At least one model (id=' + models[i].id + ') ' +
                         'has no rendering attached.');
      return false;
    }
  }
  return true;
};

/**
 * @return {boolean|string|null} Whether the renderer declares a custom drag
 *     handle selector or not (in which case, the entire rendering will be
 *     used as a drag handle.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.getDragHandleSelector_ = function() {
  if (typeof(this.renderer_.dragHandle) == 'string') {
    return this.renderer_.dragHandle;
  } else if (typeof(this.renderer_.dragHandle) == 'function') {
    return this.renderer_.dragHandle();
  } else {
    return null;
  }
};

/**
 * Attach events and additional functionality to each newly generated
 * rendering.
 *
 * @param {!Object} rawRenderings The newly generated renderings, as a jQuery
 *     collection.
 * @param {!Array.<!rhizo.model.SuperModel>} models The models the renderings
 *     were generated for.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.decorateRenderings_ = function(
    rawRenderings, models) {
  // Can renderings cache their dimensions?
  if (this.canCacheDimensions_()) {
    this.startDimensionCaching_(models);
  }

  // Do renderings support an expanded state?
  if (this.expandable_()) {
    this.startExpandable_(rawRenderings, models);
  }

  // Listen for click events on renderings.
  this.startClick_(rawRenderings);

  if (this.project_.options().isDragAndDropEnabled()) {
    // Enable dragging.
    // This may take some time, especially for thousands of models, so we do
    // this in a timeout callback, to give the UI the possibility to refresh.
    window.setTimeout(jQuery.proxy(function() {
        this.startDraggable_(rawRenderings);
      }, this), 100);
  }
};

/**
 * @return {boolean} Whether the renderer or project options indicate we
 *     should cache renderings dimensions (for improved performance).
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.canCacheDimensions_ = function() {
  return (!!this.renderer_.cacheDimensions) ||
      this.project_.options().forceDimensionCaching();
};

/**
 * @param {!Array.<!rhizo.model.SuperModel>} models The models renderings were
 *     generated for.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.startDimensionCaching_ = function(
    models) {
  for (var i = models.length-1; i >= 0; i--) {
    models[i].rendering().startDimensionCaching();
  }
};

/**
 * @return {boolean} Whether the renderings can toggle between an expanded
 *     status and a 'normal' one.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.expandable_ = function() {
  if (typeof(this.renderer_.expandable) == 'boolean') {
    return this.renderer_.expandable;
  } else if (typeof(this.renderer_.expandable) == 'function') {
    return this.renderer_.expandable(this.gui_.allRenderingHints());
  } else {
    return false;
  }
};

/**
 * @param {!Object} rawRenderings The newly generated renderings, as a jQuery
 *     collection.
 * @param {!Array.<!rhizo.model.SuperModel>} models The models renderings were
 *     generated for.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.startExpandable_ = function(
    rawRenderings, models) {
  var expander = $('<div />',
                   {'class': 'rhizo-expand-model ' +
                       'rhizo-icon rhizo-maximize-icon',
                    title: 'Maximize'});
  for (var i = models.length-1; i >= 0; i--) {
    models[i].rendering().startExpandable(expander.clone());
  }

  // register the hover effect to show/hide the expand icon
  rawRenderings.hover(
    function() {
      $(this).children('.rhizo-expand-model').css('visibility', 'visible');
    }, function() {
      $(this).children('.rhizo-expand-model').css('visibility', 'hidden');
    });

  // listen to click events on the expand icon
  $('.rhizo-expand-model', this.gui_.container).click(
      jQuery.proxy(function(ev) {
        var model = rhizo.ui.eventToModel(ev, this.project_);
        model.rendering().toggleExpanded();
        return false;
  }, this));
};

/**
 * Start tracking click events on renderings.
 *
 * @param {!Object} rawRenderings The newly generated renderings, as a jQuery
 *     collection.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.startClick_ = function(rawRenderings) {
  rawRenderings.click(jQuery.proxy(function(ev) {
    var model = rhizo.ui.eventToModel(ev, this.project_);
    if (model.rendering().isMode('__dragging__')) {
      // A spurious click event always fires after a drag event, which we
      // ignore.
      model.rendering().removeMode('__dragging__');
      return false;
    }

    if (ev.target.nodeName == 'A') {
      // If a link was clicked, let the event bubble up.
      return;
    }
    
    if ($(ev.target).is('.rhizo-stop-propagation') ||
        $(ev.target).parents('.rhizo-stop-propagation').length > 0) {
      // Stop propagation if the event originated within a node that explicitly
      // requests so.
      return false;
    }

    if (this.project_.options().isClickSelectionMode()) {
      this.project_.eventBus().publish(
          'selection', {'action': 'toggle', 'models': model.id});
    }
    return false;
  }, this));
};

/**
 * Enable support for dragging renderings.
 *
 * @param {!Object} rawRenderings The newly generated renderings, as a jQuery
 *     collection.
 * @private
 */
rhizo.ui.RenderingBootstrap.prototype.startDraggable_ = function(
    rawRenderings) {
  rawRenderings.draggable({
    cursor: 'pointer',
    handle: this.getDragHandleSelector_() || '.rhizo-drag-handle',
    distance: 3,
    addClasses: false,
    start: jQuery.proxy(function(ev, ui) {
      var model = rhizo.ui.elementToModel(ui.helper[0], this.project_);
      model.rendering().
          setMode('__dragging__').
          markPosition().
          pushElevation('__dragging__', 10000);

      // figure out all the initial positions for the selected elements
      // and store them.
      if (this.project_.selectionManager().isSelected(model.id)) {
        var all_selected = this.project_.selectionManager().allSelected();
        for (var id in all_selected) {
          this.project_.model(id).rendering().markPosition();
        }
      }
    }, this),
    drag: jQuery.proxy(function(ev, ui) {
      var model = rhizo.ui.elementToModel(ui.helper[0], this.project_);
      if (this.project_.selectionManager().isSelected(model.id)) {
        var delta = model.rendering().distanceFromMark(ui.position.top,
                                                      ui.position.left);
        var all_selected = this.project_.selectionManager().allSelected();
        for (var id in all_selected) {
          if (id != model.id) {
            all_selected[id].rendering().moveFromMark(
                delta.top, delta.left, true);
          }
        }
      }
    }, this),
    stop: jQuery.proxy(function(ev, ui) {
      var modelPositions = [];
      var model = rhizo.ui.elementToModel(ui.helper[0], this.project_);
      model.rendering().
          unmarkPosition().
          refreshPosition().
          popElevation('__dragging__');

      modelPositions.push({id: model.id,
                           top: model.rendering().position().top,
                           left: model.rendering().position().left});

      if (this.project_.selectionManager().isSelected(model.id)) {
        var all_selected = this.project_.selectionManager().allSelected();
        for (var id in all_selected) {
          modelPositions.push({
              id: id,
              top: all_selected[id].rendering().position().top,
              left: all_selected[id].rendering().position().left
          });
          all_selected[id].rendering().unmarkPosition().refreshPosition();
        }
      }
      this.project_.layoutManager().modelsMoved(modelPositions);
    }, this),
    refreshPositions: false
  });
};
/* ./src/js/extra/rhizo.keyboard.js */
/**
  @license
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

/**
 * Onscreen keyboard based on HTML5 canvas, useful when Rhizosphere is used on
 * a keyboard-less touchscreen.
 * 
 * Implementation inspired by the online virtual keyboard by Joshua Koo
 * (zz85nus@gmail.com, http://lab4games.net/zz85/blog). See
 * http://www.lab4games.net/zz85/blog/2010/02/06/online-virtual-keyboard-with-canvas-and-javascript/
 * 
 * In addition to the changes necessary to embed the virtual keyboard in
 * Rhizosphere, the following has changed from the original script:
 * - no IE support. Tested on Firefox, Chrome, Safari, Opera.
 * - no bookmarklet support. The keyboard must be explicitly embedded in the
 *   web apps that need it.
 * - replaced canvastext.js with native canvas text rendering primitives.
 * - replaced custom drag code with jQuery UI draggable().
 * - no inverse keybinding (i.e. no highlighting of virtual keys when the
 *   equivalent real ones are pressed).
 * - significant code rewrite to leverage object-orientation.
 */

// RHIZODEP=rhizo
namespace('rhizo.keyboard');

/**
 * Enumerates all the hardcoded styles and pixel sizes.
 * 
 * TODO(battlehorse): hardcoded widths, heights and color schemes. Makes it
 * difficult to apply themes. Sizes are hardcoded to produce a keyboard whose
 * size is suitable for finger use (rather than stylus).
 * 
 * @enum {number}
 */
rhizo.keyboard.Style = {
  PADDING: 5,
  KEY_HEIGHT: 40,
  KEY_WIDTH: 40,
  KEY_RADIUS: 5,
  KEY_COLORS: {
    pressed:  {
      fg: "#7aa5d6",
      text: "#7aa5d6",
      bg: "#e5ecf9"
    },
    hover: {
      fg: "#7aa5d6",
      text: "#7aa5d6",
      bg: "#fff"
    },
    base: {
      fg: "#555",
      text: "#555",
      bg: "#fff"
    }
  },
  KEY_FONT: 'normal normal normal 22px sans-serif'
};

/**
 * Onscreen canvas-based keyboard, intended for keyboardless touchscreens.
 * 
 * @param {Object} container A jQuery wrapper for the HTML tree where the
 *     keyboard must trigger (can be the whole page). All input fields within
 *     the given tree will be instrumented to use the keyboard.
 * @constructor
 */
rhizo.keyboard.Keyboard = function(container) {
  this.container_ = container;
  this.keys_ = [];

  this.canvas_ = $('<canvas />', {'class': 'rhizo-keyboard'}).appendTo(container);
  this.canvas_.get(0).width = this.canvas_.width();
  this.canvas_.get(0).height = this.canvas_.height();
  this.ctx_ = this.canvas_.get(0).getContext('2d');

  // Initially position the canvas in the middle of the screen, but make it
  // draggable.
  this.canvas_.css({
      left: ($(window).width()-this.canvas_.width())/2,
      top: ($(window).height()-this.canvas_.height())/2
    });
  this.canvas_.draggable();

  /**
   * The html element which has the focus, where all the keystrokes will be
   * sent to.
   * @type {HTMLElement}
   * @private
   */
  this.focusTarget_ = null;

  /**
   * Whether blur events originating from focusTarget_ should be ignored. This
   * is the case when the blur is triggered by mouse events on the keyboard
   * itself.
   * @type {boolean}
   * @private
   */
  this.ignoreBlur_ = false;

  this.initEvents_();
  this.initKeys_();
};

/**
 * Repaints the keyboard.
 */
rhizo.keyboard.Keyboard.prototype.paint = function() {
  this.ctx_.clearRect(0, 0, this.canvas_.get(0).width, this.canvas_.get(0).height);
  for (var i = 0; i < this.keys_.length; i++) {
    this.keys_[i].paint(this.ctx_);
  }
};

/**
 * @return {Array.<rhizo.keyboard.Key>} The set of keyboard keys.
 */
rhizo.keyboard.Keyboard.prototype.getKeys = function() {
  return this.keys_;
};

/**
 * @return {HTMLElement} The html element which has the focus, where the
 *     keystrokes from the virtual keyboard will be directed to.
 */
rhizo.keyboard.Keyboard.prototype.getFocusTarget = function() {
  return this.focusTarget_;
};

/**
 * Binds all the relevant events, either on the affected input elements or the
 * canvas itself.
 * @private
 */
rhizo.keyboard.Keyboard.prototype.initEvents_ = function() {
  // Focus, blur
  $('input, textarea', this.container_).focus(jQuery.proxy(function(ev) {
    this.focusTarget_ = ev.target;
    this.canvas_.show();
    this.paint();
  }, this)).blur(jQuery.proxy(function(ev) {
    if (!this.ignoreBlur_) {
      this.canvas_.hide();
    }
  }, this));

  // Mouse movement inside the canvas for hover effects.
  this.canvas_.mousemove(
    jQuery.proxy(function(ev) {
      var insideOne = false;
      for (var i = 0; i < this.keys_.length; i++) {
        var inside = this.keys_[i].isInside(ev.offsetX || ev.layerX,
                                            ev.offsetY || ev.layerY);
        insideOne = insideOne || inside;
        this.keys_[i].setHover(inside);
      }
      this.canvas_.css('cursor', insideOne ? 'pointer' : 'move').
                   draggable(insideOne ? 'disable' : 'enable');
      this.paint();
    }, this));

  // Mouse clicks inside the canvas.
  this.canvas_.mousedown(jQuery.proxy(this.mousedown_, this));
  this.canvas_.mouseup(
    jQuery.proxy(function(ev) {
      this.ignoreBlur_ = false;
      for (var i = 0; i < this.keys_.length; i++) {
        if (!this.keys_[i].isToggle()) {
          this.keys_[i].setPressed(false);
        }
      }
      this.paint();
      $(this.focusTarget_).focus();  // restore focus
    }, this));
};

/**
 * Routes mousedown events on the canvas to the relevant tapped key.
 * @private
 */
rhizo.keyboard.Keyboard.prototype.mousedown_ = function(ev) {
  this.ignoreBlur_ = true;
  for (var i = 0; i < this.keys_.length; i++) {
    var inside = this.keys_[i].isInside(ev.offsetX || ev.layerX,
                                        ev.offsetY || ev.layerY);
    
    if (!this.keys_[i].isToggle()) {
      this.keys_[i].setPressed(inside);
    } else {
      if (!inside) {
        if (this.keys_[i].isToggleReleasedByOtherKeys() &&
            this.keys_[i].isPressed()) {
          this.keys_[i].setPressed(false);
        }
      } else {
        // Toggle key.
        this.keys_[i].setPressed(!this.keys_[i].isPressed());
      }
    }
  }
  this.paint();  
};

/**
 * Initializes the keyboard layout.
 * @private
 */
rhizo.keyboard.Keyboard.prototype.initKeys_ = function() {
  var ctors = {
    'enter': rhizo.keyboard.EnterKey,
    'delete': rhizo.keyboard.DeleteKey,
    'tab': rhizo.keyboard.TabKey,
    'caps': rhizo.keyboard.CapsKey,
    'shift': rhizo.keyboard.ShiftKey,
    'reset': rhizo.keyboard.ResetKey,
    'space': rhizo.keyboard.SpaceKey
  };

  // Keyboard Layout.
  var kbItems = [];
  kbItems.push([ '`','1','2','3','4','5','6','7','8','9','0','-','=','delete']);
  kbItems.push([ 'tab','q','w','e','r','t','y','u','i','o','p','[',']','\\']);
  kbItems.push([ 'caps','a','s','d','f','g','h','j','k','l', ';','\'','enter']);
  kbItems.push([ 'shift','z','x','c','v','b','n','m',',','.','/','reset']);
  kbItems.push([ 'space']);

  var padding = rhizo.keyboard.Style.PADDING;
  var ky = padding;
  for (var row = 0; row < kbItems.length; row++) {
    var kx = padding;
    for (var col = 0; col < kbItems[row].length; col++) {
      var ctor;
      var keyItem = kbItems[row][col];
      if (keyItem in ctors) {
        ctor = ctors[keyItem];
      } else {
        ctor = rhizo.keyboard.Key;
      }
      var key = new ctor(kbItems[row][col], kx, ky, this);
      this.keys_.push(key);
      kx += key.width() + padding;
    }
    ky += padding + rhizo.keyboard.Style.KEY_HEIGHT;
  }
};


/**
 * A keyboard key.
 * @param {string} key This key id (which is also used as the display label for
 *     standard keys like letters and numbers).
 * @param {number} kx The x coordinate of this key top-left corner (relative to
 *     the keyboard top-left corner).
 * @param {number} ky The y coordinate of this key top-left corner (relative to
 *     the keyboard top-left corner).
 * @param {rhizo.keyboard.Keyboard} keyboard The keyboard this key belongs to.
 * @constructor
 */
rhizo.keyboard.Key = function(key, kx, ky, keyboard) {
  this.label_ = key;
  this.key_ = key;
  this.kx_ = kx;
  this.ky_ = ky;
  this.keyboard_ = keyboard;

  this.radius_ = rhizo.keyboard.Style.KEY_RADIUS;
  this.height_ = rhizo.keyboard.Style.KEY_HEIGHT;
  this.width_ = rhizo.keyboard.Style.KEY_WIDTH;

  this.pressed_ = false;
  this.hover_ = false;

  /**
   * Will this key fire repeatedly as long as it is pressed down?
   * @type {boolean}
   * @private
   */
  this.canAutofire_ = true;

  /**
   * Handle for the autofire callback, if the key is currently autofiring. null
   * otherwise.
   * @private
   */
  this.autofireIntervalId_ = null;

  this.colors_ = {};
};

rhizo.keyboard.Key.prototype.width = function() {
  return this.width_;
};

/**
 * @return {boolean} Whether this key behaves like a toggle or not.
 */
rhizo.keyboard.Key.prototype.isToggle = function() {
  return false;
};

rhizo.keyboard.Key.prototype.paint = function(ctx) {
  this.setStyles_(ctx);
  this.paintRoundedRect_(ctx);
  this.paintKey_(ctx);
};

rhizo.keyboard.Key.prototype.setStyles_ = function(ctx) {
  if (this.pressed_) {
    this.colors_ = rhizo.keyboard.Style.KEY_COLORS.pressed;
  } else if (this.hover_) {
    this.colors_ = rhizo.keyboard.Style.KEY_COLORS.hover;
  } else {
    this.colors_ = rhizo.keyboard.Style.KEY_COLORS.base;
  }
};

rhizo.keyboard.Key.prototype.paintRoundedRect_ = function(ctx) {
  ctx.beginPath();
  ctx.moveTo(this.kx_, this.ky_ + this.radius_);
  ctx.lineTo(this.kx_, this.ky_ + this.height_ - this.radius_);
  ctx.quadraticCurveTo(this.kx_, this.ky_ + this.height_,
                       this.kx_ + this.radius_, this.ky_ + this.height_);
  ctx.lineTo(this.kx_ + this.width() - this.radius_, this.ky_ + this.height_);
  ctx.quadraticCurveTo(this.kx_ + this.width(), this.ky_ + this.height_,
                       this.kx_ + this.width(),
                       this.ky_ + this.height_ - this.radius_);
  ctx.lineTo(this.kx_ + this.width(), this.ky_ + this.radius_);
  ctx.quadraticCurveTo(this.kx_ + this.width(), this.ky_,
                       this.kx_ + this.width() - this.radius_, this.ky_);
  ctx.lineTo(this.kx_ + this.radius_, this.ky_);
  ctx.quadraticCurveTo(this.kx_, this.ky_,
                       this.kx_, this.ky_ + this.radius_);

  ctx.strokeStyle = this.colors_.fg;
  ctx.fillStyle = this.colors_.bg;
  ctx.fill();
  ctx.stroke();
};

rhizo.keyboard.Key.prototype.paintKey_ = function(ctx) {
  ctx.fillStyle = this.colors_.text;
  ctx.font = rhizo.keyboard.Style.KEY_FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(this.label_, this.kx_ + this.width() / 2,
               this.ky_ + this.height_ / 2);
};

/**
 * @param {number} offsetX The x coordinate (relative to the keyboard top-left
 *     corner) of a mouse click.
 * @param {number} offsetY The y coordinate (relative to the keyboard top-left
 *     corner) of a mouse click.
 * @return {boolean} Whether the mouse click falls inside this key or not.
 */
rhizo.keyboard.Key.prototype.isInside = function(offsetX, offsetY) {
  return this.kx_ < offsetX &&
         (this.kx_ + this.width()) > offsetX &&
         this.ky_ < offsetY &&
         (this.ky_ + this.height_ > offsetY);
};

/**
 * Sets the 'hover' style for this key.
 */
rhizo.keyboard.Key.prototype.setHover = function(hover) {
  this.hover_ = hover;
};

/**
 * Sets the 'pressed' style for this key.
 * If the key is pressed, it also triggers the relevant changes in the
 * controlled HTML input element and starts autofiring (if the key supports the
 * feature).
 */
rhizo.keyboard.Key.prototype.setPressed = function(pressed) {
  this.pressed_ = pressed;
  if (this.pressed_) {
    this.modifyTarget_(this.keyboard_.getFocusTarget());
  }

  // Start autofiring, if needed.
  if (this.canAutofire_) {
    if (this.pressed_) {
      // start autofirirg
      if (this.autofireIntervalId_ == null) {
        this.autofireIntervalId_ = window.setInterval(
          jQuery.proxy(this.setPressed, this), 100, /* pressed= */ true);        
      }
    } else {
      // stop autofiring.
      window.clearInterval(this.autofireIntervalId_);
      this.autofireIntervalId_ = null;
    }
  }
};

/**
 * @return {boolean} Whether the key is currently pressed or not.
 */
rhizo.keyboard.Key.prototype.isPressed = function() {
  return this.pressed_;
};

/**
 * Toggles caps-lock (or shift functionality) on this key.
 */
rhizo.keyboard.Key.prototype.setCaps = function(capsEnabled) {
  var azLower = 'abcdefghijklmnopqrstuvwxyz';
  var symLower = '`1234567890-=[]\\;\',./';

  var azUpper = azLower.toUpperCase();
  var symUpper = '~!@#$%^&*()_+{}|:"<>?';

  var sourceChars = capsEnabled ? azLower + symLower : azUpper + symUpper;
  var destChars = capsEnabled ? azUpper + symUpper : azLower + symLower;
  for (var i = 0; i < sourceChars.length; i++) {
    if (sourceChars[i] == this.label_) {
      this.label_ = destChars[i];
      this.key_ = destChars[i];
      break;
    }
  }
};

/**
 * Adds the pressed character to the input element controlled by this keyboard.
 * Replaces a preexisting text selection, if any.
 * 
 * @param {HTMLElement} focusTarget The html element which has the focus, where
 *     all the keystrokes will be sent to.
 * @private
 */
rhizo.keyboard.Key.prototype.modifyTarget_ = function(focusTarget) {
  var selStart = focusTarget.selectionStart;
  var selEnd = focusTarget.selectionEnd;

  var prefix = $(focusTarget).val();
  var suffix = '';
  if (selEnd - selStart > 0) {
    suffix = prefix.substr(selEnd);
    prefix = prefix.substr(0, selStart);
  }
  $(focusTarget).val(prefix + this.key_ + suffix);
};


/**
 * The Enter key.
 * @constructor
 * @extends rhizo.keyboard.Key
 */
rhizo.keyboard.EnterKey = function(key, kx, ky, keyboard) {
  rhizo.keyboard.Key.call(this, key, kx, ky, keyboard);
  this.width_ = 77;
  this.canAutofire_ = false;
};
rhizo.inherits(rhizo.keyboard.EnterKey, rhizo.keyboard.Key);

rhizo.keyboard.EnterKey.prototype.modifyTarget_ = function(focusTarget) {
  // Rhizosphere events are triggered by 'change' events.
  $(focusTarget).change();
};


/**
 * The Tab key.
 * @constructor
 * @extends rhizo.keyboard.Key
 */
rhizo.keyboard.TabKey = function(key, kx, ky, keyboard) {
  rhizo.keyboard.Key.call(this, key, kx, ky, keyboard);
  this.width_ = 70;
  this.key_ = '\t';
};
rhizo.inherits(rhizo.keyboard.TabKey, rhizo.keyboard.Key);


/**
 * The Delete (Backspace) key.
 * @constructor
 * @extends rhizo.keyboard.Key
 */
rhizo.keyboard.DeleteKey = function(key, kx, ky, keyboard) {
  rhizo.keyboard.Key.call(this, key, kx, ky, keyboard);
  this.width_ = 70;
};
rhizo.inherits(rhizo.keyboard.DeleteKey, rhizo.keyboard.Key);

rhizo.keyboard.DeleteKey.prototype.modifyTarget_ = function(focusTarget) {
  var selStart = focusTarget.selectionStart;
  var selEnd = focusTarget.selectionEnd;

  var currentText = $(focusTarget).val();
  if (selEnd - selStart > 0) {
    $(focusTarget).val(currentText.substr(0, selStart) +
                       currentText.substr(selEnd));
  } else if (currentText.length > 0) {
    $(focusTarget).val(currentText.substr(0, currentText.length-1));
  }
};


/**
 * The CapsLock key.
 * @constructor
 * @extends rhizo.keyboard.Key
 */
rhizo.keyboard.CapsKey = function(key, kx, ky, keyboard) {
  rhizo.keyboard.Key.call(this, key, kx, ky, keyboard);
  this.width_ = 80;
  this.canAutofire_ = false;
};
rhizo.inherits(rhizo.keyboard.CapsKey, rhizo.keyboard.Key);

rhizo.keyboard.CapsKey.prototype.setPressed = function(pressed) {
  this.pressed_ = pressed;
  var keys = this.keyboard_.getKeys();
  for (var i = 0; i < keys.length; i++) {
    keys[i].setCaps(this.pressed_);
  }
};

rhizo.keyboard.CapsKey.prototype.isToggle = function() {
  return true;
};

rhizo.keyboard.CapsKey.prototype.isToggleReleasedByOtherKeys = function() {
  return false;
};


/**
 * The Shift key.
 * @constructor
 * @extends rhizo.keyboard.Key
 */
rhizo.keyboard.ShiftKey = function(key, kx, ky, keyboard) {
  rhizo.keyboard.CapsKey.call(this, key, kx, ky, keyboard);
  this.width_ = 97;
};
rhizo.inherits(rhizo.keyboard.ShiftKey, rhizo.keyboard.CapsKey);

rhizo.keyboard.ShiftKey.prototype.isToggleReleasedByOtherKeys = function() {
  return true;
};


/**
 * The Reset key (which is used to clear the entire input element).
 * @constructor
 * @extends rhizo.keyboard.Key
 */
rhizo.keyboard.ResetKey = function(key, kx, ky, keyboard) {
  rhizo.keyboard.Key.call(this, key, kx, ky, keyboard);
  this.width_ = 105;
  this.canAutofire_ = false;
};
rhizo.inherits(rhizo.keyboard.ResetKey, rhizo.keyboard.Key);

rhizo.keyboard.ResetKey.prototype.modifyTarget_ = function(focusTarget) {
  $(focusTarget).val('').change();
};


/**
 * The Space key (which is used to clear the entire input element).
 * @constructor
 * @extends rhizo.keyboard.Key
 */
rhizo.keyboard.SpaceKey = function(key, kx, ky, keyboard) {
  rhizo.keyboard.Key.call(this, key, kx, ky, keyboard);
  this.width_ = 660;
  this.key_ = ' ';
};
rhizo.inherits(rhizo.keyboard.SpaceKey, rhizo.keyboard.Key);
/* ./src/js/rhizo.options.js */
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
 * @fileOverview Classes that oversee Rhizosphere configuration.
 * @author Riccardo Govoni (battlehorse@google.com)
 */

// Global project namespace
// RHIZODEP=rhizo
namespace("rhizo");

/**
 * Collection of configuration options for a single Rhizosphere instance.
 * Wraps string options keys as instance methods for the sake of option
 * usage traceability throughout the Rhizosphere codebase.
 *
 * It does not perform any validation or normalization of the option values
 * it holds.
 *
 * @param {(Object.<string, *>|rhizo.Options)=} opt_optionsObj Either an
 *     object literal or another rhizo.Options object to initialize this
 *     one from. Initialization performs a shallow copy of this parameter,
 *     therefore options should not be shared across different Rhizosphere
 *     instances. The full list of supported options' keys is enumerated at
 *     http://www.rhizospherejs.com/doc/contrib_tables.html.
 * @constructor
 */
rhizo.Options = function(opt_optionsObj) {
  this.options_ = {  // Defaults
      selectfilter: '.rhizo-model:visible',
      selectionMode: 'all',
      panningMode: 'infinite',
      showErrorsInViewport: true,
      enableHTML5History: true,
      enableLoadingIndicator: true,
      enableAnims: true,
      enableDragAndDrop: true,
      enableLayoutOnResize: true,
      enableSelectionFromCard: true,
      allowConfigFromUrl: false,
      layoutOptions: {},
      logLevel: 'error',
      cacheDimensions: false,
      arDefaults: true,
      arNumFields: 5,
      uiStackFiltersThreshold: 5
  };
  this.merge(opt_optionsObj);
};

/**
 * Augments this set of options with additional ones. In case of overlapping
 * option keys, the new set of options will override the current ones.
 *
 * @param {(Object.<string, *>|rhizo.Options)=} opt_optionsObj Either an
 *     object literal or another rhizo.Options object. The method performs a
 *     shallow copy of this parameter, therefore options should not be shared
 *     across different Rhizosphere instances.
 */
rhizo.Options.prototype.merge = function(opt_optionsObj) {
  if (!opt_optionsObj) {
    return;
  }
  $.extend(this.options_,
      opt_optionsObj instanceof rhizo.Options ?
      opt_optionsObj.options_ : opt_optionsObj);
};

/**
 * @private
 */
rhizo.Options.prototype.asString_ = function(key) {
  var value = this.options_[key];
  if (value !== null && value !== undefined) {
    return String(value);
  }
  return null;
};

/**
 * @private
 */
rhizo.Options.prototype.asInteger_ = function(key) {
  var value = parseInt(this.options_[key], 10);
  return isNaN(value) ? null : value;
};

/**
 * @return {string} An identifier of the platform Rhizosphere is running upon
 *     (e.g., 'mobile'), for the visualization user interface to apply
 *     platform-specific customizations. Overrides automatic platform
 *     detection logic.
 */
rhizo.Options.prototype.platform = function() {
  return this.asString_('platform');
};

/**
 * @return {string} An identifier of the device Rhizosphere is running upon
 *     (e.g. 'iphone'), for the visualization user interface to apply
 *     device-specific customizations. Overrides automatic device detection
 *     logic.
 */
rhizo.Options.prototype.device = function() {
  return this.asString_('device');
};

/**
 * @return {string} An identifier of the user interface template and chrome
 *     the visualization should adopt.
 */
rhizo.Options.prototype.template = function() {
  return this.asString_('template');
};

/**
 * @return {Object} The visualization metamodel, either explicitly set by the
 *     user or automatically assembled by the visualization loader during
 *     the initialization process. See the documentation for
 *     info: http://www.rhizospherejs.com/doc/users_jsformat.html#metamodel.
 */
rhizo.Options.prototype.metamodel = function() {
  return this.options_['metamodel'];
};

/**
 * @return {Object} A metamodel fragment, a partial metamodel specification
 *     that will be superimposed to the metamodel definition defined above.
 */
rhizo.Options.prototype.metamodelFragment = function() {
  return this.options_['metamodelFragment'];
};

/**
 * @return {Object} The visualization renderer, either explicitly set by the
 *     user or automatically assembled by the visualization loader during the
 *     initialization process. See the documentation for
 *     info: http://www.rhizospherejs.com/doc/users_jsformat.html#renderer.
 */
rhizo.Options.prototype.renderer = function() {
  return this.options_['renderer'];
};

/**
 * @return {string} The logging granularity the visualization should use. See
 *     rhizo.log.js for the set of supported values.
 */
rhizo.Options.prototype.logLevel = function() {
  return this.asString_('logLevel');
};

/**
 * @return {string} The CSS selector that identifies selectable items in the
 *     visualization. Affects the performance for selecting/unselecting items.
 *     It is unlikely that you have to change this option unless you mess
 *     with Rhizosphere rendering internals.
 */
rhizo.Options.prototype.selectFilter = function() {
  return this.asString_('selectfilter');
};

/**
 * @return {string} What selection capabilities to activate on the user
 *     interface: 'none' (no selection can be performed via the UI, programmatic
 *     events via the project eventbus are still accepted), 'click' (only model
 *     selection by clicking on model renderings or other UI elements that
 *     allow click-based selection, like layout headers), 'box' (box selection
 *     by drawing selection boxes in the viewport) and 'all' (both 'click' and
 *     'box' modes).
 */
rhizo.Options.prototype.selectionMode = function() {
  return this.asString_('selectionMode');
};

/**
 * @return {boolean} Whether box selection gestures (if enabled), can be
 *     triggered from everywhere within the viewport (including when the mouse
 *     is hovering over a model rendering) or otherwise can only be triggered
 *     from 'empty' viewport areas. This option is ignored (and implicitly
 *     treated as false) is drag'n'drop is enabled, since that takes priority
 *     in handling drag gestures starting from within a model rendering.
 */
rhizo.Options.prototype.isSelectionFromCardEnabled = function() {
  return !!this.options_['enableSelectionFromCard'];
};

/**
 * @return {boolean} Whether 'click' selection, as defined for the
 *     'selectionMode' option, is allowed.
 */
rhizo.Options.prototype.isClickSelectionMode = function() {
  return this.selectionMode() == 'click' || this.selectionMode() == 'all';
};

/**
 * @return {boolean} Whether 'box' selection, as defined for the
 *     'selectionMode' option, is allowed.
 */
rhizo.Options.prototype.isBoxSelectionMode = function() {
  return this.selectionMode() == 'box' || this.selectionMode() == 'all';
};

/**
 * @return {string} The visualization panning mode. Either 'infinite', where
 *     the visualization pane extends limitlessly on both dimensions, 'native',
 *     where native browser scrollbars are used to constrain the panning
 *     are, or 'none', where no panning whatsoever is allowed.
 */
rhizo.Options.prototype.panningMode = function() {
  return this.asString_('panningMode');
};

/**
 * @return {boolean} Whether errors that occur within the visualization will
 *     be presented to the user via message bubbles in the visualization
 *     viewport (the main area where visualization objects are displayed).
 */
rhizo.Options.prototype.showErrorsInViewport = function() {
  return !!this.options_['showErrorsInViewport'];
};

/**
 * @return {boolean} Whether the visualization uses HTML5 History (if supported
 *     by the browser) to keep track of its state.
 */
rhizo.Options.prototype.isHTML5HistoryEnabled = function() {
  return !!this.options_['enableHTML5History'];
};

/**
 * @return {boolean} Whether a progress bar will be displayed to the user while
 *     Rhizosphere is loading.
 */
rhizo.Options.prototype.isLoadingIndicatorEnabled = function() {
  return !!this.options_['enableLoadingIndicator'];
};

/**
 * @return {boolean} Whether visualization models can be dragged around using
 *     the mouse.
 */
rhizo.Options.prototype.isDragAndDropEnabled = function() {
  return !!this.options_['enableDragAndDrop'];
};

/**
 * @return {boolean} Whether the visualization models will be laid out when
 *     the viewport visible area changes.
 */
rhizo.Options.prototype.mustLayoutOnResize = function() {
  return !!this.options_['enableLayoutOnResize'];
};

/**
 * @return {boolean} Whether animations are used to smooth transitions and
 *     operations performed on the visualization, like layouts and filters.
 */
rhizo.Options.prototype.areAnimationsEnabled = function() {
  return !!this.options_['enableAnims'];
};

/**
 * @return {boolean} Whether Rhizosphere will forcefully cache renderings'
 *     dimensions. Greatly improves layout performance, but may result in
 *     layout bugs if the models being visualized change their rendering
 *     dimensions arbitrarily after the visualization initialization.
 */
rhizo.Options.prototype.forceDimensionCaching = function() {
  return !!this.options_['cacheDimensions'];
};

/**
 * @return {boolean} Whether Rhizosphere is allowed to extract configuration
 *     options from the URL of the page it is embedded into.
 */
rhizo.Options.prototype.allowConfigFromUrl = function() {
  return !!this.options_['allowConfigFromUrl'];
};

/**
 * @return {Object.<string, number>} A map of constraints for the area that
 *     Rhizosphere will use to lay out models' renderings out of all the
 *     available viewport. See rhizo.layout.LayoutBox for the details.
 */
rhizo.Options.prototype.layoutConstraints = function() {
  return this.options_['layoutConstraints'];
};

/**
 * @param {string} layout The name of the layout engine whose option is to be
 *     looked up (e.g.: 'flow'), as registered in the rhizo.layout.layouts map.
 * @param {string} key The option key to look up.
 * @return {*} A specific configuration option for the requested layout engine,
 *     if it exists. If not found, undefined is returned.
 */
rhizo.Options.prototype.layoutOptions = function(layout, key) {
  var layoutOptions = this.options_['layoutOptions'][layout];
  if (!layoutOptions) {
    return undefined;
  }
  return layoutOptions[key];
};

/**
 * @return {string} The metamodel field that represents a visualization
 *     model title, for automatically defined renderers. Currently used only
 *     by rhizo.autorender.AR.
 */
rhizo.Options.prototype.autoRenderMasterField = function() {
  return this.asString_('arMaster');
};

/**
 * @return {string} The metamodel field to infer a visualization model title
 *     font size from, for automatically defined renderers. Currently
 *     used only by rhizo.autorender.AR.
 */
rhizo.Options.prototype.autoRenderSizeField = function() {
  return this.asString_('arSize');
};

/**
 * @return {string} The metamodel field to infer a visualization model color
 *     background, for automatically defined renderers. Currently used only by
 *     rhizo.autorender.AR.
 */
rhizo.Options.prototype.autoRenderColorField = function() {
  return this.asString_('arColor');
};

/**
 * @return {boolean} Whether automatically defined renderers should locate
 *     the master, size and color fields if not explicitly specified by the
 *     previous options. Currently used only by rhizo.autorender.AR.
 */
rhizo.Options.prototype.autoRenderUseDefaults = function() {
  return !!this.options_['arDefaults'];
};

/**
 * @return {number} The number of metamodel fields to display in model
 *     renderings' generated by automated renderers. Currently used only by
 *     rhizo.autorender.AR.
 */
rhizo.Options.prototype.autoRenderNumberOfFields = function() {
  return this.asInteger_('arNumFields');
};

/**
 * @return {number} The threshold for number of filters displayed in the
 *     StackFilterContainer interface to decide whether all available filters
 *     should be displayed immediately, or whether they should be hidden
 *     behind an 'Add Filter...' dropdown.
 */
rhizo.Options.prototype.uiStackFiltersThreshold = function() {
  return this.asInteger_('uiStackFiltersThreshold');
};
/* ./src/js/rhizo.eventbus.js */
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
 * @fileOverview Defines a simple EventBus to support a publish/subscribe
 * message dispatching mechanism within the Rhizosphere framework (and between
 * the Rhizosphere framework and the outside world).
 * @author Riccardo Govoni (battlehorse@google.com)
 */

// RHIZODEP=rhizo
namespace("rhizo.eventbus");


/**
 * Global uuid counter to tag and identify each EventBus subscriber or
 * publisher.
 * @type {number}
 * @private
 */
rhizo.eventbus.nextParticipantUuid_ = 0;


/**
 * Name of the property containing the subscriber/publisher uuid (automatically
 * attached to new subscribers/publishers when they interact with the
 * EventBus).
 * @type {string}
 * @private
 */
rhizo.eventbus.uuidKey_ = '__rhizo_event_uuid';


/**
 * An EventBus exposes a publish/subscribe message dispatching mechanism based
 * on named channels.
 *
 * NOTE that although the EventBus exposes a completely asynchronous API, the
 * current implementation uses synchronous delivery of messages.
 *
 * @param {!Object} logger A logger instance.
 * @constructor
 */
rhizo.eventbus.EventBus = function(logger) {
  /**
   * @type {!Object}
   * @private
   */
  this.logger_ = logger;

  /**
   * @private
   * @type {!Object.<string, rhizo.eventbus.Channel_>}
   */
  this.channels_ = {};
};

/**
 * Destroys the EventBus.
 */
rhizo.eventbus.EventBus.prototype.destroy = function() {
  this.channels_ = {};
};

/**
 * Adds a subscriber to the requested channel.
 * @param {string} channel The channel to subscribe to.
 * @param {!function(Object)} subscriberCallback The callback to invoke whenever
 *     a message is published on the channel. The callback receives the message
 *     as the only parameter.
 * @param {!Object} subscriber The subscriber object, typically the object that
 *     owns the subscriberCallback. The callback will be invoked with
 *     'subscriber' as the this scope.
 * @param {boolean=} opt_committed Whether the subscriber should receive
 *     message notifications while they are 'in flight' or 'committed'. Channel
 *     messages may command mutations on Rhizosphere entities that subscribers
 *     might want to query. Requesting notification on commit guarantees the
 *     subscriber to be notified after mutations have been applied. Defaults to
 *     'in flight'.
 */
rhizo.eventbus.EventBus.prototype.subscribe = function(
    channel, subscriberCallback, subscriber, opt_committed) {
  this.getChannel_(channel).addSubscriber(
      subscriberCallback, subscriber, opt_committed);
};

/**
 * Removes a subscriber from a given channel
 * @param {string} channel The channel to unsubscribe from.
 * @param {!Object} subscriber The subscriber to remove.
 */
rhizo.eventbus.EventBus.prototype.unsubscribe = function(channel, subscriber) {
  if (!(channel in this.channels_)) {
    return;
  }
  this.channels_[channel].removeSubscriber(subscriber);
};

/**
 * Adds a preprocessor to the requested channel. A preprocessor inspects and
 * manipulates published messages before they are delivered to any subscriber,
 * and can veto the delivery of a message.
 *
 * Preprocessors are executed in strict sequential order.
 *
 * @param {string} channel The channel to add the preprocessor to.
 * @param {!function(Object, function())} preprocessorCallback The callback is
 *     invoked whenever a new message is published on the channel. It receives
 *     the message as the first parameter and a response function as the
 *     second. The response function accepts 2 parameters: a boolean indicating
 *     whether the message can be published or not and a details string to
 *     describe the reason for veto (if any).
 * @param {!Object} preprocessor The object owning the callback. The callback
 *     will be invoked with 'preprocessor' as the this scope.
 * @param {boolean=} opt_first Whether this preprocessor should be inserted
 *     at the beginning of the current queue of preprocessors for this channel,
 *     rather than at the end (default).
 */
rhizo.eventbus.EventBus.prototype.addPreprocessor = function(
    channel, preprocessorCallback, preprocessor, opt_first) {
  this.getChannel_(channel).addPreprocessor(
      preprocessorCallback, preprocessor, opt_first);
};

/**
 * Removes a preprocessor from a given channel.
 * @param {string} channel The channel to remove the preprocessor from.
 * @param {!Object} preprocessor The preprocessor to remove.
 */
rhizo.eventbus.EventBus.prototype.removePreprocessor = function(
    channel, preprocessor) {
  if (!(channel in this.channels_)) {
    return;
  }
  this.channels_[channel].removePreprocessor(preprocessor);
};

/**
 * Publishes a message on the channel.
 * @param {string} channel The channel to publish to.
 * @param {!Object} message The message to publish.
 * @param {function(boolean, string=)=} opt_callback Optional callback invoked
 *     after the message has been dispatched to all subscribers (but not
 *     necessarily after the subscribers processed it). It receives two
 *     parameters: a boolean indicating whether the message was successfully
 *     published and a string containing the details in case the message was
 *     not published.
 * @param {Object=} opt_sender The message sender. If present, the EventBus
 *     guarantees the message won't be routed back to the sender if it happens
 *     to be a subscriber on the same channel it is publishing to. If present,
 *     it will be the 'this' scope for opt_callback.
 */
rhizo.eventbus.EventBus.prototype.publish = function(
    channel, message, opt_callback, opt_sender) {
  if (!(channel in this.channels_)) {
    opt_callback && opt_callback.call(opt_sender, true);
    return;
  }
  this.logger_.group('message publish on channel ' + channel);
  this.logger_.debug('message payload ', message);
  this.logger_.time('Eventbus::publish');
  this.channels_[channel].publish(message, opt_callback, opt_sender);
  this.logger_.timeEnd('Eventbus::publish');
  this.logger_.groupEnd('message publish on channel ' + channel);
};

rhizo.eventbus.EventBus.prototype.getChannel_ = function(channel) {
  if (!(channel in this.channels_)) {
    this.channels_[channel] = new rhizo.eventbus.Channel_(channel);
  }
  return this.channels_[channel];
};


/**
 * An EventBus channel.
 * @private
 * @constructor
 */
rhizo.eventbus.Channel_ = function(name) {
  /**
   * The channel name.
   * @type {string}
   * @private
   */
  this.name_ = name;

  /**
   * The channel preprocessors, keyed by their unique identifier on the
   * eventbus.
   * @type {!Object.<number, function()>}
   * @private
   */
  this.preprocessors_ = {};

  /**
   * The channel preprocessors, in execution order.
   * @type {!Array.<function()>}
   * @private
   */
  this.preprocessorsOrder_ = [];

  /**
   * The channel subscribers, keyed by their unique identifier on the eventbus,
   * that will be notified as soon as messages are published ('in flight'
   * notification phase).
   * @type {!Object.<number, function()>}
   * @private
   */
  this.subscribers_ = {};

  /**
   * The channel subscribers, keyed by their unique identifier on the eventbus,
   * that will be notified after the mutations driven by published messages
   * have been committed ('committed' notification phase).
   * @type {!Object.<number, function()>}
   * @private
   */
  this.commitSubscribers_ = {};
};

/**
 * Adds a subscriber to the channel.
 * @param {!function(Object)} subscriberCallbackThe callback to invoke whenever
 *     a message is published on the channel. The callback receives the message
 *     as the only parameter.
 * @param {!Object} subscriber The subscriber object, typically the object that
 *     owns the subscriberCallback. The callback will be invoked with
 *     'subscriber' as the this scope.
 * @param {boolean=} opt_committed Whether the subscriber should receive
 *     message notifications while they are 'in flight' or 'committed'.
 */
rhizo.eventbus.Channel_.prototype.addSubscriber = function(
    subscriberCallback, subscriber, opt_committed) {
  this.add_(
      !!opt_committed ? this.commitSubscribers_ : this.subscribers_,
      subscriberCallback, subscriber);
};

/**
 * Adds a preprocessor to the requested channel.
 *
 * @param {!function(Object, function())} preprocessorCallback The callback is
 *     invoked whenever a new message is published on the channel. It receives
 *     the message as the first parameter and a response function as the
 *     second. The response function accepts 2 parameters: a boolean indicating
 *     whether the message can be published or not and a details string to
 *     describe the reason for veto (if any).
 * @param {!Object} preprocessor The object owning the callback. The callback
 *     will be invoked with 'preprocessor' as the this scope.
 * @param {boolean=} opt_first Whether this preprocessor should be inserted
 *     at the beginning of the current queue of preprocessors for this channel,
 *     rather than at the end (default).
 */
rhizo.eventbus.Channel_.prototype.addPreprocessor = function(
    preprocessorCallback, preprocessor, opt_first) {
  var cb = this.add_(this.preprocessors_, preprocessorCallback, preprocessor);
  if (!!opt_first) {
    this.preprocessorsOrder_.splice(0, 0, cb);
  } else {
    this.preprocessorsOrder_.push(cb);
  }
};

/**
 * Removes a subscriber from the channel.
 * @param {!Object} subscriber The subscriber to remove.
 */
rhizo.eventbus.Channel_.prototype.removeSubscriber = function(subscriber) {
  this.remove_(this.subscribers_, subscriber);
  this.remove_(this.commitSubscribers_, subscriber);
};

/**
 * Removes a preprocessor from the channel.
 * @param {!Object} preprocessor The preprocessor to remove.
 */
rhizo.eventbus.Channel_.prototype.removePreprocessor = function(preprocesssor) {
  var cb = this.remove_(this.preprocessors_, preprocesssor);
  for (var i = 0; i < this.preprocessorsOrder_.length; i++) {
    if (cb == this.preprocessorsOrder_[i]) {
      this.preprocessorsOrder_.splice(i, 1);
      return;
    }
  }
};

/**
 * Publishes a message on the channel.
 *
 * @param {Object} message The message to publish.
 * @param {function(boolean, string=)=} opt_callback Optional callback invoked
 *     after the message has been dispatched to all subscribers (but not
 *     necessarily after the subscribers processed it). It receives two
 *     parameters: a boolean indicating whether the message was successfully
 *     published and a string containing the details in case the message was
 *     not published.
 * @param {Object=} opt_sender The message sender. If present, the channel
 *     guarantees the message won't be routed back to the sender if it happens
 *     to be a subscriber on this same channel. If present,
 *     it will be the 'this' scope for opt_callback.
 */
rhizo.eventbus.Channel_.prototype.publish = function(
    message, opt_callback, opt_sender) {
  message = message || {};
  var preprocessorsQueue = this.preprocessorsOrder_.slice(0);
  this.preprocess_(message, preprocessorsQueue, jQuery.proxy(
      function(valid, details) {
    if (!valid) {
      opt_callback && opt_callback.call(opt_sender, false, details);
    } else {
      this.send_(message, opt_callback, opt_sender);
    }
  }, this));
};

/**
 * Hands a message to a queue of preprocessor, proceeding through them in
 * sequential order. Executes the callback as soon as one preprocessor rejects
 * the message or the entire queue has been executed.
 *
 * @param {!Object} message The message to preprocess.
 * @param {Array.<!function()>} preprocessorsQueue The queue of preprocessors to
 *     execute.
 * @param {!function(boolean, string=)} callback The callback invoked either at
 *     the end of the queue or as soon as one preprocessor rejects the message.
 *     It takes two parameters: a boolean indicating the message rejection
 *     status and an optional string containing details.
 * @private
 */
rhizo.eventbus.Channel_.prototype.preprocess_ = function(
    message, preprocessorsQueue, callback) {
  if (preprocessorsQueue.length == 0) {
    callback(true);
    return;
  }
  var preprocesssor = preprocessorsQueue[0];
  preprocesssor(message, jQuery.proxy(function(valid, details) {
    if (!valid) {
      callback(false, details);
    } else {
      this.preprocess_(message, preprocessorsQueue.slice(1), callback);
    }
  }, this));
};

/**
 * Sends a message to all the channel subscribers, minus the sender.
 * @param {!Object} message The message to send.
 * @param {function(boolean, string=)=} opt_callback The callback to invoke
 *     after the message has been delivered to all the subscribers.
 * @param {Object=} opt_sender The message sender, if any.
 * @private
 */
rhizo.eventbus.Channel_.prototype.send_ = function(
    message, opt_callback, opt_sender) {
  this.sendToSubscriberPool_(message, this.subscribers_, opt_sender);
  this.sendToSubscriberPool_(message, this.commitSubscribers_, opt_sender);
  opt_callback && opt_callback.call(opt_sender, true);
};

/**
 * Sends  a message to a given pool of subscribers, excluding the sender if
 * part of the pool.
 * @param {!Object} message The message to send.
 * @param {!Object.<number, function()>} pool The pool of subscribers to target.
 * @param {Object=} opt_sender The message sender, if any.
 */
rhizo.eventbus.Channel_.prototype.sendToSubscriberPool_ = function(
    message, pool, opt_sender) {
  for (var subscriberId in pool) {
    if (opt_sender && subscriberId == opt_sender[rhizo.eventbus.uuidKey_]) {
      continue;
    }
    pool[subscriberId](message);
  }
};

/**
 * Adds one subscriber/preprocessor to the channel.
 * @param {!Object} pool The pool to add the object to.
 * @param {!function()} callback The subscriber/preprocessor callback to add.
 * @param {!Object} source The callback owner.
 * @return {!function()} The applied callback, i.e. the callback already tied to
 *     its source scope.
 * @private
 */
rhizo.eventbus.Channel_.prototype.add_ = function(pool, callback, source) {
  if (typeof(source[rhizo.eventbus.uuidKey_]) == 'undefined') {
    source[rhizo.eventbus.uuidKey_] = rhizo.eventbus.nextParticipantUuid_++;
  }
  var uuid = source[rhizo.eventbus.uuidKey_];
  pool[uuid] = function() { callback.apply(source, arguments); };
  return pool[uuid];
};

/**
 * Removes one subscriber/preprocessor callback from the channel.
 * @param {!Object} pool The pool to remove the callback from.
 * @param {Object} source The owner of the subscriber/preprocessor callback to
 *     remove.
 * @return {?function()} The removed callback (in applied form), if any.
 */
rhizo.eventbus.Channel_.prototype.remove_ = function(pool, source) {
  if (typeof(source[rhizo.eventbus.uuidKey_]) == 'undefined') {
    return null;
  }
  var cb = pool[source[rhizo.eventbus.uuidKey_]];
  delete pool[source[rhizo.eventbus.uuidKey_]];
  return cb;
};
/* ./src/js/rhizo.meta.js */
/**
  @license
  Copyright 2008 The Rhizosphere Authors. All Rights Reserved.

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
 * @fileOverview Implementation of all basic Rhizosphere metamodel Kinds
 * (model attribute types in Rhizosphere terminology) and associated behavior.
 *
 * Kinds are associated to each Rhizosphere metamodel key to describe the type
 * of each model attribute. The attribute kind drives the behavior of the
 * Rhizosphere visualization when filtering, clustering and other operations
 * are performed on the attribute.
 *
 * To define a new meta-type:
 * - define a new Javascript class.
 *
 * - implement the survivesFilter() function.
 *   The function is invoked when filtering Rhizosphere models on the attribute
 *   the kind describes. It verifies if a model value matches the filter or not
 *
 * - implement the isNumeric() function.
 *   This tells whether the data the kind describes is of numeric nature or not
 *   (i.e. can be used in arithmetic computations).
 *
 * - implement the cluster() function (optional).
 *   Describes a grouping behavior for this type. Invoked whenever the
 *   visualization needs to cluster multiple models in a single group (for
 *   example, when a bucketing layout is used).
 *
 * - implement the compare() function (optional).
 *   Defines how two values of this kind are compared against each other.
 *   Returns negative, 0, or positive number if the first element is smaller,
 *   equal or bigger than the second.
 *
 * - implement a toUserScale() / toModelScale() function pair (optional).
 *   Define how to convert the scale of model values respectively to/from a user
 *   facing scale. For example, a logarithmic conversion may be applied to
 *   normalize model values that span a range that would otherwise be too wide.
 *
 * - register the newly created kind a rhizo.meta.KindRegistry (either the
 *   default rhizo.meta.defaultRegistry or a custom one that you must then
 *   manually provide to a project.
 *
 * A metamodel Kind may have an associated user interface to let the user
 * enter filtering criteria. To provide a user interface for a metamodel Kind,
 * see rhizo.ui.meta.js.
 *
 * NOTE: although all the basic Kind classes defined in this file are stateless,
 * the registration framework allows for stateful instances to be used if
 * needed.
 */


// RHIZODEP=rhizo
// Metamodel namespace
namespace("rhizo.meta");


/**
 * Returns a comparison function that sorts Rhizosphere models according to one
 * of their attributes.
 *
 * The comparison function delegates to the comparison logic of the metamodel
 * Kind associated to the attribute, if present, and falls back to native
 * sorting otherwise.
 *
 * @param {string} key The metamodel key that identifies the attribute to
 *     sort against.
 * @param {*} kind The Rhizosphere metamodel Kind that describes the attribute.
 * @param {boolean=} opt_reverse Whether the sorting order should be reversed.
 * @return {function(rhizo.model.SuperModel, rhizo.model.SuperModel):number}
 *     The comparison function.
 */
rhizo.meta.sortBy = function(key, kind, opt_reverse) {
  return function(firstSuperModel, secondSuperModel) {
    var firstModel = firstSuperModel.unwrap();
    var secondModel = secondSuperModel.unwrap();

    // Sign multiplication to invert sorting order
    var reverse = opt_reverse ? -1 : 1;

    if (kind.compare) {
      return kind.compare(firstModel[key], secondModel[key])*reverse;
    } else {
      // try native sorting
      return (firstModel[key] < secondModel[key] ? -1 :
              firstModel[key] > secondModel[key] ? 1 : 0)*reverse;
    }
  };
};


/**
 * Returns a comparison function that sorts arbitrary values according to the
 * comparison logic defined by a given Rhizosphere metamodel Kind, if present,
 * and falls back to native sorting otherwise.
 *
 * @param {*} kind The Rhizosphere metamodel Kind to use for sorting.
 * @param opt_reverse Whether the sorting order should be reversed.
 * @return {function(*,*):number} The comparison function.
 */
rhizo.meta.sortByKind = function(kind, opt_reverse) {
  return function(firstValue, secondValue) {
    // Sign multiplication to invert sorting order
    var reverse = opt_reverse ? -1 : 1;
    if (kind.compare) {
      return kind.compare(firstValue, secondValue)*reverse;
    } else {
      return (firstValue < secondValue ? -1 :
          firstValue > secondValue ? 1 : 0)*reverse;
    }
  };
};


/**
 * Registry to enumerate all the available Rhizosphere metamodel Kinds, their
 * associated implementation class and, when present, the associated user
 * interface classes.
 * @constructor
 */
rhizo.meta.KindRegistry = function() {
  /**
   * Maps kind symbolic names to constructor or factories for the kind
   * implementation classes.
   * Each value in the structure is an object that contains the following
   * attributes:
   * - method: defines whether the kind should be instantiated using a
   *   constructor ('ctor') or factory method ('factory)'.
   * - ctor: points to the Kind constructor, if method is 'ctor'.
   * - factory: points to a factory function that returns Kind instances, if
   *   method is 'factory'.
   *
   * @type {!Object.<string, Object>}
   * @private
   */
  this.registry_ = {};

  /**
   * Maps kind symbolic names to constructor or factories for the kind user
   * interface implementation classes.
   * Each value in the structure is an object that contains the following
   * attributes:
   * - method: defines whether the kind user interface should be instantiated
   *   using a constructor ('ctor') or factory method ('factory)'.
   * - ctor: points to the Kind Ui constructor, if method is 'ctor'.
   * - factory: points to a factory function that returns Kind Ui instances, if
   *   method is 'factory'.
   *
   * @type {!Object.<string, Object>}
   * @private
   */
  this.uiRegistry_ = {};
};

/**
 * Returns a shallow clone of this registry. Useful to apply simple
 * customizations to the default set of Rhizosphere metamodel Kinds and
 * associated UIs.
 *
 * @return {rhizo.meta.KindRegistry} A shallow clone of this registry.
 */
rhizo.meta.KindRegistry.prototype.clone = function() {
  var clone = new rhizo.meta.KindRegistry();
  $.extend(clone.registry_, this.registry_);
  $.extend(clone.uiRegistry_, this.uiRegistry_);
  return clone;
};

/**
 * Registers a new metamodel Kind under the given symbolic name.
 * @param {string} key A symbolic name identifying the metamodel kind.
 * @param {function()} ctor A constructor function to create new Kind instances.
 */
rhizo.meta.KindRegistry.prototype.registerKind = function(key, ctor) {
  this.registry_[key] = {method: 'ctor', ctor: ctor};
};

/**
 * Registers a new metamodel Kind under the given symbolic name.
 * @param {string} key A symbolic name identifying the metamodel kind.
 * @param {function()} factory A factory function that returns new Kind
 *     instances.
 */
rhizo.meta.KindRegistry.prototype.registerKindFactory = function(key, factory) {
  this.registry_[key] = {method: 'factory', factory: factory};
};

/**
 * Registers a new metamodel Kind user interface. The user interface can be
 * bound either to a kind symbolic name (in which case all metamodel Kind
 * instances created from the same symbolic name will adopt the specified
 * user interface) or to a kind instance (in which case only the specific
 * instance will use the given Ui).
 *
 * @param {string|Object} keyOrKind A symbolic name identifying the metamodel
 *     kind or a metamodel Kind instance.
 * @param {function()} ctor A constructor function to create new Kind user
 *     interface instances.
 */
rhizo.meta.KindRegistry.prototype.registerKindUi = function(keyOrKind, ctor) {
  if (typeof(keyOrKind) == 'string') {
    this.uiRegistry_[keyOrKind] = {method: 'ctor', ctor: ctor};
  } else {
    // assumed to be a Kind instance.
    keyOrKind['__kindRegistry_ui'] = {method: 'ctor', ctor: ctor};
  }
};

/**
 * Registers a new metamodel Kind user interface. The user interface can be
 * bound either to a kind symbolic name (in which case all metamodel Kind
 * instances created from the same symbolic name will adopt the specified
 * user interface) or to a kind instance (in which case only the specific
 * instance will use the given Ui).
 *
 * @param {string|Object} keyOrKind A symbolic name identifying the metamodel
 *     kind or a metamodel Kind instance.
 * @param {function()} factory A factory function that returns new Kind user
 *     interface instances.
 */
rhizo.meta.KindRegistry.prototype.registerKindUiFactory = function(
    keyOrKind, factory) {
  if (typeof(keyOrKind) == 'string') {
    this.uiRegistry_[keyOrKind] = {method: 'factory', factory: factory};
  } else {
    // assumed to be a Kind instance.
    keyOrKind['__kindRegistry_ui'] = {method: 'factory', factory: factory};
  }
};

/**
 * Creates a new metamodel Kind implementation class of the requested type.
 * @param {string} key The key identifying the metamodel Kind to create.
 * @param {Object} metamodelEntry The metamodel entry the Kind will be
 *     assigned to.
 * @return {Object} The newly created metamodel Kind implementation class.
 */
rhizo.meta.KindRegistry.prototype.createNewKind = function(
    key, metamodelEntry) {
  if (!(key in this.registry_)) {
    return null;
  }
  var kind = null;
  if (this.registry_[key]['method'] == 'ctor') {
    kind = new this.registry_[key]['ctor'](metamodelEntry);
  } else {
    kind = this.registry_[key]['factory'](metamodelEntry);
  }
  // Attach a user interface specification to the newly crated Kind instance
  // using uiRegistry contents.
  if (key in this.uiRegistry_) {
    kind['__kindRegistry_ui'] = this.uiRegistry_[key];
  }
  return kind;
};

/**
 * Creates a new metamodel Kind user interface implementation class of the
 * requested type.
 * @param {Object} kindObj The metamodel Kind instance for which a user
 *     interface is requested.
 * @param {!rhizo.Project} project The project the user interface will be
 *     attached to.
 * @param {string} metaModelKey The name of the model attribute this Kind user
 *     interface will be attached to.
 * @return {Object} The newly created metamodel Kind user interface instance.
 */
rhizo.meta.KindRegistry.prototype.createUiForKind = function(
    kindObj, project, metaModelKey) {
  if (!this.uiExistsForKind(kindObj)) {
    return null;
  }
  var kindUiSpec = kindObj['__kindRegistry_ui'];
  if (kindUiSpec['method'] == 'ctor') {
    return new kindUiSpec['ctor'](project, metaModelKey);
  } else {
    return kindUiSpec['factory'](project, metaModelKey);
  }
};

/**
 * Returns whether an user interface is register for the given Kind instance.
 * @param {Object} kindObj The metamodel Kind instance for which a user
 *     interface is requested.
 * @return {boolean} Whether an user interface is register for the given
 *     Kind instance.
 */
rhizo.meta.KindRegistry.prototype.uiExistsForKind = function(
    kindObj) {
  // A user interface exists under any of the following conditions:
  // - The kind instance was created via createNewKind() and an UI
  //   implementation class was registered under the same symbolic name.
  // - An UI was registered directly for the specific kind instance via
  //   registerKindUi() or registerKindUiFactory()
  return !!kindObj['__kindRegistry_ui'];
};


/**
 * The default metamodel Kind registry Rhizosphere projects will use if not
 * instructed otherwise.
 * @type {rhizo.meta.KindRegistry}
 */
rhizo.meta.defaultRegistry = new rhizo.meta.KindRegistry();


/**
 * Enumeration of all the basic kinds supported by Rhizosphere out of the box.
 * Each entry is a valid key to retrieve the associated kind instance from
 * the default Kind registry (rhizo.meta.defaultRegistry).
 *
 * @enum {string}
 */
rhizo.meta.Kind = {
  STRING: 'string',
  NUMBER: 'number',
  RANGE: 'range',
  DATE: 'date',
  BOOLEAN: 'boolean',
  CATEGORY: 'category'
};


/**
 * Describes a basic string type.
 * @constructor
 */
rhizo.meta.StringKind = function() {};
rhizo.meta.defaultRegistry.registerKind(
    rhizo.meta.Kind.STRING, rhizo.meta.StringKind);

/**
 * String filtering based on case-insensistive indexOf.
 *
 * @param {string} filterValue The current filter value.
 * @param {string} modelValue A model value for the attribute this kind
 *     applies to.
 * @return {boolean} Whether the model value survives the filter criteria or
 *     not.
 */
rhizo.meta.StringKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  return filterValue != '' &&
         (modelValue || '').toLowerCase().indexOf(
             filterValue.toLowerCase()) != -1;
};

rhizo.meta.StringKind.prototype.cluster = function(modelValue) {
  if (modelValue === null || typeof(modelValue) == 'undefined') {
    modelValue = '';
  }
  return { key: modelValue.toString().toUpperCase().charAt(0),
           label: modelValue.toString().toUpperCase().charAt(0) };
};

rhizo.meta.StringKind.prototype.isNumeric = function() {
  return false;
};


/**
 * Describes a basic integer type
 * @constructor
 */
rhizo.meta.NumberKind = function() {};
rhizo.meta.defaultRegistry.registerKind(
    rhizo.meta.Kind.NUMBER, rhizo.meta.NumberKind);

rhizo.meta.NumberKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  var filterValueInt = parseInt(filterValue, 10);
  if (isNaN(filterValueInt)) {
    return true; // invalid numbers shouldn't filter anything
  } else {
    return filterValueInt == modelValue;
  }
};

rhizo.meta.NumberKind.prototype.compare = function(firstValue, secondValue) {
  return parseInt(firstValue, 10) - parseInt(secondValue, 10);
};

rhizo.meta.NumberKind.prototype.cluster = function(modelValue) {
  var iModelValue = parseInt(modelValue, 10);
  if (isNaN(iModelValue)) {
    return {key: '-', label: '-'};
  }
  if (parseFloat(modelValue) <= 10) {
    return {key: iModelValue, label: iModelValue.toString()};
  }
  // cluster at one order of magnitude less than current scale
  var powCount = 0;
  while (iModelValue >= 10) {
    iModelValue = parseInt(iModelValue / 10);
    powCount++;
  }

  var magnitude  = Math.pow(10, powCount);
  var lowRange = parseInt(modelValue/magnitude, 10)*magnitude;
  var hiRange = parseInt(modelValue/magnitude + 1, 10)*magnitude;
  return { key: lowRange,
           label: lowRange.toString() + " - " + hiRange.toString() };
};

rhizo.meta.NumberKind.prototype.isNumeric = function() {
  return true;
};


/**
 * Describes a basic integer range type.
 * @constructor
 */
rhizo.meta.RangeKind = function() {};
rhizo.meta.defaultRegistry.registerKind(
    rhizo.meta.Kind.RANGE, rhizo.meta.RangeKind);

rhizo.meta.RangeKind.prototype.survivesFilter = function(filterValue,
                                                         modelValue) {
  return modelValue >= filterValue.min && modelValue <= filterValue.max;
};

rhizo.meta.RangeKind.prototype.compare =
    rhizo.meta.NumberKind.prototype.compare;

rhizo.meta.RangeKind.prototype.cluster =
    rhizo.meta.NumberKind.prototype.cluster;

rhizo.meta.RangeKind.prototype.isNumeric =
    rhizo.meta.NumberKind.prototype.isNumeric;


/**
 * Describes a basic date type with custom clustering criteria.
 *
 * @param {Object} metamodelEntry The metamodel entry this date type is
 *     assigned to. The metamodel entry can be enriched with an additional
 *     'clusterBy' property to customize the clustering criteria: 'y' for
 *     year-based clustering, 'm' for month, 'd' for day. Defaults to
 *     year-based clustering.
 * @constructor
 */
rhizo.meta.DateKind = function(metamodelEntry) {
  this.monthMap_ = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul',
    'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  this.clusterby_ = metamodelEntry['clusterBy'] || 'y';
  if (this.clusterby_ != 'y' &&
      this.clusterby_ != 'm' &&
      this.clusterby_ != 'd') {
    this.clusterby_ = 'y';
  }
};
rhizo.meta.defaultRegistry.registerKind(
    rhizo.meta.Kind.DATE, rhizo.meta.DateKind);

rhizo.meta.DateKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  var year = parseInt(filterValue[0], 10);
  var month = parseInt(filterValue[1], 10);
  var day = parseInt(filterValue[2], 10);

  if (!modelValue) {
    return isNaN(year) && isNaN(month) && isNaN(day);
  }

  return ((isNaN(year) || modelValue.getFullYear() == year) &&
          (isNaN(month) || modelValue.getMonth() == month) &&
          (isNaN(day) || modelValue.getDate() == day));
};

// We do not implement a compare() function for dates because the native
// comparison works just fine. Watch out because 2 kinds of comparisons occur
// for DateKind:
// - date comparison is performed when comparing model objects (for example
//   to order elements in a list layout)
// - string comparison is performed when comparing bucket keys (to order the
//   buckets in a BucketLayout, via rhizo.meta.sortByKind). The cluster()
//   function takes care of rendering bucket keys as strings that respect
//   the underlying date ordering when lexicographically sorted.

rhizo.meta.DateKind.prototype.cluster = function(modelValue) {
  if (!modelValue) {
    return {key: 'Undefined date', label: 'Undefined date'};
  }
  if (this.clusterby_ == 'y') {
    return {
      key: modelValue.getFullYear() + '-00-01',
      label: modelValue.getFullYear()
    };
  } else if (this.clusterby_ == 'm') {
    return {
      key: modelValue.getFullYear() + '-' +
           this.addZero_(modelValue.getMonth()) + '-01',
      label: modelValue.getFullYear() + '-' +
             this.monthMap_[modelValue.getMonth()]
    };
  } else {
    return {
      key: modelValue.getFullYear() + '-' +
           this.addZero_(modelValue.getMonth()) + '-' +
           this.addZero_(modelValue.getDate()),
      label: modelValue.getFullYear() + '-' +
             this.monthMap_[modelValue.getMonth()] + '-' +
             modelValue.getDate()
    };   
  }
};

rhizo.meta.DateKind.prototype.isNumeric = function() {
  return false;
};

/**
 * Converts a number to string ensuring a leading 0 (zero) if the number is
 * only 1-digit long.
 *
 * @param {value} value The number to convert.
 * @return {string} The converted number into string form.
 * @private
 */
rhizo.meta.DateKind.prototype.addZero_ = function(value) {
  var result = String(value);
  if (result.length == 1) {
    result = '0' + result;
  }
  return result;
};


/**
 * Describes a basic boolean type.
 * @constructor
 */
rhizo.meta.BooleanKind = function() {};
rhizo.meta.defaultRegistry.registerKind(
    rhizo.meta.Kind.BOOLEAN, rhizo.meta.BooleanKind);

rhizo.meta.BooleanKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  return filterValue == modelValue;
};

rhizo.meta.BooleanKind.prototype.compare = function(firstValue, secondValue) {
  // true comes before false
  return firstValue ? (secondValue ? 0 : -1) : (secondValue ? 1 : 0);
};

rhizo.meta.BooleanKind.prototype.isNumeric = function() {
  return false;
};


/**
 * Describes a basic category type.
 * @constructor
 */
rhizo.meta.CategoryKind = function() {};
rhizo.meta.defaultRegistry.registerKind(
    rhizo.meta.Kind.CATEGORY, rhizo.meta.CategoryKind);

rhizo.meta.CategoryKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  // Models can use both Arrays and Strings for CategoryKind fields, hence we
  // have to convert everything to Array for the filter to work properly.
  if (!$.isArray(modelValue)) {
    modelValue = [modelValue];
  }
  if (!$.isArray(filterValue)) {
    filterValue = [filterValue];
  }

  // AND-filter

  // var survives = true;
  // for (var i = 0; i < filterValue.length; i++) {
  //   if (modelValue && modelValue.indexOf(filterValue[i]) == -1) {
  //     survives = false;
  //     break;
  //   }
  // }
  // return survives;

  // OR-filter
  var survives = false;
  for (var i = 0; i < filterValue.length; i++) {
    if (modelValue && modelValue.indexOf(filterValue[i]) != -1) {
      survives = true;
      break;
    }
  }
  return survives;
};

rhizo.meta.CategoryKind.prototype.cluster = function(modelValue) {
  // This function relies on the length property being available both on
  // Arrays and Strings (since models can use both to define
  // the value of a CategoryKind meta) and in both cases a length == 0
  // implies a missing value.
  if (!modelValue) {
    return {key: 'Nothing', label: 'Nothing'};
  }
  return { key: modelValue.length == 0 ? "Nothing" : modelValue.toString(),
           label: modelValue.length == 0 ? "Nothing" : modelValue.toString() };
};

rhizo.meta.CategoryKind.prototype.compare = function(firstValue, secondValue) {
  // comparison based on number of categories (if values are Arrays) or value
  // length (if the value is a single category, represented as string).
  // Not necessarily the most meaningful thing to do...
  // TODO(battlehorse): define a better CategoryKind comparison strategy
  return (firstValue ? firstValue.length : 0) -
         (secondValue ? secondValue.length : 0);
};

rhizo.meta.CategoryKind.prototype.isNumeric = function() {
  return false;
};

/* ./src/js/rhizo.layout.manager.js */
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
 * @fileOverview Classes that oversee Rhizosphere layout management.
 * @author Riccardo Govoni (battlehorse@google.com)
 */

//RHIZODEP=rhizo
namespace('rhizo.layout');


/**
 * A LayoutManager is responsible for handling layout operations and
 * positioning of Rhizosphere models within a given project.
 *
 * Layout operations are triggered by publishing messages on the 'layout'
 * channel of the project event bus. The messages are expected in the
 * following format:
 *
 * message = {
 *   engine: 'bucket',
 *   state: {bucketBy: 'name', reverse: false}
 *   options: {forcealign: true},
 *   positions: [{id: 1, top: 300, left: 300}, {id: 2, top: 100, left: 150}]
 * };
 *
 * Where each key has the following meaning:
 *
 * - engine: The layout engine to use. Engines are referenced using the key
 *   under which they are registered in the rhizo.layout.layouts registry.
 *   If the 'engine' parameter is not specified, the current layout engine (i.e.
 *   the one used for the last layout) will be used.
 *   If the 'engine' parameter is explicitly null, the default layout engine
 *   will be used.
 *
 * - state: Layout-specific configuration options, as defined by each layout
 *   engine implementing rhizo.layout.StatefulLayout. If unspecified, the
 *   last state used by the requested engine will be used. If null, the default
 *   state for the engine will be used.
 *
 * - options: Additional configuration to tweak the layout operation. Currently
 *   supported ones are:
 *   - 'filter' (boolean): Whether this layout operation is invoked as a result
 *      of a filter being applied.
 *   - 'forcealign' (boolean): Whether models' visibility should be synced at
 *      the end of the layout operation.
 *   - 'instant' (boolean): Whether the layout transition should happen
 *      instantly, ignoring any animation settings that might exist.
 *
 * - positions: List of manual overrides for models that should be explicitly
 *   placed in a given position in the viewport.  Each entry is a key-value map
 *   with the following properties:
 *   - 'id': the id of the model to move,
 *   - 'top': the top coordinate (in px) of the top-left model corner, with
 *      respect to the visualization universe, where the model should be placed.
 *   - 'left': the left coordinate (in px) of the top-left model corner, with
 *     respect to the visualization universe, where the model should be placed.
 *
 *   TODO(battlehorse): Update top/left to be resolution independent. See
 *   http://code.google.com/p/rhizosphere/issues/detail?id=132
 *
 * All the message keys are optional. So, for example:
 *
 * message { engine: 'flow'}
 * - Applies the 'flow' layout using the last state it used, and no custom
 *   positioning.
 *
 * message { engine: 'bucket', state: null }
 * - Applies the 'bucket' layout, resetting it to its default state.
 *
 * @param {!rhizo.Project} project The project this layout manager belongs to.
 * @constructor
 */
rhizo.layout.LayoutManager = function(project) {
  /**
   * The default layout engine used when the visualization starts.
   * TODO(battlehorse): http://code.google.com/p/rhizosphere/issues/detail?id=61
   * @type {string}
   * @private
   */
  this.defaultEngine_ = 'flow';

  /**
   * The layout engine used in the last layout operation.
   * @type {string}
   * @private
   */
  this.curEngineName_ = null;

  /**
   * @type {!rhizo.Project}
   * @private
   */
  this.project_ = project;

  /**
   * The visualization GUI
   * @type {!rhizo.ui.gui.GUI}
   * @private
   */
  this.gui_ = project.gui();

  /**
   * The registry of all known layout engines that this visualization will use
   * (out of all the available ones in the rhizo.layout.layouts global
   * registry).
   * @type {!Object.<string, Object>}
   * @private
   */
  this.engines_ = {};

  /**
   * The rendering pipeline that the layout manager will use to accumulate and
   * apply single layout operations.
   * @type {!rhizo.ui.RenderingPipeline}
   * @private
   */
  this.renderingPipeline_ = new rhizo.ui.RenderingPipeline(
      project, project.gui().universe);


  // Registers this manager to validation and notification whenever a
  // message is published on the 'layout' channel.
  this.project_.eventBus().addPreprocessor(
      'layout', this.onBeforeLayout_, this, /* first */ true);
  this.project_.eventBus().subscribe(
      'layout', this.onLayout_, this);
};

rhizo.layout.LayoutManager.prototype.toString = function() {
  return "LayoutManager";
};

/**
 * Initializes the layout engines handled by the manager. Rejects all layout
 * engines that are not compatible with the current project metamodel.
 *
 * @param {!Object} engineRegistry The key-value map definining all available
 *     layout engines (typically rhizo.layout.layouts).
 */
rhizo.layout.LayoutManager.prototype.initEngines = function(
    engineRegistry) {
  for (var engineName in engineRegistry) {
    var engine = new engineRegistry[engineName]['engine'](this.project_);
    if (engine.verifyMetaModel &&
        !engine.verifyMetaModel(this.project_.metaModel())) {
      continue;
    }
    this.engines_[engineName] = engine;
  }
};

/**
 * Returns the list of all layout engines available to project this manager
 * belongs to.
 * @return {Array.<string>} The list of available layout engines.
 */
rhizo.layout.LayoutManager.prototype.getEngineNames = function() {
  var names = [];
  for (var name in this.engines_) {
    names.push(name);
  }
  return names;
};

/**
 * Returns the name of the current layout engine.
 * @return {string} The name of the current layout engine.
 */
rhizo.layout.LayoutManager.prototype.getCurrentEngineName = function() {
  return this.curEngineName_;
};

/**
 * Returns the current state of the requested engine (which may be its default
 * state if it has never been customized).
 * @param {string} engineName The name of the engine to query.
 * @return {Object} The engine state. Null if the engine is unknown or does not
 *     support state management.
 */
rhizo.layout.LayoutManager.prototype.getEngineState = function(engineName) {
  if (this.engines_[engineName] && this.engines_[engineName].getState) {
    return this.engines_[engineName].getState();
  }
  return null;
};

/**
 * If the current layout engine  supports it, ask it to extend a model
 * selection. The engine may be aware of relationships between models (such as
 * hierarchies) so that selecting a model should trigger the selection of
 * dependent ones.
 *
 * @param {string} modelId The id of the model whose selection state changed.
 * @return {Array.<string>} An array of model ids (including the input one)
 *     that are dependent on the input one.
 */
rhizo.layout.LayoutManager.prototype.extendSelection = function(modelId) {
  var engine = this.engines_[this.curEngineName_];
  if (engine.dependentModels) {
    var idsToSelect = engine.dependentModels(modelId);
    idsToSelect.push(modelId);
    return idsToSelect;
  }
  return [modelId];
};


/**
 * Preprocessing callback invoked whenever a message is published on the
 * 'layout' channel.
 *
 * @param {!Object} message The published message.
 * @param {!function(boolean, string=)} rspCallback Callback to invoke with the
 *     preprocessing outcome.
 * @private
 */
rhizo.layout.LayoutManager.prototype.onBeforeLayout_ = function(
    message, rspCallback) {
  // If an engine is not specified, use the current one.
  // If the current engine is undefined (first layout), use the default engine.
  // If a null engine is explicitly specified, the default one is used.
  if (!('engine' in message)) {
    message['engine'] = this.curEngineName_;
  }
  message['engine'] = message['engine'] || this.defaultEngine_;

  var engine = this.engines_[message['engine']];
  if (!engine) {
    rspCallback(false, 'Invalid layout engine:' + message['engine']);
    return;
  }

  // If the message does not specify a state, use the current one.
  // Specify a null state for the layout to apply its default one.
  if (!('state' in message)) {
    message['state'] =  (engine.getState ? engine.getState() : null);
  }

  // If the engine supports state management, ask it to validate the received
  // state.
  if (engine.setState) {
    this.onBeforeEngineLayout_(engine, message, rspCallback);
  } else {
    rspCallback(true);
  }
};

/**
 * Asks a specific engine to validate the received layout state, or to provide
 * a default one if unspecified.
 *
 * @param {!Object} engine The layout engine to query.
 * @param {!Object} message The published layout message.
 * @param {!function(boolean, string=)} rspCallback Callback to invoke with the
 *     preprocessing outcome.
 */
rhizo.layout.LayoutManager.prototype.onBeforeEngineLayout_ = function(
    engine, message, rspCallback) {
  if (!engine.setState(message['state'])) {
    rspCallback(false, 'Received invalid layout state for engine: ' + engine);
  } else {
    // If the state was undefined, the engine will have adopted its default
    // state, hence we update the message payload.
    message['state'] = engine.getState();
    rspCallback(true);
  }
};

/**
 * Callback invoked when a layout request is published on the 'layout'
 * channel.
 * @param {!Object} message The published message.
 * @private
 */
rhizo.layout.LayoutManager.prototype.onLayout_ = function(message) {
  this.project_.logger().time('LayoutManager::onLayout');
  var lastEngine = this.engines_[this.curEngineName_];
  var options = message['options'] || {};

  // Disable animations if requested to do so.
  if (!!options['instant'] && this.project_.options().areAnimationsEnabled()) {
    this.project_.gui().disableFx(true);
  }

  // Update the name of the current engine.
  this.curEngineName_ = message['engine'];
  var engine = this.engines_[this.curEngineName_];

  var dirty = false;
  if (lastEngine && lastEngine.cleanup) {
    // cleanup previous layout engine.
    dirty = lastEngine.cleanup(lastEngine == engine) || dirty;
  }

  // Empty the rendering pipeline
  this.renderingPipeline_.cleanup();
  if (lastEngine != engine) {
    // Restore all models to their original sizes and styles, if we are moving
    // to a different layout engine.
    this.renderingPipeline_.backupManager().restoreAll();
  }

  // reset panning
  this.gui_.universe.move(0, 0, {'bottom': 0, 'right': 0});

  // Identify all the models that can be laid out.
  var models = this.project_.models();
  var freeModels = [];
  for (var i = models.length-1; i >= 0; i--) {
    if (models[i].isAvailableForLayout()) {
      freeModels.push(models[i]);
    }
  }
  this.project_.logger().debug(
      freeModels.length + ' models available for layout');

  // Compute the layout.
  var resultLayoutBox = {top: 0, left: 0, width: 0, height: 0};
  if (freeModels.length > 0) {
    var boundingLayoutBox = new rhizo.layout.LayoutBox(
        this.gui_.viewport, this.project_.options().layoutConstraints());
    if (!boundingLayoutBox.isEmpty()) {
      dirty = engine.layout(this.renderingPipeline_,
                            boundingLayoutBox,
                            freeModels,
                            this.project_.modelsMap(),
                            this.project_.metaModel(),
                            options) || dirty;

      // Apply the layout.
      resultLayoutBox = this.renderingPipeline_.apply();
    }
  }

  // Resize the universe based on the occupied layout box.
  this.gui_.universe.css({
      'width': Math.max(resultLayoutBox.width + resultLayoutBox.left,
                        this.gui_.viewport.get(0).clientWidth),
      'height': Math.max(resultLayoutBox.height + resultLayoutBox.top,
                         this.gui_.viewport.get(0).clientHeight)}).
      move(0, 0);

  // If the layout altered visibility of some models, or we are forced to do so,
  // realign models' visibility.
  if (dirty || options['forcealign']) {
    this.project_.logger().debug(
        'Align visibility dirty=', dirty,
        ' forceAlign=', options['forcealign']);
    this.project_.filterManager().alignVisibility();
  }

  // If we received some manual positioning requests, apply them.
  if (message['positions']) {
    this.moveModels_(message['positions']);
  }

  // Restore animation settings if we artificially disabled them.
  if (!!options['instant'] && this.project_.options().areAnimationsEnabled()) {
    this.project_.alignFx();
  }
  this.project_.logger().timeEnd('LayoutManager::onLayout');
};

/**
 * Moves a set of models to the requested custom positions.
 *
 * @param {Array.<*>} positions An array of all model positions that changed.
 *     See the comment at the top of the file for the expected format of the
 *     array entries.
 * @private
 */
rhizo.layout.LayoutManager.prototype.moveModels_ = function(positions) {
  for (var i = positions.length-1; i >= 0; i--) {
    var model = this.project_.model(positions[i].id);
    if (model) {
      model.rendering().move(positions[i].top, positions[i].left);
    }
  }
};

/**
 * Notifies the manager that a set of models has been explicitly moved by the
 * user to a different position. The manager just republishes the event on its
 * channel for all the interested parties to catch up with the news.
 *
 * @param {Array.<*>} positions An array of all model positions that changed.
 *     Each entry is a key-value map with the following properties: 'id', the
 *     id of the model that moved, 'top', the ending top coordinate of the
 *     top-left model corner with respect to the visualization universe,
 *     'left', the ending left coordinate of the top-left model corner with
 *     respect to the visualization universe.
 */
rhizo.layout.LayoutManager.prototype.modelsMoved = function(positions) {
  this.project_.eventBus().publish('layout', {
    positions: positions
  }, null, this);
};

/**
 * Forces an out-of-band layout operation for the current layout engine and
 * state, which won't be published on the channel. This is useful when a
 * layout is not directly requested by the user, but still necessary as a
 * consequence of other operations (such as model filtering or changes in the
 * selected models).
 *
 * @param {!Object} options Layout configuration options.
 */
rhizo.layout.LayoutManager.prototype.forceLayout = function(options) {
  var message = {
    options: $.extend({}, options, {forcealign: true})
  };
  this.onBeforeLayout_(message, jQuery.proxy(function() {
    this.onLayout_(message);
  }, this));
};
/* ./src/js/rhizo.log.js */
/**
  @license
  Copyright 2008 The Rhizosphere Authors. All Rights Reserved.

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
 * @fileOverview Rhizosphere logging facilities.
 */

// RHIZODEP=rhizo
namespace("rhizo.log");

/**
 * Creates a new logger object. The logger is tailored to target the browser
 * console, with the following additions: a log level can be configured,
 * causing all logging messages below the desired level to be silently
 * discarded. The logger can be attached to a project, in which case all (and
 * only) 'error'-level messages will published on the project event bus for
 * other listeners to react to them. Error-level messages are assumed to
 * require the user attention, so listeners can collect them for the purpose of
 * displaying visible error messages.
 *
 * @param {rhizo.Project=} opt_project The optional visualization project the
 *     logger belongs to.
 * @param {rhizo.Options=} opt_options An optional configuration object. The only
 *     setting currently used is 'logLevel' to define which log messages to
 *     ignore and which to display. The following values are accepted:
 *     'debug', 'info', 'warn', 'time', 'error'. At 'error' level only messages
 *     that require the user attention are retained. The 'time' level extends
 *     the previous one to include performance timings and application
 *     profiling. 'warn', 'info' and 'debug' levels further extend the scope of
 *     logged messages, with the last one being the most detailed.
 * @return {!Object} A logger object that exposes an API equivalent to the
 *     browser console API (see http://getfirebug.com/logging), including the
 *     standard error(), warn() and info() methods. Depending on the chosen
 *     log level, parts of the console API will be no-ops.
 */
rhizo.log.newLogger = function(opt_project, opt_options) {
  var logLevel = rhizo.log.getLogLevel(opt_options);
  var logger = {};

  var methods = 'dir dirxml count debug log info warn time timeEnd group groupEnd error'.split(' ');
  var logThresholdReached = false;
  for (var i = methods.length; i >= 0; i--) {
    logThresholdReached ?
        rhizo.log.createNoOp(methods[i], logger) :
        rhizo.log.createDelegate(methods[i], logger, window['console']);
    logThresholdReached = logThresholdReached || methods[i] == logLevel;
  }

  if (opt_project) {
    var delegate = logger['error'];
    logger['error'] = function() {
      opt_project.eventBus().publish(
          'error', 
          {arguments: Array.prototype.slice.call(arguments)});
      delegate.apply(logger, arguments);
    };
  }
  return logger;
};

/**
 * Extracts the desired log level new loggers should use.
 * @param {rhizo.Options=} opt_options The logger configuration object.
 * @return The desired log level. Defaults to 'error' if unspecified.
 */
rhizo.log.getLogLevel = function(opt_options) {
  var logLevel = 'error';
  if (opt_options && opt_options.logLevel()) {
    logLevel = opt_options.logLevel();
  }
  var chooseableLevels = {
    debug: true, info: true, warn: true, time: true, error: true};
  if (!(logLevel in chooseableLevels)) {
    logLevel = 'error';
  }
  return logLevel;
};

/**
 * Creates a pass-through delegate method from sourceLogger to targetLogger.
 *
 * @param {string} method The method to delegate.
 * @param {!Object} sourceLogger The source logger that will receive method
 *     calls.
 * @param {!Object} targetLogger The target logger the calls will be delegated
 *     to, iff it exposes the same method handling the call.
 */
rhizo.log.createDelegate = function(method, sourceLogger, targetLogger) {
  sourceLogger[method] = function() {
    targetLogger && targetLogger[method] && 
    typeof(targetLogger[method]) == 'function' &&
        targetLogger[method].apply(targetLogger, arguments);
  };
};

/**
 * Creatse a no-op method on the given logger.
 *
 * @param {string} method The no-op method to add.
 * @param {!Object} sourceLogger The logger to modify
 */
rhizo.log.createNoOp = function(method, sourceLogger) {
  sourceLogger[method] = function() {};
};

/* ./src/js/rhizo.state.js */
/**
  @license
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

/**
 * === Support classes for state management.
 *
 * The global, document-wide state is the composition of the states of each
 * single Rhizosphere visualization present in the document.
 *
 * Each visualization manages its state as a set of Facets. A Facet is a single
 * aspect of a visualization whose state can be tracked (such as the layout
 * algorithm the visualization is currently using).
 *
 * Each visualization state can be shared among different components that might
 * both be notified of state changes:
 * - the rhizo.Project instance that manages the visualization
 * - HTML5 window.history (for browser navigation)
 * - document location hash (for browser navigation and bookmarking)
 * - HTML5 storage (for persistence across browser restarts)
 * - etc ...
 *
 * Components might also originate state change events, which are then
 * broadcast to all the other components to keep them in sync.
 *
 * To support such model, the following infrastructure is defined:
 * - rhizo.state.MasterOverlord: Maintains the global, document-wide state
 *   and is aware of all the visualizations within the document that might
 *   affect such state.
 *
 * - rhizo.state.ProjectOverlord: There is one ProjectOverlord for every
 *   visualization present in the document. Maintains the set of all
 *   components that track visualization state and broadcast state changes
 *   among those. It's also responsible for propagating per-visualization
 *   state changes upstream to the global state.
 *
 * - rhizo.state.StateBinder: An abstract class, that defines a bi-directional
 *   notification channel for state-changes between a visualization and a single
 *   component.
 *
 * Additional support classes exist:
 * - rhizo.state.HistoryHelper: bi-directional HTML5 History wrapper, to persist
 *   state changes and broadcast history events.
 *
 * === A brief note on HTML5 History.
 * HTML5 history is a sequence of document-wide state. PopStateEvent events are
 * fired whenever the document state should be updated as a consequence of the
 * user hitting the back/forward button (either to arrive in the current page,
 * return to the current page or move within current page states).
 *
 * Because of differences in browsers implementations:
 * - a PopStateEvent might fire or not when we arrive directly on a page
 *   (without using the back/forward buttons).
 * - the initial PopStateEvent that fires when we arrive on a page using the
 *   back/forward buttons might occur before or after Rhizosphere visualizations
 *   bootstrap.
 *
 * For these reasons, we have to take care of both these scenarios:
 * - the initial PopStateEvent event occurs after a rhizosphere visualization
 *   has initialized (see MasterOverlord.setInitialState).
 * - the initial PopStateEvent event occurs before a rhizosphere visualization
 *   has initialized (see MasterOverlord.attachProject).
 *
 * Also, since history state is document-wide:
 * - We need to differentiate between states pushed by different Rhizosphere
 *   visualizations living in the same page.
 * - We need to exclude states pushed by third-party components living in the
 *   same page.
 */

// RHIZODEP=rhizo,rhizo.log,rhizo.options
namespace("rhizo.state");

/**
 * Constant tag attached to HTML5 history states, to separate Rhizosphere states
 * from other history states generated outside of the visualization.
 * @type {string}
 * @const
 */
rhizo.state.TYPE = '__rhizo_state__';


/**
 * Enumeration of the different aspects of a Rhizosphere visualization whose
 * state can be tracked.
 * @enum {string}
 */
rhizo.state.Facets = {
  LAYOUT: 'layout',
  SELECTION_FILTER: 'selection',
  FILTER: 'filter'
};


/**
 * Enumeration of the different components that might be interested in state
 * changes of a Rhizosphere visualization.
 * @enum {string}
 */
rhizo.state.Bindings = {
  PROJECT: 'project',
  HISTORY: 'history'
};


/**
 * The global state overlord, that oversees state changes for all the
 * visualizations present in a page.
 * @constructor
 */
rhizo.state.MasterOverlord = function() {
  // Plain JS object that describes the global state. Initially empty.
  this.state_ = {
    type: rhizo.state.TYPE,  // Watermarking
    uuids: {},  // per-visualization state. Each entry has the visualization
                // uuid as its key and the visualization state as the value.
                //
                // The visualization state is represented as facet-facetState
                // pairs.
    delta: {  // last state change that was applied.
      ts: null,  // timestamp
      uuid: null,  // uuid of the affected visualization
      facet: null,  // affected facet
      facetState: null  // associated facet state.
    }
  };

  /**
   * Collection of all project overlords, keyed by project uuid.
   * @type {Object.<string, rhizo.state.ProjectOverlord>}
   * @private
   */
  this.projectOverlords_ = {};

  /**
   * The component that was responsible for setting the initial state.
   * For example, it may indicate that visualization state was initially rebuilt
   * from HTML5 History.
   * @type {rhizo.state.Bindings}
   * @private
   */
  this.initialStateOwner_ = null;
};

/**
 * Enables state management for this project.
 * @param {rhizo.Project} project
 * @param {Array.<rhizo.state.Bindings>} The set of components that will track
 *     state changes for this project. The rhizo.state.Bindings.PROJECT
 *     component (binding for the project itself) it's always automatically
 *     included.
 * @return {boolean} Whether an initial state existed for the project (and was
 *     notified to it) or not (and the project should configure its state
 *     via other defaults).
 */
rhizo.state.MasterOverlord.prototype.attachProject = function(project,
                                                              bindings) {
  var uuid = project.uuid();
  var projectOverlord = new rhizo.state.ProjectOverlord(
      this, project, bindings);
  this.projectOverlords_[uuid] = projectOverlord;

  // Broadcasts the current project state (if already defined) to all the
  // bindings (including the project itself), for them to sync to the current
  // state.
  if (uuid in this.state_.uuids) {
    if (!this.initialStateOwner_) {
      throw('Initial state owner is unknown, ' +
            'even though an initial state exists for: ' + uuid);
    }
    projectOverlord.broadcast(this.initialStateOwner_, null);
    return true;
  }
  // Otherwise, notify solely the project binder for the project to initialize
  // in a default state.
  this.projectBinder(project).onTransition(null, this.state_);
  return false;
};

/**
 * Disables state management for this project.
 *
 * NOTE that you cannot repeatedly enable/disable state management for a
 * project. You can enable and disable it just once, otherwise the initial
 * state received after re-enabling state management may be out-of-sync.
 *
 * @param {rhizo.Project} project
 */
rhizo.state.MasterOverlord.prototype.detachProject = function(project) {
  var uuid = project.uuid();
  if (uuid in this.projectOverlords_) {
    this.projectOverlords_[uuid].removeAllBindings();
    delete this.projectOverlords_[uuid];
  }
  if (uuid in this.state_.uuids) {
    delete this.state_.uuids[uuid];
  }
};

/**
 * Returns the project overlord assigned to the given project.
 * @param {rhizo.Project} project
 * @return {rhizo.state.ProjectOverlord}
 */
rhizo.state.MasterOverlord.prototype.projectOverlord = function(project) {
  return this.projectOverlords_[project.uuid()];
};

/**
 * @param {rhizo.Project} project
 * @return {rhizo.state.ProjectStateBinder} The binding object that expose the
 *     state management interface for the project.
 */
rhizo.state.MasterOverlord.prototype.projectBinder = function(project) {
  return this.projectOverlords_[project.uuid()].getProjectBinder();
};

/**
 * @return {*} The current state.
 */
rhizo.state.MasterOverlord.prototype.state = function() {
  return this.state_;
};

/**
 * Replaces the current state with a new one. Does not trigger any sync.
 * @param {*} state The new state.
 */
rhizo.state.MasterOverlord.prototype.setState = function(state) {
  this.state_ = state;
};

/**
 * Sets the inital document-wide state, and broadcasts it to all the affected
 * components for them to sync.
 *
 * @param {rhizo.state.Bindings} ownerKey The component which is setting the
 *     initial state.
 * @param {*} state The initial state.
 * @param {?boolean} opt_replace Whether the given state should replace a
 *     previous initial state (if defined) or not.
 */
rhizo.state.MasterOverlord.prototype.setInitialState = function(ownerKey,
                                                                state,
                                                                opt_replace) {
  var replace = !!opt_replace;
  if (!replace) {
    // We are trying to set the initial state without forcing a replace.
    // If an initial state already exists, don't change anything.
    var numProjectStates = 0;  // projects that have already set their state.
    for (var uuid in this.state_.uuids) {
      numProjectStates++;
    }
    if (numProjectStates > 0) {
      return;
    }
  }
  this.initialStateOwner_ = ownerKey;
  this.setState(state);

  // Broadcast the initial state to all projects that have already enabled
  // state management.
  for (var uuid in this.state_.uuids) {
    if (uuid in this.projectOverlords_) {
      this.projectOverlords_[uuid].broadcast(ownerKey, null, opt_replace);
    }
  }
};

/**
 * Pushes a delta change of the global state.
 * @param {*} delta A key-value map that describes the delta change to apply.
 *     Must contain the following properties:
 *     - uuid: The id of the affected visualization
 *     - facet: The affected facet
 *     - facetState: The target facetState
 *     - ts: The timestamp at which the change occurred.
 */
rhizo.state.MasterOverlord.prototype.pushDelta = function(delta) {
  this.state_.delta  = delta;
  if (!(delta.uuid in this.state_.uuids)) {
    this.state_.uuids[delta.uuid] = {};
  }
  this.state_.uuids[delta.uuid][delta.facet] = delta.facetState;
};


/**
 * Oversees all the changes that occur in a single Rhizosphere visualization.
 * Maintains all the bi-directional channels to the registered components that
 * are tracking changes on this visualization and keeps them in sync.
 *
 * @param {rhizo.state.MasterOverlord} masterOverlord The global state manager.
 * @param {rhizo.Project} project The project that manages the visualization.
 * @param {Array.<rhizo.state.Bindings>} The set of components that will track
 *     state changes for this project. The rhizo.state.Bindings.PROJECT
 *     component (binding for the project itself) it's always automatically
 *     included.
 * @constructor
 */
rhizo.state.ProjectOverlord = function(masterOverlord, project, bindings) {
  this.master_ = masterOverlord;
  this.uuid_ = project.uuid();
  this.bindings_ = {};

  bindings.push(rhizo.state.Bindings.PROJECT);
  var binder;
  for (var i = 0; i < bindings.length; i++) {
    var binding = bindings[i];
    switch(binding) {
      case rhizo.state.Bindings.PROJECT:
        binder = new rhizo.state.ProjectStateBinder(this, project);
        this.bindings_[binding] = binder;
        break;
      case rhizo.state.Bindings.HISTORY:
        if (rhizo.state.getHistoryHelper()) {  // HTML5 history supported.
          binder = new rhizo.state.HistoryStateBinder(this);
          this.bindings_[binding] = binder;
        }
        break;
      default:
        throw('Unknown binding: ' + binding);
    }
  }
};

/**
 * @return {rhizo.state.ProjectStateBinder} The binding object that expose the
 *     state management interface for the project.
 */
rhizo.state.ProjectOverlord.prototype.getProjectBinder = function() {
  return this.bindings_[rhizo.state.Bindings.PROJECT];
};

/**
 * @return {string} The unique id of the visualization managed by this
 *     overlord.
 */
rhizo.state.ProjectOverlord.prototype.uuid = function() {
  return this.uuid_;
};

/**
 * @return {rhizo.state.MasterOverlord} Returns the master state overlord.
 */
rhizo.state.ProjectOverlord.prototype.master = function() {
  return this.master_;
};

/**
 * Adds a new binder to the list of bindings attached to this overlord.
 * Upon attachment, the binder receives the full state to be able to sync itself
 * to the current visualization state.
 *
 * @param {rhizo.state.StateBinder} binder The StateBinder to add.
 */
rhizo.state.ProjectOverlord.prototype.addBinding = function(binder) {
  if (!(binder.key() in this.bindings_)) {
    this.bindings_[binder.key()] = binder;
  }
  if (this.uuid_ in this.master_.state().uuids) {
    binder.onTransition(null, this.master_.state());
  }
};

/**
 * Removes a binding from the list of bindings this overlord is serving.
 * @param {string} binder_key The key of the binder to remove.
 */
rhizo.state.ProjectOverlord.prototype.removeBinding = function(binder_key) {
  var binder = this.bindings_[binder_key];
  binder.onRemove();
  delete this.bindings_[binder_key];
  return binder;
};

/**
 * Removes all the bindings from this overlord.
 *
 * After this call, the overlord will be effectively blind to any changes that
 * affect the project it was bound to, even the ones originating from the
 * project itself.
 */
rhizo.state.ProjectOverlord.prototype.removeAllBindings = function() {
  for (var binder_key in this.bindings_) {
    this.removeBinding(binder_key);
  }
};

/**
 * Applies a state transition requested by one binder and broadcast the changes
 * to all the other binders.
 *
 * The transition is described as a 'delta' that describes the change from
 * the current state to the target state and, optionally, a target state.
 *
 * Deltas can describe both forward changes (moving from the current state to
 * a future one) and backward changes (rolling back to a previous state).
 *
 * If the target state is missing, the 'delta' is assumed to be a forward change
 * and therefore the target state will be computed from the current one.
 *
 * Deltas can only change one state facet at a time, for one visualization at
 * a time.
 *
 * @param {rhizo.state.Bindings} sourceKey The key that identifies the binder
 *     where the last state change originated from.
 * @param {*} delta A key-value map that describes the delta change to apply.
 *     Must contain the following properties:
 *     - uuid: The id of the affected visualization
 *     - facet: The affected facet
 *     - facetState: The target facetState
 *     - ts: The timestamp at which the change occurred (can be in the past
 *       if we are rolling back to a previous state).
 * @param {*} opt_target_state Optional target state. Can be omitted if the
 *     change is a forward change.
 * @param {boolean} opt_replace Hints that the target state reached by this
 *     delta transition should replace the current one, instead of being a
 *     transition from it.
 */
rhizo.state.ProjectOverlord.prototype.transition = function(sourceKey,
                                                            delta,
                                                            opt_target_state,
                                                            opt_replace) {
  if (opt_target_state) {
    this.master_.setState(opt_target_state);
  } else {
    this.master_.pushDelta(delta);
  }
  this.broadcast(sourceKey, delta, opt_replace);
};

/**
 * Broadcasts a state change from the originating component to all the other
 * interested parties. Each component receives the full target state and, if
 * the transition to the target state affected a single facet, a delta object
 * as well.
 *
 * @param {rhizo.state.Bindings} sourceKey The key that identifies the binder
 *     where the last state change originated from.
 * @param {*} opt_delta An optional key-value map that describes a delta change
 *     that occurred. See transition() for this object attributes.
 * @param {boolean} opt_replace Hints that the target state reached by this
 *     delta transition should replace the current one, instead of being a
 *     transition from it.
 */
rhizo.state.ProjectOverlord.prototype.broadcast = function(sourceKey,
                                                           opt_delta,
                                                           opt_replace) {
  // Propagate the change to all the other binders to keep them in sync.
  for (var binderKey in this.bindings_) {
    if (binderKey != sourceKey) {
      this.bindings_[binderKey].onTransition(
          opt_delta, this.master_.state(), opt_replace);
    }
  }
};


/**
 * Abstract class that defines the interface to notify/listen to state changes.
 * @param {rhizo.state.ProjectOverlord} overlord
 * @param {rhizo.state.Bindings} binderKey
 * @constructor
 */
rhizo.state.StateBinder = function(overlord, binderKey) {
  this.overlord_ = overlord;
  this.binderKey_ = binderKey;
};

/**
 * @return {rhizo.state.Bindings}
 */
rhizo.state.StateBinder.prototype.key = function() {
  return this.binderKey_;
};

/**
 * Callback to notify this binder that a state transition occurred elsewhere.
 * @param {*} opt_delta Defines the facet that changed state and its associated
 *     changes. See the parameter documentation for
 *     rhizo.state.ProjectOverlord.prototype.transition. null if the change
 *     affected multiple facets at the same time.
 * @param {*} state The target state at the end of the transition.
 * @param {boolean} opt_replace Hints that the target state reached by this
 *     delta transition should replace the current one, instead of being a
 *     transition from it.
 */
rhizo.state.StateBinder.prototype.onTransition = function(opt_delta,
                                                          state,
                                                          opt_replace) {
  throw("Unimplemented StateBinder.onTransition");
};

/**
 * Creates a delta object from a facet change.
 * @param {rhizo.state.Facets} facet The facet that change.
 * @param {*} facetState The facet target state.
 * @return {*} An object that describes the change, suitable for passing to
 *     rhizo.state.ProjectOverlord.prototype.transition.
 */
rhizo.state.StateBinder.prototype.makeDelta = function(facet, facetState) {
  return {
    ts: new Date().getTime(),
    uuid: this.overlord_.uuid(),
    facet: facet,
    facetState: facetState
  };
};

/**
 * Callback to notify this binder that is being removed from its overlord.
 * Therefore it won't be sent further state transitions, and it should stop
 * pushing state changes to the overlord.
 */
rhizo.state.StateBinder.prototype.onRemove = function() {};


/**
 * Binds the visualization state to the rhizo.Project that manages the
 * visualization itself.
 *
 * @param {rhizo.state.StateOverlord} overlord
 * @param {rhizo.Project} project
 * @constructor
 */
rhizo.state.ProjectStateBinder = function(overlord, project) {
  rhizo.state.StateBinder.call(this, overlord, rhizo.state.Bindings.PROJECT);
  this.project_ = project;
  this.removed_ = false;
  this.project_.eventBus().subscribe(
      'layout', this.onLayout_, this, /* committed */ true);
  this.project_.eventBus().subscribe(
      'selection', this.onSelection_, this, /* committed */ true);
  this.project_.eventBus().subscribe(
      'filter', this.onFilter_, this, /* committed */ true);
};
rhizo.inherits(rhizo.state.ProjectStateBinder, rhizo.state.StateBinder);

rhizo.state.ProjectStateBinder.prototype.onRemove = function() {
  this.project_.eventBus().unsubscribe('layout', this);
  this.project_.eventBus().unsubscribe('selection', this);
  this.project_.eventBus().unsubscribe('filter', this);
  this.removed_ = true;
};

/** @inheritDoc */
rhizo.state.ProjectStateBinder.prototype.onTransition = function(opt_delta,
                                                                 state) {
  if (this.removed_) {
    throw("ProjectStateBinder received a transition after being removed from " +
          "overlord.");
  }

  // If we know exactly what changed to get to the target state, then
  // just apply the delta, otherwise rebuild the full state.
  if (opt_delta) {
    this.pushDeltaChange_(opt_delta);
  } else {
    this.pushFullState_(state);
  }
};

/**
 * Applies a single facet transition to the managed project.
 *
 * @param {*} delta Defines the facet that changed state and its associated
 *     changes. See the parameter documentation for
 *     rhizo.state.ProjectOverlord.prototype.transition.
 * @private
 */
rhizo.state.ProjectStateBinder.prototype.pushDeltaChange_ = function(delta) {
  this.project_.logger().debug('Received delta state change to push: ', delta);
  var facet = delta.facet;
  var facetState = delta.facetState;
  if (facet == rhizo.state.Facets.LAYOUT) {
    this.pushLayoutChange_(facetState);
  } else if (facet == rhizo.state.Facets.SELECTION_FILTER) {
    this.pushSelectionChange_(facetState);
  } else if (facet == rhizo.state.Facets.FILTER) {
    this.pushFilterChange_(facetState);
  } else {
    throw("Invalid facet: " + facet);
  }
};

/**
 * Rebuilds the full project state.
 *
 * @param {*} state The target state to transition the project to.
 * @private
 */
rhizo.state.ProjectStateBinder.prototype.pushFullState_ = function(state) {
  this.project_.logger().debug('Received full state change to push: ', state);
  var projectState = state.uuids[this.overlord_.uuid()] || {};
  this.pushFilterChange_(projectState[rhizo.state.Facets.FILTER]);
  this.pushSelectionChange_(
      projectState[rhizo.state.Facets.SELECTION_FILTER]);

  // forcealign required to align model visibility since we are rebuilding
  // a full state (it may even be the initial one, when all models are still
  // hidden).
  this.pushLayoutChange_(
      projectState[rhizo.state.Facets.LAYOUT], /* forcealign */ true);
};

/**
 * Publishes a 'layout' message on the project eventbus to update all
 * subscribers about the current layout engine and configuration.
 *
 * @param {Object} facetState An object describing the current layout
 *     configuration, as defined by rhizo.layout.LayoutManager, containing
 *     'engine', 'state' and optional 'positions' settings. Or null if the
 *     layout should be reverted to the visualization default state.
 * @param {boolean=} opt_forcealign Whether a visibility alignment should be
 *     enforced as part of the layout operation. Defaults to false.
 * @private
 */
rhizo.state.ProjectStateBinder.prototype.pushLayoutChange_ = function(
    facetState, opt_forcealign) {
  var message = {
    // Setting engine and state explicitly to null (when facetState is
    // missing) equates to restoring the default engine and/or state (which
    // is the right thing to do when a null, aka initial, state is restored
    // from html5 history and other binders).
    engine: facetState ? facetState.engine: null,
    state: facetState ? facetState.state : null,
    positions: facetState ? facetState.positions : null
  };
  if (!!opt_forcealign) {
    message['options'] = {forcealign: true};
  }
  this.project_.eventBus().publish(
      'layout', message, /* callback */ null, this);
};

/**
 * Callback invoked whenever a layout related change occurs elsewhere on the
 * project. Updates the visualization state to match the layout change.
 *
 * @param {Object} message An eventbus message describing the layout change
 *     that occurred. See rhizo.layout.LayoutManager for the expected message
 *     structure.
 * @private
 */
rhizo.state.ProjectStateBinder.prototype.onLayout_ = function(message) {
  if (this.removed_) {
    throw("ProjectStateBinder cannot issue transitions after removal from " +
          "overlord");
  }

  var facetState = {
    engine: message['engine'],
    state: message['state']
  };
  var replace = !!message['positions'] && this.curLayoutHasPositions_();
  if (message['positions']) {
    facetState.positions = this.mergePositions_(message['positions']);
  }
  var delta = this.makeDelta(rhizo.state.Facets.LAYOUT, facetState);
  this.overlord_.transition(this.key(), delta, null, replace);
};

/**
 * @return {boolean} Whether the current state, and the current layout in
 *     particular, is storing custom model positions or not.
 * @private
 */
rhizo.state.ProjectStateBinder.prototype.curLayoutHasPositions_ = function() {
  var state = this.overlord_.master().state();
  var uuid = this.overlord_.uuid();
  return uuid in state.uuids &&
      rhizo.state.Facets.LAYOUT in state.uuids[uuid] &&
      !!state.uuids[uuid][rhizo.state.Facets.LAYOUT].positions;
};

/**
 * Merges all the custom layout positions currently stored in the visualization
 * state with new custom model positions defined in the current transition.
 *
 * @param {Array.<*>} positions An array of all model that have moved to a
 *     custom position as part of the current state transition.
 * @return {Array.<*>} An array of the same format of the input one, that
 *     contains all known custom model positions (current and historical).
 * @private
 */
rhizo.state.ProjectStateBinder.prototype.mergePositions_ = function(positions) {
  var positions_map = {};
  for (var i = positions.length-1; i >= 0; i--) {
    positions_map[positions[i].id] = true;
  }

  if (this.curLayoutHasPositions_()) {
    var cur_positions =
        this.overlord_.master().state().uuids[this.overlord_.uuid()][
            rhizo.state.Facets.LAYOUT].positions || [];
    for (var i = cur_positions.length-1; i >= 0; i--) {
      if (!(cur_positions[i].id in positions_map)) {
        positions.push(cur_positions[i]);
      }
    }
  }
  return positions;
};

/**
 * Publishes a 'selection' message on the project eventbus to update all
 * subscribers about the current selection status.
 *
 * @param {Array} facetState The array of all model ids that should be hidden
 *     from the visualization, or null if all models should be visible.
 * @private
 */
rhizo.state.ProjectStateBinder.prototype.pushSelectionChange_ = function(
    facetState) {
  var hiddenModelIds = facetState || [];
  if (hiddenModelIds.length == 0) {
    this.project_.eventBus().publish(
        'selection', {action: 'resetFocus'}, /* callback */ null, this);
  } else {
    this.project_.eventBus().publish(
        'selection', {
          action: 'hide',
          models: hiddenModelIds,
          incremental: false
        },
        /* callback */ null, this);
  }
};

/**
 * Callback invoked whenever a selection related change occurs elsewhere on the
 * project. Updates the visualization state to match the selection change.
 *
 * @param {Object} message An eventbus message describing the selection change
 *     that occurred. See rhizo.selection.SelectionManager for the expected
 *     message structure.
 * @private
 */
rhizo.state.ProjectStateBinder.prototype.onSelection_ = function(message) {
  if (this.removed_) {
    throw("ProjectStateBinder cannot issue transitions after removal from " +
          "overlord");
  }
  if (message['action'] != 'focus' &&
      message['action'] != 'resetFocus' &&
      message['action'] != 'hide') {
    return;
  }
  var hiddenModelIds = [];
  for (var modelId in this.project_.selectionManager().allHidden()) {
    hiddenModelIds.push(modelId);
  }
  var delta = this.makeDelta(rhizo.state.Facets.SELECTION_FILTER,
                             hiddenModelIds);
  this.overlord_.transition(this.key(), delta);
};

/**
 * Publishes a 'filter' message on the project eventbus to update all
 * subscribers about the current filter status.
 *
 * @param {Object.<string, *>} facetState The set of filters to transition the
 *     project to, or null if all existing filters are to be removed.
 * @private
 */
rhizo.state.ProjectStateBinder.prototype.pushFilterChange_ = function(
    facetState) {
  this.project_.eventBus().publish(
      'filter',
      this.project_.filterManager().filterDiff(facetState || {}),
      /* callback */ null,
      this);
};

/**
 * Callback invoked whenever one or more filters are applied (or removed)
 * elsewhere on the project. Updates the visualization state to match the
 * filter change.
 *
 * @param {Object} message An eventbus message describing the filter change
 *     that occurred. See rhizo.meta.FilterManager for the expected
 *     message structure.
 * @private
 */
rhizo.state.ProjectStateBinder.prototype.onFilter_ = function(message) {
  if (this.removed_) {
    throw("ProjectStateBinder cannot issue transitions after removal from " +
          "overlord");
  }
  var delta = this.makeDelta(
      rhizo.state.Facets.FILTER, this.project_.filterManager().getFilters());
  this.overlord_.transition(this.key(), delta);
};


/**
 * Binds the visualization state to the browser HTML5 history.
 * @param {rhizo.state.StateOverlord} overlord
 * @constructor
 */
rhizo.state.HistoryStateBinder = function(overlord) {
  rhizo.state.StateBinder.call(this, overlord, rhizo.state.Bindings.HISTORY);
  rhizo.state.getHistoryHelper().addListener(
      this.overlord_.uuid(),
      jQuery.proxy(function(delta, target_state) {
        this.overlord_.transition(this.key(), delta, target_state);
      }, this));
};
rhizo.inherits(rhizo.state.HistoryStateBinder, rhizo.state.StateBinder);

rhizo.state.HistoryStateBinder.prototype.onTransition = function(opt_delta,
                                                                 state,
                                                                 opt_replace) {
  rhizo.state.getHistoryHelper().sync(state, opt_replace);
};


rhizo.state.HistoryStateBinder.prototype.onRemove = function() {
  rhizo.state.getHistoryHelper().removeListener(this.overlord_.uuid());
};


/**
 * Helper that manages all interactions with HTML5 History for all the
 * HistoryBinder instances that exist.
 * @param {rhizo.state.MasterOverlord} masterOverlord
 * @param {!Object} logger
 * @constructor
 */
rhizo.state.HistoryHelper = function(masterOverlord, logger) {
  this.master_ = masterOverlord;
  this.logger_ = logger;
  this.listeners_ = {};
  this.initialStateReceived_ = false;

  $(window).bind('popstate', jQuery.proxy(this.historyChange_, this));
};



/**
 * Registers a callback to be invoked whenever an history-originated change
 * affecting a given visualization occurs.
 * @param {string} uuid The id of the visualization to track.
 * @param {function(rhizo.state.Facets, *, number)} callback Callback function.
 *   Receives as parameters: the facet that changed, the associated facet state
 *   and the timestamp when the change originally occurred.
 */
rhizo.state.HistoryHelper.prototype.addListener = function(uuid, callback) {
  this.listeners_[uuid] = callback;
};

/**
 * Deregisters a callback from being invoked on history-originated changes
 * affecting the given visualization.
 *
 * @param {string} uuid The id of the visualization to stop tracking.
 */
rhizo.state.HistoryHelper.prototype.removeListener = function(uuid) {
  if (uuid in this.listeners_) {
    delete this.listeners_[uuid];
  }
};

/**
 * Pushes the current master state to HTML5 history.
 */
rhizo.state.HistoryHelper.prototype.sync = function(state, opt_replace) {
  // Stop listening for initial events after the first push.
  // We assume the initial state was never fired during the init process,
  // as is the case of Safari/MacOs when we are landing directly on the
  // visualization page (not arriving from history browse).
  this.logger_.debug('Pushing history state, replace=', !!opt_replace);
  this.initialStateReceived_ = true;
  if (!!opt_replace) {
    window.history.replaceState(state, /* empty title */ '');
  } else {
    window.history.pushState(state, /* empty title */ '');
  }
};

/**
 * Callback invoked whenever an history event occurs (forward / back navigation)
 * @param {PopStateEvent} evt
 * @private
 */
rhizo.state.HistoryHelper.prototype.historyChange_ = function(evt) {
  this.logger_.debug('History popstate event: ', evt.originalEvent.state);
  if (!this.initialStateReceived_) {
    this.logger_.debug('History event is initial.');

    // A PopStateEvent is fired on page load when we are arriving on the page
    // as a consequence of browser back/forward navigation. The event contains
    // the initial state Rhizosphere visualizations should be restored to.
    this.initialStateReceived_ = true;
    var initial_state = evt.originalEvent.state;

    // A null PopStateEvent is fired by Chrome (on Linux, Win) and FF4 when
    // we are landing directly on the page that contains the visualization
    // (i.e.: no back/forward buttons were used).
    if (initial_state) {

      // Verify whether the state we received belongs to Rhizosphere.
      if (this.isRhizoState_(initial_state)) {
        this.master_.setInitialState(rhizo.state.Bindings.HISTORY,
                                     initial_state);
      }
    } else {
      this.logger_.debug('Initial history event is null.');
    }
    return;
  }

  var delta;
  var target_state = evt.originalEvent.state;
  if (!target_state) {
    // A null target state implies we are moving backward to the initial state
    // the page has when we land on it directly (not coming from an history
    // event).
    //
    // Prepare a suitable delta to revert the facet to its initial (default)
    // state.
    delta = {
      ts: new Date().getTime(),
      uuid: this.master_.state().delta.uuid,
      facet: this.master_.state().delta.facet,
      facetState: null
    };
  } else {
    if (!this.isRhizoState_(target_state)) {
      // Notified of an HTML5 history state change that was not set by
      // Rhizosphere.
      return;
    }

    if (this.master_.state().delta.ts == target_state.delta.ts) {
      // We are receiving the same state twice (assuming timestamp measurement
      // is granular enough).
      // This can happen in some weird cases. For example:
      // - if we are on Chrome/Linux,
      // - and we set an initial state with replacement (as when resuming the
      //   the initial following of a remote visualization)
      // Then:
      // - a popState event will be fired _after_ the initial state was set.
      // Since we performed a state replace, the popstate event will contain
      // the exact state currently in the master.
      return;
    }

    // Compute the transition required to reach the target state.
    delta = this.diff_(this.master_.state(), target_state);
  }

  this.logger_.debug('Delta change extracted from history: ', delta);
  if (delta.uuid in this.listeners_) {
    // If a listener responsible for the affected visualization still exists,
    // notify it and rely on it to update the master state.
    this.listeners_[delta.uuid](delta, target_state);
  } else {
    // Nobody is tracking history changes for this visualization anymore,
    // update the master state directly.
    // (even though no longer useful, we cannot miss this state, because
    // delta computations in diff() must operate on consecutive states).
    if (target_state) {
      this.master_.setState(target_state);
    } else {
      this.master_.pushDelta(delta);
    }
  }
};

/**
 * Defines whether the history state belongs to Rhizosphere or was defined by
 * someone else living in the same page as the visualization.
 * @private
 */
rhizo.state.HistoryHelper.prototype.isRhizoState_ = function(state) {
  return state.type == rhizo.state.TYPE;
};

/**
 * Computes the delta state change that occurred between two consecutive
 * global states. It distinguishes between forward changes (the state we
 * diff against occurred after the current one) and backward ones (viceversa).
 *
 * @param {*} current_state The current state.
 * @param {*} target_state The target state, as received from history.
 * @return {*} An object describing the delta change with the following
 *    properties:
 *    - uuid: uuid of the visualization that changed.
 *    - facet: changed facet
 *    - facetState: facet state as it was after the state change.
 *    - ts: The timestamp at which the change occurred.
 */
rhizo.state.HistoryHelper.prototype.diff_ = function(current_state,
                                                     target_state) {
  if (target_state.delta.ts > current_state.delta.ts) {
    // Moving forward through the history
    return target_state.delta;
  } else {
    // Moving backward through the history
    var facetToRollback = current_state.delta.facet;
    var uuidToRollback = current_state.delta.uuid;
    if (uuidToRollback in target_state.uuids &&
        facetToRollback in target_state.uuids[uuidToRollback]) {
      return {
        ts: target_state.delta.ts,
        uuid: uuidToRollback,
        facet: facetToRollback,
        facetState: target_state.uuids[uuidToRollback][facetToRollback]
      }
    } else {
      // Either the uuid or the affected facet is missing in the target state.
      // We are rolling back to a state where either the entire project
      // associated to this uuid, or just one of its facets, was in its
      // default (unconfigured) state.
      // Examples:
      // - missing uuid: null initial state (direct landing on the page),
      //     apply a change and then roll it back.
      // - missing facet: null initial state (direct landing on the page),
      //     apply a change to 2 different facets, then rollback the latter.
      return {
        ts: target_state.delta.ts,
        uuid: uuidToRollback,
        facet: facetToRollback,
        facetState: null
      };
    }
  }
};


/**
 * The singleton master state manager.
 * @type {rhizo.state.MasterOverlord}
 * @private
 */
rhizo.state.overlord_ = new rhizo.state.MasterOverlord();


/**
 * @return {rhizo.state.MasterOverlord} The global state manager.
 */
rhizo.state.getMasterOverlord = function() {
  return rhizo.state.overlord_;
};


/**
 * The detail level rhizo.state.HistoryHelper will use in logging history
 * events.
 *
 * This is defined as a global variable (to customize before
 * Rhizosphere libraries are loaded) because HistoryHelper is a global
 * object shared across multiple visualizations.
 *
 * It is not namespaced, as the 'rhizo' namespace will not exist yet when
 * the user customizes it.
 *
 * @type {string}
 */
rhizosphereHistoryLogLevel = window['rhizosphereHistoryLogLevel'] || 'error';


/**
 * The singleton helper that manages all interactions with HTML5 History.
 * @type {rhizo.state.HistoryHelper}
 * @private
 */
rhizo.state.history_ = null;
if (window.history && typeof(window.history.pushState) == 'function') {
  var logger = rhizo.log.newLogger(
      null, new rhizo.Options({logLevel: rhizosphereHistoryLogLevel}));
  rhizo.state.history_ = new rhizo.state.HistoryHelper(
      rhizo.state.getMasterOverlord(), logger);
}


/**
 * @return {rhizo.state.HistoryHelper} the singleton helper that manages all
 *   interactions with HTML5 History.
 */
rhizo.state.getHistoryHelper = function() {
  return rhizo.state.history_;
};
/* ./src/js/rhizo.ui.meta.js */
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
 * @fileOverview User interfaces for Rhizosphere metamodel Kinds to collect
 * filtering criteria from the user. Filtering criteria are then used to
 * filter out Rhizosphere models from the visualization project, allowing the
 * user to perform faceted searches on the visualization contents.
 * @author Riccardo Govoni (battlehorse@google.com)
 *
 * To define a new metamodel Kind user interface:
 * - define a new Javascript class.
 *
 * - implement a filterUiControls() function.
 *   This renders and returns the metamodel Kind filter Ui.
 *
 * - register for notifications on the 'filter' eventbus channel.
 *   Notifications will be delivered whenever the filtering criteria for the
 *   project change, for the user interface to catch up.
 *
 * - publish filtering requests entered by the user on the 'filter' eventbus
 *   channel, for the rest of the project to catch up on user requests to
 *   modify the set of filters applied to the visualization.
 *
 * - If needed, register for notifications on other channels. For example,
 *   if the user interfaces show information computed from the current set of
 *   models, it should subscribe to the 'model' eventbus channel, to be
 *   notified whenever models are added or removed from the visualization.
 *
 * The rhizo.ui.meta.FilterUi base class can be used to simplify ui development.
 */

// RHIZODEP=rhizo,rhizo.meta
namespace('rhizo.ui.meta');


/**
 * Helper function to wrap a Kind user interface into a standard labeled box
 * that will fit into Rhizosphere default filter containers.
 *
 * @param {!rhizo.Project} project The visualization project.
 * @param {string} metaModelKey The key identifying the metamodel the user
 *     interface pertains to.
 * @param {*} filterUi A DOM element or jQuery object referencing the metamodel
 *     Kind user interface.
 * @return {*} A jQuery wrapper referencing the labeled box containing the
 *     Kind user interface.
 */
rhizo.ui.meta.labelWrap = function(project, metaModelKey, filterUi) {
  return $("<div class='rhizo-filter' />").
      append(project.metaModel()[metaModelKey].label + ": ").
      append($(filterUi));
};


/**
 * Helper superclass to simplify management of metamodel Kind user interfaces.
 *
 * @param {!rhizo.Project} project The visualization project.
 * @param {string} metaModelKey The metamodel key this user interface class
 *     pertains to.
 */
rhizo.ui.meta.FilterUi = function(project, metaModelKey) {
  /**
   * jQuery object wrapping the DOM nodes containing the filter engine user
   * interface.
   * @type {*}
   * @private
   */
  this.ui_controls_ = null;

  /**
   * The project this filter UI belongs to.
   * @type {!rhizo.Project}
   * @private
   */
  this.project_ = project;

  /**
   * The metaModel key (aka model attribute name) this filter applies to.
   * @type {string}
   * @private
   */
  this.metaModelKey_ = metaModelKey;

  this.project_.eventBus().subscribe('filter', this.onFilter_, this);
  this.project_.eventBus().subscribe('model', this.onModelChange_, this,
      /* committed */ true);
};

/**
 * Returns the UI controls associated to this metamodel Kind. Controls are
 * rendered only once, so this method can be invoked multiple times with no
 * side effects.
 *
 * @return {*} Either an HTML node or a jQuery object pointing to it,
 *     collecting the UI controls for this Kind user interface.
 */
rhizo.ui.meta.FilterUi.prototype.filterUIControls = function() {
  if (!this.ui_controls_) {
    this.ui_controls_ = this.renderControls();
    this.setFilterValue(
        this.project_.filterManager().getFilterValue(this.metaModelKey_));
  }
  return this.ui_controls_;
};


/**
 * Callback invoked when a filter-related change occurs on the project.
 * If the change pertains to the metamodel Kind this UI manages, transitions
 * the UI to the new state as advertised by the received message.
 *
 * @param {Object} message The message describing the filter change. See
 *     rhizo.meta.FilterManager documentation for the expected message
 *     structure.
 * @private
 */
rhizo.ui.meta.FilterUi.prototype.onFilter_ = function(message) {
  if (!(this.metaModelKey_ in message)) {
    return;  // Not a message directed to us.
  }
  if (this.ui_controls_) {
    this.setFilterValue(message[this.metaModelKey_]);
  }
};

/**
 * Helper function that subclasses should invoke whenever the filtering
 * criteria for the metamodel Kind managed by this UI changes.
 *
 * @param {*} value The new filtering criteria.
 */
rhizo.ui.meta.FilterUi.prototype.doFilter = function(value) {
  var message = {};
  message[this.metaModelKey_] = value;
  this.project_.eventBus().publish(
      'filter', message, /* callback */ null, this);
};

/**
 * Stub method for subclasses to override. Updates the user interface to
 * display a different filtering criteria for the metamodel Kind this class
 * manages.
 *
 * @param {*} value The new filtering criteria.
 */
rhizo.ui.meta.FilterUi.prototype.setFilterValue = function(value) {};

/**
 * Stub method for subclasses to override. Returns the user interface for the
 * metamodel Kind this class manages.
 *
 * @return {*} Either an HTML node or a jQuery object pointing to it,
 *     collecting the UI controls for this metamodel Kind.
 */
rhizo.ui.meta.FilterUi.prototype.renderControls = function() {
  return null;
};

/**
 * Callback invoked when models are added or removed from the visualization.
 * @param {Object} message The message describing the model additions or
 *     removals. See rhizo.model.ModelManager documentation for the expected
 *     message structure.
 * @private
 */
rhizo.ui.meta.FilterUi.prototype.onModelChange_ = function(message) {
  var remove = message['action'] == 'remove';
  this.modelsChanged(remove, message['models'], this.project_.models());
  this.setFilterValue(
      this.project_.filterManager().getFilterValue(this.metaModelKey_));
};

/**
 * Helper function for subclasses to override. Updates the user interface in
 * response to changes in the set of models that are part of the visualization.
 *
 * @param {boolean} remove Whether models have been added or removed.
 * @param {!Array.<!rhizo.model.SuperModel>} deltaModels The list of models that
 *     have changed (added or removed).
 * @param {!Array.<!rhizo.model.SuperModel>} allModels The list of all models
 *     that are currently part of the visualization.
 */
rhizo.ui.meta.FilterUi.prototype.modelsChanged = function(
    remove, deltaModels, allModels) {};


/**
 * User interface class for basic text input.
 *
 * @param {!rhizo.Project} project The visualization project.
 * @param {string} metaModelKey The key identifying the metamodel the user
 *     interface pertains to.
 * @constructor
 * @extends rhizo.ui.meta.FilterUi
 */
rhizo.ui.meta.TextKindUi = function(project, metaModelKey) {
  this.input_ = null;
  rhizo.ui.meta.FilterUi.call(this, project, metaModelKey);
};
rhizo.inherits(rhizo.ui.meta.TextKindUi, rhizo.ui.meta.FilterUi);
rhizo.meta.defaultRegistry.registerKindUi(
    rhizo.meta.Kind.STRING, rhizo.ui.meta.TextKindUi);
rhizo.meta.defaultRegistry.registerKindUi(
    rhizo.meta.Kind.NUMBER, rhizo.ui.meta.TextKindUi);

rhizo.ui.meta.TextKindUi.prototype.renderControls = function() {
  this.input_ = $("<input type='text' />");
  // keypress handling removed due to browser quirks in key detection
  $(this.input_).change(jQuery.proxy(function() {
    this.doFilter($(this.input_).val().length > 0 ? $(this.input_).val() : null);
  }, this));
  return rhizo.ui.meta.labelWrap(this.project_, this.metaModelKey_, this.input_);
};

rhizo.ui.meta.TextKindUi.prototype.setFilterValue = function(value) {
  this.input_.val(value || '');
};


/**
 * User interface for date input.
 *
 * @param {!rhizo.Project} project The visualization project.
 * @param {string} metaModelKey The key identifying the metamodel the user
 *     interface pertains to.
 * @constructor
 * @extends rhizo.ui.meta.FilterUi
 */
rhizo.ui.meta.DateKindUi = function(project, metaModelKey) {
  this.monthMap_ = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul',
    'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  this.year_ = null;
  this.month_ = null;
  this.day_ = null;

  /**
   * A fixed range of selectable years in the year picker. This field is
   * filled only when a fixed year range is specified on the metamodel entry
   * this UI is assigned to. If defined, the year picker will always show the
   * same set of selectable years, no matter what the span of years actually
   * covered by visualization models is.
   *
   * The object has only two keys: 'min' and 'max' for the minimum and maximum
   * acceptable years (inclusive).
   *
   * @type {Object.<string, number>}
   * @private
   */
  this.fixedYearRange_ = null;

  /**
   * The range of selectable years in the year picker, as derived from the
   * span of years covered by the models currently part of the visualization.
   *
   * The object has only two keys: 'min' and 'max' for the minimum and maximum
   * acceptable years (inclusive).
   *
   * @type {Object.<string, number>}
   * @private
   */
  this.yearRange_ = null;
  rhizo.ui.meta.FilterUi.call(this, project, metaModelKey);
};
rhizo.inherits(rhizo.ui.meta.DateKindUi, rhizo.ui.meta.FilterUi);
rhizo.meta.defaultRegistry.registerKindUi(
    rhizo.meta.Kind.DATE, rhizo.ui.meta.DateKindUi);

rhizo.ui.meta.DateKindUi.prototype.renderControls = function() {
  this.extractFixedYearRange_();
  this.year_ = $("<select style='vertical-align:top' />");
  this.updateYearRanges_();

  this.month_ = $("<select style='vertical-align:top' />");
  this.month_.append("<option value='mm'>mm</option>");
  for (i = 0; i < this.monthMap_.length; i++) {
    this.month_.append("<option value='" + i + "'>" +
                       this.monthMap_[i] +
                       "</option>");
  }

  this.day_ = $("<select style='vertical-align:top' />");
  this.day_.append("<option value='dd'>dd</option>");
  for (i = 1 ; i <= 31; i++) {
    this.day_.append("<option value='" + i + "'>" + i + "</option>");
  }
  
  $(this.year_).add($(this.month_)).add($(this.day_)).change(
      jQuery.proxy(function(ev) {
        // When the user explicitly changes the selected year, remove all
        // stale entries that may be consequences of model additions/removals.
        $(this.year_).find('option[disabled="disabled"]').remove();
        var year = $(this.year_).val();
        var month = $(this.month_).val();
        var day = $(this.day_).val();
        if (year == 'yyyy' && month == 'mm' && day == 'dd') {
          this.doFilter(null);
        } else {
          this.doFilter(
              [year != 'yyyy' ? year : undefined,
               month != 'mm' ? month : undefined,
               day != 'dd' ? day : undefined]);
        }
      }, this));

  return rhizo.ui.meta.labelWrap(this.project_, this.metaModelKey_,
    $(this.year_).add($(this.month_)).add($(this.day_)));
};

rhizo.ui.meta.DateKindUi.prototype.setFilterValue = function(value) {
  value = value || [undefined, undefined, undefined];

  $(this.year_).find('option[disabled="disabled"]').remove();
  if (value[0] && (
      !this.yearRange_ || 
      value[0] < this.yearRange_.min || 
      value[0] > this.yearRange_.max)) {
    // The requested year falls outside the available year range. Create a
    // disabled entry to represent it.
    this.createYearOptions_(
        value[0],
        null,
        /* disabled */ true,
        /* prepend */ !this.yearRange_ || value[0] < this.yearRange_.min);
  }

  this.year_.val(value[0] || 'yyyy');
  this.month_.val(value[1] || 'mm');
  this.day_.val(value[2] || 'dd');
};

/**
 * Extracts the range of selectable years to be mandatorily shown in the year
 * picker, if defined in the metamodel entry this UI is assigned to.
 * @private
 */
rhizo.ui.meta.DateKindUi.prototype.extractFixedYearRange_ = function() {
  var metadata = this.project_.metaModel()[this.metaModelKey_];
  if (typeof(metadata.minYear) != 'undefined' && metadata.minYear != null &&
      typeof(metadata.maxYear) != 'undefined' && metadata.maxYear != null) {
    this.fixedYearRange_ = {
        min: parseInt(metadata.minYear, 10),
        max: parseInt(metadata.maxYear, 10)
    };
    this.yearRange_ = this.fixedYearRange_;
  }
};

/**
 * Updates the range of years spanned by the year picker.
 * @private
 */
rhizo.ui.meta.DateKindUi.prototype.updateYearRanges_ = function() {
  this.year_.children().remove();
  this.year_.append("<option value='yyyy'>yyyy</option>");
  if (this.yearRange_) {
    this.createYearOptions_(this.yearRange_.min, this.yearRange_.max);
  }
};

/**
 * Fills the year picker with a set of years.
 * @param {number} minYear The minimum year the picker should contain
 *     (inclusive).
 * @param {number=} opt_maxYear The maximum year the picker should contain
 *     (inclusive), or undefined to add only minYear.
 * @param {boolean=} opt_disabled Whether the added years should be selectable
 *     or not. Defaults to true.
 * @param {boolean=} opt_prepend Whether the added years should be added
 *     at the beginning or at the end of the year picker list.
 * @private
 */
rhizo.ui.meta.DateKindUi.prototype.createYearOptions_ = function(
    minYear, opt_maxYear, opt_disabled, opt_prepend) {
  var maxYear = typeof(opt_maxYear) == 'number' ? opt_maxYear : minYear;
  for (var i = minYear; i <= maxYear; i++) {
    var opt = '<option value="' + i + '" ' +
        (!!opt_disabled ? 'disabled="disabled"' : '' ) +
        '>' + i + '</option>';
    !!opt_prepend ?
        this.year_.children(':first').after(opt) :
        this.year_.append(opt);
  }
};

/**
 * Callback invoked when models are added or removed from the visualization, to
 * compute the set of selectable years in the year picker based on the range of
 * dates spanned by visualization models (unless a fixed year range is
 * specified in the metamodel entry this UI is assigned to).
 *
 * @param {boolean} remove Whether models have been added or removed.
 * @param {!Array.<!rhizo.model.SuperModel>} deltaModels The list of models that
 *     have changed (added or removed).
 * @param {!Array.<!rhizo.model.SuperModel>} allModels The list of all models
 *     that are currently part of the visualization.
 * @override
 */
rhizo.ui.meta.DateKindUi.prototype.modelsChanged = function(
    remove, deltaModels, allModels) {
  if (this.fixedYearRange_) {
    return;
  }
  if (allModels.length == 0) {
    this.yearRange_ = null;
    this.updateYearRanges_();
    return;
  }
  var minYear = Number.POSITIVE_INFINITY, maxYear = Number.NEGATIVE_INFINITY;
  for (var i = allModels.length-1; i >= 0; i--) {
    var modelDate = allModels[i].unwrap()[this.metaModelKey_];
    if (modelDate) {
      minYear = Math.min(minYear, modelDate.getFullYear());
      maxYear = Math.max(maxYear, modelDate.getFullYear());
    }
  }
  this.yearRange_ = {min: minYear, max: maxYear};
  this.updateYearRanges_();
};


/**
 * User interface for numeric range input via a dual-thumb slider.
 *
 * @param {!rhizo.Project} project The visualization project.
 * @param {string} metaModelKey The key identifying the metamodel the user
 *     interface pertains to.
 * @constructor
 * @extends rhizo.ui.meta.FilterUi
 */
rhizo.ui.meta.RangeKindUi = function(project, metaModelKey) {
  this.slider_ = null;
  this.minLabel_ = null;
  this.maxLabel_ = null;

  /**
   * A fixed range of selectable values. This field is filled only when a
   * fixed range is specified in the metamodel entry this UI is assigned to.
   * If defined, the slider will always span the specified range, no matter
   * what the span of values actually covered by the visualization models is.
   *
   *
   * The object has only two keys: 'min' and 'max' for the minimum and maximum
   * range extents (inclusive).
   *
   * @type {Object.<string, number>}
   * @private
   */
  this.fixedRange_ = null;

  /**
   * The range of selectable values, as derived from the set of values spanned
   * by the models currently part of the visualization.
   *
   * The object has only two keys: 'min' and 'max' for the minimum and maximum
   * range extents (inclusive).
   *
   * @type {Object.<string, number>}
   * @private
   */
  this.range_ = null;

  /**
   * As 'range_' but normalized to the filter scale (see toModelScale() and 
   * toFilterScale()).
   *
   * @type {Object.<string, number>}
   * @private
   */
  this.rangeFilterScale_ = null;

  /**
   * The stepping between slider ticks, if specified in the metamodel entry this
   * UI is assigned to.
   * @type {number}
   * @private
   */
  this.stepping_ = null;

  /**
   * The number of fixed steps the slider should enforce, if specified in the
   * metamodel entry this UI is assigned to.
   * @type {number}
   * @private
   */
  this.steps_ = null;
  rhizo.ui.meta.FilterUi.call(this, project, metaModelKey);
};
rhizo.inherits(rhizo.ui.meta.RangeKindUi, rhizo.ui.meta.FilterUi);
rhizo.meta.defaultRegistry.registerKindUi(
    rhizo.meta.Kind.RANGE, rhizo.ui.meta.RangeKindUi);

rhizo.ui.meta.RangeKindUi.prototype.renderControls = function() {
  this.extractMetamodelOptions_();
  this.minLabel_ = $('<span />', {'class': 'rhizo-slider-label'});
  this.maxLabel_ = $('<span />', {'class': 'rhizo-slider-label'});

  this.slider_ = $("<div class='rhizo-slider' />").slider({
    stepping: this.stepping_ ? this.toFilterScale(this.stepping_) : null,
    steps: this.steps_,
    range: true,
    values: [0, 100],
    slide: jQuery.proxy(this.onSlide_, this),
    stop: jQuery.proxy(this.onStopSlide_, this),
    orientation: 'horizontal'
  });
  this.updateRange_();

  return rhizo.ui.meta.labelWrap(this.project_, this.metaModelKey_,
      $(this.minLabel_).
      add($("<span> to </span>")).
      add($(this.maxLabel_)).
      add($(this.slider_)));
};

/**
 * Extracts slider configuration options as defined in the metamodel entry this
 * UI is assigned to. This includes the fixed range of selectable values the
 * slider should span, stepping and steps configuration.
 * @private
 */
rhizo.ui.meta.RangeKindUi.prototype.extractMetamodelOptions_ = function() {
  var metadata = this.project_.metaModel()[this.metaModelKey_];
  if (typeof(metadata.min) != 'undefined' && metadata.min != null &&
      typeof(metadata.max) != 'undefined' && metadata.max != null) {
    this.fixedRange_ = {
        min: parseFloat(metadata.min),
        max: parseFloat(metadata.max)
    };
    this.range_ = this.fixedRange_;
    this.rangeFilterScale_ = {
      min: this.toFilterScale(this.range_.min),
      max: this.toFilterScale(this.range_.max)
    };
  }
  this.stepping_ = metadata.stepping;
  this.steps_ = metadata.steps;
};

/**
 * Updates the slider range.
 * @private
 */
rhizo.ui.meta.RangeKindUi.prototype.updateRange_ = function() {
  this.slider_.slider('option', {
    min: this.rangeFilterScale_ ? this.rangeFilterScale_.min : 0,
    max: this.rangeFilterScale_ ? this.rangeFilterScale_.max : 100
  }).slider(this.rangeFilterScale_ ? 'enable' : 'disable');
};

/**
 * Event callback triggered while the user is moving one of the slider thumbs.
 *
 * @param {*} ev
 * @param {*} ui 
 * @private
 */
rhizo.ui.meta.RangeKindUi.prototype.onSlide_ = function(ev, ui) {
  if (ui.values[0] != this.rangeFilterScale_.min) {
    // min slider has moved
    this.minLabel_.
        text(this.toHumanLabel(this.toModelScale(ui.values[0]))).
        addClass("rhizo-slider-moving");
    this.maxLabel_.removeClass("rhizo-slider-moving");
  }
  if (ui.values[1] != this.rangeFilterScale_.max) {
    // max slider has moved
    this.maxLabel_.
        text(this.toHumanLabel(this.toModelScale(ui.values[1]))).
        addClass("rhizo-slider-moving");
    this.minLabel_.removeClass("rhizo-slider-moving");
  }
};

/**
 * Event callback triggered while the user stops moving one of the slider
 * thumbs.
 *
 * @param {*} ev
 * @param {*} ui 
 * @private
 */
rhizo.ui.meta.RangeKindUi.prototype.onStopSlide_ = function(ev, ui) {
  var minSlide = Math.max(this.toModelScale(ui.values[0]), this.range_.min);
  var maxSlide = Math.min(this.toModelScale(ui.values[1]), this.range_.max);
  this.minLabel_.text(this.toHumanLabel(minSlide)).removeClass(
      "rhizo-slider-moving");
  this.maxLabel_.text(this.toHumanLabel(maxSlide)).removeClass(
      "rhizo-slider-moving");
  if (minSlide != this.range_.min || maxSlide != this.range_.max) {
    this.doFilter({ min: minSlide, max: maxSlide });
  } else {
    this.doFilter(null);
  }
};

/**
 * Callback invoked when models are added or removed from the visualization, to
 * compute the updated slider range based on the range of values spanned by
 * visualization models.
 *
 * @param {boolean} remove Whether models have been added or removed.
 * @param {!Array.<!rhizo.model.SuperModel>} deltaModels The list of models that
 *     have changed (added or removed).
 * @param {!Array.<!rhizo.model.SuperModel>} allModels The list of all models
 *     that are currently part of the visualization.
 * @override
 */
rhizo.ui.meta.RangeKindUi.prototype.modelsChanged = function(
    remove, deltaModels, allModels) {
  if (this.fixedRange_) {
    return;
  }
  if (allModels.length == 0) {
    this.range_ = null;
    this.rangeFilterScale_ = null;
    this.updateRange_();
    return;
  }
  var min = Number.POSITIVE_INFINITY, max = Number.NEGATIVE_INFINITY;
  for (var i = allModels.length-1; i >= 0; i--) {
    var modelValue = parseFloat(allModels[i].unwrap()[this.metaModelKey_]);
    if (!isNaN(modelValue)) {
      min = Math.min(min, modelValue);
      max = Math.max(max, modelValue);
    }
  }
  if (min == Number.POSITIVE_INFINITY || max == Number.NEGATIVE_INFINITY) {
    this.range_ = null;
    this.rangeFilterScale_ = null;
  } else {
    this.range_ = {min: min, max: max};
    this.rangeFilterScale_ = {
      min: this.toFilterScale(this.range_.min),
      max: this.toFilterScale(this.range_.max)
    };
  }
  this.updateRange_();
};

rhizo.ui.meta.RangeKindUi.prototype.setFilterValue = function(value) {
  if (!this.range_) {
    this.minLabel_.add(this.maxLabel_).text('-');
    return;
  }
  value = {
    min: value ? this.clamp_(value.min) : this.range_.min,
    max: value ? this.clamp_(value.max) : this.range_.max
  };
  this.minLabel_.text(this.toHumanLabel(value.min));
  this.maxLabel_.text(this.toHumanLabel(value.max));
  this.slider_.slider(
      'values',
      [this.toFilterScale(value.min), this.toFilterScale(value.max)]);
};

/**
 * Converts a value as returned from the slider into a value in the model range.
 * This method, and the subsequent one, are particularly useful when the range
 * of Model values is not suitable for a slider (which accepts only integer
 * ranges). For example, when dealing with small decimal scales.
 *
 * The default implementation of this method is a no-op. Custom filters
 * extending the range slider should customize this method according to their
 * needs.
 * @param {number} filterValue the value received from the filter.
 */
rhizo.ui.meta.RangeKindUi.prototype.toModelScale = function(filterValue) {
  var kind = this.project_.metaModel()[this.metaModelKey_].kind;
  if (kind.toModelScale) {
    return kind.toModelScale(filterValue);
  }
  return filterValue;
};

/**
 * Converts a value as read from the model into a value in the slider scale.
 * This is the inverse method of the previous one.
 * @param {number} modelValue the value received from the model.
 */
rhizo.ui.meta.RangeKindUi.prototype.toFilterScale = function(modelValue) {
  var kind = this.project_.metaModel()[this.metaModelKey_].kind;
  if (kind.toUserScale) {
    return kind.toUserScale(modelValue);
  }
  return modelValue;
};

/**
 * Converts a numeric value into a human readable form.
 *
 * The default implementation of this method searches for a custom formatting
 * function looking up the 'toHumanLabel' property on the metamodel entry this
 * Kind instance is assigned to.
 *
 * Custom filters extending the range slider should customize this method
 * according to their needs. rhizo.ui.toHumanLabel() is a useful helper in this
 * case.
 *
 * @param {number} modelValue the value to be converted
 */
rhizo.ui.meta.RangeKindUi.prototype.toHumanLabel = function(modelValue) {
  var metamodelEntry = this.project_.metaModel()[this.metaModelKey_];
  if (typeof(metamodelEntry['toHumanLabel']) == 'function') {
    return metamodelEntry['toHumanLabel'].call(metamodelEntry, modelValue);
  }
  return modelValue;
};

/**
 * Clamps the given value between the minimum and maximum range limits.
 * @param {number} val The value to clamp.
 * @private
 */
rhizo.ui.meta.RangeKindUi.prototype.clamp_ = function(val) {
  return Math.max(this.range_.min, Math.min(this.range_.max, val));
};


/**
 * User interface to collect boolean inputs.
 *
 * @param {!rhizo.Project} project The visualization project.
 * @param {string} metaModelKey The key identifying the metamodel the user
 *     interface pertains to.
 * @constructor
 * @extends rhizo.ui.meta.FilterUi
 */
rhizo.ui.meta.BooleanKindUi = function(project, metaModelKey) {
  this.check_ = null;
  rhizo.ui.meta.FilterUi.call(this, project, metaModelKey);
};
rhizo.inherits(rhizo.ui.meta.BooleanKindUi, rhizo.ui.meta.FilterUi);
rhizo.meta.defaultRegistry.registerKindUi(
    rhizo.meta.Kind.BOOLEAN, rhizo.ui.meta.BooleanKindUi);

rhizo.ui.meta.BooleanKindUi.prototype.renderControls = function() {
  this.check_ = $("<select />");
  this.check_.append("<option value=''>-</option>");
  this.check_.append("<option value='true'>Yes</option>");
  this.check_.append("<option value='false'>No</option>");

  $(this.check_).change(jQuery.proxy(function() {
    this.doFilter(
        $(this.check_).val().length > 0 ?
            ($(this.check_).val() == 'true') :
            null);
  }, this));
  return rhizo.ui.meta.labelWrap(this.project_, this.metaModelKey_, this.check_);
};

rhizo.ui.meta.BooleanKindUi.prototype.setFilterValue = function(value) {
  this.check_.val(value == null ? '' : (value ? 'true' : 'false'));
};


/**
 * User interface for single or multiple selection among a finite set of
 * categories.
 *
 * @param {!rhizo.Project} project The visualization project.
 * @param {string} metaModelKey The key identifying the metamodel the user
 *     interface pertains to.
 * @constructor
 * @extends rhizo.ui.meta.FilterUi
 */
rhizo.ui.meta.CategoryKindUi = function(project, metaModelKey) {
  this.categoryPicker_ = null;

  /**
   * Whether multiple choice is allowed or not.
   * @type {boolean}
   * @private
   */
  this.multiple_ = false;

  /**
   * A fixed list of categories for the category picker. This field is
   * filled only when categories are explicitly specified on the
   * metamodel entry this UI is assigned to. If defined, the category picker
   * will always show the same set of categories to choose from.
   *
   * @type {Array.<string>}
   * @private
   */
  this.fixedCategories_ = null;

  /**
   * The set of categories for the category picker, as derived from the
   * set of unique categories found in the models currently part of the
   * visualization.
   *
   * @type {!Object.<string, boolean>}
   * @private
   */
  this.categories_ = {};
  rhizo.ui.meta.FilterUi.call(this, project, metaModelKey);
};
rhizo.inherits(rhizo.ui.meta.CategoryKindUi, rhizo.ui.meta.FilterUi);
rhizo.meta.defaultRegistry.registerKindUi(
    rhizo.meta.Kind.CATEGORY, rhizo.ui.meta.CategoryKindUi);

rhizo.ui.meta.CategoryKindUi.prototype.renderControls = function() {
  this.extractMetamodelOptions_();
  this.categoryPicker_ = $(
      "<select " + (this.multiple_ ? 'multiple size="4" ' : '') +
      " style='vertical-align:top' />");
  this.updateCategories_();

  $(this.categoryPicker_).change(jQuery.proxy(function(ev) {
    // When the user explicitly changes the selected year, remove all
    // stale entries that may be consequences of model additions/removals.
    $(this.categoryPicker_).find('option[disabled="disabled"]').remove();
    var selectedCategories = [];
    if (this.multiple_) {
      selectedCategories = $.grep($(this.categoryPicker_).val(),
          function(category) {
        return category != '';
      });
    } else if ($(this.categoryPicker_).val().length > 0) {
      selectedCategories = [ $(this.categoryPicker_).val() ];
    }
    if (selectedCategories.length == 0) {
      selectedCategories = null;
    }
    this.doFilter(selectedCategories);
  }, this));
  return rhizo.ui.meta.labelWrap(
      this.project_, this.metaModelKey_, this.categoryPicker_);
};

/**
 * Extracts configuration options as defined in the metamodel entry this
 * UI is assigned to. This includes the fixed range of selectable categories
 * the picker should contain and where multiple selection is allowed or not.
 * @private
 */
rhizo.ui.meta.CategoryKindUi.prototype.extractMetamodelOptions_ = function() {
  var metadata = this.project_.metaModel()[this.metaModelKey_];
  this.fixedCategories_ = metadata['categories'] || null;
  if (this.fixedCategories_) {
    for (var i = this.fixedCategories_.length-1; i >= 0; i--) {
      this.categories_[this.fixedCategories_[i]] = true;
    }
  }
  this.multiple_ = !!metadata['multiple']
};

/**
 * Updates the set of categories the picker allows to choose from.
 * @private
 */
rhizo.ui.meta.CategoryKindUi.prototype.updateCategories_ = function() {
  this.categoryPicker_.children().remove();
  this.categoryPicker_.append("<option value=''>-</option>");

  var sortedCategories = [];
  for (var category in this.categories_) {
    sortedCategories.push(category);
  }
  sortedCategories.sort();
  for (var i = 0; i < sortedCategories.length; i++) {
    this.categoryPicker_.append(
        "<option value='" + sortedCategories[i] + "'>" +
        sortedCategories[i] + "</option>");
  }
};

rhizo.ui.meta.CategoryKindUi.prototype.setFilterValue = function(value) {
  this.categoryPicker_.find('option[disabled="disabled"]').remove();
  if (value) {
    var categories = $.isArray(value) ? value : [value];
    for (var i = categories.length-1; i >= 0; i--) {
      if (!(categories[i] in this.categories_)) {
        this.categoryPicker_.append(
            "<option value='" + categories[i] + "' disabled='disabled'>" +
            categories[i] + "</option>");
      }
    }
  }
  // val() accepts both a single string and an array.
  this.categoryPicker_.val(value || (this.multiple_ ? [] : ''));
};

/**
 * Callback invoked when models are added or removed from the visualization, to
 * compute the updated set of categories based on the range of values spanned
 * by visualization models.
 *
 * @param {boolean} remove Whether models have been added or removed.
 * @param {!Array.<!rhizo.model.SuperModel>} deltaModels The list of models that
 *     have changed (added or removed).
 * @param {!Array.<!rhizo.model.SuperModel>} allModels The list of all models
 *     that are currently part of the visualization.
 * @override
 */
rhizo.ui.meta.CategoryKindUi.prototype.modelsChanged = function(
    remove, deltaModels, allModels) {
  if (this.fixedCategories_) {
    return;
  }

  this.categories_ = {};
  if (allModels.length == 0) {
    this.updateCategories_();
    return;
  }
  for (var i = allModels.length-1; i >= 0; i--) {
    var modelCategories = allModels[i].unwrap()[this.metaModelKey_];
    if (!modelCategories) { continue; }
    if (!$.isArray(modelCategories)) { modelCategories = [ modelCategories ]; }
    for (var j = modelCategories.length-1; j >= 0; j--) {
      this.categories_[modelCategories[j]] = true;
    }
  }
  this.updateCategories_();
};
/* ./src/js/rhizo.model.js */
/**
  @license
  Copyright 2008 The Rhizosphere Authors. All Rights Reserved.

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

// RHIZODEP=rhizo.ui
namespace("rhizo.model");

/**
 * Wraps a 'naked' model with additional functionalities and goodness required
 * by Rhizosphere to manage it.
 *
 * @param {*} model The model to wrap.
 * @constructor
 */
rhizo.model.SuperModel = function(model) {
  this.model = model;
  this.id = model.id;
  this.filters_ = {}; // a map of filter status, one for each model key
  this.rendering_ = null;
  this.selected_ = false;
  this.pinned_ = false;
};

/**
 * @param {rhizo.ui.Rendering} rendering
 */
rhizo.model.SuperModel.prototype.setRendering = function(rendering) {
  this.rendering_ = rendering;
};

/**
 * @return {rhizo.ui.Rendering}
 */
rhizo.model.SuperModel.prototype.rendering = function() {
  return this.rendering_;
};

/**
 * @return {*} the naked model wrapped by this SuperModel.
 */
rhizo.model.SuperModel.prototype.unwrap = function() {
  return this.model;
};

/**
 * Destroys any expensive resources attached to this model, making it ready
 * for disposal and removal from the visualization.
 */
rhizo.model.SuperModel.prototype.destroy = function() {
  if (this.rendering_) {
    this.rendering_.destroy();
    this.rendering_ = null;
  }
};

/**
 * Returns whether the visibility and filtering status of this model are out
 * of sync (for example, the model is not filtered but still is not visible
 * in the visualization).
 *
 * @return {boolean} Whether the visibility and filtering status of this model
 *     are out of sync.
 */
rhizo.model.SuperModel.prototype.isDirtyVisibility = function() {
  return !this.isFiltered() && (
      this.rendering_ == null ||
      this.rendering_.visibility == rhizo.ui.Visibility.HIDDEN);
};

/**
 * @return {boolean} Whether this model participates in layout operations.
 *     A model won't respond to layouts if it's filtered or pinned.
 */
rhizo.model.SuperModel.prototype.isAvailableForLayout = function() {
  return !this.isFiltered() && !this.isPinned();
};

/**
 * Sets the selection status for this model. Propagates to its rendering.
 * @param {boolean} selected
 */
rhizo.model.SuperModel.prototype.setSelected = function(selected) {
  this.selected_ = !!selected;
  this.rendering_.setSelected(this.selected_);
};

/**
 * Pins the model. The model rendering will remain at a fixed position in
 * the visualization universe and won't respond to layout operations. Users
 * can still move the model by manually dragging it.
 */
rhizo.model.SuperModel.prototype.pin = function() {
  this.pinned_ = true;
};

/**
 * Unpins the model.
 */
rhizo.model.SuperModel.prototype.unpin = function() {
  this.pinned_ = false;
};

/**
 * @return {boolean} Whether the model is pinned or not.
 */
rhizo.model.SuperModel.prototype.isPinned = function() {
  return this.pinned_;
};

rhizo.model.SuperModel.prototype.toString = function() {
  return this.model.toString();
};

/**
 * Checks whether this model is filtered out from the visualization.
 *
 * @param {string=} opt_key An optional filtering key. If present, the method
 *     will check only whether the model is filtered on the given key. If
 *     missing, the method will check if the model is filtered according to
 *     any key.
 * @return {boolean} Whether this model is filtered out from the visualization
 *     or not.
 */
rhizo.model.SuperModel.prototype.isFiltered = function(opt_key) {
  if (opt_key) {
    return this.filters_[opt_key] || false;
  } else {
    for (var key in this.filters_) {
      return true;
    }
    return false;
  }
};

/**
 * Applies the given filter to this model.
 * @param {string} key The key of the filter to add.
 * @return {boolean} Whether the filter did not exist on this model (and was
 *     therefore added) or was already there (no-op).
 */
rhizo.model.SuperModel.prototype.filter = function(key) {
  if (key in this.filters_) {
    return false;
  } else {
    this.filters_[key] = true;
    return true;
  }
};

/**
 * Removes the given filter from this model.
 * @param {string} key The key of the filter to remove.
 * @return {boolean} Whether the filter existed on this model (and was
 *     therefore removed) or not.
 */
rhizo.model.SuperModel.prototype.resetFilter = function(key) {
  if (key in this.filters_) {
    delete this.filters_[key];
    return true;
  } else {
    return false;
  }
};

/**
 * Notifies the supermodel that the underlying naked model has changed, forcing
 * it to update the rendering.
 */
rhizo.model.SuperModel.prototype.modelChanged = function() {
  this.rendering_.modelChanged();
};

/* ./src/js/rhizo.meta.manager.js */
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
 * @fileOverview Classes that oversee Rhizosphere filter management.
 * @author Riccardo Govoni (battlehorse@google.com)
 */

//RHIZODEP=rhizo,rhizo.ui
namespace('rhizo.meta');


/**
 * A FilterManager is responsible for filtering Rhizosphere models within a
 * given project.
 *
 * Filter operations are triggered by publishing messages on the 'filter'
 * channel of the project event bus. The messages are expected in the following
 * format:
 *
 * message = {
 *   metaModelKey1: filterValue1,
 *   metaModelKey2: filterValue2,
 *   ...
 *   metaModelKeyN: null,
 *   ...
 * };
 *
 * Each message can contain one or more key. Each key should match with the name
 * of a model attribute (i.e. be a valid key within the project metaModel).
 *
 * If the key points to a non-null value, the value is expected to be the filter
 * value and every model not matching the value will be filtered. The format of
 * filter values is filter-dependent. Refer to the documentation for each filter
 * kind in rhizo.meta.js for further info.
 *
 * If the key points to a null value, any filter possibly present on the given
 * key will be removed and all the models that were filtered on such key will
 * revert to their unfiltered status.
 *
 * @param {!rhizo.Project} project The project this filter manager applies to.
 * @constructor
 */
rhizo.meta.FilterManager = function(project) {
  /**
   * The set of filters currently applied to the project. Maps metaModel keys to
   * filter values.
   *
   * @type {!Object.<string, *>}
   * @private
   */
  this.filters_ = {};

  /**
   * Whether filters are automatically committed or not. When autoCommit is
   * false, applying a filter will only result in dimming out the filtered
   * models (instead of removing them altogether from the viewport). A 'commit'
   * operation must follow to confirm the operation and remove (hide) the
   * filtered models from the visualization viewport.
   * @type {boolean}
   * @private
   */
  this.filterAutocommit_ = true;

  /**
   * @type {!rhizo.Project}
   * @private
   */
  this.project_ = project;

  this.project_.eventBus().addPreprocessor(
      'filter', this.onBeforeFilter_, this, /* first */ true);
  this.project_.eventBus().subscribe('filter', this.onFilter_, this);
};

/**
 * Returns the set of filters currently applied to the project. Maps metaModel
 * keys to filter values.
 *
 * @return {!Object.<string, *>} The set of filters currently applied to the
 *     project. Maps metaModel keys to filter values.
 */
rhizo.meta.FilterManager.prototype.getFilters = function() {
  return $.extend({}, this.filters_);
};

/**
 * Returns the filter value for a given filter, or null if the filter is not
 * currently applied to the project.
 *
 * @param {string} metaModelKey The metaModel key for which the filter value is
 *     queried.
 * @return {?*} The filter value, or null if the filter is not currently applied
 *     to the project.
 */
rhizo.meta.FilterManager.prototype.getFilterValue = function(metaModelKey) {
  return this.filters_[metaModelKey] || null;
};

/**
 * Enables or disables filter autocommit.
 *
 * If autocommit is true, any filter operation wil immediately hide filtered
 * models from the visualization viewport. If autocommit is false, any filter
 * operation will only dim the filtered models (leaving them visible in the
 * visualization viewport). A subsequent commit, either explicit via
 * commitFilter() or implicit, is required to hide the filtered models.
 *
 * @param {boolean} enable Whether to enable or disable filter autocommit.
 */
rhizo.meta.FilterManager.prototype.enableFilterAutocommit = function(enable) {
  this.filterAutocommit_ = enable;
  if (this.filterAutocommit_) {
    // If there are any greyed models when auto-filtering is re-enabled, we
    // commit the filter.
    var models = this.project_.models();
    for (var i = models.length-1; i >= 0; i--) {
      if (models[i].rendering().visibility == rhizo.ui.Visibility.GREY) {
        this.commitFilter();
        break;
      }
    }
  }
};

/**
 * Returns whether the filter manager is operating in autocommit mode or not.
 *
 * @return {boolean} whether the filter manager is operating in autocommit mode
 *     or not.
 */
rhizo.meta.FilterManager.prototype.isFilterAutocommit = function() {
  return this.filterAutocommit_;
};

/**
 * Commits the current set of filters. No-op if the filter manager is operating
 * in autocommit mode.
 */
rhizo.meta.FilterManager.prototype.commitFilter = function() {
  this.project_.layoutManager().forceLayout({filter: true});
};

/**
 * Computes the set of filters to apply (or remove) to transition from the
 * current set of filters to a target set of filters (which may be the empty
 * set to imply the removal of all existing filters).
 *
 * @param {Object.<stirng, *>} The target set of filters.
 * @return {!Object.<string, *>} The set of filters to apply or remove to
 *     transition from the current set of filters to the desired target set.
 */
rhizo.meta.FilterManager.prototype.filterDiff = function(targetFilters) {
  var transitionFilters = $.extend({}, targetFilters);
  for (var metaModelKey in this.filters_) {
    if (!(metaModelKey in transitionFilters)) {
      transitionFilters[metaModelKey] = null;
    }
  }
  return transitionFilters;
};

/**
 * Removes the given filter from all models.
 * @param {string} metaModelKey The metamodel key of the filter to remove.
 * @return {boolean} Whether the filter existed on at least one of the models.
 */
rhizo.meta.FilterManager.prototype.removeFilterFromModels = function(
    metaModelKey) {
  var models = this.project_.models();
  var modelsAffected = false;
  for (var i = models.length-1; i >= 0; i--) {
    modelsAffected = models[i].resetFilter(metaModelKey) || modelsAffected;
  }
  return modelsAffected;
};

/**
 * Updates the set of filters defined on a single model to match all the filters
 * currently in operation on the visualization.
 *
 * @param {!rhizo.model.SuperModel} model The model to update.
 * @return {boolean} Whether the model filtering status changed because of this
 *     operation or not.
 */
rhizo.meta.FilterManager.prototype.applyAllFiltersToModel = function(model) {
  var modelChanged = false;
  for (var metaModelKey in this.filters_) {
    modelChanged = this.filterModelOnKey_(
        metaModelKey, this.filters_[metaModelKey], model) || modelChanged;
  }
  return modelChanged;
};

/**
 * Refreshes models' visibility based on their filtering status.
 *
 * @param {rhizo.ui.Visibility?} opt_filtered_visibility An optional visibility
 *     level that filtered items should have. The default is
 *     rhizo.ui.Visibility.HIDDEN.
 */
rhizo.meta.FilterManager.prototype.alignVisibility = function(
    opt_filtered_visibility) {
  this.project_.logger().time('FilterManager::alignVisibility');
  var vis = rhizo.ui.Visibility;
  var filtered_visibility = opt_filtered_visibility || vis.HIDDEN;

  var forceLayout = false;
  var modelsToFadeOut = [];
  var modelsToFadeIn = [];
  var models = this.project_.models();
  for (var i = models.length-1; i >= 0; i--) {
    var model = models[i];
    var rendering = model.rendering();
    if (model.isFiltered()) {
      if (rendering.visibility > filtered_visibility) {
        modelsToFadeOut.push(model);
        rendering.visibility = filtered_visibility;
      }
    } else if (rendering.visibility < vis.VISIBLE) {
      // Items that were completely hidden must be repositioned.
      forceLayout = forceLayout || rendering.visibility == vis.HIDDEN;
      modelsToFadeIn.push(model);
      rendering.visibility = vis.VISIBLE;
    }
  }

  // When native panning is used, the extent of the viewport scrollbars is
  // measured based on the models actual positions, even if they are hidden.
  // In this case we have to forcefully move them to the viewport origin for
  // the scrollbars to have the correct length.
  var repositionToOrigin =
      this.project_.options().panningMode() == 'native' &&
      filtered_visibility == vis.HIDDEN;

  rhizo.ui.fadeAllRenderingsTo(
      modelsToFadeOut, filtered_visibility, repositionToOrigin);
  rhizo.ui.fadeAllRenderingsTo(modelsToFadeIn, vis.VISIBLE);
  this.project_.logger().timeEnd('FilterManager::alignVisibility');
  this.project_.logger().debug(
      (modelsToFadeOut.length + modelsToFadeIn.length) +
      ' models changed visibility');
  this.project_.logger().debug('Dirty layout after alignVisibility');
  return forceLayout;
};

/**
 * Preprocessing callback invoked whenever a message is published on the
 * 'filter' channel.
 *
 * @param {!Object} message The published message.
 * @param {!function(boolean, string=)} rspCallback Callback to invoke with the
 *     preprocessing outcome.
 * @private
 */
rhizo.meta.FilterManager.prototype.onBeforeFilter_ = function(
    message, rspCallback) {
  for (var metaModelKey in message) {
    if (!(metaModelKey in this.project_.metaModel())) {
      // This may occur whenever we are applying a filter loaded from an
      // historical state, but which no longer exists in the current
      // visualization.
      delete message[metaModelKey];
    }
  }
  rspCallback(true);
};

/**
 * Callback invoked when a filter request is published on the 'filter' channel.
 * @param {!Object} message The published message.
 * @private
 */
rhizo.meta.FilterManager.prototype.onFilter_ = function(message) {
  this.project_.logger().time('FilterManager::onFilter');
  var modelsChange = false;
  for (var metaModelKey in message) {
    var filterValue = message[metaModelKey];
    if (filterValue !== null && filterValue !== undefined) {
      // valid filter
      modelsChange = 
          this.filterAllModelsOnKey_(metaModelKey, filterValue) ||
          modelsChange;
    } else {
      // reset filter
      modelsChange =
          this.resetAllModelsOnKey_(metaModelKey) || modelsChange;
    }
  }

  if (modelsChange) {
    // An fx alignment must occur _before_ the visibility change if a large
    // number of models is becoming visible (moving from enabled to
    // disabled animations), otherwise the visibility flip might be slow.
    this.project_.alignFx();
    if (this.mustLayoutAfterFilter_()) {
      this.commitFilter();
    } else {
      this.alignVisibility(rhizo.ui.Visibility.GREY);
    }
    // An fx alignment must occur _after_ the visibility change if a large
    // number of models became hidden (moving from disabled to enabled
    // animtations), otherwise animations would remain unnecessarily disabled.
    this.project_.alignFx();
  }
  this.project_.logger().timeEnd('FilterManager::onFilter');
};

/**
 * Filters all models for the specified value on a single metaModel key.
 * @param {string} metaModelKey The metaModel key to affect.
 * @param {*} filterValue The value to filter against.
 * @return {boolean} Whether any model changed its filtered status because of
 *     the new filter being applied.
 * @private
 */
rhizo.meta.FilterManager.prototype.filterAllModelsOnKey_ = function(
    metaModelKey, filterValue) {
  this.filters_[metaModelKey] = filterValue;

  var modelsChange = false;
  var models = this.project_.models();
  for (var i = models.length-1; i >= 0; i--) {
    modelsChange =
        this.filterModelOnKey_(
            metaModelKey, filterValue, models[i]) || modelsChange;
  }
  return modelsChange;
};

/**
 * Filters a single model for the specified value on a single metaModel key.
 * @param {string} metaModelKey The metaModel key to affect.
 * @param {*} filterValue The value to filter against.
 * @param {!rhizo.model.SuperModel} model The model to filter.
 * @return {boolean} Whether the model changed its filtered status because of
 *     the new filter being applied.
 * @private
 */
rhizo.meta.FilterManager.prototype.filterModelOnKey_ = function(
    metaModelKey, filterValue, model) {
  if (this.project_.metaModel()[metaModelKey].kind.survivesFilter(
      filterValue, model.unwrap()[metaModelKey])) {
    // matches filter. Doesn't have to be hidden
    return model.resetFilter(metaModelKey);
  } else {
    // does not match filter. Must be hidden
    return model.filter(metaModelKey);
  }
};

/**
 * Removes any filtering on the given metaModel key from all models.
 * @param {string} metaModelKey The metaModel key to affect.
 * @return {boolean} Whether the filter existed on at least one of the models
 * @private
 */
rhizo.meta.FilterManager.prototype.resetAllModelsOnKey_ = function(
    metaModelKey) {
  delete this.filters_[metaModelKey];
  return this.removeFilterFromModels(metaModelKey);
};

/**
 * Decides whether models should be repositioned after a filter was applied.
 * This may be necessary either because the filters are in autocommit mode, or
 * because the filter change caused some models that were completely hidden
 * to become visible (hence all the models must be repositioned to accomodate
 * these ones).
 *
 * @return {boolean} Whether models should be repositioned after a filter was
 *     applied, or it's enough to align their visibility.
 * @private
 */
rhizo.meta.FilterManager.prototype.mustLayoutAfterFilter_ = function() {
  if (this.filterAutocommit_) {
    return true;
  }
  var models = this.project_.models();
  for (var i = models.length-1; i >= 0; i--) {
    if (models[i].isDirtyVisibility()) {
      return true;
    }
  }
  return false;
};
/* ./src/js/extra/rhizo.meta.extra.js */
/**
  @license
  Copyright 2008 The Rhizosphere Authors. All Rights Reserved.

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
 * @fileOverview Definition of additional Rhizosphere metamodel Kinds that
 * address specialized needs and may be excluded from main distribution if
 * not needed. Users needing them should be able to include them in their own
 * visualization by just including this js file in addition to the rest of the
 * Rhizosphere javascript payload.
 */

// RHIZODEP=rhizo,rhizo.meta
namespace('rhizo.meta');


// Extends the Kind enum to include keys for the extra filters.
rhizo.meta.Kind = rhizo.meta.Kind || {};
rhizo.meta.Kind.DECIMAL = 'decimal';
rhizo.meta.Kind.DECIMALRANGE = 'decimalRange';
rhizo.meta.Kind.LOGARITHMRANGE = 'logarithmRange';
rhizo.meta.Kind.STRINGARRAY = 'stringArray';


/**
 * An extensions of the basic number type to handle decimal (floating point)
 * numbers.
 * @param {Object} metamodelEntry The metamodel entry this decimal type is
 *     assigned to. The metamodel entry can be enriched with an additional
 *     'precision' property to customize the precision (in terms of decimal
 *     digits after the floating point) to use when parsing and clustering
 *     decimal numbers. Users of this filter are strongly encouraged to
 *     customize this setting on a per-field basis.
 * @constructor
 */
rhizo.meta.DecimalKind = function(metamodelEntry) {
  this.precision_ = typeof(metamodelEntry['precision']) == 'number' ?
      metamodelEntry['precision'] : 2;
};
rhizo.meta.defaultRegistry.registerKind(
    rhizo.meta.Kind.DECIMAL, rhizo.meta.DecimalKind);

rhizo.meta.DecimalKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  var filterValueFloat = parseFloat(filterValue);
  if (isNaN(filterValueFloat)) {
    return true; // invalid numbers shouldn't filter anything
  } else {
    return filterValueFloat.toFixed(this.precision_) ==
           modelValue.toFixed(this.precision_);
  }
};

rhizo.meta.DecimalKind.prototype.compare = function(firstValue, secondValue) {
  return parseFloat(firstValue) - parseFloat(secondValue);
};

rhizo.meta.DecimalKind.prototype.cluster = function(modelValue) {
  var fModelValue = parseFloat(modelValue.toFixed(this.precision_));

  // cluster at one order of magnitude less than current scale
  var order = rhizo.util.orderOfMagnitude(fModelValue);
  if (isNaN(order)) {
    return { key: 0,
             label: new Number(0).toFixed(this.precision_) };
  }

  var lowRange = Math.pow(10, order);
  var hiRange = Math.pow(10, order + 1);
  return { key: lowRange,
           label: rhizo.ui.toHumanLabel(lowRange) + " - " +
                  rhizo.ui.toHumanLabel(hiRange) };
};

rhizo.meta.DecimalKind.prototype.isNumeric = function() {
  return true;
};


/**
 * An extension of the basic range type to handle ranges of decimal values.
 *
 * @param {Object} metamodelEntry The metamodel entry this decimal type is
 *     assigned to. The metamodel entry can be enriched with an additional
 *     'precision' property to customize the precision (in terms of decimal
 *     digits after the floating point) to use when parsing and clustering
 *     decimal numbers. Users of this filter are strongly encouraged to
 *     customize this setting on a per-field basis.
 * @constructor
 */
rhizo.meta.DecimalRangeKind = function(metamodelEntry) {
  this.precision_ = typeof(metamodelEntry['precision']) == 'number' ?
      metamodelEntry['precision'] : 2;
  this.scale_ = Math.pow(10, this.precision_);
};
rhizo.meta.defaultRegistry.registerKind(
    rhizo.meta.Kind.DECIMALRANGE, rhizo.meta.DecimalRangeKind);

rhizo.meta.DecimalRangeKind.prototype.survivesFilter = function(filterValue,
                                                                modelValue) {
  return modelValue >= filterValue.min && modelValue <= filterValue.max;
};

rhizo.meta.DecimalRangeKind.prototype.compare =
    rhizo.meta.DecimalKind.prototype.compare;

rhizo.meta.DecimalRangeKind.prototype.cluster =
    rhizo.meta.DecimalKind.prototype.cluster;

rhizo.meta.DecimalRangeKind.prototype.isNumeric =
    rhizo.meta.DecimalKind.prototype.isNumeric;

rhizo.meta.DecimalRangeKind.prototype.toModelScale = function(userValue) {
  // toFixed() returns a string, hence the need to parseFloat()
  return parseFloat((userValue / this.scale_).toFixed(this.precision_));
};

rhizo.meta.DecimalRangeKind.prototype.toUserScale = function(modelValue) {
  return Math.round(modelValue * this.scale_);
};


/**
 * An extension of the basic range type to handle ranges of decimal values,
 * specialized for operating over decimal ranges of values using a logarithmic
 * scale.
 *
 * @param {Object} metamodelEntry The metamodel entry this logarithm type is
 *     assigned to. The metamodel entry can be enriched with an additional set
 *     of properties:
 *     - 'precision': defines the precision (in terms of decimal digits after
 *       the floating point) to use when parsing and clustering decimal
 *       numbers. Users of this filter are strongly encouraged to customize
 *       this setting on a per-field basis.
 *     - 'oneplus': If true, then the transformation applied to convert between
 *       user and model scale will be Log10(1+x) rather than Log10(x) (useful
 *       if your dataset has values that start from 0).
 * @constructor
 */
rhizo.meta.LogarithmRangeKind = function(metamodelEntry) {
  this.precision_ = typeof(metamodelEntry['precision']) == 'number' ?
      metamodelEntry['precision'] : 2;
  this.scale_ = Math.pow(10, this.precision_);
  this.oneplus_ = !!metamodelEntry['oneplus'];
};
rhizo.meta.defaultRegistry.registerKind(
    rhizo.meta.Kind.LOGARITHMRANGE, rhizo.meta.LogarithmRangeKind);

rhizo.meta.LogarithmRangeKind.prototype.survivesFilter = function(filterValue,
                                                                  modelValue) {
  return modelValue >= filterValue.min && modelValue <= filterValue.max;
};

rhizo.meta.LogarithmRangeKind.prototype.compare =
    rhizo.meta.DecimalKind.prototype.compare;

rhizo.meta.LogarithmRangeKind.prototype.cluster =
    rhizo.meta.DecimalKind.prototype.cluster;

rhizo.meta.LogarithmRangeKind.prototype.isNumeric =
    rhizo.meta.DecimalKind.prototype.isNumeric;

rhizo.meta.LogarithmRangeKind.prototype.toModelScale = function(userValue) {
  // toFixed() returns a string, hence the need to parseFloat()
  var delta = this.oneplus_ ? -1 : 0;
  return parseFloat(
    Math.pow(10, userValue / this.scale_).toFixed(this.precision_)) +  delta;
};

rhizo.meta.LogarithmRangeKind.prototype.toUserScale = function(modelValue) {
  modelValue = this.oneplus_ ? modelValue+1 : modelValue;
  return Math.round(rhizo.util.log10_(modelValue) * this.scale_);
};


/**
 * A metamodel Kind that behaves exactly like a String kind but expects the
 * model to be an array of strings, instead of just a single one.
 *
 * TODO(battlehorse): This is still very temporary, since a) it doesn't support
 * clustering and b) it could be made a lot more generic (create array filters
 * out of normal filters by wrapping them).
 *
 * @constructor
 */
rhizo.meta.StringArrayKind = function() {};
rhizo.meta.defaultRegistry.registerKind(
    rhizo.meta.Kind.STRINGARRAY, rhizo.meta.StringArrayKind);

rhizo.meta.StringArrayKind.prototype.survivesFilter =
    function(filterValue, modelValue) {
  if (filterValue != '') {
    for (var i=0; i<modelValue.length;i++) {
      if (modelValue[i].toLowerCase().indexOf(
          filterValue.toLowerCase()) != -1) {
        return true;
      }
    }
  }
  return false;
};

rhizo.meta.StringArrayKind.prototype.cluster = function(modelValue) {
  return { key: "undefined",
           label: "Clustering unsupported for this datatype." };
};

rhizo.meta.StringArrayKind.prototype.isNumeric = function() {
  return false;
};
/* ./src/js/rhizo.layout.shared.js */
/**
  @license
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
 * Shared components and utilities used by more than one layout engine.
 */

// RHIZODEP=rhizo.log,rhizo.meta
namespace("rhizo.layout");


/**
 * Returns the first key of the project metamodel, optionally satisfying a
 * required constraint.
 * @param {rhizo.Project} project
 * @param {function(string, Object):boolean} opt_matcher Optional function to
 *     decide whether to the given metaModel key is acceptable or not.
 *     Receives as parametes the key itself and the associated metamodel entry.
 * @return {string} The metamodel key, or null if no acceptable key could be
 *     found.
 */
rhizo.layout.firstMetamodelKey = function(project, opt_matcher) {
  for (var key in project.metaModel()) {
    if (!opt_matcher || opt_matcher(key, project.metaModel()[key])) {
      return key;
    }
  }
  return null;
};


/**
 * A function that composes together multiple other matchers OR-wise. Matches
 * metamodel keys that satisfy any of the matchers passed as arguments.
 *
 * @param {...function(string, *):boolean} var_args two or more matchers to
 *     assemble together into a single one.
 * @return {function(string, *):boolean} The composed matcher.
 */
rhizo.layout.orMatcher = function(var_args) {
  var matchers = Array.prototype.slice.call(arguments);
  return function(key, meta) {
    for (var i = 0; i < matchers.length; i++) {
      if (matchers[i](key, meta)) {
        return true;
      }
    }
    return false;
  };
};


/**
 * A function that matches metamodel keys that establish links to other models,
 * for example to define parent-child relationships by having a key whose value
 * points to the parent model of a given one).
 * @param {string} key The key to check.
 * @param {*} meta The metamodel entry associated to this key.
 * @return {boolean} Whether the given metamodel key establish links to other
 *     models.
 */
rhizo.layout.linkMatcher = function(key, meta) {
  return !!meta.isLink;
};


/**
 * A function that matches metamodel keys that identify hierarchical
 * categorizations.
 *
 * @param {string} key The key to check.
 * @param {*} meta The metamodel entry associated to this key.
 * @return {boolean} Whether the given metamodel key identifies a hierarchical
 *     categorization.
 */
rhizo.layout.hierarchyMatcher = function(key, meta) {
  return meta.kind instanceof rhizo.meta.CategoryKind && !!meta.isHierarchy;
};


/**
 * A function that matches metamodel keys that identify numeric model
 * attributes.
 * @param {string} key The key to check.
 * @param {*} meta The metamodel entry associated to this key.
 * @return {boolean} Whether the given metamodel key identifies numeric model
 *     attributes.
 */
rhizo.layout.numericMatcher = function(key, meta) {
  return meta.kind.isNumeric();
};


/**
 * Defines the bounding rectangle inside which models' layout should occur.
 * The bounding rectangle is guaranteed to remain within the container limits.
 *
 * @param {HTMLElement} container The HTML element whose width and height define
 *     the maximum width and height of the layout rectangle. This will typically
 *     be the visualization viewport.
 * @param {*} opt_layoutConstraints An optional map of constraints for the
 *     layout bounding rectangle. The following keys are accepted: top, bottom,
 *     left, right, width and height. Each value in the [0.0,1.0) range is
 *     considered relative to the container width and height, and assumed to
 *     be absolute values otherwise. 'width' and 'height' takes precedence
 *     respectively over 'right' and 'bottom'.
 * @constructor
 */
rhizo.layout.LayoutBox = function(container, opt_layoutConstraints) {
  /**
   * The distance (in pixels) of the layout rectangle from the container top
   * border.
   * @type {number}
   */
  this.top = 0;

  /**
   * The distance (in pixels) of the layout rectangle from the container bottom
   * border.
   * @type {number}
   */
  this.bottom = 0;

  /**
   * The distance (in pixels) of the layout rectangle from the container left
   * border.
   * @type {number}
   */
  this.left = 0;

  /**
   * The distance (in pixels) of the layout rectangle from the container right
   * border.
   * @type {number}
   */
  this.right = 0;

  /**
   * The layout rectangle width (in pixels).
   * @type {number}
   */
  this.width = 0;

  /**
   * The layout rectangle height (in pixels).
   * @type {number}
   */
  this.height = 0;

  this.maxWidth_ = $(container).get(0).clientWidth;
  this.maxHeight_ = $(container).get(0).clientHeight;
  this.computeLayoutBox_(opt_layoutConstraints || {});
};

/**
 * @return {boolean} Whether the layout box has a non-zero area to accomodate
 *     elements to be laid out.
 */
rhizo.layout.LayoutBox.prototype.isEmpty = function() {
  return (this.width <= 0) || (this.height <= 0);
};

/**
 * Computes the top,bottom,left,right,width and height attributes of the layout
 * rectangle, given the surrounding container size and any externally provided
 * constraints.
 *
 * @param {*} layoutConstraints Map of constraints for the layout bounding
 *     rectangle.
 * @private
 */
rhizo.layout.LayoutBox.prototype.computeLayoutBox_ = function(
    layoutConstraints) {
  this.top = this.getAbsoluteDimension_(layoutConstraints.top,
                                        this.maxHeight_);
  if (layoutConstraints.height) {
    this.height = this.getAbsoluteDimension_(layoutConstraints.height,
                                             this.maxHeight_);
    this.bottom = this.maxHeight_ - this.top - this.height;
  } else {
    this.bottom = this.clamp_(
        this.getAbsoluteDimension_(layoutConstraints.bottom, this.maxHeight_),
        0, this.maxHeight_ - this.top);
    this.height = this.maxHeight_ - this.top - this.bottom;
  }

  this.left = this.getAbsoluteDimension_(layoutConstraints.left,
                                         this.maxWidth_);
  if (layoutConstraints.width) {
    this.width = this.getAbsoluteDimension_(layoutConstraints.width,
                                            this.maxWidth_);
    this.right = this.maxWidth_ - this.left - this.width;
  } else {
    this.right = this.clamp_(
        this.getAbsoluteDimension_(layoutConstraints.right, this.maxWidth_),
        0, this.maxWidth_ - this.left);
    this.width = this.maxWidth_ - this.left - this.right;
  }
};

/**
 * Converts a value relative to the container size into an absolute value (in
 * pixels).
 * @param {number} value The value to convert.
 * @param {number} maxValue The maximum acceptable value.
 * @return {number} An absolute number (in pixel units) that is guaranteed to
 *     be in the [0, maxValue] range.
 * @private
 */
rhizo.layout.LayoutBox.prototype.getAbsoluteDimension_ = function(
    value, maxValue) {
  value = value || 0;
  var multiplier = value < 1.0 ? maxValue : 1;
  return this.clamp_(Math.round(value * multiplier), 0, maxValue);
};

/**
 * Clamps the given value between the minimum and maximum range limits.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @private
 */
rhizo.layout.LayoutBox.prototype.clamp_ = function(val, min, max) {
  return Math.min(max, Math.max(min, val));
};


/**
 * Factory function to generate Treeifiers. A Treeifier converts an
 * unorganized set of rhizo.model.SuperModel instances into a tree, according to
 * relationships defined by a chosen model attribute.
 *
 * We currently support two treeifiers: one based an models that have
 * hierarchical categorizations (CategoryTreeifier) and another based on models
 * that links between themselves in parent-child chains (LinkTreeifier).
 *
 * @param {string} key The name of the model attribute where parent-child
 *     relationships are stored and will guide tree construction.
 * @param {*} meta The metamodel entry associated to this key.
 * @return {?Object} A suitable treeifier for the given key, or null if no
 *     suitable treeifier exists.
 */
rhizo.layout.newTreeifier = function(key, meta) {
  if (rhizo.layout.linkMatcher(key, meta)) {
    return new rhizo.layout.LinkTreeifier(key, meta['linkKey'])
  } else if (rhizo.layout.hierarchyMatcher(key, meta)) {
    return new rhizo.layout.CategoryTreeifier(key);
  } else {
    return null;
  }
};


/**
 * Converter that turns an unorganized set of rhizo.model.SuperModel instances
 * into a tree, according to a model attribute (categoryKey) that defines a
 * hierarchical categorization of the model itself.
 *
 * @param {string} categoryKey The name of the model attribute whose value
 *     contains a hierarchical categorization of the model.
 * @constructor
 */
rhizo.layout.CategoryTreeifier = function(categoryKey) {
  this.categoryKey_ = categoryKey;
};

/**
 * Builds a hierarchical structure of TreeNodes. The tree is built out of all
 * the hierarchical categorizations found on all models. Therefore, every
 * non-leaf node (minus the root) is a SyntheticTreeNode representing a single
 * category one or more models belong to, and every leaf node is a ModelTreeNode
 * for a model that belongs to all the categories standing above him.
 *
 * @param {Array.<rhizo.model.SuperModel>} supermodels A list of all supermodels
 *     to treeify.
 * @param {Object.<string, rhizo.model.SuperModel>} allmodels a map associating
 *     model ids to SuperModel instances, for all models currently known to the
 *     project.
 * @param {Object.<string, rhizo.layout.TreeNode>=} opt_globalNodesMap an
 *     optional map that will accumulate all TreeNodes, keyed by model id.
 * @return {rhizo.layout.TreeNode} the root TreeNode (that has no model
 *     attached) that contains the models treeification.
 */
rhizo.layout.CategoryTreeifier.prototype.buildTree = function(
    supermodels, allmodels, opt_globalNodesMap) {
  var root = new rhizo.layout.TreeNode();
  for (var i = 0, l = supermodels.length; i < l; i++) {
    var categories = supermodels[i].unwrap()[this.categoryKey_];
    if (!$.isArray(categories)) {
      categories = [categories];
    }
    var node = root;
    for (var j = 0; j < categories.length; j++) {
      var category = categories[j] ? categories[j] : '__undefined__';
      var categoryNodeId = '__syntethic_id_' + categories[j];
      var childNode = node.childs[categoryNodeId];
      if (!childNode) {
        childNode = new rhizo.layout.SyntheticTreeNode(
            categoryNodeId, categories[j]);
        node.addChild(childNode);
      }
      node = childNode;
    }
    var modelNode = new rhizo.layout.ModelTreeNode(supermodels[i]);
    node.addChild(modelNode);
    if (opt_globalNodesMap) {
      opt_globalNodesMap[supermodels[i].id] = modelNode;
    }
  }
  return root;
};

/**
 * Converter that turns an unorganized set of rhizo.model.SuperModel instances
 * into a tree, according to a model attribute (linkStartKey) that points to
 * other models, defining child-to-parent relationships.
 * 
 * @param {string} linkStartKey the name of the model attribute whose value
 *     points to another model, establishing a child-to-parent relationship.
 * @param {string} opt_linkEndKey The name of the model attribute whose
 *     value resolves the links defined by linkStartKey. If
 *     unspecified, it is assumed that the values of model attributes identified
 *     by linkStartKey will contain the ids of their parent models.
 *     If specified, the model values identified by opt_linkEndKey must be
 *     unique (otherwise it would be possible for a child to link to multiple
 *     parents).
 * @constructor
 */
rhizo.layout.LinkTreeifier = function(linkStartKey, opt_linkEndKey) {
  this.linkStartKey_ = linkStartKey;
  this.linkEndKey_ = opt_linkEndKey || 'id';
};

/**
 * Builds a hierarchical structure of TreeNodes. Since this treeifier relies on
 * model-to-model links, the entire tree (minus the root) is composed of
 * ModelTreeNode instances, each one holding a reference to a model.
 *
 * Raises exceptions if cycles are found within the tree or if childs are found
 * to link to multiple parents. Deals automatically with "unavailable" parts of
 * the tree.
 * 
 * @param {Array.<rhizo.model.SuperModel>} supermodels A list of all supermodels
 *     to treeify.
 * @param {Object.<string, rhizo.model.SuperModel>} allmodels a map associating
 *     model ids to SuperModel instances, for all models currently known to the
 *     project.
 * @param {Object.<string, rhizo.layout.TreeNode>=} opt_globalNodesMap an
 *     optional map that will accumulate all TreeNodes, keyed by model id.
 * @return {rhizo.layout.TreeNode} the root TreeNode (that has no model
 *     attached) that contains the models treeification.
 */
rhizo.layout.LinkTreeifier.prototype.buildTree = function(
    supermodels, allmodels, opt_globalNodesMap) {
  var linkMap = allmodels;
  if (this.linkEndKey_ != 'id') {
    // A key other than the model id is used to resolve child-parent
    // relationships. Assemble a map pointing from the model values the key
    // identifies to SuperModel instances.
    linkMap = this.buildLinkMap_(allmodels);
  }

  var globalNodesMap = opt_globalNodesMap || {};
  for (var i = 0, l = supermodels.length; i < l; i++) {
    globalNodesMap[supermodels[i].id] =
        new rhizo.layout.ModelTreeNode(supermodels[i]);
  }

  var root = new rhizo.layout.TreeNode();

  // supermodels contains only the models that can be laid out, while allmodels
  // contains all the known models.
  for (var i = 0, l = supermodels.length; i < l; i++) {
    if (!globalNodesMap[supermodels[i].unwrap().id].traversed_) {

      // we never encountered the node before. Start navigating
      // this branch upward, paying attention to cycles
      var localNodesMap = {};
      var model = supermodels[i].unwrap();

      while(true) {
        if (localNodesMap[model.id]) {
          // cycle detected
          throw new rhizo.layout.TreeCycleException(
              "Tree is invalid: cycle detected");
        }
        localNodesMap[model.id] = true;
        globalNodesMap[model.id].traversed_ = true;

        var parentSuperModel = this.findFirstAvailableParent_(
            linkMap,
            linkMap[model[this.linkStartKey_]]);
        if (parentSuperModel && parentSuperModel.id != model.id) {
          var parentModel = parentSuperModel.unwrap();
          globalNodesMap[parentModel.id].addChild(globalNodesMap[model.id]);
          model = parentSuperModel.unwrap();
        } else {
          root.addChild(globalNodesMap[model.id]);
          break;
        }
      }
    }
  }
  return root;
};

/**
 * From a given model, returns the first model in the tree hierarchy defined
 * by linkStartKey which is available for layout. Models can be unavailable for
 * various reasons, such as being filtered or pinned.
 * If the given model itself is available, it is returned without further
 * search. If a cycle is detected while traversing unavailable parents,
 * an exception is raised.
 *
 * @param {Object.<*, rhizo.model.SuperModel>} linkMap a map associating
 *     model unique identifiers (either the model id itself, or another unique
 *     attribute identified by 'linkEndKey') to SuperModel instances, for all
 *     models currently known to the project.
 * @param {rhizo.model.SuperModel} superParent the model to start the search
 *     from.
 * @private
 */
rhizo.layout.LinkTreeifier.prototype.findFirstAvailableParent_ = function(
    linkMap, superParent) {
  if (!superParent) {
    return null;
  }

  var localNodesMap = {};
  while (!superParent.isAvailableForLayout()) {
    if (localNodesMap[superParent.id]) {
      // cycle detected
      throw new rhizo.layout.TreeCycleException(
          "Tree is invalid: hidden cycle detected");
    }
    localNodesMap[superParent.id] = true;

    superParent = linkMap[superParent.unwrap()[this.linkStartKey_]];
    if (!superParent) {
      // we reached an hidden root.
      return null;
    }
  }

  return superParent;
};

/**
 * Builds a map of SuperModel instances keying them by the value each model has
 * for the attribute identified by 'linkEndKey'. Raises exceptions if two or
 * more models share the same value for the 'linkEndKey' attribute, i.e.
 * whenever it's not possible to build a unique mapping from attribute values to
 * models.
 *
 * @param {Object.<string, rhizo.model.SuperModel>} allmodels A map associating
 *     model ids to SuperModel instances, for all models currently known to the
 *     project.
 * @return {Object.<*, rhizo.model.SuperModel>} A map associating model values
 *     as extracted from the 'linkEndKey' attribute to SuperModel instances,
 *     for all models currently known to the project.
 * @private
 */
rhizo.layout.LinkTreeifier.prototype.buildLinkMap_ = function(allmodels) {
  var linkMap = {};
  for (var modelId in allmodels) {
    var model = allmodels[modelId].unwrap();
    if (!(this.linkEndKey_ in model)) {
      continue;
    }
    if (model[this.linkEndKey_] in linkMap) {
      // Two or more models share the same value for the 'linkEndKey'
      // attribute. It's not possible to build a unique mapping.
      throw new rhizo.layout.TreeCycleException(
              "Tree is invalid: multiple models have the same value for the " +
              this.linkEndKey_ + " attribute");
    }
    linkMap[model[this.linkEndKey_]] = allmodels[modelId];
  }
  return linkMap;
};


/**
 * A generic tree node.
 * @param {*?} opt_id The unique node id. If null, the node is assumed to a tree
 *     root.
 * @param {*=} opt_payload An optional payload associated to the node.
 * @constructor
 */
rhizo.layout.TreeNode = function(opt_id, opt_payload) {
  this.id = opt_id;
  this.childs = {};
  this.traversed_ = false;
  this.numChilds = 0;
  this.is_root = this.id == null;
  this.synthetic_ = false;
  this.payload_ = opt_payload;
};

/**
 * Defines whether the node is synthetic or not, i.e. whether it is backed by
 * one of the visualization models or not.
 * @param {boolean} synthetic Whether the node is synthetic or not.
 */
rhizo.layout.TreeNode.prototype.setSynthetic = function(synthetic) {
  this.synthetic_ = synthetic;
};

/**
 * @return {boolean} Whether the node is synthetic.
 */
rhizo.layout.TreeNode.prototype.synthetic = function() {
  return this.synthetic_;
};

/**
 * @return {*?} The node payload.
 */
rhizo.layout.TreeNode.prototype.payload = function() {
  return this.payload_;
};

/**
 * Adds another node as child of the this node.
 * @param {rhizo.layout.TreeNode} treenode The child to add.
 */
rhizo.layout.TreeNode.prototype.addChild = function(treenode) {
  if (!this.childs[treenode.id]) {
    this.childs[treenode.id] = treenode;
    this.numChilds++;
  }
};

/**
 * @returns {Array.<rhizo.layout.TreeNode>} The immediate childs of this node.
 */
rhizo.layout.TreeNode.prototype.childsAsArray = function() {
  var nodes = [];
  for (var nodeId in this.childs) {
    nodes .push(this.childs[nodeId]);
  }
  return nodes ;
};

/**
 * Deep find all the children of this node and appends them to the given array.
 * @param {Array.<rhizo.layout.TreeNode>} childs Array into which accumulate
 *     this node children.
 */
rhizo.layout.TreeNode.prototype.deepChildsAsArray = function(childs) {
  for (var nodeId in this.childs) {
    childs.push(this.childs[nodeId]);
    this.childs[nodeId].deepChildsAsArray(childs);
  }
};

/**
 * The space this node will occupy (in width, height terms) in the visualization
 * viewport once positioned by layout operations.
 * @return {Object.<string, number>} The node rendering dimensions.
 */
rhizo.layout.TreeNode.prototype.renderingDimensions = function() {
  return {width: 0, height: 0};
};


/**
 * A tree node backed by a visualization rhizo.model.SuperModel.
 *
 * @param {rhizo.model.SuperModel} opt_superModel The model this tree node
 *     wraps. If unspecified, this node is assumed to be the root of the tree.
 * @constructor
 * @extends rhizo.layout.TreeNode
 */
rhizo.layout.ModelTreeNode = function(opt_superModel) {
  rhizo.layout.TreeNode.call(
      this, opt_superModel ? opt_superModel.id : null, opt_superModel);
};
rhizo.inherits(rhizo.layout.ModelTreeNode, rhizo.layout.TreeNode);

/**
 * @return {Object.<string, number>} The dimensions of the rendering bound to
 *     this node.
 */
rhizo.layout.ModelTreeNode.prototype.renderingDimensions = function() {
  return this.payload().rendering().getDimensions();
};


/**
 * A synthetic tree node, not backed by a visualization model, but instead
 * representing a visualization artifact.
 *
 * @param {*?} opt_id The unique node id. If null, the node is assumed to a tree
 *     root.
 * @param {*=} opt_payload An optional payload associated to the node.d
 * @constructor
 * @extends rhizo.layout.TreeNode
 */
rhizo.layout.SyntheticTreeNode = function(opt_id, opt_payload) {
  rhizo.layout.TreeNode.call(this, opt_id, opt_payload);
  this.setSynthetic(true);
  this.syntheticRendering_ = null;
};
rhizo.inherits(rhizo.layout.SyntheticTreeNode, rhizo.layout.TreeNode);

rhizo.layout.SyntheticTreeNode.prototype.renderingDimensions = function() {
  return this.syntheticRendering_.getDimensions();
};

/**
 * Sets the node synthetic rendering. Since the node is not backed by a
 * visualization model, it doesn't have an associated rendering, which is
 * therefore provided in the form of a synthetic one.
 *
 * @param {rhizo.ui.SyntheticRendering} syntheticRendering
 */
rhizo.layout.SyntheticTreeNode.prototype.setSyntheticRendering = function(
    syntheticRendering) {
  this.syntheticRendering_ = syntheticRendering;
};

/**
 * @return {rhizo.ui.SyntheticRendering} The node synthetic rendering, if any.
 */
rhizo.layout.SyntheticTreeNode.prototype.syntheticRendering = function() {
  return this.syntheticRendering_;
};


/**
 * An exception raised when cycles are encountered when treeifing a list of
 * SuperModels.
 * @constructor
 * @param {string} message Additional information about the specific cycle
 *     found.
 */
rhizo.layout.TreeCycleException = function(message) {
  this.message = message;
  this.name = "TreeCycleException";
};

rhizo.layout.TreeCycleException.prototype.toString = function() {
  return this.name + ": " + this.message;
};
/* ./src/js/rhizo.autorender.js */
/**
  @license
  Copyright 2008 The Rhizosphere Authors. All Rights Reserved.

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

// RHIZODEP=rhizo.meta
namespace("rhizo.autorender");

rhizo.autorender.AR = function(metamodel,
                               models,
                               opt_fallbackToDefaults,
                               opt_numfields) {
                                 
  this.metamodel_ = metamodel;
  this.metamodelFields_ = 0;
  for (var f in this.metamodel_) {
    this.metamodelFields_++;
  }
    
  this.fallbackToDefaults_ =!!opt_fallbackToDefaults;
  this.locateFields_();

  var autoShownFields = 0; // counts the number of fields that will always show
                           // independently on opt_numfields
  if (this.sizeField_) {
    this.sizeRange_ = this.locateMinMax_(models, this.sizeField_);
    autoShownFields++;
  }

  if (this.colorField_) {
    this.colorRange_ = this.locateMinMax_(models, this.colorField_);
    autoShownFields++;    
  }
  
  this.numfields_ = opt_numfields === undefined || opt_numfields === null ?
      5 : Math.max(opt_numfields, autoShownFields);

  // An autorender can always have its dimensions cached.
  this.cacheDimensions = true;
};

rhizo.autorender.AR.prototype.getSizeRange = function() {
  return this.sizeRange_;
};

rhizo.autorender.AR.prototype.getColorRange = function() {
  return this.colorRange_;
};

rhizo.autorender.AR.prototype.locateFields_ = function() {
  for (var key in this.metamodel_) {
    this.masterField_ = this.masterField_ ||
                        this.getArField_(key, 'master', 'true');
    this.sizeField_ = this.sizeField_ ||
                      this.getArField_(key, 'bind', 'size');
    this.colorField_ = this.colorField_ ||
                       this.getArField_(key, 'bind', 'color');
  }
  this.locateDefaultFields_();
};

rhizo.autorender.AR.prototype.getArField_ = function(key, property, value) {
  if (this.metamodel_[key].ar) {
    var propVal = this.metamodel_[key].ar[property];
    if (propVal && propVal.toString().indexOf(value) != -1) {
      return key;
    }
  }
  return null;
};

rhizo.autorender.AR.prototype.locateDefaultFields_ = function() {
  for (var key in this.metamodel_) {
    // master Field is by default the first one
    if (!this.masterField_) {
      this.masterField_ = key;
    }

    if (!this.fallbackToDefaults_) {
      break;
    }

    // size Field is the first numeric field
    var kind = this.metamodel_[key].kind;
    kind = typeof(kind) == 'string' ?
        rhizo.meta.defaultRegistry.createNewKind(kind, this.metamodel_[key]) :
        kind;
    if (!this.sizeField_ && kind.isNumeric()) {
      this.sizeField_ = key;
      continue;
    }

    // color Field is the next numeric field, or the first one if
    // size is explicitly bound
    if (this.sizeField_) {
      if (!this.colorField_ && kind.isNumeric()) {
        this.colorField_ = key;
      }
    }
  }
};

rhizo.autorender.AR.prototype.locateMinMax_ = function(models, key) {
    var kind = this.metamodel_[key].kind;
    kind = typeof(kind) == 'string' ?
        rhizo.meta.defaultRegistry.createNewKind(kind, this.metamodel_[key]) :
        kind;
  if (kind.isNumeric() &&
      typeof(this.metamodel_[key].min) != 'undefined' &&
      typeof(this.metamodel_[key].max) != 'undefined') {
    // Numeric field with 'min' and 'max' attributes. Looks range-y.
    return { min: this.metamodel_[key].min ,
             max: this.metamodel_[key].max ,
             label: this.metamodel_[key].label };
  } else {
    // simple numeric field. Iterate over models to figure out min and max.
    var modelMin = Number.POSITIVE_INFINITY;
    var modelMax = Number.NEGATIVE_INFINITY;
    $.each(models, function(i, model) {
      modelMin = Math.min(modelMin, model[key]);
      modelMax = Math.max(modelMax, model[key]);
    });
    return { min: modelMin, max: modelMax, label: this.metamodel_[key].label};
  }
};

rhizo.autorender.AR.prototype.getClass_ = function(value,
                                                   range,
                                                   renderingHints,
                                                   identifier) {
  // 0 to 5 scale
  var size = parseInt(((value - range.min) / (range.max - range.min))*5.0, 10);
  return 'ar-' + identifier + '-' + size.toString() + (renderingHints.small ? 'm' : '');
};


rhizo.autorender.AR.prototype.getFontClass_ = function(value,
                                                       range,
                                                       renderingHints,
                                                       master) {
  return this.getClass_(value, range, renderingHints, 'fon');
};

rhizo.autorender.AR.prototype.getColorClass_ = function(value,
                                                        range,
                                                        renderingHints) {
  return this.getClass_(value, range, renderingHints, 'col');
};

rhizo.autorender.AR.prototype.renderSingleModelKey_ = function(key, value) {
  var html = [];
  html.push('<p><span class="rhizo-autorender-label">');
  html.push(this.metamodel_[key].label);
  html.push('</span>: ');
  html.push(value);
  html.push('</p>');
  return html.join('');
};

/**
  Detects whether the renderings produced by this renderer can be expanded
  or not. 
  If the rendering is small (via renderingHints)
    then only the masterField is shown and expandable is true if there are
    additional fields.
  If the rendering is not small
    then expandable is true if there are more fields, in addition to the
    ones are already shown (numfields_) plus the masterField (that is always
    shown).
 */
rhizo.autorender.AR.prototype.expandable = function(renderingHints) {
  var threshold = renderingHints.small ? 1 :  this.numfields_ + 1;
  return this.metamodelFields_ > threshold;
};

rhizo.autorender.AR.prototype.render = function(model, 
                                                expanded, 
                                                renderingHints) {
  var colorClass = 'ar-col-0' + (renderingHints.small ? 'm' : '');
  if (this.colorField_) {
    colorClass = this.getColorClass_(model[this.colorField_],
                                     this.colorRange_,
                                     renderingHints);
  }

  var fontClass = 'ar-fon-0' + (renderingHints.small ? 'm' : '');
  if (this.sizeField_) {
    fontClass = this.getFontClass_(model[this.sizeField_],
                                   this.sizeRange_,
                                   renderingHints);
  }

  if (renderingHints.small && !expanded) {
    return $("<div class='rhizo-autorender " + colorClass + "'>" +
             "<span class='" + fontClass + "'>" +
             model[this.masterField_] + "</span>" +
             "</div>");
  } else {
    var html = [];
    html.push("<div class='rhizo-autorender " + colorClass + "'>");
    html.push("<span class='" + fontClass + "'>" +
              model[this.masterField_] + "</span>");

    var count = 0;
    if (this.sizeField_) {
      html.push(this.renderSingleModelKey_(this.sizeField_,
                                           model[this.sizeField_]));
      count++;
    }

    if (this.colorField_ && this.colorField_ != this.sizeField_) {
      html.push(this.renderSingleModelKey_(this.colorField_,
                                           model[this.colorField_]));
      count++;
    }

    for (var key in this.metamodel_) {
      if (count >= this.numfields_ && !expanded) {
        break;
      }
      if (key != this.sizeField_ &&
          key != this.colorField_ &&
          key != this.masterField_) {
        count++;
        html.push(this.renderSingleModelKey_(key, model[key]));
      }
    }
    html.push("</div>");
    return $(html.join(''));
  }
};

/**
 * React to style changes that affect the background color (for example as
 * dictated by treemap colorings) to override the default background color
 * that the autorenderer would otherwise use.
 */
rhizo.autorender.AR.prototype.changeStyle = function(
    unused_model, node, props, opt_hintRevert) {
  if (!('backgroundColor' in props)) {
    return;
  }
  $(node).css(
      'backgroundColor', !!opt_hintRevert ? '' : props['backgroundColor']);
};
/* ./src/js/rhizo.gviz.js */
/**
  @license
  Copyright 2008 The Rhizosphere Authors. All Rights Reserved.

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

// RHIZODEP=rhizo.meta,rhizo.autorender,rhizo.log,rhizo.options
namespace("rhizo.gviz");

/**
 * Exposes Rhizosphere as a visualization compatible with the Google
 * Visualization APIs.
 *
 * See http://code.google.com/apis/visualization/interactive_charts.html for
 * an introduction to the Google Visualization APIs and
 * http://code.google.com/apis/visualization/documentation/using_overview.html
 * for more detailed information about using Google Visualizations.
 *
 * The visualization fires a 'ready' event once it has finished loading and is
 * ready to accept user interaction. It fires an 'error' event if it fails
 * drawing. The 'error' event contains details describing the specific error
 * that occurred.
 *
 * @param {HTMLElement} container The element that will contain the
 *    visualization. It must have an explicit CSS position set (either
 *     'relative' or 'absolute'). You are free to set its width and height and
 *     Rhizosphere will render itself within the given constraints.
 * @constructor
 */
rhizo.gviz.Rhizosphere = function(container) {
  if (typeof google == 'undefined' ||
      typeof google.visualization == 'undefined') {
    throw 'Google Visualization APIs not available. Please load them first.'
  }
  this.container_ = container;

  /**
   * @type {rhizo.Project}
   * @private
   */
  this.project_ = null;
};

/**
 * Initializes and draws the Rhizosphere visualization with the given Google
 * Visualization datatable.
 *
 * Rhizosphere accepts any well-formed Google Visualization datatable and
 * automatically extracts relevant metadata to set up the visualization.
 *
 * If you are not comfortable with the automatic selection of metadata and/or
 * rendering algorithm, you can provide your own custom metadata and rendering
 * via configuration options.
 * See http://www.rhizospherejs.com/doc/contrib_tables.html#options.
 *
 * @param {google.visualization.DataTable} datatable The dataset to visualize
 *     in Rhizosphere.
 * @param {*} opt_options key-value map of Visualization-wide configuration
 *     options, as described at
 *     http://www.rhizospherejs.com/doc/contrib_tables.html#options.
 */
rhizo.gviz.Rhizosphere.prototype.draw = function(datatable, opt_options) {
  if (this.project_) {
    // Google Visualizations can be redrawn multiple times. Rhizosphere does
    // not properly support redraws, so the easiest (and crudest) way to achieve
    // it is to destroy and rebuild the entire visualization.
    this.project_.destroy();
  }

  // Mandatorily disable the display of errors in the visualization viewport,
  // as this is already handled by google.visualization.errors management
  // in the bootstrap completion callback.
  var options = new rhizo.Options(opt_options);
  options.merge({showErrorsInViewport: false});

  var initializer = new rhizo.gviz.Initializer(
      datatable, rhizo.log.newLogger(null, options), options);
  if (!initializer.parse()) {
    // The datatable is empty, we skip visualization deployment.
    this.project_ = null;
    this.deployComplete_(null, true);
  } else {
    var bootstrapper = new rhizo.bootstrap.Bootstrap(
        this.container_, options, jQuery.proxy(this.deployComplete_, this));

    this.project_ = bootstrapper.prepare().getProject();
    bootstrapper.deployExplicit(initializer.models,
                                initializer.metamodel,
                                initializer.renderer);
  }
};

/**
 * Fires the Google Visualization 'ready' or 'error' event to notify
 * visualization users that Rhizosphere is either ready for interaction or
 * failed drawing.
 *
 * @param {!rhizo.UserAgent} unused_ua unused.
 * @param {boolean} success Whether the Rhizosphere visualization successfully
 *     deployed or otherwise failed.
 * @param {string=} opt_details The error details in case of failure.
 * @private
 */
rhizo.gviz.Rhizosphere.prototype.deployComplete_ = function(
    unused_ua, success, opt_details) {
  if (success) {
    google.visualization.events.trigger(this, 'ready', {});
  } else {
    var errorId = google.visualization.errors.addError(
        this.container_,
        opt_details, null,
        {style: 'position: absolute; top: 0; right: 0; z-index: 350'});
    google.visualization.events.trigger(this, 'error', {
      'id': errorId, 'message': opt_details
    });
  }
};


/**
 * Builder to extract Rhizosphere datastructures (models, metamodel and
 * renderer) from a Google Visualization datatable.
 *
 * Each datatable row maps to a Rhizosphere model, while each column (or
 * group of columns) maps to a model attribute and associated Rhizosphere
 * metamodel entry.
 *
 * The class relies on usage of custom column properties and/or conventions in
 * column labeling to extract additional structural information that would
 * otherwise not be available in the input Google Visualization datatable.
 *
 * Parent-child relationships:
 * - Pair of columns with the latter having the same label as the former,
 *   prefixed with the 'Parent' string are assumed to represent a child-parent
 *   tree hierarchy, e.g.:
 *   *Location*, *ParentLocation*, *Population*
 *   Italy,      Europe,           60M
 *   Uk,         Europe,           61M
 *   Europe,     World,            857M
 *   USA,        World,            300M
 *   World,      ,                 7B
 *
 * - Alternatively, the parent column may have a custom 'rhizosphereParent'
 *   property set to 'true', to indicate that the column represents the parent
 *   of the previous column.
 *
 * Categories:
 * - The presence of a 'CAT' token in column labels, or the presence of a custom
 *   'rhizosphereCategory' column property (with any value) is an hint that the
 *   values in the column belong to a finite set of categories, that Rhizosphere
 *   will represent using dedicated logic. A single cell can use comma separated
 *   values to assign multiple categories to the datapoint it belongs to.
 *
 * - If an additional 'MUL' token is present on the label of a category column
 *   (as defined above), or a 'rhizosphereCategory' custom column property
 *   exists and has a 'multiple' attribute (with any value), then Rhizosphere
 *   will allow the user to select multiple values concurrently for the given
 *   column when filtering upon it.
 *
 * - If an additional 'HIE' token is present on the label of a category column
 *   (as defined above), or a 'rhizosphereCategory' custom column property
 *   exists and has a 'hierarchy' attribute (with any value), then Rhizosphere
 *   will assume that the categories defined by the column are arranged in a
 *   hierarchical fashion. Rhizosphere will use the information to enable tree
 *   based functionalities (such as tree and nested treemap layouts) on the
 *   given column. Example of a column definining hierarchical categories:
 *
 *   *Name*,  *Hobbies CAT HIE*
 *   John,    "Sports,Soccer"
 *   George,  "Sports,Baseball"
 *   Mary,    "Leisure,Cinema"
 *   Anne,    "Leisure,Cinema,Sci-Fi movies"
 *
 *   Will result in the following tree of categories:
 *   Root
 *   |____ Sports
 *   |     |______ Soccer
 *   |     |______ Baseball
 *   |
 *   |____ Leisure
 *         |______ Cinema
 *                 |______ Sci-Fi movies
 *
 * - Alternatively, a hierarchical categorization can be expressed using
 *   multiple subsequent columns with the same label. The initializer
 *   will interpret it as a flattened multilevel hierarchy and interpret it as
 *   described above. Example:
 *
 *   *Location*, *Location*, *Location*, *Population*
 *   World,      Europe,     Italy,      60M
 *   World,      Europe,     Uk,         61M
 *   World,      USA,        ,           300M
 *   World,      ,           ,           7B
 *
 *   If a hierarchical categorization exhaustively identifies all the
 *   datatable rows (Rhizosphere models) in a unique way, it will be internally
 *   converted in the format described for parent-child relationships. That is,
 *   Rhizosphere will assume the categorization to represent a valid tree
 *   representation of all the models (which is a stricter notion than just
 *   assuming models can be placed within a hierarchical set of
 *   categorizations).
 *   NOTE that the conversion will occur only for the first hierarchical
 *   categorization matching the requirements.
 *
 * @param {google.visualization.DataTable} dataTable The dataset to extract
 *     Rhizosphere metamodel and models from.
 * @param {!Object} logger A generic logger that exposes an API equivalent to
 *     the browser console API (see http://getfirebug.com/logging), including
 *     the standard error(), warn() and info() methods.
 * @param {!rhizo.Options} options Visualization-wide configuration options.
 */
rhizo.gviz.Initializer = function(dataTable,
                                  logger,
                                  options) {
  this.dt_ = dataTable;
  this.logger_ = logger;
  this.options_ = options;
};

/**
 * Parses the Google Visualization DataTable and builds a metamodel, models,
 * renderer tuple from it.
 *
 * @return {boolean} Whether it was possible to parse the datatable or not.
 *     When false, metamodel, models and renderer won't be available.
 */
rhizo.gviz.Initializer.prototype.parse = function() {
  if (this.dt_.getNumberOfRows() == 0 || this.dt_.getNumberOfColumns() == 0) {
    return false;
  }
  var colGroups = this.getColumnGroupings_();
  if (this.transformDataTableIfNeeded_(colGroups)) {
    // Recompute colum groups if the datatable was changed.
    colGroups = this.getColumnGroupings_();
  }
  // TODO(battlehorse): The initializer should deal with the possibility of
  // receiving a complete metamodel via configuration options.
  this.metamodel = this.buildMetaModel_(colGroups);
  this.models = this.loadModels_(this.metamodel, colGroups);
  this.renderer = this.options_.renderer() ||
                  this.createDefaultRenderer_(this.metamodel, this.models);
  return true;
};

/**
 * Returns a unique identifier for a specific datatable column.
 * @param {number} columnNum The column number.
 * @return {string} The column identifier.
 * @private
 */
rhizo.gviz.Initializer.prototype.getColumnId_ = function(columnNum) {
  return this.dt_.getColumnId(columnNum) || ('col_' + columnNum);
};

/**
 * Returns a unique identifier for a column group.
 * @param {number} startColumnNum The start column (inclusive) of the group.
 * @param {number} endColumnNum The end column (exclusive) of the group.
 * @return {string} The group identifier.
 * @private
 */
rhizo.gviz.Initializer.prototype.getColumnGroupId_ = function(
    startColumnNum, endColumnNum) {
  return this.getColumnId_(startColumnNum) + '__' +
      this.getColumnId_(endColumnNum-1);
};

/**
 * @param {number} columnNum
 * @return {string} The column label for the requested column.
 * @private
 */
rhizo.gviz.Initializer.prototype.getColumnLabel_ = function(columnNum) {
  var label = this.dt_.getColumnLabel(columnNum);
  if (label == '') {
    label = "Column " + this.getColumnId_(columnNum);
  }
  return label;
};

/**
 * Checks whether a given column represents the parent of the previous one in
 * a parent-child relationship.
 *
 * @param {number} columnNum The column to check.
 * @return {boolean}
 * @private
 */
rhizo.gviz.Initializer.prototype.isParentColumn_ = function(columnNum) {
  if (columnNum == 0) {
    return false;  // The first column in a datatable cannot be a parent,
                   // because there is no preceding column.
  }
  return (!!this.dt_.getColumnProperty(columnNum, 'rhizosphereParent')) ||
      this.getColumnLabel_(columnNum) ==
          'Parent' + this.getColumnLabel_(columnNum-1);
};

/**
 * Checks whether a given column is marked as containing a set of categories.
 *
 * @param {number} columnNum The column to check.
 * @return {Object.<string, boolean>?} null if the column is not a category
 *     holder, or an Object with 'multiple' and 'hierarchy' properties
 *     otherwise. The properties will be true if the multiple selection and/or
 *     hierarchical arrangement of the categories have been requested.
 * @private
 */
rhizo.gviz.Initializer.prototype.getCategoryColumnData_ = function(columnNum) {
  var categoryProperties =  this.dt_.getColumnProperty(
      columnNum, 'rhizosphereCategory');
  if (categoryProperties) {
    return {
      'multiple': !!categoryProperties.multiple,
      'hierarchy': !!categoryProperties.hierarchy
    };
  }
  if (this.getColumnLabel_(columnNum).indexOf('CAT') != -1) {
    return {
      'multiple': this.getColumnLabel_(columnNum).indexOf('MUL') != -1,
      'hierarchy': this.getColumnLabel_(columnNum).indexOf('HIE') != -1
    };
  }
  return null;
};

/**
 * Static function to strip category markers from a column label.
 * @param {string} columnLabel
 * @return {string}
 * @private
 */
rhizo.gviz.Initializer.stripCategoryTokens_ = function(columnLabel) {
  return columnLabel.replace(/CAT|MUL|HIE/g, '').replace(/^\s+|\s+$/g, '');
};

/**
 * Scans the datatable looking for repeated columns having the same label,
 * defining a column group. This is an hint for the presence of flattened
 * multilevel hierarchies.
 *
 * @return {Object.<number, number>} A mapping from the starting column
 *     (inclusive) to the end column (exclusive) of each column group found.
 * @private
 */
rhizo.gviz.Initializer.prototype.getColumnGroupings_ = function() {
  var groups = {};
  var numColumns = this.dt_.getNumberOfColumns();
  var columnIndex = 0;
  var lastColumnLabel = this.getColumnLabel_(columnIndex);
  for (var i = 1; i < numColumns; i++) {
    if (this.getColumnLabel_(i) == lastColumnLabel) {
      continue;
    }

    if (i > columnIndex+1) {
      // columnIndex is the start column of the group (inclusive), i is the
      // end column of the group (exclusive)
      groups[columnIndex] = i;
    }
    columnIndex = i;
    lastColumnLabel = this.getColumnLabel_(columnIndex);
  }

  if (columnIndex != numColumns - 1) {
    groups[columnIndex] = numColumns;
  }
  return groups;
};

/**
 * Identifies the need for transformations on the input datatable and applies
 * them if needed.
 * The only transformation currently supported is the conversion of hierarchical
 * categories that define an exhaustive model tree into a parent-child
 * relationship (see the documentation in the constructor for further info).
 *
 * @param {Object.<number, number>} colGroups The column groups found in the
 *     datatable.
 * @return {boolean} Whether the input datatable was transformed or not.
 * @private
 */
rhizo.gviz.Initializer.prototype.transformDataTableIfNeeded_ = function(
    colGroups) {
  for (var i = 0, clen = this.dt_.getNumberOfColumns(); i < clen;) {
    if (i in colGroups) {
      if (this.isValidModelTree_(i, colGroups[i])) {
        this.logger_.debug('Column group starting at ' + i +
            ' is a valid model tree. Transforming the datatable.');
        this.packHierarchy_(i, colGroups[i]);
        return true;
      }

      i = colGroups[i];  // jump after the column group
      continue;
    }

    var categoryColumn = this.getCategoryColumnData_(i);
    if (categoryColumn && categoryColumn['hierarchy']) {
      if (this.isValidModelTree_(i)) {
        this.logger_.debug('Hierarchy column at position ' + i +
            ' is a valid model tree. Transforming the datatable.');
        this.packHierarchy_(i);
        return true;
      }
    }
    i+=1;
  }
  return false;
};

/**
 * Checks whether a column (or column group) defining a hierarchical
 * categorization exhaustively identifies all the datatable rows (Rhizosphere
 * models) in a unique way, i.e. it identifies a parent-child relationship
 * between the Rhizosphere models that will be created from the datatable
 * (which is a stricter notion than just assuming models can be placed within a
 * hierarchical set of categorizations).
 *
 * @param {number} startColumnNum The column to inspect, or the starting index
 *     (inclusive) of a column group.
 * @param {number=} opt_endColumnNum The optional end index (exclusive) of a
 *     column group.
 * @return {boolean} Whether the column (or column group) defines an exhaustive
 *     model tree.
 * @private
 */
rhizo.gviz.Initializer.prototype.isValidModelTree_ = function(
    startColumnNum, opt_endColumnNum) {
  var treeIds = {};
  var treeRoot = {};
  var numNodes = 0;
  for (var i = 0, len = this.dt_.getNumberOfRows(); i < len; i++) {
    var parentNode = treeRoot;
    var categories = rhizo.gviz.Initializer.getRowCategories_(
        this.dt_, i, startColumnNum, opt_endColumnNum);
    for (var c = 0; c < categories.length; c++) {
      var value = categories[c];
      if (!(value in parentNode)) {
        if (value in treeIds) {
          return false; // The node already exists, but in a different part
                        // of the tree (turning this into a graph).
        }
        treeIds[value] = true;
        parentNode[value] = {};
        numNodes++;
      }
      parentNode = parentNode[value];
    }
  }
  return numNodes == this.dt_.getNumberOfRows();
};

/**
 * Replaces the Initializer datatable with a dataview that converts an
 * exhaustive hierarchical model categorization into a set of parent-child
 * relationships between models (see the documentation in the constructor for
 * further info).
 *
 * @param {number} startColumn The column that contains an exhaustive
 *     hierarchical model categorization, or the starting index (inclusive) of
 *     a column group that does the same.
 * @param {number=} opt_endColumn The optional end index (exclusive) of a column
 *     group.
 * @private
 */
rhizo.gviz.Initializer.prototype.packHierarchy_ = function(
    startColumn, opt_endColumn) {
  var view = new google.visualization.DataView(this.dt_);
  var columns = [];

  // All the columns preceding the hierarchical one(s) are left as is.
  for (var i = 0; i < startColumn; i++) {
    columns.push(i);
  }

  // Define a calculated (synthetic) column containing the child of the
  // parent-child relationship.
  // Columns calculated this way are necessarily converted to string types.
  columns.push({
    'type': 'string',
    'id': 'c(' + this.getColumnId_(startColumn) +
        (opt_endColumn ? ':' + this.getColumnId_(opt_endColumn-1) : '') + ')',
    'label': this.dt_.getColumnLabel(startColumn),
    'calc': function(dataTable, rowNum) {
      return rhizo.gviz.Initializer.packFunction_(
          dataTable, rowNum, startColumn, opt_endColumn, 0);
  }});

  // Define a calculated (synthetic) column containing the parent of the
  // parent-child relationship. The label is defined in such a way to match
  // the required conventions for parent-child relationships (checked while
  // building the metamodel).
  columns.push({
    'type': 'string',
    'id': 'p(' + this.getColumnId_(startColumn) +
        (opt_endColumn ? ':' + this.getColumnId_(opt_endColumn-1) : '') + ')',
    'label': 'Parent' +  this.dt_.getColumnLabel(startColumn),
    'calc': function(dataTable, rowNum) {
      return rhizo.gviz.Initializer.packFunction_(
          dataTable, rowNum, startColumn, opt_endColumn, 1);
    }
  });

  // All the columns after the hierarchical one(s) are left as is.
  for (i = opt_endColumn || startColumn + 1;
       i < this.dt_.getNumberOfColumns();
       i++) {
    columns.push(i);
  }
  view.setColumns(columns);
  this.dt_ = view;
};

/**
 * Static function that returns either the leaf category (delta=0) or
 * immediate parent (delta=1) from a hierarchical categorization expressed
 * either as a set of comma separated values in a single column,
 * e.g. "World,Europe,Italy", or a set of separate columns, each one holding a
 * value, e.g. "World", "Europe", "Italy".
 *
 * @param {google.visualization.DataTable} dataTable The input datatable.
 * @param {number} rowNum The affected row.
 * @param {number} startColumn The column that contains the hierarchical model
 *     categorization, or the starting index (inclusive) of a column group that
 *     does the same.
 * @param {number=} opt_endColumn The optional end index (exclusive) of a column
 *     group.
 * @param {number} delta
 * @return {string}
 * @private
 */
rhizo.gviz.Initializer.packFunction_ = function(
    dataTable, rowNum, startColumn, opt_endColumn, delta) {
  var categories = rhizo.gviz.Initializer.getRowCategories_(
    dataTable, rowNum, startColumn, opt_endColumn);
  if (categories.length-1-delta < 0) {
    return null;
  } else {
    return categories[categories.length-1-delta];
  }
};

/**
 * Builds a metamodel by inspecting datatable column metadata. For each
 * column a matching metamodel entry is built with a defined label and kind.
 *
 * See the comments in the class constructor for further info about the
 * conventions adopted during parsing.
 *
 * @param {Object.<number, number>} colGroups The column groups found in the
 *     datatable.
 * @return {Object} The visualization metamodel.
 * @private
 */
rhizo.gviz.Initializer.prototype.buildMetaModel_ = function(colGroups) {
  var metamodel = {};
  for (var i = 0, len = this.dt_.getNumberOfColumns(); i < len;) {
    var metamodelKey = null;
    var metamodelEntry = null;
    var parentMetamodelKey = null;
    var parentMetamodelEntry = null;

    if (i in colGroups) {
      // The current column marks the beginning of a column group.
      metamodelKey =
          this.getColumnGroupId_(i, colGroups[i]);
      metamodelEntry = this.buildMetaModelEntry_(metamodelKey, i, colGroups[i]);
      i = colGroups[i]; // jump after the column group
    } else {
      metamodelKey = this.getColumnId_(i);
      metamodelEntry = this.buildMetaModelEntry_(metamodelKey, i);
      i+= 1;

      // Look ahead to determine whether the current column is part of a
      // parent-child definition
      if (i != len && this.isParentColumn_(i)) {
        parentMetamodelKey = this.getColumnId_(i);
        parentMetamodelEntry = this.buildMetaModelEntry_(parentMetamodelKey, i);
        parentMetamodelEntry['isLink'] = true;
        parentMetamodelEntry['linkKey'] = metamodelKey;

        i += 1;
      }
    }

    metamodel[metamodelKey] = metamodelEntry;
    if (parentMetamodelKey) {
      metamodel[parentMetamodelKey] = parentMetamodelEntry;
    }
  }
  return metamodel;
};

/**
 * Builds a single metamodel entry.
 * @param {string} metamodelKey The key this metamodel entry will be associated
 *     to.
 * @param {number} startColumnNum The column to be converted into a metamodel
 *     entry, or the starting index (inclusive) of a column group to be
 *     processed in the same way.
 * @param {number=} opt_endColumnNum The optional end index (exclusive) of a
 *     column group.
 * @return {Object.<string, *>} The metamodel entry.
 * @private
 */
rhizo.gviz.Initializer.prototype.buildMetaModelEntry_ = function(
    metamodelKey, startColumnNum, opt_endColumnNum) {
  var metamodelEntry = {};
  // Assign the label
  metamodelEntry['label'] = this.getColumnLabel_(startColumnNum);

  // Assign the metamodel kind
  if (opt_endColumnNum) {
    // A column group forcefully defines a hierarchical category.
    this.buildMetaModelCategoryEntry_(
        metamodelEntry, startColumnNum, opt_endColumnNum);
  } else {
    var type = this.dt_.getColumnType(startColumnNum);
    if (type == 'number') {
      this.buildMetaModelNumericEntry_(metamodelEntry, startColumnNum);
    } else if (type == 'boolean') {
      metamodelEntry['kind'] = rhizo.meta.Kind.BOOLEAN;
    } else {
      // assumed string type
      if (type != 'string') {
        this.logger_.warn(
            "Column " + metamodelEntry['label'] +
            " will be treated as String. Unsupported type: " + type);
      }
      this.buildMetaModelStringEntry_(metamodelEntry, startColumnNum);
    }
  }

  // Assign autorender attributes, if any
  this.buildAutoRenderInfo_(metamodelKey, metamodelEntry);

  return metamodelEntry;
};

/**
 * Builds a single metamodel entry of rhizo.meta.Kind.STRING kind, unless
 * specific column marking requires it to be treated as a category set.
 *
 * @param {Object.<string, *>} metamodelEntry The metamodel entry to fill.
 * @param {number} columnNum The column to be converted into a metamodel entry.
 * @private
 */
rhizo.gviz.Initializer.prototype.buildMetaModelStringEntry_ = function(
    metamodelEntry, columnNum) {
  var categoryColumn = this.getCategoryColumnData_(columnNum);
  if (categoryColumn) {
    this.buildMetaModelCategoryEntry_(
        metamodelEntry, columnNum, null, categoryColumn);
  } else {
    metamodelEntry['kind'] = rhizo.meta.Kind.STRING;
  }
};

/**
 * Builds a single metamodel entry of rhizo.meta.Kind.NUMBER or
 * rhizo.meta.Kind.RANGE kind.
 *
 * @param {Object.<string, *>} metamodelEntry The metamodel entry to fill.
 * @param {number} columnNum The column to be converted into a metamodel entry.
 * @private
 */
rhizo.gviz.Initializer.prototype.buildMetaModelNumericEntry_ = function(
    metamodelEntry, columnNum) {
  var min = this.dt_.getColumnRange(columnNum).min;
  var max = this.dt_.getColumnRange(columnNum).max;
  if (min == max) {
    metamodelEntry['kind'] = rhizo.meta.Kind.NUMBER;
  } else {
    metamodelEntry['kind'] = rhizo.meta.Kind.RANGE;
    metamodelEntry['min'] = min;
    metamodelEntry['max'] = max;
  }
};

/**
 * Builds a single metamodel entry of rhizo.meta.Kind.CATEGORY kind.
 *
 * @param {Object.<string, *>} metamodelEntry The metamodel entry to fill.
 * @param {number} startColumnNum The column to be converted into a metamodel
 *     entry, or the starting index (inclusive) of a column group to be
 *     processed in the same way.
 * @param {number=} opt_endColumnNum The optional end index (exclusive) of a
 *     column group.
 * @param {Object.<string, boolean>=} opt_categoryColumnData Optional structure
 *     about category information extracted from the column via
 *     getCategoryColumnData_().
 * @private
 */
rhizo.gviz.Initializer.prototype.buildMetaModelCategoryEntry_ = function(
    metamodelEntry, startColumnNum, opt_endColumnNum, opt_categoryColumnData) {
  metamodelEntry['kind'] = rhizo.meta.Kind.CATEGORY;
  metamodelEntry['categories'] = rhizo.gviz.Initializer.getAllCategories_(
      this.dt_, startColumnNum, opt_endColumnNum);
  metamodelEntry['isHierarchy'] = opt_endColumnNum ||
      (opt_categoryColumnData && opt_categoryColumnData['hierarchy']);
  metamodelEntry['multiple'] =
      opt_categoryColumnData && opt_categoryColumnData['multiple'];

  if (opt_categoryColumnData) {
    metamodelEntry['label'] =
        rhizo.gviz.Initializer.stripCategoryTokens_(metamodelEntry['label']);
  }
};


/**
 * Static function to extract a list of all the unique categories found in the
 * specified column (or column group) over the entire datatable.
 *
 * @param {google.visualization.DataTable} datatable The table to inspect.
 * @param {number} startColumnNum The column containing categories, or the
 *     starting index (inclusive) of a column group containing categories.
 * @param {number=} opt_endColumnNum The optional end index (exclusive) of a
 *     column group.
 * @return {Array.<string>} The list of all categories found, in sorted order.
 * @private
 */
rhizo.gviz.Initializer.getAllCategories_ = function(
    datatable, startColumnNum, opt_endColumnNum) {
  var categories = [];

  if (opt_endColumnNum) {
    // Parse categories from a group of columns.
    for (var i = 0, len = datatable.getNumberOfRows(); i < len; i++) {
      for (var j = startColumnNum; j < opt_endColumnNum; j++) {
        categories.push(datatable.getValue(i, j));
      }
    }
  } else {
    // Parse categories from the comma-separated values of a single column.
    for (var i = 0, len = datatable.getNumberOfRows(); i < len; i++) {
      Array.prototype.push.apply(
          categories,
          rhizo.gviz.Initializer.splitCSVCategory_(
              datatable.getValue(i, startColumnNum)));
    }
  }
  return rhizo.gviz.Initializer.cleanCategories_(categories).sort();
};

/**
 * Static function to extract all the categories found in a column (or
 * column group) for a specific row of a datatable.
 *
 * @param {google.visualization.DataTable} datatable The table to inspect.
 * @param {number} rowNum The row to inspect.
 * @param {number} startColumnNum The column containing categories, or the
 *     starting index (inclusive) of a column group containing categories.
 * @param {number=} opt_endColumnNum The optional end index (exclusive) of a
 *     column group.
 * @return {Array.<string>} The list of all categories found.
 * @private
 */
rhizo.gviz.Initializer.getRowCategories_ = function(
    datatable, rowNum, startColumnNum, opt_endColumnNum) {
  var categories = []
  if (opt_endColumnNum) {
    // Loading categories from a column group
    for (var col = startColumnNum; col < opt_endColumnNum; col++) {
      categories.push(datatable.getValue(rowNum, col));
    }
  } else {
    // Parsing a single CSV column.
    categories = rhizo.gviz.Initializer.splitCSVCategory_(
        datatable.getValue(rowNum, startColumnNum));
  }
  return rhizo.gviz.Initializer.cleanCategories_(categories);
}

/**
 * Splits a CSV string which is supposed to contain a list of categories.
 *
 * @param {string} value The string to split.
 * @return {Array.<string>} The split list.
 * @private
 */
rhizo.gviz.Initializer.splitCSVCategory_ = function(value) {
  if (value == null || String(value) == '') {
    return [];
  }
  return String(value).split(',');
};

/**
 * Cleans a list of categories by removing empty entries, duplicates and
 * converting all the contents to (trimmed) string.
 *
 * @param {Array.<string>} categories The list to clean.
 * @return {Array.<string>} The cleaned list.
 * @private
 */
rhizo.gviz.Initializer.cleanCategories_ = function(categories) {
  // Remove empty categories
  var prunedCats = $.grep(categories, function(category) {
    return category != null && String(category) != '';
  });

  // Convert to string, strip spaces and eliminate duplicates.
  var categoriesMap = {};
  for (var i = 0; i < prunedCats.length; i++) {
    categoriesMap[String(prunedCats[i]).replace(/^\s+|\s+$/g, "")] = true;
  }

  // Write to output array.
  var results = [];
  for (var category in categoriesMap) {
    results.push(category);
  }
  return results;
};

/**
 * Assigns autorender options to matching metamodel entries.
 *
 * @param {string} metamodelKey The key of the metamodel entry to inspect.
 * @param {Object.<string, *>} metamodelEntry The metamodel entry to inspect.
 * @private
 */
rhizo.gviz.Initializer.prototype.buildAutoRenderInfo_ =
    function(metamodelKey, metamodelEntry) {
  var ar = {};
  var hasArAttribute = false;
  if (this.options_.autoRenderMasterField() &&
      this.matchAutoRenderOption_(
          this.options_.autoRenderMasterField(),
          metamodelEntry['label'],
          metamodelKey)) {
    ar.master = true;
    hasArAttribute = true;
  }
  if (this.options_.autoRenderSizeField() &&
      this.matchAutoRenderOption_(
          this.options_.autoRenderSizeField(),
          metamodelEntry['label'],
          metamodelKey)) {
    ar.bind = (ar.bind ? ar.bind : '') + 'size ';
    hasArAttribute = true;
  }
  if (this.options_.autoRenderColorField() &&
      this.matchAutoRenderOption_(
          this.options_.autoRenderColorField(),
          metamodelEntry['label'],
          metamodelKey)) {
    ar.bind = (ar.bind ? ar.bind : '') + 'color ';
    hasArAttribute = true;
  }
  if (hasArAttribute) {
    metamodelEntry['ar'] = ar;
  }
};

/**
 * Checks whether a specific autorender option should be applied to the given
 * metamodel entry.
 * @param {string} optionValue A value describing the metamodel entry the
 *     autorender option should be assigned to. Will be matched against either
 *     the metamodel label or id (respectively matching the column label or
 *     id of the underlying datatable the metamodel was generated from).
 * @param {string} label The label of the metamodel entry being checked.
 * @param {string} metamodelKey The key of the metamodel entry being checked.
 * @return {boolean} Whether the autorender option should be applied to this
 *     metamodel entry.
 * @private
 */
rhizo.gviz.Initializer.prototype.matchAutoRenderOption_ =
    function(optionValue, label, metamodelKey) {
  optionValue = optionValue.toLowerCase();
  var colRegExp = /^[a-z]$/;
  if (colRegExp.test(optionValue)) {
    // try matching the column id
    // TODO(battlehorse): Too strictly tailored to the ids Google Spreadsheet
    // assigns to columns ('A', 'B', ...)
    metamodelKey = String(metamodelKey).toLowerCase();
    return metamodelKey == optionValue ||
        // matches if optionValue points to the first column of a group
        metamodelKey.indexOf(optionValue + '__') == 0 ||
        // matches if optionValue points to child column of a parent-child.
        metamodelKey.indexOf('c(' + optionValue + ':') == 0;
  } else {
    // otherwise try to match the column label
    return label.toLowerCase() == optionValue;
  }
};

/**
 * Creates the list of Rhizosphere models from the underlying datatable.
 *
 * @param {Object} metamodel The visualization metamodel
 * @param {Object.<number, number>} colGroups  A mapping from the starting
 *     column (inclusive) to the end column (exclusive) of each column group
 *     found.
 * @private
 */
rhizo.gviz.Initializer.prototype.loadModels_ = function(metamodel, colGroups) {
  var models = [];
  for (var row = 0, len = this.dt_.getNumberOfRows(); row < len; row++) {
    var model = {'id': 'gviz-' + row};
    for (var col = 0, clen = this.dt_.getNumberOfColumns(); col < clen;) {
      if (col in colGroups) {
        // Parsing a column group
        model[this.getColumnGroupId_(col, colGroups[col])] =
          rhizo.gviz.Initializer.getRowCategories_(
              this.dt_, row, col, colGroups[col]);
        col = colGroups[col];  // jump after the column group
      } else {
        // Parse a single column.
        if (metamodel[this.getColumnId_(col)].kind ==
            rhizo.meta.Kind.CATEGORY) {
          model[this.getColumnId_(col)] =
              rhizo.gviz.Initializer.getRowCategories_(this.dt_, row, col);
        } else {
          model[this.getColumnId_(col)] = this.dt_.getValue(row, col);
        }
        col++;
      }
    }
    models.push(model);
  }
  return models;
};

/**
 * Creates the visualization renderer.
 *
 * @param {Object} metamodel The visualization metamodel.
 * @param {Array.<Object>}models The visualization models.
 * @return {rhizo.autorender.AR} The renderer.
 * @private
 */
rhizo.gviz.Initializer.prototype.createDefaultRenderer_ =
    function(metamodel, models) {
  return new rhizo.autorender.AR(metamodel,
                                 models,
                                 this.options_.autoRenderUseDefaults(),
                                 this.options_.autoRenderNumberOfFields());
  // return new rhizo.gviz.DebugRenderer(this.dt_);
};


/**
 * A simple renderer for debug purposes. Not used in real life.
 * @param {google.visualization.DataTable} dataTable
 * @constructor
 */
rhizo.gviz.DebugRenderer = function(dataTable) {
  this.dt_ = dataTable;
};

/**
 * Returns a unique identifier for a specific datatable column.
 * @param {number} columnNum The column number.
 * @return {string} The column id.
 * @private
 */
rhizo.gviz.DebugRenderer.prototype.getColumnId_ = function(columnNum) {
  return this.dt_.getColumnId(columnNum) || ('col_' + columnNum);
};

/**
 * Renders a Rhizosphere model.
 * @param {Object} model
 */
rhizo.gviz.DebugRenderer.prototype.render = function(model) {
  var div = $("<div />");
  for (var j = 0, clen = this.dt_.getNumberOfColumns(); j < clen; j++) {
    div.append("<p>" + model[this.getColumnId_(j)] + "</p>");
  }
  return div;
};
/* ./src/js/rhizo.layout.js */
/**
  @license
  Copyright 2008 The Rhizosphere Authors. All Rights Reserved.

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
 * @fileOverview Support classes for the development of layout engines and
 * implementations for basic Rhizosphere layout engines.
 *
 * To define a new layout:
 * - define a new Javascript class.
 *
 * - implement the layout() function
 *   This is responsible for the actual layouting
 *
 * - implement the toString() function
 *   This returns the layout name for debug purposes
 *
 * - implement the verifyMetaModel() function (optional)
 *   This verifies the current project metaModel and decides whether it
 *   contains the right kinds for this layout to work. If not implemented, it is
 *   assumed the layout can work with the current metamodel.
 *
 * - implement a getState()/setState() function pair (optional).
 *   Handle state management for the layout. The former returns a plain js
 *   object with the layout state information, the latter receives back an
 *   object in the ame format, for the layout to restore itself to a given
 *   state.
 *
 *   The layout can use state information to tweak and let the user customize
 *   its behavior.
 *
 *   It is the layout responsibility to validate any received state. A boolean
 *   should be returned from setState() to declare whether the received state
 *   is well formed or not.
 *
 *   setState() will receive a null state if the layout should be restored to
 *   its 'default' (or initial) state.
 *
 *   The rhizo.layout.StatefulLayout helper class can be used to simplify state
 *   management.
 *
 * - implement the cleanup() function (optional)
 *   If your layout creates data structures or UI components that
 *   have to be cleaned up once the layout is dismissed.
 *
 * - implement the dependentModels() function (optional)
 *   If your layout establish specific relationships between models (this may
 *   be the case, for example, of hierarchical layouts that define parent-child
 *   relationships between models). Rhizosphere may use the information about
 *   dependent models to tweak the way other aspects work, such as selection
 *   management.
 *
 * - register the newly created layout in the rhizo.layout.layouts structure.
 *
 * A layout may have an associated user interface to let the user customize
 * its behavior. To provide a user interface for a layout engine, see
 * rhizo.ui.layout.LayoutUi.
 */

// RHIZODEP=rhizo.log,rhizo.meta,rhizo.layout.shared
namespace("rhizo.layout");


/**
 * Helper superclass to simplify state management for stateful layouts.
 *
 * @param {rhizo.Project} project
 * @constructor
 */
rhizo.layout.StatefulLayout = function(project) {
  this.project_ = project;
  this.state_ = this.defaultState_();
};

/**
 * @return {*} The current layout state.
 */
rhizo.layout.StatefulLayout.prototype.getState = function() {
  return this.state_;
};

/**
 * Transitions the layout to a new state. The received state will be validated
 * before setting it on the layout.
 *
 * @param {*} otherState The state the layout should transition to. If null,
 *     the layout will transition back to its default state.
 * @return {boolean} Whether the state was successfully set or not (for example
 *     because it didn't pass validation checks).
 */
rhizo.layout.StatefulLayout.prototype.setState = function(otherState) {
  if (!otherState) {
    this.state_ = this.defaultState_();
    return true;
  }

  if (!this.validateState_(otherState)) {
    return false;
  } else {
    this.state_ = this.cloneState_(otherState);
    return true;
  }
};

/**
 * Subclasses to override to define default layout state.
 * @return {*} The default, or initial, layout state.
 */
rhizo.layout.StatefulLayout.prototype.defaultState_ = function() {
  return null;
};

/**
 * Subclasses to override to perform layout state validation.
 * @param {*} otherState The state the layout is asked to transition to.
 * @return {boolean} Whether the received state is well formed.
 */
rhizo.layout.StatefulLayout.prototype.validateState_ = function(otherState) {
  return true;
};

/**
 * Helper validation function that checks whether the received state contains
 * a given key.
 * @param {*} otherState The state to validate.
 * @param {string} key The key to find in otherState.
 * @return {boolean} Whether the state satisfies the validation rule.
 */
rhizo.layout.StatefulLayout.prototype.validateStateAttributePresence_ =
    function(otherState, key) {
  if (!(key in otherState)) {
    this.project_.logger().error(
        'State must specify a ' + key + ' attribute');
    return false;
  }
  return true;
};

/**
 * Helper validation function that checks whether a given key (found inside
 * a layout state) is present in the project metamodel and (optionally) whether
 * the key kind satisfies additional constraints.
 *
 * @param {string} key The key to find in the project metamodel.
 * @param {function(string, Object):boolean} opt_matcher Optional function to
 *     decide whether the received key is acceptable, given its associated
 *     metamodel information.
 *     Receives as parametes the key itself and the associated metamodel entry.
 */
rhizo.layout.StatefulLayout.prototype.validateMetamodelPresence_ = function(
    key, opt_matcher) {
  if (!(key in this.project_.metaModel())) {
    this.project_.logger().error(key + ' is not part of the metamodel.');
    return false;
  }
  if (opt_matcher && (!opt_matcher(key, this.project_.metaModel()[key]))) {
    this.project_.logger().error(
        key + ' does not match the required constraints');
    return false;
  }
  return true;
};

/**
 * Clones an externally received state.
 * Subclasses to override to customize the cloning policy, for example to
 * enforce specific casts or type conversion when an external state is set on
 * the layout.
 *
 * @param {*} otherState
 */
rhizo.layout.StatefulLayout.prototype.cloneState_ = function(otherState) {
  return $.extend({}, otherState);
};


/**
 * A no-op layout.
 * @param {rhizo.Project} unused_project
 * @constructor
 */
rhizo.layout.NoLayout = function(unused_project) {};

rhizo.layout.NoLayout.prototype.layout = function() {
  return false;
};

rhizo.layout.NoLayout.prototype.toString = function() {
  return "NoLayout";
};


/**
 * A layout that re-arranges models in random positions within the visible
 * viewport.
 * @param {rhizo.Project} unused_project
 * @constructor
 */
rhizo.layout.ScrambleLayout = function(unused_project) {};

/**
 * Lays out models.
 *
 * @param {rhizo.ui.RenderingPipeline} pipeline The pipeline that
 *     accumulates all the layout operations to perform as part of this layout
 *     request.
 * @param {rhizo.layout.LayoutBox} layoutBox The bounding rectangle inside which
 *     the layout should occur.
 * @param {Array.<rhizo.model.SuperModel>} supermodels List of the SuperModels
 *     that will participate in the layout.
 * @param {Object.<*, rhizo.model.SuperModel>} allmodels A map of all
 *     visualization models, mapping from the model id the associated SuperModel
 *     instance.
 * @param {*} meta The project metamodel.
 * @param {!Object.<string, *>} options Key-value map of layout options. The
 *     set of available options is the same supported by 'layout' eventbus
 *     messages, as described in rhizo.layout.LayoutManager documentation.
 */
rhizo.layout.ScrambleLayout.prototype.layout = function(pipeline,
                                                        layoutBox,
                                                        supermodels,
                                                        allmodels,
                                                        meta,
                                                        options) {
  if (options.filter) {
    return false; // re-layouting because of filtering doesn't affect the layout
  }

  // Randomly distributing models leaving a 5%-wide margin between the models
  // and the container.
  for (var i = 0, len = supermodels.length; i < len; i++) {
    var top = Math.round(layoutBox.height*0.05 +
                         Math.random()*0.85*layoutBox.height);
    var left = Math.round(layoutBox.width*0.05 +
                          Math.random()*0.85*layoutBox.width);

    pipeline.move(supermodels[i].id, top, left);
  }
  return false;
};

rhizo.layout.ScrambleLayout.prototype.toString = function() {
  return "ScrambleLayout";
};


/**
 * A layout that positions models sequentially, left to right, top to bottom.
 *
 * @param {rhizo.Project} project
 * @constructor
 */
rhizo.layout.FlowLayout = function(project) {
  this.project_ = project;

  this.vgutter = parseInt(
      project.options().layoutOptions('flow', 'verticalGutter'), 10);
  if (isNaN(this.vgutter) || this.vgutter < 0) {
    this.vgutter = 5;
  }
  this.top = this.vgutter;

  this.hgutter = parseInt(
      project.options().layoutOptions('flow', 'horizontalGutter'), 10);
  if (isNaN(this.hgutter) || this.hgutter < 0) {
    this.hgutter = 5;
  }
  this.left = this.hgutter;

  rhizo.layout.StatefulLayout.call(this, project);
};
rhizo.inherits(rhizo.layout.FlowLayout, rhizo.layout.StatefulLayout);

/**
 * @private
 */
rhizo.layout.FlowLayout.prototype.defaultState_ = function() {
  return {
    order: rhizo.layout.firstMetamodelKey(this.project_),
    reverse: false
  };
};

/**
 * Validates a layout state. A valid state must have an 'order' property
 * pointing to the metamodel key that will be used as sorting criteria when
 * laying out models.
 *
 * @param {*} otherState
 * @private
 */
rhizo.layout.FlowLayout.prototype.validateState_ = function(otherState) {
  return this.validateStateAttributePresence_(otherState, 'order') &&
      this.validateMetamodelPresence_(otherState.order);
};

/**
 * Lays out models.
 *
 * @param {rhizo.ui.RenderingPipeline} pipeline The pipeline that
 *     accumulates all the layout operations to perform as part of this layout
 *     request.
 * @param {rhizo.layout.LayoutBox} layoutBox The bounding rectangle inside which
 *     the layout should occur.
 * @param {Array.<rhizo.model.SuperModel>} supermodels List of the SuperModels
 *     that will participate in the layout.
 * @param {Object.<*, rhizo.model.SuperModel>} allmodels A map of all
 *     visualization models, mapping from the model id the associated SuperModel
 *     instance.
 * @param {*} meta The project metamodel.
 */
rhizo.layout.FlowLayout.prototype.layout = function(pipeline,
                                                    layoutBox,
                                                    supermodels,
                                                    allmodels,
                                                    meta) {
  var order = this.getState().order;
  var reverse = !!this.getState().reverse;
  var maxWidth = layoutBox.width;
  var lineHeight = 0;

  // reorder supermodels
  supermodels.sort(rhizo.meta.sortBy(order, meta[order].kind, reverse));

  // layout supermodels
  for (var i = 0, len = supermodels.length; i < len; i++) {
    var modelDims = supermodels[i].rendering().getDimensions();
    lineHeight = Math.max(lineHeight, modelDims.height);

    if (this.left + modelDims.width > maxWidth) {
      this.left = this.hgutter;
      this.top += lineHeight + this.vgutter;
      lineHeight = modelDims.height;
    }

    pipeline.move(supermodels[i].id, this.top, this.left);
    this.left += modelDims.width + this.hgutter;
  }
  // adjust top after last line
  this.top += lineHeight;
  return false;
};

rhizo.layout.FlowLayout.prototype.cleanup = function(sameEngine) {
  this.top = this.vgutter;
  this.left = this.hgutter;
  return false;
};

rhizo.layout.FlowLayout.prototype.toString = function() {
  return "FlowLayout";
};


/**
 * A layout that arranges models in buckets.
 * @param {rhizo.Project} project
 * @constructor
 */
rhizo.layout.BucketLayout = function(project) {
  this.project_ = project;
  this.internalFlowLayout_ = new rhizo.layout.FlowLayout(project);
  rhizo.layout.StatefulLayout.call(this, project);
};
rhizo.inherits(rhizo.layout.BucketLayout, rhizo.layout.StatefulLayout);

/**
 * @private
 */
rhizo.layout.BucketLayout.prototype.defaultState_ = function() {
  return {
    bucketBy: rhizo.layout.firstMetamodelKey(this.project_),
    reverse: false
  };
};

/**
 * Validates a layout state. A valid state must have a 'bucketBy' property
 * pointing to the metamodel key that will be used as grouping criteria when
 * laying out models.
 *
 * @param {*} otherState
 * @private
 */
rhizo.layout.BucketLayout.prototype.validateState_ = function(otherState) {
  return this.validateStateAttributePresence_(otherState, 'bucketBy') &&
      this.validateMetamodelPresence_(otherState.bucketBy);
};

/**
 * Lays out models.
 *
 * @param {rhizo.ui.RenderingPipeline} pipeline The pipeline that
 *     accumulates all the layout operations to perform as part of this layout
 *     request.
 * @param {rhizo.layout.LayoutBox} layoutBox The bounding rectangle inside which
 *     the layout should occur.
 * @param {Array.<rhizo.model.SuperModel>} supermodels List of the SuperModels
 *     that will participate in the layout.
 * @param {Object.<*, rhizo.model.SuperModel>} allmodels A map of all
 *     visualization models, mapping from the model id the associated SuperModel
 *     instance.
 * @param {*} meta The project metamodel.
 */
rhizo.layout.BucketLayout.prototype.layout = function(pipeline,
                                                      layoutBox,
                                                      supermodels,
                                                      allmodels,
                                                      meta) {
  var reverse = !!this.getState().reverse;
  var bucketBy = this.getState().bucketBy;
  this.internalFlowLayout_.setState({order: bucketBy, reverse: reverse});

  var clusterFunction;
  var clusterThis;
  if (meta[bucketBy].cluster) {
    clusterFunction = meta[bucketBy].cluster;
    clusterThis = meta[bucketBy];
  } else {
    clusterFunction = meta[bucketBy].kind.cluster;
    clusterThis = meta[bucketBy].kind;
  }
  var buckets = {};
  var bucketsLabels = {};

  // figure out the bucket for each model
  for (var i = 0, len = supermodels.length; i < len; i++) {
    var bucketKey = supermodels[i].unwrap()[bucketBy];
    var bucketLabel = bucketKey;
    if (clusterFunction) {
      var keyLabel = clusterFunction.call(clusterThis, bucketKey);
      bucketKey = keyLabel['key'];
      bucketLabel = keyLabel['label'];
    }
    if (!buckets[bucketKey]) {
      buckets[bucketKey] = [];
      bucketsLabels[bucketKey] = bucketLabel;
    }
    buckets[bucketKey].push(supermodels[i]);
  }

  // collect unique bucketKeys
  var bucketKeys = [];
  for (bucketKey in buckets) {
    bucketKeys.push(bucketKey);
  }

  // sort bucketKeys
  bucketKeys.sort(rhizo.meta.sortByKind(meta[bucketBy].kind, reverse));

  var dirty = false;
  var firstBucket = true;
  for (var i = 0; i < bucketKeys.length; i++) {
    var bucketKey = bucketKeys[i];
    this.renderBucketHeader_(pipeline,
                             bucketsLabels[bucketKey],
                             buckets[bucketKey],
                             firstBucket);
    dirty = this.internalFlowLayout_.layout(pipeline,
                                            layoutBox,
                                            buckets[bucketKey],
                                            allmodels,
                                            meta) || dirty;

    // re-position for next bucket
    this.internalFlowLayout_.top += this.internalFlowLayout_.vgutter * 2;
    this.internalFlowLayout_.left = this.internalFlowLayout_.hgutter;
    firstBucket = false;
  }
  return dirty;
};

/**
 * Renders a bucket header.
 *
 * @param {rhizo.ui.RenderingPipeline} pipeline The pipeline that
 *     accumulates all the layout operations to perform as part of this layout
 *     request.
 * @param {string} header The bucket label.
 * @param {Array.<rhizo.model.SuperModel>} supermodels The supermodels that are
 *     clustered within this bucket.
 * @param {boolean} firstBucket Whether the bucket header being rendered is the
 *     first one or not.
 * @private
 */
rhizo.layout.BucketLayout.prototype.renderBucketHeader_ =
    function(pipeline, header, supermodels, firstBucket) {
  var modelIds = new Array(supermodels.length);
  for (var i = supermodels.length - 1; i >= 0; i--) {
    modelIds[i] =supermodels[i].id;
  }
  var bucketHeader = $('<div />', {
      'class': firstBucket ? 'rhizo-bucket-header rhizo-bucket-first' :
                             'rhizo-bucket-header'});

  bucketHeader.text(header).
               css('position', 'absolute').
               css('left', this.internalFlowLayout_.hgutter).
               css('top', this.internalFlowLayout_.top);
  if (this.project_.options().isClickSelectionMode()) {
    bucketHeader.click(jQuery.proxy(function() {
        this.project_.eventBus().publish(
            'selection', {'action': 'toggle', 'models': modelIds});
        }, this));
  }
  pipeline.artifact(bucketHeader);
  this.internalFlowLayout_.top +=
      bucketHeader.height() + this.internalFlowLayout_.vgutter;
};

rhizo.layout.BucketLayout.prototype.cleanup = function(sameEngine) {
  this.internalFlowLayout_.cleanup(sameEngine);
  return false;
};

rhizo.layout.BucketLayout.prototype.toString = function() {
  return "BucketLayout";
};


/**
 * Enumeration of all available layouts. New layouts should be registered in
 * this enum for Rhizosphere to pick them up.
 */
rhizo.layout.layouts = {
  no: {'name': '-', 'engine': rhizo.layout.NoLayout},
  flow: {'name': 'List', 'engine': rhizo.layout.FlowLayout},
  scramble: {'name': 'Random', 'engine': rhizo.layout.ScrambleLayout},
  bucket: {'name': 'Buckets', 'engine': rhizo.layout.BucketLayout}
};
/* ./src/js/extra/rhizo.ui.meta.extra.js */
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
 * defined in rhizo.meta.extra.js.
 * @author Riccardo Govoni (battlehorse@google.com)
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
/* ./src/js/rhizo.model.manager.js */
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
 * @fileOverview Classes that oversee Rhizosphere model management.
 * @author Riccardo Govoni (battlehorse@google.com)
 */

//RHIZODEP=rhizo.model,rhizo.ui
namespace('rhizo.model');


/**
 * A ModelManager is responsible for keeping track of the models (visualization
 * items) that are currently part of a Rhizosphere visualization and handling
 * their addition and removal.
 *
 * Model addition and removal are triggered by publishing messages on the
 * 'model' channel of the project event bus. The messages are expected in the
 * following format:
 *
 * message = {
 *   action: 'add',
 *   models: [ Object, Object, ... ],
 *   options: {delayLayout: true}
 * };
 *
 * Where each key has the following meaning:
 *
 * - action: The action to perform, 'add' or 'remove'.
 *
 * - models: One or more models to add or remove from the visualization.
 *   New models being added must have an 'id' field that uniquely identifies
 *   them within the visualization. The message won't be processed if invalid
 *   or missing ids are found.
 *   When models are removed, the 'models' parameter can either specify actual
 *   model objects, or just reference them by their id. Invalid or non-existent
 *   ids will be ignored.
 *
 * - options: Additional configuration to tweak the message processing. The
 *   key is optional. Currently supported options are:
 *   - 'delayLayout' (boolean): Whether the refresh of the visualization layout
 *     (to accomodate the newly added or removed models) should be avoided or
 *     not (defaults: false).
 *
 * @param {!rhizo.Project} project The project this model manager belongs to.
 * @constructor
 */
rhizo.model.ModelManager = function(project) {
  /**
   * @type {!rhizo.Project}
   * @private
   */
  this.project_ = project;

  /**
   * @type {rhizo.ui.RenderingBoostrap}
   * @private
   */
  this.renderingBootstrap_ = new rhizo.ui.RenderingBootstrap(
      this.project_.renderer(), this.project_.gui(), this.project_);

  /**
   * The map of all models currently deployed on the visualization, keyed by
   * their unique id.
   *
   * @type {!Object.<string, !rhizo.model.SuperModel>}
   * @private
   */
  this.modelsMap_ = {};

  /**
   * The list of all models currently deployed on the visualization.
   *
   * @type {!Array.<!rhizo.model.SuperModel>}
   * @private
   */
  this.models_ = [];

  this.project_.eventBus().addPreprocessor(
      'model', this.onBeforeModelChange_, this, /* first */ true);
  this.project_.eventBus().subscribe('model', this.onModelChange_, this);
};

/**
 * Returns the list of models that are part of this project. Preferable over
 * modelsMap() for faster iterations.
 *
 * @return {!Array.<!rhizo.model.SuperModel>} The list of models that are part
 *     of this project.
 */
rhizo.model.ModelManager.prototype.models = function() {
  return this.models_;
};

/**
 * Returns the set of models that are part of this project, keyed by their
 * unique id.
 * @return {!Object.<string, rhizo.model.SuperModel>} The set of models that
 *     are part of this project.
 */
rhizo.model.ModelManager.prototype.modelsMap = function() {
  return this.modelsMap_;
};

/**
 * Preprocessing callback invoked whenever a message is published on the
 * 'model' channel. Normalizes the message to mandatorily include an 'action'
 * parameter and ensure that the 'models' key points to an array of
 * SuperModel instances.
 *
 * @param {!Object} message The published message.
 * @param {!function(boolean, string=)} rspCallback Callback to invoke with
 *     the preprocessing outcome.
 * @private
 */
rhizo.model.ModelManager.prototype.onBeforeModelChange_ = function(
    message, rspCallback) {
  var superModels = [];
  var models = message['models'] || [];
  if (!$.isArray(models)) {
    models = [models];
  }

  if (message['action'] == 'remove') {
    superModels = this.extractSuperModelsToRemove_(models);

  } else {  // default action 'add'
    message['action'] = 'add';
    if (!this.createSuperModelsToAdd(models, superModels, rspCallback)) {
      return;
    }
  }

  message['models'] = superModels;
  rspCallback(true);
};

/**
 * Converts a list of (possibly invalid) models or model ids into a list of
 * SuperModel instances that are guaranteed to be part of the visualization.
 *
 * @param {!Array} The list of models (or their ids) to normalize.
 * @return {!Array.<!rhizo.model.SuperModel>} The normalized list of
 *     SuperModel instances matching the input list.
 * @private
 */
rhizo.model.ModelManager.prototype.extractSuperModelsToRemove_ = function(
    models) {
  var superModels = [];
  for (var i = models.length-1; i >= 0; i--) {
    var model = models[i];
    if (model.id) {
      if (model.id in this.modelsMap_) {
        superModels.push(this.modelsMap_[model.id]);
      }
    } else if (model in this.modelsMap_) {
      superModels.push(this.modelsMap_[model]);
    }
  }
  return superModels;
};

/**
 * Validates and a list of model objects to add to the visualization and wraps
 * them into corresponding SuperModel wrappers.
 *
 * @param {!Array} models The models to add to the visualization. Each model
 *     object must have an 'id' field that uniquely identifies it within the
 *     visualization.
 * @param {!Array.<!rhizo.model.SuperModel>} The corresponding SuperModel
 *     wrappers created for each added model.
 * @param {!function(boolean, string=)} rspCallback Callback to invoke with
 *     the validation outcome.
 * @return {boolean} Whether the models passed validation checks.
 * @private
 */
rhizo.model.ModelManager.prototype.createSuperModelsToAdd = function(
    models, superModels, rspCallback) {
  for (var i = 0; i < models.length; i++) {
    var superModel = new rhizo.model.SuperModel(models[i]);
    this.project_.filterManager().applyAllFiltersToModel(superModel);
    superModels.push(superModel);
  }

  // model sanity checking.
  return this.checkModels_(superModels, rspCallback);
};

/**
 * Verify the models' formal correctness, by checking that all the models have
 * an assigned id and no duplicate ids exist.
 *
 * @param {!Array.<!rhizo.model.SuperModel>} modelsToAdd The models to
 *     validate.
 * @param {!function(boolean, string=)} rspCallback Callback to invoke with
 *     the validation outcome.
 * @return {boolean} Whether the models passed validation checks.
 * @private
 */
rhizo.model.ModelManager.prototype.checkModels_ = function(
    modelsToAdd, rspCallback) {
  var uniqueAddedIds = {};
  var missingIds = false;
  for (var i = modelsToAdd.length-1; i >= 0; i--) {
    var id = modelsToAdd[i].id;
    if (typeof(id) == 'undefined') {
      rspCallback(false, 'Missing models\' ids.');
      return false;
    } else {
      if (id in uniqueAddedIds || id in this.modelsMap_) {
        rspCallback(false, 'Verify your models, duplicate id ' + id);
        return false;
      } else {
        uniqueAddedIds[id] = true;
      }
    }
  }
  return true;
};

/**
 * Callback invoked when a model addition or removal request is published on
 * the 'model' channel.
 * @param {!Object} message The published message.
 * @private
 */
rhizo.model.ModelManager.prototype.onModelChange_ = function(message) {
  this.project_.logger().time('ModelManager::onModelChange');
  var superModels = message['models'] || [];
  if (superModels.length > 0) {
    var dirtyVisibility = message['action'] == 'remove' ? 
        this.removeModels_(superModels) : this.addModels_(superModels);
    if (dirtyVisibility && !(message['options'] || {})['delayLayout']) {
      this.project_.layoutManager().forceLayout();
    }
  }
  this.project_.logger().debug(
      this.models_.length + ' models in visualization');
  this.project_.logger().timeEnd('ModelManager::onModelChange');
};

/**
 * Adds a set of models to the visualization.
 * @param {!Array.<!rhizo.model.SuperModel>} superModels The models to add.
 * @return {boolean} Whether the addition caused some affected models to change
 *     their visibility (turned from non-existent to visible), hence requiring a
 *     visibility re-alignment.
 * @private
 */
rhizo.model.ModelManager.prototype.addModels_ = function(superModels) {
  // TODO(battlehorse): handle buildRenderings() failure.
  this.renderingBootstrap_.buildRenderings(superModels);

  var dirtyVisibility = false;
  for (var i = superModels.length-1; i >= 0; i--) {
    this.modelsMap_[superModels[i].id] = superModels[i];
    this.models_.push(superModels[i]);
    dirtyVisibility = superModels[i].isDirtyVisibility() || dirtyVisibility;
  }
  return dirtyVisibility;
};

/**
 * Removes a set of models from the visualization.
 * @param {!Array.<!rhizo.model.SuperModel>} superModels The models to remove.
 * @return {boolean} Whether the removal caused some affected models to change
 *     their visibility (turned from visible to removed), hence requiring a
 *     visibility re-alignment.
 * @private
 */
rhizo.model.ModelManager.prototype.removeModels_ = function(superModels) {
  var dirtyVisibility = false;
  for (var i = superModels.length-1; i >= 0; i--) {
    superModels[i].destroy();
    dirtyVisibility = superModels[i].isDirtyVisibility() || dirtyVisibility;
    delete this.modelsMap_[superModels[i].id];
  }

  // Rebuilds the list of visualization models. Note that this turns any removal
  // into an O(N) operation (which still has acceptable performances, on
  // desktop, for Rhizosphere-sized datasets of XXK datapoints).
  this.models_ = [];
  for (var modelId in this.modelsMap_) {
    this.models_.push(this.modelsMap_[modelId]);
  }
  return dirtyVisibility;
};
/* ./src/js/rhizo.base.js */
/**
  @license
  Copyright 2008 The Rhizosphere Authors. All Rights Reserved.

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

// Global project namespace
// RHIZODEP=rhizo,rhizo.options,rhizo.log,rhizo.model,rhizo.ui,rhizo.layout,rhizo.layout.manager,rhizo.eventbus,rhizo.selection,rhizo.meta.manager,rhizo.state
namespace("rhizo");


/**
 * Projects are the central entities that manage an entire Rhizosphere
 * visualization.
 *
 * @param {!rhizo.ui.gui.GUI} gui The GUI associated to this visualization.
 * @param {!rhizo.Options} options Project-wide configuration options.
 * @constructor
 */
rhizo.Project = function(gui, options) {
  this.metaModelRegistry_ = rhizo.meta.defaultRegistry;

  /**
   * Project-wide configuration options.
   *
   * @type {!rhizo.Options}
   * @private
   */
  this.options_ = options;
  this.gui_ = gui;

  /**
   * The project logger.
   * @private
   */
  this.logger_ = rhizo.log.newLogger(this, this.options_);

  /**
   * Manages transitions in visualization state.
   * @type {rhizo.state.ProjectStateBinder}
   * @private
   */
  this.state_ = null;

  /**
   * The publish/subscribe message dispatcher used by visualization elements
   * and components to communicate across the project.
   *
   * @type {!rhizo.eventbus.EventBus}
   * @private
   */
  this.eventBus_ = new rhizo.eventbus.EventBus(this.logger_);

  /**
   * @type {rhizo.model.ModelManager}
   * @private
   */
  this.modelManager_ = null;

  /**
   * @type {!rhizo.selection.SelectionManager}
   * @private
   */
  this.selectionManager_ = new rhizo.selection.SelectionManager(this);

  /**
   * @type {rhizo.layout.LayoutManager}
   * @private
   */
  this.layoutManager_ = null;

  /**
   * @type {!rhizo.meta.FilterManager}
   * @private
   */
  this.filterManager_ = new rhizo.meta.FilterManager(this);

  /**
   * @type {!rhizo.UserAgent}
   * @private
   */
  this.userAgent_ = new rhizo.UserAgent(this);
};

/**
 * Initializes the Rhizosphere visualization managed by this project from the
 * provided metaModel and renderer (received via configuration options).
 *
 * At this stage Rhizosphere differentiates its UI and logic to match the type
 * of data that will subsequently visualize. This includes configuring the
 * layout and filtering capabilities to match the received metaModel.
 *
 * After this stage, the visualization is ready to perform any operation
 * exposed by the visualization user agent, including model additions and
 * removals.
 *
 * The metaModel formal correctness is verified at this point, by checking that
 * every metaModel entry has a separate kind instance. MetaModels are stateful,
 * so kinds cannot be shared.
 *
 * @return {!Object.<string, *>} An object describing the outcome of the
 *     deployment phase. It contains two keys: 'success', pointing to a
 *     boolean, indicates whether the deployment was successful. 'details',
 *     pointing to a string, contains the error details in case of failure.
 */
rhizo.Project.prototype.deploy = function() {
  var outcome = this.parseOptions_();
  if (!outcome.success) {
    return outcome;
  }

  // Delay instantiation of those managers that depend on the rendering
  // infrastructure to be present to work properly.
  this.modelManager_ = new rhizo.model.ModelManager(this);
  this.layoutManager_ = new rhizo.layout.LayoutManager(this);
  this.layoutManager_.initEngines(rhizo.layout.layouts);

  // Enable HTML5 history (if requested) and rebuild visualization state
  // (either from defaults or from HTML5 history itself).
  // Rebuilding the full state has no visual impact at this point, since
  // the visualization does not contain any models yet.
  var bindings = [];
  if (this.options_.isHTML5HistoryEnabled()) {
    bindings.push(rhizo.state.Bindings.HISTORY);
  }
  rhizo.state.getMasterOverlord().attachProject(this, bindings);
  this.state_ = rhizo.state.getMasterOverlord().projectBinder(this);

  if (this.options_.mustLayoutOnResize()) {
    this.gui_.trackViewportResize(this.layoutManager_);
  }

  return {success: true};
};

/**
 * Extracts and validates the visualization metamodel and renderer as received
 * via configuration options.
 *
 * @return {!Object.<string, *>} An object describing the outcome of the
 *     validation. It contains two keys: 'success', pointing to a boolean,
 *     indicates whether the validation was successful. 'details',
 *     pointing to a string, contains the error details in case of failure.
 * @private
 */
rhizo.Project.prototype.parseOptions_ = function() {
  var outcome = this.parseMetaModel_();
  if (!outcome.success) {
    return outcome;
  }
  outcome = this.parseRenderer_();
  if (!outcome.success) {
    return outcome;
  }
  return {success: true};
};

/**
 * Extracts and validates the visualization metamodel as received via
 * configuration options.
 *
 * @return {!Object.<string, *>} An object describing the outcome of the
 *     validation. It contains two keys: 'success', pointing to a boolean,
 *     indicates whether the validation was successful. 'details',
 *     pointing to a string, contains the error details in case of failure.
 * @private
 */
rhizo.Project.prototype.parseMetaModel_ = function() {
  if (!this.options_.metamodel()) {
    return {
      success: false,
      details: 'Missing metaModel specification'
    };
  }

  // Clone the metamodel so we can manipulate it.
  // Also, merge any fragments that have been defined.
  this.metaModel_ = $.extend(
      {}, this.options_.metamodel(), this.options_.metamodelFragment());

  var allKinds = [];
  for (var key in this.metaModel_) {
    if (!this.metaModel_[key].kind) {
      // Delete all spurious metamodel keys that have no attached kind.
      // This includes, for instance, GWT-generated keys like __gwt_ObjectId.
      // (this implies the cloned metamodel object cannot be passed back to GWT
      // code).
      delete this.metaModel_[key];
    } else {
      // Resolves all 'kind' specifications into metamodel Kind instances.
      // Uses the default kind registry to resolve against.
      if (typeof(this.metaModel_[key].kind) == 'string') {
        this.metaModel_[key].kind = this.metaModelRegistry_.createNewKind(
            this.metaModel_[key].kind, this.metaModel_[key]);
      }
      allKinds.push(this.metaModel_[key].kind);
    }
  }

  // Ensure that there are no shared meta instances in the metaModel, since
  // Kind instances are stateful.
  for (var i = 0; i < allKinds.length; i++) {
    for (var j = i+1; j < allKinds.length; j++) {
      if (allKinds[i] === allKinds[j]) {
        return {
          success: false,
          details: 'Verify your metaModel: shared kind instances.'
        };
      }
    }
  }
  return {success: true};
};

/**
 * Extracts and validates the visualization renderer as received via
 * configuration options.
 *
 * @return {!Object.<string, *>} An object describing the outcome of the
 *     validation. It contains two keys: 'success', pointing to a boolean,
 *     indicates whether the validation was successful. 'details',
 *     pointing to a string, contains the error details in case of failure.
 * @private
 */
rhizo.Project.prototype.parseRenderer_ = function() {
  // TODO(battlehorse): perform a more comprehensive renderer validation.
  if (!this.options_.renderer()) {
    return {
      success: false,
      details: 'Missing renderer'
    };
  }
  this.renderer_ = this.options_.renderer();
  return {success: true};
};

/**
 * Destroys the Rhizosphere visualization managed by this project.
 *
 * This includes removal of all renderings, visualization Chrome and other
 * UI elements, and reverting the DOM element that contains the visualization
 * back to its original state.
 */
rhizo.Project.prototype.destroy = function() {
  rhizo.state.getMasterOverlord().detachProject(this);
  if (this.modelManager_) {
    var models = this.modelManager_.models();
    for (var i = models.length-1; i >= 0; i--) {
      var rendering = models[i].rendering();
      if (rendering) {
        // Give renderings a chance to cleanup.
        rendering.beforeDestroy();
      }
    }
  }
  this.gui_.destroy();
};

/**
 * @return {string} A unique document-wide identifier for this project. We rely
 *     on an unique id being assigned to the HTML element that contains the
 *     visualization this project manages.
 */
rhizo.Project.prototype.uuid = function() {
  return this.gui_.container.attr('id');
};

/**
 * @return {!rhizo.Options} Project-wide configuration options.
 */
rhizo.Project.prototype.options = function() {
  return this.options_;
};

/**
 * Returns the model object matching the given model id.
 * @param {*} id The unique id of the model to retrieve.
 * @return {rhizo.model.SuperModel} The matching model object.
 */
rhizo.Project.prototype.model = function(id) {
  return this.modelManager_.modelsMap()[id];
};

/**
 * Returns the list of models that are part of this project. Preferable over
 * modelsMap() for faster iterations.
 *
 * @return {!Array.<!rhizo.model.SuperModel>} The list of models that are part
 *     of this project.
 */
rhizo.Project.prototype.models = function() {
  return this.modelManager_.models();
};

/**
 * Returns the set of models that are part of this project, keyed by their
 * unique id.
 * @return {!Object.<string, rhizo.model.SuperModel>} The set of models that
 *     are part of this project.
 */
rhizo.Project.prototype.modelsMap = function() {
  return this.modelManager_.modelsMap();
};

rhizo.Project.prototype.metaModel = function() {
  return this.metaModel_;
};

/**
 * Returns the metamodel registry this project uses.
 * @return {!rhizo.meta.KindRegistry} the metamodel registry this project uses.
 */
rhizo.Project.prototype.metaModelRegistry = function() {
  return this.metaModelRegistry_;
};

rhizo.Project.prototype.renderer = function() {
  return this.renderer_;
};

rhizo.Project.prototype.gui = function() {
  return this.gui_;
};

rhizo.Project.prototype.logger = function() {
  return this.logger_;
};

/**
 * Returns the project event bus, that can be used to publish/subscribe to
 * project-wide messages and notifications.
 *
 * @return {!rhizo.eventbus.EventBus} The project event bus.
 */
rhizo.Project.prototype.eventBus = function() {
  return this.eventBus_;
};

/**
 * Returns the project model manager.
 *
 * @return {!rhizo.model.ModelManager} The project model manager.
 */
rhizo.Project.prototype.modelManager = function() {
  return this.modelManager_;
};

/**
 * Returns the project layout manager.
 *
 * @return {!rhizo.layout.LayoutManager} The project layout manager.
 */
rhizo.Project.prototype.layoutManager = function() {
  return this.layoutManager_;
};

/**
 * Returns the project selection manager.
 *
 * @return {!rhizo.selection.SelectionManager} The project selection manager.
 */
rhizo.Project.prototype.selectionManager = function() {
  return this.selectionManager_;
};

/**
 * Returns the project filter manager.
 *
 * @return {!rhizo.meta.FilterManager} The project filter manager.
 */
rhizo.Project.prototype.filterManager = function() {
  return this.filterManager_;
};

/**
 * Returns a UserAgent bound to this project, to programmatically drive the
 * visualization.
 * @return {!rhizo.UserAgent} a UserAgent bound to this project, to
 *     programmatically drive the visualization.
 */
rhizo.Project.prototype.userAgent = function() {
  return this.userAgent_;
};

/**
 * Enables or disables project-wide animations.
 *
 * The decision is based on the number of models the browser has to manipulate
 * (move, hide, show, rescale ...). This includes:
 * - models that are currently visible,
 * - 'unfiltered' models (i.e. number of models that will be visible once
 *   this.filterManager_.alignVisibility() is invoked).
 *
 * If either number is too high, animations are disabled.
 */
rhizo.Project.prototype.alignFx = function() {
  if (!this.options_.areAnimationsEnabled()) {
    this.gui_.disableFx(true);
    return;
  }
  var numUnfilteredModels = 0;
  var numVisibleModels = 0;
  var models = this.modelManager_.models();
  for (var i = models.length-1; i >= 0; i--) {
    var model = models[i];
    if (!model.isFiltered()) {
      numUnfilteredModels++;
    }
    if (model.rendering().visibility >= rhizo.ui.Visibility.GREY) {
      numVisibleModels++;
    }
  }
  this.gui_.disableFx(numUnfilteredModels > 200 ||
                      numVisibleModels > 200);
};


/**
 * The UserAgent is an high-level interface to programmatically drive a
 * Rhizosphere visualization like a user would do. This allows Rhizosphere
 * visualizations to communicate bidirectionally with any other interacting
 * third party existing in the same webpage.
 *
 * @param {!rhizo.Project} project The project this user agent is bound to.
 * @constructor
 */
rhizo.UserAgent = function(project) {
  /**
   * @type {!rhizo.Project}
   * @private
   */
  this.project_ = project;

  /**
   * Lists of listener/callback pairs to invoke whenver a selection, filter or
   * layout messages are published on the project eventbus channel.
   * @type {!Array.<string, !Array.<!Object> >}
   * @private
   */
  this.listeners_ = {
    'selection': [],
    'filter': [],
    'layout': [],
    'model': [],
    'error': [],
    'userAction': []
  };
};

/**
 * Returns the managed project, to let external third-parties have access to
 * the low-level visualization functionalities which are not yet exposed through
 * the UserAgent interface.
 *
 * If possible, refrain from programmatically manage a Rhizosphere visualization
 * by directly accessing its internal project, unless you know what you're
 * doing. Be aware that the underlying Project may change its exposed API
 * without notice: all programmatic interactions needs should be addressed at
 * the UserAgent level.
 *
 * @return {!rhizo.Project} The managed project.
 */
rhizo.UserAgent.prototype.getProject = function() {
  return this.project_;
};

/**
 * Adds a listener that will be notified whenever a selection event occurs on
 * the visualization.
 *
 * @param {!function(Object)} listenerCallback The callback to invoke when a
 *     selection event occurs on the visualization. The callback is passed a
 *     'message' describing the event, in the format outlined by
 *     rhizo.selection.SelectionManager.
 * @param {!Object} listener The object in whose scope ('this') the callback
 *     will be invoked.
 */
rhizo.UserAgent.prototype.addSelectionListener = function(
    listenerCallback, listener) {
  this.subscribe_('selection', listenerCallback, listener);
};

/**
 * Removes one or more listeners registered for selection events.
 * If both parameters are specified, only the specific callback is removed. If
 * only opt_listener is specified, all the callbacks associated to that listener
 * are removed. If neither parameter is specified, all the callbacks associated
 * to selection events are removed.
 *
 * @param {Object=} opt_listener The object whose listeners have to be removed.
 * @param {function(Object)=} opt_listenerCallback The specific listener
 *    callback to remove.
 */
rhizo.UserAgent.prototype.removeSelectionListener = function(
    opt_listener, opt_listenerCallback) {
  this.unsubscribe_('selection', opt_listener, opt_listenerCallback);
};

/**
 * Adds a listener that will be notified whenever a filter event occurs on
 * the visualization.
 *
 * @param {!function(Object)} listenerCallback The callback to invoke when a
 *     filter event occurs on the visualization. The callback is passed a
 *     'message' describing the event, in the format outlined by
 *     rhizo.meta.FilterManager.
 * @param {!Object} listener The object in whose scope ('this') the callback
 *     will be invoked.
 */
rhizo.UserAgent.prototype.addFilterListener = function(
    listenerCallback, listener) {
  this.subscribe_('filter', listenerCallback, listener);
};

/**
 * Removes one or more listeners registered for filter events.
 * If both parameters are specified, only the specific callback is removed. If
 * only opt_listener is specified, all the callbacks associated to that listener
 * are removed. If neither parameter is specified, all the callbacks associated
 * to filter events are removed.
 *
 * @param {Object=} opt_listener The object whose listeners have to be removed.
 * @param {function(Object)=} opt_listenerCallback The specific listener
 *    callback to remove.
 */
rhizo.UserAgent.prototype.removeFilterListener = function(
    opt_listener, opt_listenerCallback) {
  this.unsubscribe_('filter', opt_listener, opt_listenerCallback);
};

/**
 * Adds a listener that will be notified whenever a layout event occurs on
 * the visualization.
 *
 * @param {!function(Object)} listenerCallback The callback to invoke when a
 *     layout occurs on the visualization. The callback is passed a
 *     'message' describing the event, in the format outlined by
 *     rhizo.layout.LayoutManager.
 * @param {!Object} listener The object in whose scope ('this') the callback
 *     will be invoked.
 */
rhizo.UserAgent.prototype.addLayoutListener = function(
    listenerCallback, listener) {
  this.subscribe_('layout', listenerCallback, listener);
};

/**
 * Removes one or more listeners registered for layout events.
 * If both parameters are specified, only the specific callback is removed. If
 * only opt_listener is specified, all the callbacks associated to that listener
 * are removed. If neither parameter is specified, all the callbacks associated
 * to layout events are removed.
 *
 * @param {Object=} opt_listener The object whose listeners have to be removed.
 * @param {function(Object)=} opt_listenerCallback The specific listener
 *    callback to remove.
 */
rhizo.UserAgent.prototype.removeLayoutListener = function(
    opt_listener, opt_listenerCallback) {
  this.unsubscribe_('layout', opt_listener, opt_listenerCallback);
};

/**
 * Adds a listener that will be notified whenever a model event occurs on the
 * visualization.
 *
 * @param {!function(Object)} listenerCallback The callback to invoke when
 *     models are added or removed from the visualization. The callback is
 *     passed a 'message' describing the event, in the format outlined by
 *     rhizo.model.ModelManager.
 * @param {!Object} listener The object in whose scope ('this') the callback
 *     will be invoked.
 */
rhizo.UserAgent.prototype.addModelListener = function(
    listenerCallback, listener) {
  this.subscribe_('model', listenerCallback, listener);
};

/**
 * Removes one or more listeners registered for model events.
 * If both parameters are specified, only the specific callback is removed. If
 * only opt_listener is specified, all the callbacks associated to that listener
 * are removed. If neither parameter is specified, all the callbacks associated
 * to model events are removed.
 *
 * @param {Object=} opt_listener The object whose listeners have to be removed.
 * @param {function(Object)=} opt_listenerCallback The specific listener
 *    callback to remove.
 */
rhizo.UserAgent.prototype.removeModelListener = function(
    opt_listener, opt_listenerCallback) {
  this.unsubscribe_('model', opt_listener, opt_listenerCallback);
};

/**
 * Adds a listener that will be notified whenever an error occurs on the
 * visualization.
 *
 * @param {!function(Object)} listenerCallback The callback to invoke when
 *     errors occur on the visualization. The callback is passed a 'message'
 *     describing the event. The message contains either a 'clear' field
 *     (indicating the desire to clear previous errors) or an 'arguments' field
 *     (pointing to an array of objects representing the error details).
 * @param {!Object} listener The object in whose scope ('this') the callback
 *     will be invoked.
 */
rhizo.UserAgent.prototype.addErrorListener = function(
    listenerCallback, listener) {
  this.subscribe_('error', listenerCallback, listener);
};

/**
 * Removes one or more listeners registered for error events.
 * If both parameters are specified, only the specific callback is removed. If
 * only opt_listener is specified, all the callbacks associated to that listener
 * are removed. If neither parameter is specified, all the callbacks associated
 * to error events are removed.
 *
 * @param {Object=} opt_listener The object whose listeners have to be removed.
 * @param {function(Object)=} opt_listenerCallback The specific listener
 *    callback to remove.
 */
rhizo.UserAgent.prototype.removeErrorListener = function(
    opt_listener, opt_listenerCallback) {
  this.unsubscribe_('error', opt_listener, opt_listenerCallback);
};

/**
 * Adds a listener that will be notified whenever an user action occurs on the
 * visualization. These are particular actions or gestures performed by the
 * user, such as the activation or deactivation of specific UI components, the
 * starting and ending of a selection gesture and more.
 *
 * @param {!function(Object)} listenerCallback The callback to invoke when an
 *     user action occurs on the visualization. The callback is passed a
 *     'message' describing the event. The message contains an 'action' field
 *     that defines the action that occurred, and an arbitrary number of
 *     additional fields containing the action details (if any).
 * @param {!Object} listener The object in whose scope ('this') the callback
 *     will be invoked.
 */
rhizo.UserAgent.prototype.addUserActionListener = function(
    listenerCallback, listener) {
  this.subscribe_('userAction', listenerCallback, listener);
};

/**
 * Removes one or more listeners registered for user action events.
 * If both parameters are specified, only the specific callback is removed. If
 * only opt_listener is specified, all the callbacks associated to that listener
 * are removed. If neither parameter is specified, all the callbacks associated
 * to user action events are removed.
 *
 * @param {Object=} opt_listener The object whose listeners have to be removed.
 * @param {function(Object)=} opt_listenerCallback The specific listener
 *    callback to remove.
 */
rhizo.UserAgent.prototype.removeUserActionListener = function(
    opt_listener, opt_listenerCallback) {
  this.unsubscribe_('userAction', opt_listener, opt_listenerCallback);
};

/**
 * Adds a callback/listener pair to the notification list for events published
 * on the given eventbus channel.
 * @param {string} channel The channel to subscribe to.
 * @param {!function(Object)} listenerCallback listener callback.
 * @param {!Object} listener listener scope ('this').
 * @private
 */
rhizo.UserAgent.prototype.subscribe_ = function(
    channel, listenerCallback, listener) {
  var firstSubscription = this.listeners_[channel].length == 0;
  this.listeners_[channel].push(
      {listener: listener, listenerCallback: listenerCallback});
  if (firstSubscription) {
    this.project_.eventBus().subscribe(channel, function(message) {
      for (var i = 0; i < this.listeners_[channel].length; i++) {
        var l = this.listeners_[channel][i];
        l['listenerCallback'].call(l['listener'], message);
      }
    }, this, /* committed */ true);
  }
};

/**
 * Removes one or more callback/listener pairs from the notification list for
 * events published on the given eventbus channel.
 * If no more listeners exists after the removal, unsubscribes from the eventbus
 * channel altogether.
 *
 * @param {string} channel The channel to unsubscribe from.
 * @param {Object=} opt_listener The object whose listeners have to be removed.
 * @param {function(Object)=} opt_listenerCallback The specific listener
 *    callback to remove.
 */
rhizo.UserAgent.prototype.unsubscribe_ = function(
    channel, opt_listener, opt_listenerCallback) {
  var newListeners = [];
  if (opt_listener) {
    for (var i = 0; i < this.listeners_[channel].length; i++) {
      var listener = this.listeners_[channel][i];
      if (listener['listener'] == opt_listener &&
          (!opt_listenerCallback ||
           opt_listenerCallback == listener['listenerCallback'])) {
        continue;
      }
      newListeners.push(listener);
    }
  }
  this.listeners_[channel] = newListeners;
  if (newListeners.length == 0) {
    this.project_.eventBus().unsubscribe(channel, this);
  }
};

/**
 * Instructs the visualization to perform a selection operation.
 *
 * @param {string} action The operation to perform. See
 *     rhizo.selection.SelectionManager for the list of supported actions.
 * @param {Array.<*>=} opt_models An optional list of model ids the action
 *     should apply to. Not all actions support the parameter. Some actions,
 *     like 'hide' and 'focus' may infer the parameter if unspecified.
 * @param {boolean=} opt_incremental Whether the action should be incremental or
 *     not. Defaults to true if unspecified. Only 'hide' and 'focus' actions
 *     support the options.
 * @param {function(boolean, string=)=} opt_callback An optional callback
 *     invoked after the selection operation has been dispatched. Receives two
 *     parameters: a boolean describing whether the operation was rejected and
 *     an optional string containing the rejection details, if any.
 */
rhizo.UserAgent.prototype.doSelection = function(
    action, opt_models, opt_incremental, opt_callback) {
  var message = {action: action};
  if (opt_models) {
    message['models'] = opt_models;
  }
  if (opt_incremental !== null && opt_incremental != undefined) {
    message['incremental'] = opt_incremental;
  }
  this.project_.eventBus().publish('selection', message, opt_callback, this);
};

/**
 * Instructs the visualization to perform a filter operation. The operation can
 * apply (or remove) multiple filters at the same time.
 *
 * @param {(string|Object.<string, *>)} arg_1 Either a string defining the
 *     single metamodel key the filter should be applied upon (or removed
 *     from), or an Object containing a collection of such keys (and the
 *     associated filter values).
 * @param {(*|function(boolean, string=))=} opt_arg2 If arg_1 is a string, this
 *     should be the value of the filter value to apply. If null is provided,
 *     the filter is instead removed (the same logic applies when multiple
 *     filters are given as an Object in arg_1). If arg_1 is an object, then
 *     this is expected to be the optional callback to invoke after the filter
 *     operation.
 * @param {function(boolean, string=)=} opt_arg3 An optional callback
 *     invoked after the filter operation has been dispatched, if arg_1 is a
 *     string. Receives two parameters: a boolean describing whether the
 *     operation was rejected and an optional string containing the rejection
 *     details, if any.
 */
rhizo.UserAgent.prototype.doFilter = function(arg_1, opt_arg_2, opt_arg_3) {
  if (typeof(arg_1) == 'string') {
    var message = {};
    message[arg_1] = opt_arg_2 || null;
    this.project_.eventBus().publish(
        'filter', message, opt_arg_3 || null, this);
  } else {
    this.project_.eventBus().publish('filter', arg_1, opt_arg_2 || null, this);
  }
};

/**
 * Instructs the visualization to remove all existing filters.
 *
 * @param {function(boolean, string=)=} opt_callback An optional callback
 *     invoked after the filter operation has been dispatched. Receives two
 *     parameters: a boolean describing whether the operation was rejected and
 *     an optional string containing the rejection details, if any.
 */
rhizo.UserAgent.prototype.doResetFilters = function(opt_callback) {
  this.project_.eventBus().publish(
      'filter',
      this.project_.filterManager().filterDiff({}),
      opt_callback,
      this);
};

/**
 * Instructs the visualization to perform a layout operation.
 *
 * @param {string=} opt_engine The layout engine to use. Leave null or
 *     unspecified to re-use the current layout engine. Valid values for this
 *     parameter are all the keys in the rhizo.layout.layouts registry.
 * @param {Object=} opt_state The layout state to use. Each layout engine define
 *     its supported state variables and format. See rhizo.layout.js for each
 *     specific case. Leave null or unspecified to re-use the current layout
 *     state.
 * @param {Array=} opt_positions An array of custom position overrides for
 *     specific model renderings. See rhizo.layout.LayoutManager for the
 *     expected structure of each array entry. Leave unspecified if position
 *     overrides are not needed.
 * @param {Object=} opt_options A set of key-value options to tweak the layout
 *     operation. See rhizo.layout.manager.js for the list of supported options.
 * @param {function(boolean, string=)=} opt_callback An optional callback
 *     invoked after the layout operation has been dispatched. Receives two
 *     parameters: a boolean describing whether the operation was rejected and
 *     an optional string containing the rejection details, if any.
 */
rhizo.UserAgent.prototype.doLayout = function(
    opt_engine, opt_state, opt_positions, opt_options, opt_callback) {
  var message = {};
  if (opt_engine) {
    message['engine'] = opt_engine;
  }
  if (opt_state) {
    message['state'] = opt_state;
  }
  if (opt_positions) {
    message['positions'] = opt_positions;
  }
  if (opt_options) {
    message['options'] = opt_options;
  }
  this.project_.eventBus().publish('layout', message, opt_callback, this);
};

/**
 * Adds one or more models to the visualization.
 *
 * @param {Array|Object} models one or more models to add to the visualization.
 * @param {function(boolean, string=)=} opt_callback An optional callback
 *     invoked after the model addition request has been dispatched. Receives
 *     two parameters: a boolean describing whether the operation was rejected
 *     and an optional string containing the rejection details, if any.
 */
rhizo.UserAgent.prototype.addModels = function(models, opt_callback) {
  this.project_.eventBus().publish('model', {
      'action': 'add',
      'models': models
  }, opt_callback, this);
};

/**
 * Removes one or more models to the visualization.
 *
 * @param {Array|Object} models one or more models to remove from the
 *     visualization. The method accepts a list of model objects or a list of
 *     model ids.
 * @param {function(boolean, string=)=} opt_callback An optional callback
 *     invoked after the model removal request has been dispatched. Receives
 *     two parameters: a boolean describing whether the operation was rejected
 *     and an optional string containing the rejection details, if any.
 */
rhizo.UserAgent.prototype.removeModels = function(models, opt_callback) {
  this.project_.eventBus().publish('model', {
      'action': 'remove',
      'models': models
  }, opt_callback, this);
};

/**
 * Adds one error to the visualization. This would tipycally result in a
 * visual notification shown to the user.
 *
 * @param {Array} args An array containing arbitrary error details.
 * @param {function(boolean, string=)=} opt_callback An optional callback
 *     invoked after the error addition request has been dispatched. Receives
 *     two parameters: a boolean describing whether the operation was rejected
 *     and an optional string containing the rejection details, if any.
 */
rhizo.UserAgent.prototype.addError = function(args, opt_callback) {
  this.project_.eventBus().publish(
      'error', {'arguments': args}, opt_callback, this);
};

/**
 * Clears all visualization errors, if any.
 *
 * @param {function(boolean, string=)=} opt_callback An optional callback
 *     invoked after the error clearing request has been dispatched. Receives
 *     two parameters: a boolean describing whether the operation was rejected
 *     and an optional string containing the rejection details, if any.
 */
rhizo.UserAgent.prototype.clearErrors = function(opt_callback) {
  this.project_.eventBus().publish(
      'error', {'clear': true}, opt_callback, this);
};
/* ./src/js/rhizo.layout.tree.js */
/**
  @license
  Copyright 2008 The Rhizosphere Authors. All Rights Reserved.

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
  The whole TreeLayout depends on the following classes:
  - TreeLayout: the layout itself. It builds the tree structure out of the
    supermodels and, for every root found, draws a tree. Trees are stacked from
    left to right, top to bottom, hence this class uses the 'traditional' set of
    positioning coordinates (top, left, width, height).

  - TreeNode: a simple datastructure representing a node in the tree. It is used
    also to store some rendering information about the node, such as the
    bounding rectangle which can contain the rendering of the node itself and
    all its children

  - TreePainter: the class responsible for drawing each tree (aka, each set of
    nodes connected to a single root). Since trees can be rendered both
    vertically and horizontally, the TreePainter uses and abstract set of
    coordinates :
    * gd: the growing direction
    * od: the opposite direction
    Siblings are appended to the layout following the growing direction.
    Childs are appended to their parents following the opposite direction.

    Hence, in a horizontal tree, _gd_ is left to right and _od_ is top to bottom.
    In a vertical tree, _gd_ is top to bottom and _od_ is left to right.

    Using this abstract set of coordinates allows the TreePainter to re-use the
    same rendering code.
    Utility methods are provided to convert between the 'physical' and
    'abstract' coordinate set.
*/

// RHIZODEP=rhizo.layout,rhizo.ui
namespace('rhizo.layout');


/**
 * A layout that arranges models in a tree structure.
 *
 * @param {rhizo.Project} project
 * @constructor
 */
rhizo.layout.TreeLayout = function(project) {
  this.project_ = project;

  /**
   * The matcher to identify all model attributes where tree structures can be
   * built from.
   * @type {function(string, Object):boolean}
   * @private
   */
  this.matcher_ = rhizo.layout.orMatcher(
      rhizo.layout.linkMatcher, rhizo.layout.hierarchyMatcher);

  /**
   * Map that accumulates all the nodes matching the models being laid out.
   * @type {Object.<string, rhizo.layout.TreeNode>}
   * @private
   */
  this.globalNodesMap_ = null;
  rhizo.layout.StatefulLayout.call(this, project);
};
rhizo.inherits(rhizo.layout.TreeLayout, rhizo.layout.StatefulLayout);


/**
 * Verifies whether this layout can be used, given the project metamodel.
 * The project metamodel must define at least one model attribute that specifies
 * parent-child relationships, so that trees can be built.
 *
 * @param {*} meta The project metamodel.
 */
rhizo.layout.TreeLayout.prototype.verifyMetaModel = function(meta) {
  for (var key in meta) {
    if (this.matcher_(key, meta[key])) {
      return true;
    }
  }
  return false;
};

/**
 * @private
 */
rhizo.layout.TreeLayout.prototype.defaultState_ = function() {
  return {
    direction: 'ver',
    parentKey : rhizo.layout.firstMetamodelKey(
        this.project_, this.matcher_)
  };
};

/**
 * Validates a layout state. A valid state must have a 'parentKey' property
 * pointing to the metamodel key that contains parent-child relationships to
 * create the layout tree.
 *
 * @param {*} otherState
 * @private
 */
rhizo.layout.TreeLayout.prototype.validateState_ = function(otherState) {
  return this.validateStateAttributePresence_(otherState, 'parentKey') &&
         this.validateMetamodelPresence_(
             otherState.parentKey, this.matcher_);
};

/**
 * Lays out models.
 *
 * @param {rhizo.ui.RenderingPipeline} pipeline The pipeline that
 *     accumulates all the layout operations to perform as part of this layout
 *     request.
 * @param {rhizo.layout.LayoutBox} layoutBox The bounding rectangle inside which
 *     the layout should occur.
 * @param {Array.<rhizo.model.SuperModel>} supermodels List of the SuperModels
 *     that will participate in the layout.
 * @param {Object.<*, rhizo.model.SuperModel>} allmodels A map of all
 *     visualization models, mapping from the model id the associated SuperModel
 *     instance.
 * @param {*} meta The project metamodel.
 */
rhizo.layout.TreeLayout.prototype.layout = function(pipeline,
                                                    layoutBox,
                                                    supermodels,
                                                    allmodels,
                                                    meta) {
  var parentKey = this.getState().parentKey;

  // detect rendering direction
  var vertical = this.getState().direction == 'ver';
  this.treePainter_ = new rhizo.layout.TreePainter(this.project_, vertical);

  try {
    // builds the tree model and also checks for validity
    this.globalNodesMap_ = {};
    var roots = new rhizo.layout.newTreeifier(
        parentKey, meta[parentKey]).buildTree(
            supermodels, allmodels, this.globalNodesMap_).childs;

    var drawingOffset = { left: 0, top: 0 };

    var maxHeight = 0;
    for (var id in roots) { // for each root found

      this.treePainter_.fillSyntheticRenderings_(roots[id], pipeline);

      // calculate the bounding rectangle for the whole tree,
      // in gd-od coordinates
      var unrotatedBoundingRect =
          this.treePainter_.calculateBoundingRect_(roots[id]);

      // flip the bounding rectangle back to physical coordinates
      var boundingRect =
          this.treePainter_.toAbsoluteCoords_(unrotatedBoundingRect);

      // 'return carriage' if needed
      if (drawingOffset.left + boundingRect.w > layoutBox.width) {
        drawingOffset.left = 0;
        drawingOffset.top += maxHeight + (maxHeight > 0 ? 5 : 0);
      }

      // Flip the drawing offset back into the gd-od coordinate set
      // and draw the tree.
      this.treePainter_.draw_(
          pipeline, roots[id],
          this.treePainter_.toRelativeCoords_(drawingOffset));

      // update offset positions
      drawingOffset.left += boundingRect.w;
      maxHeight = Math.max(maxHeight, boundingRect.h);
    }
  } catch(e) {
    if (e.name == "TreeCycleException") {
      this.project_.logger().error(e);
    } else {
      throw e;
    }
  }
  return false;
};

rhizo.layout.TreeLayout.prototype.toString = function() {
  return "TreeLayout";
};

rhizo.layout.TreeLayout.prototype.dependentModels = function(modelId) {
  var extension = [];
  var treeNode = this.globalNodesMap_[modelId];
  if (treeNode) {
    treeNode.deepChildsAsArray(extension);
    for (var i = extension.length-1; i >= 0; i--) {
      extension[i] = extension[i].id;
    }
  }
  return extension;
};


/*
  The whole class depends on coordinate transformation between screen
  width-height into the gd-od coordinates.

  +--------> width/left
  |
  |        Vertical layout      Horizontal Layout
  |        +-------> od         +-------> gd
  |        |                    |
  \/       |  [P]               |   +-[P]-+---+
  height   |   |__[c]           |   |     |   |
  top      |   |__[c]           |   [c]   [c] [c]
           \/                   \/
          gd                    od

  This class adopts two different layout variations when rendered vertically
  rather than horizontally.

  When rendered vertically, each parent will always be above, or at the same
  (physical or, equivalently, gd) height as the highest of its children.
  In this way, it looks like childrens are hanging under the parents.
  This is called the 'packed' layout.

  When rendered horizontally, each parent will be positioned evenly in the
  middle along the (phyisical, or, equivalently gd) width of the area occupied
  by all its children. It this way, the tree appears to be balanced.
  This is called the 'even' layout.
*/
/**
 * @param {rhizo.Project} project
 * @param {boolean} vertical Whether to render the tree vertically or
 *     horizontally.
 * @constructor
 */
rhizo.layout.TreePainter = function(project, vertical) {
  this.project_ = project;
  this.vertical_ = vertical;

  // translate coordinate names and distances into gd-od names
  if (this.vertical_) {
    this.gdName_ = 'top';
    this.odName_ = 'left';
    this.gdLength_ = 'height';
    this.odLength_ = 'width';
  } else {
    this.gdName_ = 'left';
    this.odName_ = 'top';
    this.gdLength_ = 'width';
    this.odLength_ = 'height';

  }
};

/**
 * Given the dimensions of a rendering, which is a DOM block element with
 * physical coordinates, return its size in the growing direction.
 *
 * @param {Object.<string, Number>} renderingDims a map describing the
 *     dimensions (width, height) of a model rendering.
 * @returns {number} its dimension in the gd axis
 * @private
 */
rhizo.layout.TreePainter.prototype.gd_ = function(renderingDims) {
  return this.vertical_ ? renderingDims.height : renderingDims.width;
};

/**
 * Given the dimensions of a rendering, which is a DOM block element with
 * physical coordinates, return its size in the opposite direction.
 *
 * @param {Object.<string, Number>} rendering a map describing the
 *     dimensions (width, height) of a model rendering.
 * @returns {number} its dimension in the od axis
 * @private
 */
rhizo.layout.TreePainter.prototype.od_ = function(renderingDims) {
  return this.vertical_ ? renderingDims.width : renderingDims.height;
};

/**
 * Converts gd-od coordinates into a physical width-height pair
 * @private
 */
rhizo.layout.TreePainter.prototype.toAbsoluteCoords_ = function(boundingRect) {
  return this.vertical_ ?
    { w: boundingRect.od , h: boundingRect.gd} :
    { w: boundingRect.gd , h: boundingRect.od};
};

/**
 * Converts a phyisical top-left coordinate into its gd-od equivalent
 * @private
 */
rhizo.layout.TreePainter.prototype.toRelativeCoords_ = function(offset) {
  return this.vertical_ ?
    { gd: offset.top, od: offset.left } :
    { gd: offset.left, od: offset.top };
};

/**
 * Given the dimensions of a rendering, it returns the gd-od coordinate of its
 * center, assuming it is positioned in 'packed' layout.
 * @private
 */
rhizo.layout.TreePainter.prototype.packedCenter_ = function(offset,
                                                            renderingDims) {
  return {
    gd: offset.gd + 5 + this.gd_(renderingDims)/2,
    od: offset.od + this.od_(renderingDims)/2
  };
};

/**
 * Given the dimensions of a rendering, it returns the gd-od coordinate of its
 * center, assuming it is positioned in 'even' layout.
 * @private
 */
rhizo.layout.TreePainter.prototype.evenCenter_ = function(offset,
                                                          renderingDims,
                                                          boundingRect) {
  return {
    gd: offset.gd + boundingRect.gd / 2,
    od: offset.od + 5 + this.od_(renderingDims)/2
  };
};


/**
 * Recursively analyzes a tree node and all its child, creating synthetic
 * renderings for all nodes that are missing one. When a tree node is not backed
 * by any visualization model, e.g. it represents a model categorization but
 * not a full fledged model, a rhizo.ui.SyntheticRendering is created and used
 * in place of the model rendering.
 * @param {rhizo.layout.SyntheticTreeNode} treenode The tree node to inspect.
 * @param {rhizo.ui.RenderingPipeline} pipeline The rendering pipeline that
 *     stores all drawing operations.
 * @private
 */
rhizo.layout.TreePainter.prototype.fillSyntheticRenderings_ = function(
    treenode, pipeline) {
  if (treenode.synthetic() && !treenode.syntheticRendering()) {
    var raw_node = $('<div />', {'class': 'rhizo-tree-syntheticnode'}).
      text(treenode.payload() || 'Everything Else');
    if (this.project_.options().isClickSelectionMode()) {
      raw_node.click(jQuery.proxy(function() {
        var childNodes = [];
        var modelIds = [];
        treenode.deepChildsAsArray(childNodes);
        for (var i = childNodes.length-1; i >= 0; i--) {
          if (!childNodes[i].synthetic()) {
            modelIds.push(childNodes[i].id);
          }
        }
        this.project_.eventBus().publish(
            'selection', {'action': 'toggle', 'models': modelIds});
      }, this));
    }

    // node must be attached to the DOM when creating a SyntheticRendering,
    // hence we push it on the pipeline first.
    pipeline.artifact(raw_node);
    treenode.setSyntheticRendering(new rhizo.ui.SyntheticRendering(raw_node));
  }

  for (var childId in treenode.childs) {
    this.fillSyntheticRenderings_(treenode.childs[childId], pipeline);
  }
};

/**
 * For every node, recursively calculate its bounding rectangle,
 * in gd-od coordinates.
 *
 * @param {rhizo.layout.TreeNode} treenode the node
 * @private
 */
rhizo.layout.TreePainter.prototype.calculateBoundingRect_ = function(treenode) {
  var childsArea = { gd: 0, od: 0};
  for (var childId in treenode.childs) {
    var childRect = this.calculateBoundingRect_(treenode.childs[childId]);
    childsArea.gd += childRect.gd + 5;
    childsArea.od = Math.max(childsArea.od, childRect.od);
  }

  var dims = treenode.renderingDimensions();

  // enrich the treenode with rendering info
  treenode.boundingRect =
    {
      // 20 px padding between node and childs, 5 px padding for the whole rect
      od: this.od_(dims) + childsArea.od + 25,
      gd: Math.max(this.gd_(dims), childsArea.gd) + 5};

  return treenode.boundingRect;
};

/**
 * Recursively draw every node and, if the node is not a root, the connectors to
 * its parent. This method differentiates between the packed and even layouting
 * within the tree.
 *
 * @private
 */
rhizo.layout.TreePainter.prototype.draw_ = function(pipeline,
                                                    treenode,
                                                    offset,
                                                    parentOffset,
                                                    parentNode) {

  var dims = treenode.renderingDimensions();

  // vertical layout stacks items from the top, while the horizontal layout
  // keeps the tree center aligned.
  if (this.vertical_) {
    if (treenode.synthetic()) {
      treenode.syntheticRendering().move(
          offset.gd + 5, offset.od, /* instant */ true);
    } else {
      pipeline.move(treenode.payload().id, offset.gd + 5, offset.od);
    }

    // draw connector if needed
    if (parentOffset != null) {
      this.drawConnector_(pipeline,
        this.packedCenter_(offset, dims),
        this.packedCenter_(parentOffset,
                           parentNode.renderingDimensions()));
    }
  } else {
    if (treenode.synthetic()) {
      treenode.syntheticRendering().move(
          offset.od + 5,
          offset.gd + (treenode.boundingRect.gd - this.gd_(dims))/2,
          /* instant */ true);
    } else {
      pipeline.move(
          treenode.payload().id,
          offset.od + 5,
          offset.gd + (treenode.boundingRect.gd - this.gd_(dims))/2);
    }

    // draw connector if needed
    if (parentOffset != null) {
      this.drawConnector_(pipeline,
        this.evenCenter_(offset, dims, treenode.boundingRect),
        this.evenCenter_(parentOffset,
                         parentNode.renderingDimensions(),
                         parentNode.boundingRect));
    }
  }

  // Renders all the children along the gd direction
  var progressiveGd = offset.gd;
  for (var childId in treenode.childs) {
    var childNode = treenode.childs[childId];

    var childOffset = {
      od: offset.od + this.od_(dims) + 20,
      gd: progressiveGd
    };
    this.draw_(pipeline, childNode, childOffset, offset, treenode);
    progressiveGd += childNode.boundingRect.gd + 5;
  }
};

/**
 * Draws a connector between a node and its parent. A connector is always
 * composed of two segments.
 * A segment along the gd axis and a segment along the od axis.
 *
 * @param curCenter the gd-od coordinate of the center of the current node
 * @param parentCenter the gd-od coordinate of the center of its parent node
 * @private
 */
rhizo.layout.TreePainter.prototype.drawConnector_ = function(pipeline,
                                                             curCenter,
                                                             parentCenter) {
  var gdCssAttrs = {position: 'absolute'};
  gdCssAttrs[this.gdName_] = Math.min(curCenter.gd, parentCenter.gd);
  gdCssAttrs[this.odName_] = parentCenter.od;
  gdCssAttrs[this.odLength_] = 2;
  gdCssAttrs[this.gdLength_] = Math.abs(parentCenter.gd - curCenter.gd);

  var gdconnector = $('<div />', {
                        'class': 'rhizo-tree-connector',
                        css: gdCssAttrs});

  var odCssAttrs = {position: 'absolute'};
  odCssAttrs[this.gdName_] = curCenter.gd;
  odCssAttrs[this.odName_] = parentCenter.od;
  odCssAttrs[this.gdLength_] = 2;
  odCssAttrs[this.odLength_] = Math.abs(parentCenter.od - curCenter.od);

  var odconnector = $('<div />', {
                        'class': 'rhizo-tree-connector',
                        css: odCssAttrs});

  pipeline.artifact(gdconnector);
  pipeline.artifact(odconnector);
};


// register the treelayout in the global layouts list
rhizo.layout.layouts.tree = {'name': 'Tree', 'engine': rhizo.layout.TreeLayout};
/* ./src/js/rhizo.layout.treemap.js */
/**
  @license
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

// RHIZODEP=rhizo.layout,rhizo.ui

namespace("rhizo.layout");
namespace("rhizo.layout.treemap");

// TreeMap Layout.
// Based on the "Squarified Treemaps" algorithm, by Mark Bruls, Kees Huizing,
// and Jarke J. van Wijk (http://tinyurl.com/2eey2zn).
//
// TODO(battlehorse): When expanding and unexpanding a model in this layout, the
// model is re-rendered with its original size, not the one the treemap expects.

/**
 * Enumarates the growing direction of treemap slices (which accumulate treemap
 * nodes either along vertical or horizontal lines).
 * @enum {string}
 */
rhizo.layout.treemap.TreeMapDirection = {
  HOR: 'h',
  VER: 'v'
};


/**
 * A node in the TreeMapLayout. Each node represents a single supermodel and can
 * alter the model rendering to match treemap requirements (such as size and
 * color).
 *
 * It also keeps track of its positioning information within the layout.
 *
 * @constructor
 * @param {rhizo.layout.TreeNode} treenode The TreeNode wrapping the supermodel
 *     this TreeMapNode should bind to (the set of models to layout is converted
 *     to a tree early in the layout process, to support treemap nesting).
 * @param {rhizo.ui.RenderingPipeline} pipeline The pipeline that
 *     accumulates all the layout operations to perform as part of this layout
 *     request.
 * @param {rhizo.Project} project
 * @param {number} areaRatio The squared-pixel to area ratio, to map between
 *     area values as extracted from models and associated pixel dimensions in
 *     the layout representation.
 */
rhizo.layout.treemap.TreeMapNode = function(
    treenode, pipeline, project, areaRatio) {
  this.id = treenode.id;
  this.pipeline_ = pipeline;
  this.project_ = project;
  this.area_ = treenode.area * areaRatio;
  if (isNaN(this.area_) || this.area_ < 0) {
    this.area_ = 0.0;
  }
  this.top_ = 0;
  this.left_ = 0;
  this.width_ = 0;
  this.height_ = 0;

  this.synthetic_ = treenode.synthetic();
  if (this.synthetic_) {
    this.buildSyntheticRendering_(treenode);
    this.hidden_ = false;
  } else {
    this.model_ = treenode.payload();
  }
};

/**
 * Builds a synthetic rendering for the tree node. When a tree node is not
 * backed by any visualization model, e.g. it represents a model categorization
 * but not a full fledged model, a rhizo.ui.SyntheticRendering is created and
 * used in place of the model rendering.
 * @param {rhizo.layout.SyntheticTreeNode} treenode The node to render.
 * @private
 */
rhizo.layout.treemap.TreeMapNode.prototype.buildSyntheticRendering_ = function(
    treenode) {
  var raw_node = $('<div />', {'class': 'rhizo-treemap-syntheticnode'}).
      text(treenode.payload() || 'Everything Else');
  if (this.project_.options().isClickSelectionMode()) {
    raw_node.click(jQuery.proxy(function() {
      var childNodes = [];
      var modelIds = [];
      treenode.deepChildsAsArray(childNodes);
      for (var i = childNodes.length-1; i >= 0; i--) {
        if (!childNodes[i].synthetic()) {
          modelIds.push(childNodes[i].id);
        }
      }
      this.project_.eventBus().publish(
          'selection', {'action': 'toggle', 'models': modelIds});
    }, this));
  }

  // node must be attached to the DOM when creating a SyntheticRendering, hence
  // we push it on the pipeline first.
  this.pipeline_.artifact(raw_node);
  this.syntheticRendering_  = new rhizo.ui.SyntheticRendering(raw_node);
  treenode.setSyntheticRendering(this.syntheticRendering_);
};

rhizo.layout.treemap.TreeMapNode.prototype.area = function() {
  return this.area_;
};

/**
 * Returns whether this treemap node is hidden from layout. Although it may
 * represent a non-filtered (visible) model, the model characteristics can be
 * of such kind to prevent this node from showing (e.g.: too small area).
 */
rhizo.layout.treemap.TreeMapNode.prototype.isHidden = function() {
  return this.synthetic_ ? this.hidden_ : this.model_.isFiltered('__treemap__');
};

rhizo.layout.treemap.TreeMapNode.prototype.hide = function() {
  if (this.synthetic_) {
    this.hidden_ = true;
  } else {
    this.model_.filter('__treemap__');
  }
};

/**
 * Computes the available area within this node available for nesting treemap
 * nodes that are child of this one.
 *
 * Returns a bounding rectangle of zero area is there is not enough space to
 * render nested elements.
 */
rhizo.layout.treemap.TreeMapNode.prototype.nestedBoundingRect = function() {
  // Minimum widths and heights:
  // 24px: 4px padding, retain a minimum width of 20px for rendering nested
  //       contents.
  // 39px: 4px padding, 15px header space, retain a minimum height of 20px for
  //       rendering nested contents.

  if (this.isHidden() || this.width_ < 24 || this.height_ < 39) {
    // Setting boundingRect dimensions to 0 will nullify areaRatio, which in
    // turn zeroes nodes' area, causing them to be hidden.
    return {width: 0, height: 0};
  } else {
    return {
      width: this.width_ - 4,  // 4px left and right padding
      height: this.height_ - 19  // 4px top/bottom padding + 15px header space
    };
  }
};

/**
 * Returns the {x,y} anchor point, with respect to the overall container that
 * contains the whole treemap layout, to which the top-left corner of the
 * nested bounding rectangle should be anchored to.
 */
rhizo.layout.treemap.TreeMapNode.prototype.nestedAnchor = function() {
  return {
    x: this.left_ + 2,  // 2px left padding.
    y: this.top_ + 17  // 2px left padding, 15px header space
  };
};

/**
 * Moves this node model rendering to the given {top, left} coordinates, with
 * respect to the overall container that contains the whole treemap layout.
 *
 * Also alters the rendering z-index for treemap nesting.
 */
rhizo.layout.treemap.TreeMapNode.prototype.move = function(top, left, deepness) {
  this.top_ = Math.round(top);
  this.left_ = Math.round(left);
  if (this.synthetic_) {
    this.syntheticRendering_.move(this.top_, this.left_, /* instant */ true);
    this.syntheticRendering_.pushElevation('__treemap__', deepness);
  } else {
    this.pipeline_.move(this.id, this.top_, this.left_, '__treemap__', deepness);
  }
};

/**
 * Resizes this node model rendering to the desired width and height.
 * @return {boolean} whether the resizing was successful.
 */
rhizo.layout.treemap.TreeMapNode.prototype.resize = function(width, height) {
  if (this.synthetic_) {
    if (!this.syntheticRendering_.canRescaleTo(width, height)) {
      return false;
    }
    this.width_ = width;
    this.height_ = height;
    return this.syntheticRendering_.rescaleRendering(width, height);
  } else if (this.model_.rendering().canRescaleTo(width, height)) {
    this.pipeline_.resize(this.id, width, height);
    this.width_ = width;
    this.height_ = height;
    return true;
  }
  return false;
};

rhizo.layout.treemap.TreeMapNode.prototype.colorWeighted = function(colorRange) {
  if (this.synthetic_) {
    return;
  }
  var colorVal = parseFloat(this.model_.unwrap()[colorRange.meta]);
  if (!isNaN(colorVal)) {
    this.pipeline_.style(
        this.id,
        {backgroundColor: this.toColorScale_(colorVal, colorRange)});
  }
};

rhizo.layout.treemap.TreeMapNode.prototype.color = function(color) {
  if (this.synthetic_) {
    return;
  }
  this.pipeline_.style(this.id, {backgroundColor: color});
};

rhizo.layout.treemap.TreeMapNode.prototype.updateColorRange = function(colorRange) {
  if (this.synthetic_) {
    return;
  }
  var colorVal = parseFloat(this.model_.unwrap()[colorRange.meta]);
  if (!isNaN(colorVal)) {
    colorRange.min = Math.min(colorRange.min, colorVal);
    colorRange.max = Math.max(colorRange.max, colorVal);
  }
};

/**
 * Returns the color to assign to this node in a scale ranging from
 * colorRange.colorMin to colorRange.colorMax, given the respective positioning
 * of this model color attribute within the {colorRange.min, colorRange.max)
 * scale.
 * @private
 */
rhizo.layout.treemap.TreeMapNode.prototype.toColorScale_ = function(
    colorVal, colorRange) {
  var rescaler = colorRange.kind.toUserScale ?
      jQuery.proxy(colorRange.kind.toUserScale, colorRange.kind) :
      function(val) { return val; };
  var channels = ['r', 'g', 'b'];
  var outputColor = {};
  for (var i = 0; i < channels.length; i++) {
    var channel = channels[i];
    outputColor[channel] = colorRange.colorMin[channel] +
      (colorRange.colorMax[channel] - colorRange.colorMin[channel])*
      (rescaler(colorVal) - rescaler(colorRange.min))/(rescaler(colorRange.max) - rescaler(colorRange.min));
  }
  return 'rgb(' + Math.round(outputColor.r) + ',' +
      Math.round(outputColor.g) + ',' +
      Math.round(outputColor.b) + ')';
};


/**
 * A slice is a linear sequence of given length of treemap nodes.
 * The slice span changes dinamically to accomodate new nodes added to it.
 * @constructor
 * @param {number} length
 * @param {rhizo.layout.treemap.TreeMapDirection} direction
 * @param {Object} anchorPoint The {x,y} position of the top left corner of the
 *     slice, with respect to the bounding rectangle this slice was laid into.
 */
rhizo.layout.treemap.TreeMapSlice = function(length, direction, anchorPoint) {
  this.length_ = length;
  this.direction_ = direction;
  this.anchorPoint_ = anchorPoint;
  this.nodes_ = [];
  this.sliceArea_ = 0.0;
  this.minArea_ = Number.MAX_VALUE;
};

rhizo.layout.treemap.TreeMapSlice.prototype.direction = function() {
  return this.direction_;
};

rhizo.layout.treemap.TreeMapSlice.prototype.anchorPoint = function() {
  return this.anchorPoint_;
};

rhizo.layout.treemap.TreeMapSlice.prototype.nodes = function() {
  return this.nodes_;
};

/**
 * @param {rhizo.layout.treemap.TreeMapNode} node
 */
rhizo.layout.treemap.TreeMapSlice.prototype.addNode = function(node) {
  this.nodes_.push(node);
  this.sliceArea_ += node.area();
  this.minArea_ = Math.min(this.minArea_, node.area());
};

/**
 * Returns the slice span, either as it currently is, or as it would if
 * opt_newNode were added to it.
 *
 * @param {rhizo.layout.treemap.TreeMapNode} opt_newNode
 * @return {number}
 */
rhizo.layout.treemap.TreeMapSlice.prototype.span = function(opt_newNode) {
  if (opt_newNode) {
    return (this.sliceArea_ + opt_newNode.area()) / this.length_;
  } else {
    return this.sliceArea_ / this.length_;
  }
};

/**
 * Returns the slice aspect ratio, either as it currently is, or as it would if
 * opt_newNode were added to it.
 *
 * @param {rhizo.layout.treemap.TreeMapNode} opt_newNode
 * @return {number}
 */
rhizo.layout.treemap.TreeMapSlice.prototype.aspectRatio = function(
    opt_newNode) {
  var span = this.span(opt_newNode);
  var ratio = null;
  if (opt_newNode) {
    ratio = Math.min(this.minArea_, opt_newNode.area()) / (1.0 * span * span);
  } else {
    ratio = this.minArea_ / (1.0 * span * span);
  }
  if (ratio < 1) {
    ratio = 1.0 / ratio;
  }
  return ratio;
};

/**
 * Renders all the nodes in the slice. Nodes are moved and resized to match the
 * computed treemap layout. Any node whose rendering characteristics are altered
 * is backed up before changing it.
 *
 * Nodes may be hidden if their area is too small to be relevant for the layout.
 *
 * @param {Object?} anchorDelta The {x,y} position delta to convert node
 *     positioning relative to the slice anchorPoint into absolute positioning
 *     with respect to the overall container that contains the whole treemap
 *     layout.
 * @param {number} deepness The nesting deepness we are currently rendering at.
 * @return {number} The total number of hidden nodes in the slice.
 */
rhizo.layout.treemap.TreeMapSlice.prototype.draw = function(anchorDelta,
                                                            deepness) {
  anchorDelta = anchorDelta || {x:0, y:0};
  var numHiddenModels = 0;
  var t = this.anchorPoint_.y + anchorDelta.y;
  var l = this.anchorPoint_.x + anchorDelta.x;
  for (var i = 0; i < this.nodes_.length; i++) {
    var node = this.nodes_[i];
    if (node.isHidden()) {
      numHiddenModels++;
      continue;
    }
    var span = Math.round(this.span());
    var length = node.area() / this.span();

    if (Math.round(length) == 0 || span == 0) {
      // Hide items that are too small to be displayed on screen
      node.hide();
      numHiddenModels++;
    } else {
      var renderingSize = {};
      if (this.direction_ == rhizo.layout.treemap.TreeMapDirection.HOR) {
        renderingSize['width'] = Math.round(length);
        renderingSize['height'] = span;
      } else {
        renderingSize['width'] = span;
        renderingSize['height'] = Math.round(length);
      }
      if (!node.resize(renderingSize['width'], renderingSize['height'])) {
        node.hide();
        numHiddenModels++;
      } else {
        node.move(t, l, deepness);
      }
    }
    if (this.direction_ == rhizo.layout.treemap.TreeMapDirection.HOR) {
      l += length;
    } else {
      t += length;
    }
  }
  return numHiddenModels;
};


/**
 * A layout that arranges models in treemaps, possibly hierarchical.
 *
 * @param {rhizo.Project} project
 * @constructor
 */
rhizo.layout.TreeMapLayout = function(project) {
  this.project_ = project;
  this.prevColorMeta_ = null;

  /**
   * Map that accumulates all the nodes matching the models being laid out.
   * @type {Object.<string, rhizo.layout.TreeNode>}
   * @private
   */
  this.globalNodesMap_ = {};

  // Number of models that have been hidden specifically by this layout because
  // their area would be too small for display.
  this.numHiddenModels_ = 0;

  /**
   * The matcher to identify all model attributes where tree structures can be
   * built from.
   * @type {function(string, Object):boolean}
   * @private
   */
  this.parentMatcher_ = rhizo.layout.orMatcher(
      rhizo.layout.linkMatcher, rhizo.layout.hierarchyMatcher);

  rhizo.layout.StatefulLayout.call(this, project);
};
rhizo.inherits(rhizo.layout.TreeMapLayout, rhizo.layout.StatefulLayout);

/**
 * Verifies whether this layout can be used, given the project metamodel.
 * The project metamodel must define at least one numeric model attribute that
 * will be used to compute treemap areas.
 *
 * @param {*} meta The project metamodel.
 */
rhizo.layout.TreeMapLayout.prototype.verifyMetaModel = function(meta) {
  for (var key in meta) {
    if (rhizo.layout.numericMatcher(key, meta[key])) {
      return true;
    }
  }
  return false;
};

/**
 * @private
 */
rhizo.layout.TreeMapLayout.prototype.defaultState_ = function() {
  return {
    area: rhizo.layout.firstMetamodelKey(this.project_,
                                         rhizo.layout.numericMatcher),
    color: null,
    parentKey: null
  };
};

/**
 * Validates a layout state. A valid state must have an 'area' property
 * pointing to the numeric metamodel key that will be used to compute treemap
 * areas.
 *
 * It might contain a 'color' property, which must be numeric, that will be
 * used to assign colors to each treemap element.
 *
 * It might contain a 'parentKey' property, which must define parent-child
 * relationships between models, that will be used to create hierarchical
 * nesting in the treemap.
 *
 * @param {*} otherState
 * @private
 */
rhizo.layout.TreeMapLayout.prototype.validateState_ = function(otherState) {
  if (!this.validateStateAttributePresence_(otherState, 'area')) {
    return false;
  }

  if (!this.validateMetamodelPresence_(otherState.area,
                                       rhizo.layout.numericMatcher)) {
    return false;
  }
  if (otherState.color &&
      !(this.validateMetamodelPresence_(otherState.color,
                                        rhizo.layout.numericMatcher))) {
    return false;
  }
  if (otherState.parentKey &&
      !(this.validateMetamodelPresence_(otherState.parentKey,
                                        this.parentMatcher_))) {
    return false;
  }
  return true;
};

/**
 * Lays out models.
 *
 * @param {rhizo.ui.RenderingPipeline} pipeline The pipeline that
 *     accumulates all the layout operations to perform as part of this layout
 *     request.
 * @param {rhizo.layout.LayoutBox} layoutBox The bounding rectangle inside which
 *     the layout should occur.
 * @param {Array.<rhizo.model.SuperModel>} supermodels List of the SuperModels
 *     that will participate in the layout.
 * @param {Object.<*, rhizo.model.SuperModel>} allmodels A map of all
 *     visualization models, mapping from the model id the associated SuperModel
 *     instance.
 * @param {*} meta The project metamodel.
 */
rhizo.layout.TreeMapLayout.prototype.layout = function(pipeline,
                                                       layoutBox,
                                                       supermodels,
                                                       allmodels,
                                                       meta) {
  var areaMeta = this.getState().area;
  var colorMeta = this.getState().color;
  var parentKey = this.getState().parentKey;

  // Restore models that are no longer part of the treemap.
  // Keep track of the last coloring key used, in case we have to restore remove
  // color coding at a later layout run.
  pipeline.backupManager().restore(supermodels,
                                   this.prevColorMeta_ && !colorMeta);
  this.prevColorMeta_ = colorMeta;

  // Revert expanded models, if needed.
  this.revertExpandedModels_(supermodels);

  // Identify whether we are rendering nested treemaps or just a flat one with
  // no hierarchy.
  var treeRoot;
  this.globalNodesMap_ = {};
  if (parentKey) {
    try {
      treeRoot = new rhizo.layout.newTreeifier(
          parentKey, meta[parentKey]).buildTree(
              supermodels, allmodels, this.globalNodesMap_);
    } catch(e) {
      if (e.name == "TreeCycleException") {
        this.project_.logger().error(e);
        return false;
      } else {
        throw e;
      }
    }
  } else {
    // In the flat case, convert everything to a tree, so that we can handle
    // this with the same code that handles the tree case.
    treeRoot = new rhizo.layout.TreeNode();
    for (var i = 0; i < supermodels.length; i++) {
      treeRoot.addChild(new rhizo.layout.ModelTreeNode(supermodels[i]));
    }
  }

  // When nesting treemaps are used, non-leaf nodes ignore their own area, and
  // rather rely on the sum of all the underlying (non-filtered) models.
  this.computeNestedAreas_(treeRoot, areaMeta);

  // Actual layout occurs here.
  this.numHiddenModels_ = this.layoutNestedMap_(
      pipeline,
      {width: layoutBox.width, height: layoutBox.height},
      treeRoot,
      {x:0, y:0},
      /* deepness */ 50);

  // Treemap coloring (if needed).
  // Color ranges are determined by sampling values from:
  // - all visible leaf nodes.
  // - all visible non-leaf nodes whose children are all hidden.
  if (colorMeta) {
    var colorRange = {
      min: Number.MAX_VALUE,
      max: Number.MIN_VALUE,
      meta: colorMeta,
      kind: this.project_.metaModel()[colorMeta].kind,
      colorMin: {r: 237, g: 76, b: 95},
      colorMax: {r: 122, g: 255, b: 115},
      colorGroup: 'white'
    };
    this.computeColorRange_(treeRoot, colorRange);
    this.colorTree_(treeRoot, colorRange);
  }

  // If the layout decided to hide some models, mark visibility as dirty to
  // force a realignment after layout.
  return this.numHiddenModels_ > 0;
};

rhizo.layout.TreeMapLayout.prototype.cleanup = function() {
  if (this.numHiddenModels_ > 0) {
    // There were hidden models, reset their filter and mark visibility as
    // dirty to force visibility alignment.
    this.project_.filterManager().removeFilterFromModels('__treemap__');
    this.numHiddenModels_ = 0;
    return true;
  }
  return false;
};

rhizo.layout.TreeMapLayout.prototype.dependentModels = function(modelId) {
  var extension = [];
  var treeNode = this.globalNodesMap_[modelId];
  if (treeNode) {
    treeNode.deepChildsAsArray(extension);
    for (var i = extension.length-1; i >= 0; i--) {
      extension[i] = extension[i].id;
    }
  }
  return extension;
};

rhizo.layout.TreeMapLayout.prototype.toString = function() {
  return "TreeMapLayout";
};

/**
 * Recursively lay out all the models following the tree structure defined by
 * 'treeRoot'. Each level is laid out before moving to the next (deeper) one,
 * since every level needs bounding rectangles and anchoring information from
 * the above one.
 *
 * @param {rhizo.ui.RenderingPipeline} pipeline The pipeline that
 *     accumulates all the layout operations to perform as part of this layout
 *     request.
 * @param {*} boundingRect An object exposing 'width' and 'height' properties
 *     that define the area this treemap level should cover.
 * @param {rhizo.layout.TreeNode} treeRoot The tree node whose children are to
 *     be laid out, in breadth-first recursive fashion.
 * @param {*} anchorDelta An object exposing 'x' and 'y' properties identifying
 *     the position (with respect to the overall container that contains the
 *     whole treemap layout) to which the top-left corner of the nested bounding
 *     rectangle should be anchored to.
 * @param {number} deepness
 * @return {number} The number of models that this layout wants to hide because
 *     their pixel area is too small to properly display on screen.
 * @private
 */
rhizo.layout.TreeMapLayout.prototype.layoutNestedMap_ = function(
    pipeline, boundingRect, treeRoot, anchorDelta, deepness) {
  var numHiddenModels = 0;

  if (treeRoot.numChilds == 0) {
    return numHiddenModels;
  }

  // Layout all the models at the current hierarchy level.
  var slices = this.layoutFlatMap_(pipeline, boundingRect, treeRoot);
  for (var i = 0; i < slices.length; i++) {

    // Draw the slices at the current level.
    // This also ensures resizing of all the slice nodes, so nested
    // boundingRects can be computed accurately.
    numHiddenModels += slices[i].draw(anchorDelta, deepness);

    // Iterate all over the TreeMapNodes that have been created at this level.
    for (var j = 0; j < slices[i].nodes().length; j++) {
      var node = slices[i].nodes()[j];
      var treenode = treeRoot.childs[node.id];

      // Bind TreeNode and TreeMapNode together (used later for coloring).
      treenode.treemapnode = node;

      // Recurse
      numHiddenModels += this.layoutNestedMap_(pipeline,
                                               node.nestedBoundingRect(),
                                               treenode,
                                               node.nestedAnchor(),
                                               deepness+1,
                                               pipeline);
    }
  }
  return numHiddenModels;
};

/**
 * @private
 * @param {rhizo.layout.TreeNode} firstTreeNode
 * @param {rhizo.layout.TreeNode} secondTreeNode
 */
rhizo.layout.TreeMapLayout.prototype.sortByAreaDesc_ = function(firstTreeNode,
                                                                secondTreeNode) {
  return secondTreeNode.area - firstTreeNode.area;
};

/**
 * Lays out all the given models at the current hierachy according to the
 * treemap algorithm, with no nesting.
 *
 * @param {rhizo.ui.RenderingPipeline} pipeline The pipeline that
 *     accumulates all the layout operations to perform as part of this layout
 *     request.
 * @param {*} boundingRect An object exposing 'width' and 'height' properties
 *     that define the area this treemap level should cover.
 * @param {rhizo.layout.TreeNode} treeRoot The tree node whose children are to
 *     be laid out.
 * @return {Array.<rhizo.layout.treemap.TreeMapSlice>}
 * @private
 */
rhizo.layout.TreeMapLayout.prototype.layoutFlatMap_ = function(pipeline,
                                                               boundingRect,
                                                               treeRoot) {
  var slices = [];

  if (treeRoot.numChilds == 0) {
    return slices;
  }

  var treenodes = treeRoot.childsAsArray();

  // Accumulate area
  var totalArea = 0.0;
  for (var i = 0; i < treenodes.length; i++) {
    totalArea += treenodes[i].area;
  }

  // Compute the ratio between the treemap area and the available pixel region as
  // defined by the boundingRect we will render into.
  var areaRatio;
  if (totalArea > 0) {
      areaRatio = boundingRect.width * boundingRect.height * 1.0 / totalArea;
  }

  // Create the first slice.
  if (boundingRect.width < boundingRect.height) {
    slices.push(new rhizo.layout.treemap.TreeMapSlice(
      boundingRect.width,
      rhizo.layout.treemap.TreeMapDirection.HOR,
      {x:0, y:0}));
  } else {
    slices.push(new rhizo.layout.treemap.TreeMapSlice(
      boundingRect.height,
      rhizo.layout.treemap.TreeMapDirection.VER,
      {x:0, y:0}));
  }
  var currentSlice = slices[0];
  var modelsCount = 0;

  // Sort the models and add the first node to the first slice, to bootstrap
  // the algorithm.
  treenodes.sort(this.sortByAreaDesc_);
  var node = new rhizo.layout.treemap.TreeMapNode(treenodes[modelsCount++],
                                                  pipeline,
                                                  this.project_,
                                                  areaRatio);
  if (node.area() <= 0.0) {
    node.hide();
  }
  currentSlice.addNode(node);

  while (modelsCount < treenodes.length) {
    node = new rhizo.layout.treemap.TreeMapNode(treenodes[modelsCount++],
                                                pipeline,
                                                this.project_,
                                                areaRatio);
    if (node.area() <= 0.0) {
      node.hide();
      currentSlice.addNode(node);
      continue;
    }

    // compute the worst aspect ratio the slice would have if the node were
    // added to the current slice.
    var withAspectRatio = currentSlice.aspectRatio(node);
    var withoutAspectRatio = currentSlice.aspectRatio();

    if (withAspectRatio > withoutAspectRatio) {
      // Create a new slice, in the opposite direction from the current one and
      // update the remainder boundingRect.
      boundingRect = this.getRemainderBoundingRect_(boundingRect, currentSlice);

      var boundingRectSpan =
        currentSlice.direction() == rhizo.layout.treemap.TreeMapDirection.HOR ?
        boundingRect.height : boundingRect.width;

      if (currentSlice.direction() == rhizo.layout.treemap.TreeMapDirection.HOR) {
        currentSlice = new rhizo.layout.treemap.TreeMapSlice(
          boundingRectSpan,
          rhizo.layout.treemap.TreeMapDirection.VER,
          {x:currentSlice.anchorPoint().x,
           y: currentSlice.anchorPoint().y + currentSlice.span()});
      } else {
        currentSlice = new rhizo.layout.treemap.TreeMapSlice(
          boundingRectSpan,
          rhizo.layout.treemap.TreeMapDirection.HOR,
          {x: currentSlice.anchorPoint().x + currentSlice.span(),
           y: currentSlice.anchorPoint().y});
      }
      slices.push(currentSlice);
    }
    currentSlice.addNode(node);

  }
  return slices;
};

rhizo.layout.TreeMapLayout.prototype.getRemainderBoundingRect_ = function(
    boundingRect, slice) {
  var sliceSpan = slice.span();
  if (slice.direction() == rhizo.layout.treemap.TreeMapDirection.HOR) {
    return {width: boundingRect.width,
            height: boundingRect.height - sliceSpan};
  } else {
    return {width: boundingRect.width - sliceSpan,
            height: boundingRect.height};
  }
};

/**
 * Compute the area each node will occupy summing up the area occupied by all
 * childrens. Zeroes any area that cannot be parsed or is negative (causing the
 * associated model to be hidden).
 * @private
 */
rhizo.layout.TreeMapLayout.prototype.computeNestedAreas_ = function(treeNode,
                                                                    areaMeta) {
  if (treeNode.numChilds == 0) {
    // leaf node. Payload is guaranteed to be a SuperModel.
    treeNode.area = parseFloat(treeNode.payload().unwrap()[areaMeta]);
    if (isNaN(treeNode.area) || treeNode.area < 0) {
      // isNaN() occurs when areaMeta is not a numeric property and/or extracted
      // values cannot be converted into a number.
      treeNode.area = 0.0;
    }
  } else {
    var childsArea = 0;
    for (var modelId in treeNode.childs) {
      childsArea += this.computeNestedAreas_(treeNode.childs[modelId], areaMeta);
    }
    treeNode.area = childsArea;
  }
  return treeNode.area;
};

/**
 * Recursively computes the minimum and maximum models' values for the coloring
 * attribute, to be able to later map this range into an RGB color range.
 *
 * The only nodes that participate in coloring are a) visible leaf nodes and
 * b) visible non-leaf nodes whose children are all hidden.
 *
 * @param {rhizo.layout.TreeNode} treeNode The tree node to start recursion from.
 * @param {Object.<string, *>} colorRange A map describing the treemap coloring
 *     range.
 * @private
 */
rhizo.layout.TreeMapLayout.prototype.computeColorRange_ = function(treeNode,
                                                                   colorRange) {
  if (!treeNode.is_root && treeNode.treemapnode.isHidden()) {
    return false;
  }

  // Node is visible.
  if (treeNode.numChilds > 0) {
    var hasVisibleChilds = false;
    for (var modelId in treeNode.childs) {
      // Recurse
      hasVisibleChilds = this.computeColorRange_(
          treeNode.childs[modelId], colorRange) || hasVisibleChilds;
    }
    if (!hasVisibleChilds) {
      if (!treeNode.is_root) {
        treeNode.treemapnode.updateColorRange(colorRange);
      }
    }
  } else if (!treeNode.is_root) {
    // visible leaf node.
    treeNode.treemapnode.updateColorRange(colorRange);
  }
  return true;
};

rhizo.layout.TreeMapLayout.prototype.colorTree_ = function(treeNode,
                                                           colorRange) {
  if (!treeNode.is_root && treeNode.treemapnode.isHidden()) {
    return false;
  }

  // Node is visible
  if (treeNode.numChilds > 0) {
    var hasVisibleChilds = false;
    for (var modelId in treeNode.childs) {
      // Recurse
      hasVisibleChilds = this.colorTree_(
          treeNode.childs[modelId], colorRange) || hasVisibleChilds;
    }
    if (!treeNode.is_root) {
      if (hasVisibleChilds) {
        treeNode.treemapnode.color(colorRange.colorGroup);
      } else {
        treeNode.treemapnode.colorWeighted(colorRange);
      }
    }
  } else if (!treeNode.is_root) {
    // visible leaf node.
    treeNode.treemapnode.colorWeighted(colorRange);
  }
  return true;
};

/**
 * Reverts expanded models to unexpanded status, since the layout takes charge
 * of resizing models directly.
 *
 * @param {Array.<rhizo.model.SuperModel>} supermodels List of models that will
 *     be laid out.
 * @private
 */
rhizo.layout.TreeMapLayout.prototype.revertExpandedModels_ = function(
      supermodels) {
  for (var i = supermodels.length-1; i >= 0; i--) {
    supermodels[i].rendering().setExpanded(false);
  }
};


// register the treemaplayout in global layout list
rhizo.layout.layouts.treemap =
    {'name': 'Treemap', 'engine': rhizo.layout.TreeMapLayout};
/* ./src/js/rhizo.model.loader.js */
/**
  @license
  Copyright 2008 The Rhizosphere Authors. All Rights Reserved.

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
 * @fileOverview Definition of Rhizosphere loaders, and global functions to
 * access the registry of known loaders.
 *
 * A loader is responsible for loading the 3 main components a Rhizosphere
 * visualization needs to be properly displayed:
 *
 * - A list of models: This is the list of data items we want to visualize.
 * - A metamodel: A metamodel describes that attributes and properties that
 *     each model in the above list has. The metamodel is optional if the
 *     visualization has already received one via configuration options.
 * - A renderer: A renderer creates HTML representations of models. The
 *     renderer is optional if the visualization has already received one via
 *     configuration options.
 *
 * A loader is a Javascript object that exposes the following constructor and
 * methods:
 * - A 1-arg constructor that receives the URI of the resource to load as a
 *     parameter.
 * - match():boolean: Decides whether the loader is capable of loading
 *     Rhizosphere models from the given resource URI.
 * - load(function callback, options, logger): Loads Rhizosphere models from the
 *     resource URI and invokes the callback once loading completes. The
 *     callback function accepts the loaded models, the optional metamodel, and
 *     the optional renderer as parameters.
 *     'options' contains visualization-wide configuration options that can be
 *     used to tune the loading. 'logger' is a generic logger that exposes
 *     an API equivalent to the browser console API (see
 *     http://getfirebug.com/logging), including the standard error(), warn()
 *     and info() methods.
 *
 * Loaders should be registered in the rhizo.model.loader.loaders array.
 * When Rhizosphere is bootstrapped with a generic URI and an explicit loader is
 * not specified, it will scan such array to automatically find a suitable
 * loader to use among the known ones.
 */

// RHIZODEP=rhizo.gviz
namespace("rhizo.model.loader");

// Global registry of available loaders.
// Add elements to this array if you want Rhizosphere to be aware of your
// loader when it needs to load a new resource.
rhizo.model.loader.loaders = [];

// Global tracking of existing Javascript loaders, necessary to match the
// JSONP callbacks fired by included scripts to the right loader.
var $globalJSONPLoaderCount = 0;
var $globalJSONPLoaderMap = {};

// Plain Javascript file loader
rhizo.model.loader.JSONP = function(resource) {
  this.resource_ = resource;
  this.loaderCount_ = $globalJSONPLoaderCount++;
  $globalJSONPLoaderMap[this.loaderCount_] = this;
};
rhizo.model.loader.loaders.push(rhizo.model.loader.JSONP);

rhizo.model.loader.JSONP.prototype.match = function() {
  return /\.js$/.test(this.resource_);
};

rhizo.model.loader.JSONP.prototype.load = function(callback,
                                                   unused_options,
                                                   unused_logger) {
  this.callback_ = callback;
  var e = document.createElement("script");
  e.src = this.resource_ +
      '?jsonp=$globalJSONPLoaderMap[' +
      this.loaderCount_ +
      '].loadDone';
  e.type="text/javascript";
  document.getElementsByTagName("head")[0].appendChild(e);

  // we expect the script to contain the code the deploy the project,
  // in addition to just defining models and renderers.
};

rhizo.model.loader.JSONP.prototype.loadDone = function(payload) {
  this.callback_(payload.models,
                 payload.metamodel,
                 payload.renderer);
  $globalJSONPLoaderMap[this.loaderCount_] = null;
};

// Generic Google Visualization API (GViz) loader
rhizo.model.loader.GViz = function(resource) {
  this.resource_ = resource;

  // Expose the resource URI with a friendlier name for Gviz users.
  this.datasource_url = resource;
};
rhizo.model.loader.loaders.push(rhizo.model.loader.GViz);

rhizo.model.loader.GViz.prototype.match = function() {
  // Google Visualizations can be exposed under any URL. We leave to specific
  // implementations the task of matching against known GViz sources.
  return false;
};

rhizo.model.loader.GViz.prototype.load = function(callback, options, logger) {
  // The javascript http://www.google.com/jsapi and the visualization
  // package must be already included in the page and available at this point.
  if (typeof google == 'undefined' ||
      typeof google.visualization == 'undefined') {
    logger.error('Google Visualization APIs not available.');
  } else {
    var query = new google.visualization.Query(this.resource_);
    var that = this;  // needed to propagate this through the Gviz callback.
    query.send(function(response) {
      that.handleQueryResponse_(response, callback, options, logger);
    })
  }
};

rhizo.model.loader.GViz.prototype.handleQueryResponse_ =
    function(response, callback, options, logger) {
  if (response.isError()) {
    logger.error("GViz load failed: " + response.getMessage());
    return;
  }
  var initializer = new rhizo.gviz.Initializer(response.getDataTable(),
                                               logger, options);
  if (initializer.parse()) {
    callback(initializer.models,
             initializer.metamodel,
             initializer.renderer);
  }
};

// Google Spreadsheets loader (which follows the GViz spec).
rhizo.model.loader.GoogleSpreadsheets = function(resource) {
  rhizo.model.loader.GViz.call(this, resource);
};
rhizo.inherits(rhizo.model.loader.GoogleSpreadsheets, rhizo.model.loader.GViz);
rhizo.model.loader.loaders.push(rhizo.model.loader.GoogleSpreadsheets);

rhizo.model.loader.GoogleSpreadsheets.prototype.match = function() {
  return /spreadsheets\d?\.google\.com/.test(this.resource_);
};

// Google Gadgets loader (which follows the GViz spec)
rhizo.model.loader.GoogleGadget = function(unused_resource) {
  rhizo.model.loader.GViz.call(this, unused_resource);
};
rhizo.inherits(rhizo.model.loader.GoogleGadget, rhizo.model.loader.GViz);
rhizo.model.loader.loaders.push(rhizo.model.loader.GoogleGadget);

rhizo.model.loader.GoogleGadget.prototype.match = function() {
  // Google Gadgets can load their data from any URL. This implementation
  // uses a google.visualization.GadgetHelper to extract the datasource URL
  // from the gadget prefs and therefore this loader must be explicitly
  // invoked.
  return false;
};

rhizo.model.loader.GoogleGadget.prototype.load = function(callback,
                                                          options,
                                                          logger) {
  if (typeof google == 'undefined' ||
      typeof google.visualization == 'undefined') {
    logger.error('Google Visualization APIs not available.');
    return;
  }

  if (typeof _IG_Prefs == 'undefined') {
    logger.error('Google Gadget APIs not available.');
    return;
  }

  var prefs = new _IG_Prefs();
  var gadgetHelper = new google.visualization.GadgetHelper();
  var query = gadgetHelper.createQueryFromPrefs(prefs);
  var that = this;  // needed to propagate this through the Gviz callback.
  query.send(function(response) {
    that.handleQueryResponse_(response, callback, options, logger);
  });
};


/**
 * Global function that load a resource containing a Rhizosphere
 * model and handle back the loaded models and associated meta information
 * to the given callback.
 *
 * This method is part of the default Rhizosphere bootstrap sequence (see
 * rhizo.bootstrap.Bootstrap), but can also be invoked explicitly if needed
 * by custom loaders.
 *
 * @param {string} resource the resource to load. Tipically this will be a URL.
 * @param {function(Array.<*>, *, *)} callback Callback function that will be
 *     invoked once the resource has been loaded and all data necessary for a
 *     Rhizosphere visualization (models, metamodel, renderer) are available.
 * @param {!rhizo.Options} options Visualization-wide configuration options.
 * @param {*} logger A logger that exposes info(), error() and warn() logging
 *     functions.
 */
rhizo.model.loader.load = function(resource, callback, options, logger) {
  var loader_ctors = rhizo.model.loader.loaders;

  for (var i = 0; i < loader_ctors.length; i++) {
    var loader = new loader_ctors[i](resource);
    if (loader.match()) {
      loader.load(callback, options, logger);
      return;
    }
  }

  // TODO(battlehorse): The logger here might not be visible to the user
  // (e.g.: native console or NoOpLogger ), should we rely on alert() to
  // make sure the user receives the message?
  logger.error('No loader available for the resource: ' + resource);
};
/* ./src/js/rhizo.ui.layout.js */
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
 * @fileOverview User interfaces for Rhizosphere layout engines and related
 * shared classes. Layout engines' UIs are used to collect user input to
 * configure each layout engine behavior.
 * @author battlehorse@google.com (Riccardo Govoni)
 *
 * To define a layout engine user interface:
 * - define a new Javascript class.
 *
 * - implement a layoutUIControls() function
 *   This renders and returns the layout engine UI.
 *
 * - register for notifications on the 'layout' eventbus channel.
 *   Notifications will be delivered whenever any kind of layout-related
 *   change occurs elsewhere in the project (such as the layout state being
 *   restored to a different value) for the user interface to catch up.
 *
 * - publish layout-affecting user interactions on the 'layout' eventbus
 *   channel, for the rest of the project to catch up on user requests to
 *   modify the managed layout state.
 *
 * The rhizo.ui.layout.LayoutUi base class can be used to simplify ui
 * development.
 */

// RHIZODEP=rhizo,rhizo.layout.shared,rhizo.layout,rhizo.layout.tree,rhizo.layout.treemap
namespace("rhizo.ui.layout");


/**
 * Associates a given class as the user interface for a layout engine.
 *
 * @param {string} engineName The layout engine to associate UI to.
 * @param {function()} uiCtor The constructor function for the UI class.
 */
rhizo.ui.layout.registerUi = function(engineName, uiCtor) {
  if (engineName in rhizo.layout.layouts) {
    rhizo.layout.layouts[engineName]['ui'] = uiCtor;
  }
};


/**
 * Creates a dropdown control that enumerates all the metaModel keys.
 * @param {rhizo.Project} project
 * @param {string} className The classname the dropdown should have.
 * @param {function(string, Object):boolean=} opt_matcher Optional function to
 *     decide whether to include a given metaModel key in the selector.
 *     Receives as parametes the key itself and the associated metamodel entry.
 * @return {Element} the jquery-enhanced HTML dropdown control
 */
rhizo.ui.layout.metaModelKeySelector = function(
    project, className, opt_matcher) {
  var select = $("<select class='" + className + "' />");
  if (project && project.metaModel()) {
    for (var key in project.metaModel()) {
      if (!opt_matcher || opt_matcher(key, project.metaModel()[key])) {
        select.append("<option value='" + key + "'>" +
                      project.metaModel()[key].label + "</option>");
      }
    }
  }
  return select;
};


/**
 * Helper superclass to simplify management of layout engines' user interfaces.
 *
 * @param {rhizo.Project} project The project the engine belongs to.
 * @param {string} engineName The name of the layout engine this UI applies to.
 * @constructor
 */
rhizo.ui.layout.LayoutUi = function(project, engineName) {
  /**
   * jQuery object wrapping the DOM nodes containing the layout engine user
   * interface.
   * @type {*}
   * @private
   */
  this.ui_controls_ = null;

  /**
   * The project this UI belongs to.
   * @type {!rhizo.Project}
   * @private
   */
  this.project_ = project;

  /**
   * The name of the engine this interface pertains to.
   * @type {string}
   * @private
   */
  this.engineName_ = engineName;

  this.project_.eventBus().subscribe('layout', this.onLayout_, this);
};

/**
 * Returns the UI controls associated to this layout engine. Controls are
 * rendered only once, so this method can be invoked multiple times with no
 * side effects.
 *
 * @return {*} Either an HTML node or a jQuery object pointing to it,
 *     collecting the UI controls for this layout.
 */
rhizo.ui.layout.LayoutUi.prototype.layoutUIControls = function() {
  if (!this.ui_controls_) {
    this.ui_controls_ = this.renderControls();
    this.setState(
        this.project_.layoutManager().getEngineState(this.engineName_));
  }
  return this.ui_controls_;
};

/**
 * Callback invoked when a layout-related change occurs on the project.
 * If the change pertains to the layout engine this UI is managing, transitions
 * the UI to the new state as advertised by the received message.
 *
 * @param {Object} message The message describing the layout change. See
 * rhizo.layout.LayoutManager documentation for the expected message structure.
 */
rhizo.ui.layout.LayoutUi.prototype.onLayout_ = function(message) {
  if (message['engine'] != this.engineName_) {
    return;  // Not a message directed to us.
  }
  if (this.ui_controls_ && message['state']) {
    // We can assume the state to be valid since it already passed the
    // LayoutManager preprocessor.
    this.setState(message['state']);
  }
};

/**
 * Stub method for subclasses to override. Returns the user interface for the
 * layout engine this class manages.
 *
 * @return {*} Either an HTML node or a jQuery object pointing to it,
 *     collecting the UI controls for this layout.
 */
rhizo.ui.layout.LayoutUi.prototype.renderControls = function() {
  return null;
};

/**
 * Stub method for subclasses to override. Transitions the layout engine user
 * interface to a new state.
 *
 * @param {Object} state The state to transition the user interface to. The
 *     actual object composition is engine dependent. See
 *     rhizo.layout.StatefulLayout for further info.
 */
rhizo.ui.layout.LayoutUi.prototype.setState = function(state) {};

/**
 * Helper function that subclasses should invoke whenever the layout
 * state changes because of user action on the user interface controls.
 *
 * @param {Object} state The new layout state.
 */
rhizo.ui.layout.LayoutUi.prototype.setStateFromUi = function(state) {
  this.project_.eventBus().publish('layout', {
    engine: this.engineName_,
    state: state,
    // TODO(battlehorse): forcealign should be true only if there are
    // uncommitted filters (i.e. GREY models).
    options: {forcealign: true}
  }, /* callback */ null, this);
};


/**
 * User interface for rhizo.layout.ScrambleLayout layout engine.
 * @param {rhizo.Project} project The project the engine belongs to.
 * @param {string} engineName The name of the layout engine this UI applies to.
 * @constructor
 * @extends rhizo.ui.layout.LayoutUi
 */
rhizo.ui.layout.ScrambleLayoutUi = function(project, engineName) {
  rhizo.ui.layout.LayoutUi.call(this, project, engineName);
};
rhizo.inherits(rhizo.ui.layout.ScrambleLayoutUi, rhizo.ui.layout.LayoutUi);
rhizo.ui.layout.registerUi('scramble', rhizo.ui.layout.ScrambleLayoutUi);

/** @inheritDoc */
rhizo.ui.layout.ScrambleLayoutUi.prototype.renderControls = function() {
  var reshuffle = $('<button />').text('Reshuffle').click(
    jQuery.proxy(function() {
      this.setStateFromUi({});
    }, this));
  return $('<div />').append(reshuffle);
};


/**
 * User interface for rhizo.layout.FlowLayout layout engine.
 * @param {rhizo.Project} project The project the engine belongs to.
 * @param {string} engineName The name of the layout engine this UI applies to.
 * @constructor
 * @extends rhizo.ui.layout.LayoutUi
 */
rhizo.ui.layout.FlowLayoutUi = function(project, engineName) {
  rhizo.ui.layout.LayoutUi.call(this, project, engineName);
  this.project_ = project;
  this.orderSelector_ = null;
  this.reverseCheckbox_ = null;
};
rhizo.inherits(rhizo.ui.layout.FlowLayoutUi, rhizo.ui.layout.LayoutUi);
rhizo.ui.layout.registerUi('flow', rhizo.ui.layout.FlowLayoutUi);

/** @inheritDoc */
rhizo.ui.layout.FlowLayoutUi.prototype.renderControls = function() {
  this.orderSelector_ =  rhizo.ui.layout.metaModelKeySelector(
    this.project_, 'rhizo-flowlayout-order').
      change(jQuery.proxy(this.updateState_, this));
  this.reverseCheckbox_ = $(
    '<input type="checkbox" class="rhizo-flowlayout-desc" />').
      click(jQuery.proxy(this.updateState_, this));

  return $("<div />").
           append("Ordered by: ").
           append(this.orderSelector_).
           append(" desc?").
           append(this.reverseCheckbox_);
};

/** @inheritDoc */
rhizo.ui.layout.FlowLayoutUi.prototype.setState = function(state) {
  this.orderSelector_.val(state.order);
  if (state.reverse) {
    this.reverseCheckbox_.attr('checked', 'checked');
  } else {
    this.reverseCheckbox_.removeAttr('checked');
  }
};

/**
 * Updates the layout state whenever the user modifies the controls.
 * @private
 */
rhizo.ui.layout.FlowLayoutUi.prototype.updateState_ = function() {
  this.setStateFromUi({
    order: this.orderSelector_.val(),
    reverse: this.reverseCheckbox_.is(':checked')
  });
};


/**
 * User interface for rhizo.layout.BucketLayout layout engine.
 * @param {rhizo.Project} project The project the engine belongs to.
 * @param {string} engineName The name of the layout engine this UI applies to.
 * @constructor
 * @extends rhizo.ui.layout.LayoutUi
 */
rhizo.ui.layout.BucketLayoutUi = function(project, engineName) {
  rhizo.ui.layout.LayoutUi.call(this, project, engineName);
  this.project_ = project;
  this.bucketSelector_ = null;
  this.reverseCheckbox_ = null;
};
rhizo.inherits(rhizo.ui.layout.BucketLayoutUi, rhizo.ui.layout.LayoutUi);
rhizo.ui.layout.registerUi('bucket', rhizo.ui.layout.BucketLayoutUi);

/** @inheritDoc */
rhizo.ui.layout.BucketLayoutUi.prototype.renderControls = function() {
  this.bucketSelector_ = rhizo.ui.layout.metaModelKeySelector(
      this.project_, 'rhizo-bucketlayout-bucket').
      change(jQuery.proxy(this.updateState_, this));
  this.reverseCheckbox_ = $('<input type="checkbox" ' +
                            'class="rhizo-bucketlayout-desc" />').
      click(jQuery.proxy(this.updateState_, this));
  return $("<div />").
           append("Group by: ").
           append(this.bucketSelector_).
           append(" desc?").
           append(this.reverseCheckbox_);
};

/** @inheritDoc */
rhizo.ui.layout.BucketLayoutUi.prototype.setState = function(state) {
  this.bucketSelector_.val(state.bucketBy);
  if (state.reverse) {
    this.reverseCheckbox_.attr('checked', 'checked');
  } else {
    this.reverseCheckbox_.removeAttr('checked');
  }
};

/**
 * Updates the layout state whenever the user modifies the controls.
 * @private
 */
rhizo.ui.layout.BucketLayoutUi.prototype.updateState_ = function() {
  this.setStateFromUi({
    bucketBy: this.bucketSelector_.val(),
    reverse: this.reverseCheckbox_.is(':checked')
  });
};


/**
 * User interface for rhizo.layout.TreeLayout layout engine.
 * @param {rhizo.Project} project The project the engine belongs to.
 * @param {string} engineName The name of the layout engine this UI applies to.
 * @constructor
 * @extends rhizo.ui.layout.LayoutUi
 */
rhizo.ui.layout.TreeLayoutUi = function(project, engineName) {
  rhizo.ui.layout.LayoutUi.call(this, project, engineName);
  this.project_ = project;

  this.directionSelector_ = null;
  this.metaModelKeySelector_ = null;

  /**
   * The matcher to identify all model attributes where tree structures can be
   * built from.
   * @type {function(string, Object):boolean}
   * @private
   */
  this.matcher_ = rhizo.layout.orMatcher(
      rhizo.layout.linkMatcher, rhizo.layout.hierarchyMatcher);
};
rhizo.inherits(rhizo.ui.layout.TreeLayoutUi, rhizo.ui.layout.LayoutUi);
rhizo.ui.layout.registerUi('tree', rhizo.ui.layout.TreeLayoutUi);

/** @inheritDoc */
rhizo.ui.layout.TreeLayoutUi.prototype.renderControls = function() {
  var parentKeys = this.getParentKeys_();
  var details = $("<div />");
  if (parentKeys.length == 0) {
    // should never happen because of verifyMetaModel
    details.append("No hierarchical relationships exist");
    return details;
  }

  details.append(" arrange ");
  this.directionSelector_ = $("<select class='rhizo-treelayout-direction' />");
  this.directionSelector_.append("<option value='hor'>Horizontally</option>");
  this.directionSelector_.append("<option value='ver'>Vertically</option>");
  this.directionSelector_.change(jQuery.proxy(this.updateState_, this));
  details.append(this.directionSelector_);

  if (parentKeys.length > 1) {
    this.metaModelKeySelector_ = rhizo.ui.layout.metaModelKeySelector(
        this.project_,
        'rhizo-treelayout-parentKey',
        this.matcher_);
    this.metaModelKeySelector_.change(jQuery.proxy(this.updateState_, this));
    details.append(" by ").append(this.metaModelKeySelector_);
  } else if (parentKeys.length == 1) {
    this.metaModelKeySelector_ =
        $("<input type='hidden' />").val(parentKeys[0]);
  }
  return details;
};

/**
 * @return {Array.<string>} The list of all metamodel keys which can be used
 *     to arrange models in a tree structure, i.e. they either identify
 *     parent-child relationships (see rhizo.layout.linkMatcher) or place
 *     a model in a hierarchical path (see rhizo.layout.hierarchyMatcher).
 * @private
 */
rhizo.ui.layout.TreeLayoutUi.prototype.getParentKeys_ = function() {
  var parentKeys = [];
  for (var key in this.project_.metaModel()) {
    if (this.matcher_(key, this.project_.metaModel()[key])) {
      parentKeys.push(key);
    }
  }
  return parentKeys;
};

/** @inheritDoc */
rhizo.ui.layout.TreeLayoutUi.prototype.setState = function(state) {
  this.directionSelector_.val(state.direction);
  if (this.metaModelKeySelector_) {
    this.metaModelKeySelector_.val(state.parentKey);
  }
};

/**
 * Updates the layout state whenever the user modifies the controls.
 * @private
 */
rhizo.ui.layout.TreeLayoutUi.prototype.updateState_ = function() {
  var state = {
    direction: this.directionSelector_.val()
  };
  if (this.metaModelKeySelector_) {
    state.parentKey = this.metaModelKeySelector_.val();
  }
  this.setStateFromUi(state);
};


/**
 * User interface for rhizo.layout.TreeMapLayout layout engine.
 * @param {rhizo.Project} project The project the engine belongs to.
 * @param {string} engineName The name of the layout engine this UI applies to.
 * @constructor
 * @extends rhizo.ui.layout.LayoutUi
 */
rhizo.ui.layout.TreeMapLayoutUi = function(project, engineName) {
  rhizo.ui.layout.LayoutUi.call(this, project, engineName);
  this.project_ = project;

  this.areaSelector_ = null;
  this.colorSelector_ = null;
  this.parentKeySelector_ = null;

  /**
   * The matcher to identify all model attributes where tree structures can be
   * built from.
   * @type {function(string, Object):boolean}
   * @private
   */
  this.parentMatcher_ = rhizo.layout.orMatcher(
      rhizo.layout.linkMatcher, rhizo.layout.hierarchyMatcher);
};
rhizo.inherits(rhizo.ui.layout.TreeMapLayoutUi, rhizo.ui.layout.LayoutUi);
rhizo.ui.layout.registerUi('treemap', rhizo.ui.layout.TreeMapLayoutUi);

/** @inheritDoc */
rhizo.ui.layout.TreeMapLayoutUi.prototype.renderControls = function() {
  var hasParentKeys = this.checkParentKeys_();
  var details = $('<div />');

  this.areaSelector_ = rhizo.ui.layout.metaModelKeySelector(
      this.project_,
      'rhizo-treemaplayout-area',
      rhizo.layout.numericMatcher).
    change(jQuery.proxy(this.updateState_, this));
  this.colorSelector_ = rhizo.ui.layout.metaModelKeySelector(
      this.project_,
      'rhizo-treemaplayout-color',
      rhizo.layout.numericMatcher).
    append("<option value=''>-</option>").
    change(jQuery.proxy(this.updateState_, this));
  details.
      append(this.renderSelector_('Area: ', this.areaSelector_)).
      append(this.renderSelector_('Color: ', this.colorSelector_));
  if (hasParentKeys) {
    this.parentKeySelector_ = rhizo.ui.layout.metaModelKeySelector(
        this.project_,
        'rhizo-treemaplayout-parentKey',
        this.parentMatcher_).
      append("<option value=''>-</option>").
      change(jQuery.proxy(this.updateState_, this));
    details.append(this.renderSelector_('Group by: ', this.parentKeySelector_));
  }
  return details;
};

/**
 * Renders an option selector, by grouping together a label and a combobox in
 * a single element.
 * @param {string} label Text label to associate to the SELECT element.
 * @param {*} selector jQuery object pointing to a SELECT element.
 * @return {*} JQuery object pointing to the grouped control.
 * @private
 */
rhizo.ui.layout.TreeMapLayoutUi.prototype.renderSelector_ = function(
    label, selector) {
  return $('<div />', {'class': 'rhizo-layout-control'}).
      append($('<label />').text(label)).append(selector);
};

/**
 * Checks whether the project metamodel contains keys that define parent-child
 * relationships between models, so that hierarchical treemaps can be built.
 * @return {boolean} Whether the project allows hierarchical treemaps or not.
 * @private
 */
rhizo.ui.layout.TreeMapLayoutUi.prototype.checkParentKeys_ = function() {
  for (var key in this.project_.metaModel()) {
    if (this.parentMatcher_(key, this.project_.metaModel()[key])) {
      return true;
    }
  }
  return false;
};

/** @inheritDoc */
rhizo.ui.layout.TreeMapLayoutUi.prototype.setState = function(state) {
  this.areaSelector_.val(state.area);
  this.colorSelector_.val(state.color || '');  // color is optional
  if (this.parentKeySelector_) {
    this.parentKeySelector_.val(state.parentKey || '');  // parent is optional.
  }
};

/**
 * Updates the layout state whenever the user modifies the controls.
 * @private
 */
rhizo.ui.layout.TreeMapLayoutUi.prototype.updateState_ = function() {
  var state = {
    area: this.areaSelector_.val(),
    color: this.colorSelector_.val()
  };
  if (this.parentKeySelector_) {
    state.parentKey = this.parentKeySelector_.val();
  }
  this.setStateFromUi(state);
};
/* ./src/js/rhizo.ui.component.js */
/**
  @license
  Copyright 2009 The Rhizosphere Authors. All Rights Reserved.

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
 * === Components and Templates
 *
 * This file contains the building blocks of the Rhizosphere UI:
 *
 * = Components:
 *   a Component is a single UI control (e.g. the layout selector or the filters
 *   container) that can be plugged into the Rhizosphere UI.
 *
 *   Components follow a simple lifecycle that mimics the loading phase of a
 *   Rhizosphere visualization:
 *   - initialization
 *   - render: Only the static aspects of the visualization are available at
 *     this point. The component defines its html skeleton.
 *   - metaReady: The component can use information about the visualization
 *     metamodel and renderer.
 *   - ready: The visualization is fully loaded, including models, and ready
 *     to use.
 *
 *   The lifecycle can terminate early if the visualization input is malformed.
 *   Components should provide an interface as functional as possible for
 *   each lifecycle state.
 *
 * = Containers:
 *   an extension of Component that allows the container to include other
 *   components within itself.
 *
 * = Templates
 *   a Template is a specialized Container that defines an entire Rhizosphere
 *   UI. It extends Container by ensuring that the visualization has a Viewport
 *   (which is the only mandatory part of a visualization) and includes extra
 *   features like UI feedback of the loading sequence.
 *
 *   Every visualization has a template attached to it. Every template should
 *   inherit from the rhizo.ui.component.Template base class.
 *
 * New templates can be registered by adding a factory method to the
 * rhizo.ui.component.templates enumeration.
 */

// RHIZODEP=rhizo.ui,rhizo.ui.layout
// Components Namespace
namespace("rhizo.ui.component");


/**
 * Progress-bar to handle visualization startup feedback.
 * @constructor
 */
rhizo.ui.component.Progress = function() {};

/**
 * Initializes and renders the progress bar.
 * @param {*} container jQuery object pointing to the element to which add the
 *   progress bar.
 */
rhizo.ui.component.Progress.prototype.render = function(container) {
  this.pbarPanel_ = $('<div/>', {'class': 'rhizo-progressbar-panel'}).
      appendTo(container);

  // center the progress bar.
  this.pbarPanel_.css({
    'top': Math.round((container.height() - this.pbarPanel_.height()) / 2),
    'left': Math.round((container.width() - this.pbarPanel_.width()) / 2)
  });
  var pbar = $('<div/>', {'class': 'rhizo-progressbar'}).
      appendTo(this.pbarPanel_);
  this.pbar_ = pbar.progressbar({value: 1});
  this.pbarText_ = $('<div/>', {'class': 'rhizo-progressbar-text'}).
      text('Loading...').
      appendTo(this.pbarPanel_);
};

/**
 * Updates the progress bar to a new value.
 * @param {number} value The new value to set. If greater or equal than 100, the
 *     task is assumed to be completed and the progressbar is removed.
 * @param {?string} opt_text An optional descriptive text to describe the
 *     current status.
 */
rhizo.ui.component.Progress.prototype.update = function(value, opt_text) {
  this.pbar_.progressbar('value', value);
  if (opt_text) {
    this.pbarText_.text(opt_text);
  }
  if (value >= 100) {
    this.destroy();
  }
};

/**
 * Destroys the progress bar.
 */
rhizo.ui.component.Progress.prototype.destroy = function() {
  if (this.pbarPanel_.is(':visible')) {
    setTimeout(jQuery.proxy(function() {
      this.pbarPanel_.fadeOut(function() {
        $(this).remove();
      });
    }, this), 1000);
  } else {
    this.pbarPanel_.remove();
  }
};


/* ==== Phases other enums ==== */


/**
 * Enumeration of the phases of a component lifecycle.
 * @enum {number}
 */
rhizo.ui.component.Phase = {
  INIT: 0,
  RENDER: 1,
  METAREADY: 2,
  READY: 3
};


/* ==== Component, Container, Template definition ==== */


/**
 * Defines a Component, the basic building block of the Rhizosphere UI.
 *
 * @param {!rhizo.Project} project The project this component belongs to.
 * @param {?string} opt_key Optional key the component will use to register
 *     itself with the project GUI.
 * @constructor
 */
rhizo.ui.component.Component = function(project, opt_key) {
  this.project_ = project;
  this.gui_ = project.gui();
  this.key_ = opt_key;
};

/**
 * @return {?string} The registration key of this component, if any. The
 *     registration key can be used to uniquely identify this component
 *     among all the ones registered with the project GUI.
 */
rhizo.ui.component.Component.prototype.key = function() {
  return this.key_;
};

/**
 * @return {?string} The component title, if defined. Subclasses should
 *     override. The containing template or container can use this information
 *     to visually separate this component from others.
 */
rhizo.ui.component.Component.prototype.title = function() {
  return null;
};

/**
 * @return {?string} The CSS class to assign to the component title. Subclasses
 *     should override.
 */
rhizo.ui.component.Component.prototype.titleClass = function() {
  return null;
};

/**
 * Renders the component. Subclasses should override to define the HTML
 * skeleton of the component.
 *
 * When this method is invoked, only static information about the visualization
 * are known. The project models, metamodel and renderer are not defined yet.
 *
 * Components should define their entire HTML structure here, and activate it
 * in later phases (metaReady, ready) depending on the minimum information
 * needed to proceed.
 *
 * @return {Array.<HTMLElement>|HTMLElement} The set of elements (can be one
 *     or more) that define the component structure.
 */
rhizo.ui.component.Component.prototype.render = function() {
  return $('<div />').get(0);
};

/**
 * Callback method that notifies that the project metamodel and renderer are
 * now known. Subclasses should extend to enrich the component with
 * functionality that depends on the metamodel and renderer presence.
 */
rhizo.ui.component.Component.prototype.metaReady = function() {};

/**
 * Callback method that notifies that the visualization this component belongs
 * to is now ready and fully usable.
 * Subclasses should extend to fully activate the component UI and/or to
 * trigger functionality that requires the visualization to be fully loaded.
 */
rhizo.ui.component.Component.prototype.ready = function() {};


/**
 * A Container is a specialized component that can contain other components
 * within itself.
 *
 * @param {!rhizo.Project} project The project this container belongs to.
 * @param {?string} opt_key Optional key the container will use to register
 *     itself with the project GUI.
 * @constructor
 * @extends {rhizo.ui.component.Component}
 */
rhizo.ui.component.Container = function(project, opt_key) {
  rhizo.ui.component.Component.call(this, project, opt_key);
  this.components_ = [];
  this.phase_ = rhizo.ui.component.Phase.INIT;
};
rhizo.inherits(rhizo.ui.component.Container, rhizo.ui.component.Component);

/**
 * Adds a component to this container. A component can be added to the container
 * during any phase of the container lifecycle (even when the container has been
 * made ready and the visualization is fully usable).
 *
 * @param {rhizo.ui.component.Component} component The component to add.
 * @param {number} opt_position The optional position in the sequence of
 *     components where the new one should be inserted. Follows the same rules
 *     as Array.prototype.splice.
 * @return {Array.<HTMLElement>|HTMLElement} The set of elements (can be one or
 *     more) that the newly added component generated. This is not null only if
 *     the component was added after the container already rendered its
 *     contents.
 */
rhizo.ui.component.Container.prototype.addComponent = function(component,
                                                               opt_position) {
  if (opt_position) {
    this.components_.splice(opt_position, 0, component);
  } else {
    this.components_.push(component);
  }

  if (opt_position < 0) {
    opt_position = this.components_.length - 1 + opt_position;
  }

  // Catch up with the missing lifecycle steps if the component is added late
  // in the game.
  var new_renderings = null;
  switch(this.phase_) {
    case rhizo.ui.component.Phase.INIT:
      break;
    case rhizo.ui.component.Phase.RENDER:
      new_renderings = this.renderSingleComponent(component, opt_position);
      break;
    case rhizo.ui.component.Phase.METAREADY:
      new_renderings = this.renderSingleComponent(component, opt_position);
      component.metaReady();
      break;
    case rhizo.ui.component.Phase.READY:
      new_renderings = this.renderSingleComponent(component, opt_position);
      component.metaReady();
      component.ready();
      break;
    default:
      break;
  }

  // Return any new HTML elements that were created, for the upstream container
  // to properly attach them to the visualization.
  return new_renderings;
};

/**
 * @return {Array.<rhizo.ui.component.Component>} Returns the list of components
 *     that are contained within this container.
 */
rhizo.ui.component.Container.prototype.getComponents = function() {
  return this.components_;
};

/**
 * @return {rihzo.ui.component.Phase} The lifecycle phase the container is
 *     currently in.
 */
rhizo.ui.component.Container.prototype.phase = function() {
  return this.phase_;
};

/**
 * Renders the container and iteratively renders all the components contained
 * within. Delegates to renderContainer() and renderSingleComponent() methods
 * that subclasses should implement.
 *
 * @return {Array.<HTMLElement>|HTMLElement} The set of elements (can be one
 *     or more) that define the container structure.
 * @override
 */
rhizo.ui.component.Container.prototype.render = function() {
  this.phase_ = rhizo.ui.component.Phase.RENDER;
  var all_renderings = [];
  this.appendRendering_(this.renderContainer(), all_renderings);
  for (var i = 0; i < this.components_.length; i++) {
    this.appendRendering_(this.renderSingleComponent(this.components_[i], i),
                          all_renderings);
  }
  return all_renderings;
};

/**
 * Adds a single rendering to the list of all renderings that will be returned
 * by render().
 *
 * @param {?Array.<HTMLElement>|HTMLElement} rendering
 * @param {Array.<HTMLElement>} all_renderings
 * @private
 */
rhizo.ui.component.Container.prototype.appendRendering_ = function(
    rendering, all_renderings) {
  if (!rendering) {
    return;
  }
  if (jQuery.isArray(rendering)) {
    Array.prototype.push.apply(all_renderings, rendering);
  } else {
    all_renderings.push(rendering);
  }
};

/**
 * Renders the container itself. Subclasses should override this method.
 * @return {Array.<HTMLElement>|HTMLElement} The set of elements (can be one
 *     or more) that define the container itself.
 */
rhizo.ui.component.Container.prototype.renderContainer = function() {
  return null;
};

/**
 * Renders a single component within the container.
 * @param {rhizo.ui.component.Component} component The component to render.
 * @param {?number} opt_position The position of the component being rendered
 *     in the sequence of components part of this container. Guaranteed to be
 *     greater or equal to 0.
 * @return {Array.<HTMLElement>|HTMLElement} The set of elements (can be one
 *     or more) that define the given component and should be attached to the
 *     visualization DOM, unless they're explicity attached within this method.
 */
rhizo.ui.component.Container.prototype.renderSingleComponent = function(
    component, opt_position) {
  return null;
};

/**
 * Dispatches the notification that the project metamodel and renderer are now
 * known to all the components managed by this container.
 * @override
 */
rhizo.ui.component.Container.prototype.metaReady = function() {
  this.phase_ = rhizo.ui.component.Phase.METAREADY;
  var components = this.getComponents();
  for (var i = 0; i < components.length; i++) {
    components[i].metaReady();
  }
};

/**
 * Dispatches the notification the visualization is now ready to all the
 * components managed by this container.
 * @override
 */
rhizo.ui.component.Container.prototype.ready = function() {
  this.phase_ = rhizo.ui.component.Phase.READY;
  var components = this.getComponents();
  for (var i = 0; i < components.length; i++) {
    components[i].ready();
  }
};


/**
 * Base class to define Rhizosphere UI templates. A Template is a specialized
 * Container with the additional knowledge of the project Viewport (the only
 * mandatory part of a Rhizosphere visualization).
 *
 * A template will always include a rhizo.ui.component.Viewport instance.
 *
 * A template follows the same rendering sequence of containers and components.
 * Additional components can be added to the template, even after it has been
 * made live, via the addComponent() method.
 *
 * A template can notify an external component about the state of the
 * initialization process. By default a rhizo.ui.component.Progress progressbar
 * is used, but it can be customized via setProgressHandler(). The default
 * progress bar can be disabled by setting the 'enableLoadingIndicator' project
 * configuration option to false.
 *
 * @param {!rhizo.Project} project The project this template belongs to.
 * @param {?string} template_key A unique key that identifies the template.
 *     Generates a CSS class name that can be used for template-specific UI
 *     skinning.
 * @constructor
 * @extends {rhizo.ui.component.Container}
 */
rhizo.ui.component.Template = function(project, template_key) {
  rhizo.ui.component.Container.call(this, project, template_key);

  this.viewport_ = new rhizo.ui.component.Viewport(project);
  if (project.options().isLoadingIndicatorEnabled()) {
    this.progress_ = new rhizo.ui.component.Progress();
  }
};
rhizo.inherits(rhizo.ui.component.Template, rhizo.ui.component.Container);

/**
 * Sets the progress handler, that will receive notifications about the
 * template initialization sequence.
 *
 * @param {*} progress An object that responds to the render(container) and
 *     update(value, message) functions. See rhizo.ui.component.Progress for
 *     an example on how to create a progress handler.
 *     Set to null to disable progress reporting altogether.
 */
rhizo.ui.component.Template.prototype.setProgressHandler = function(progress) {
  if (this.progress_) {
    this.progress_.destroy();
  }
  this.progress_ = progress;
};

/**
 * Adds a component to this template.
 * @param {rhizo.ui.component.Component} component The component to add
 * @override
 */
rhizo.ui.component.Template.prototype.addComponent = function(component) {
  var new_renderings = rhizo.ui.component.Container.prototype.addComponent.call(
      this, component);
  if (new_renderings) {
    this.gui_.container.append(new_renderings);
  }
};

/**
 * Renders the template. Unlike the vanilla container rendering, the template
 * does not create its containing HTML element, but instead it populates the
 * project GUI container.
 *
 * @return {HTMLElement} The project GUI container, filled with the template
 *     contents.
 * @override
 */
rhizo.ui.component.Template.prototype.render = function() {
  var all_renderings = rhizo.ui.component.Container.prototype.render.call(this);
  if (this.progress_) {
    this.progress_.update(20, 'Chrome created. Loading metadata...');
  }
  return all_renderings;
};

rhizo.ui.component.Template.prototype.renderContainer = function() {
  this.gui_.container.addClass('rhizo-template-' + this.key());
  this.gui_.container.append(this.viewport_.render());
  if (this.progress_) {
    this.progress_.render(this.gui_.viewport);
  }
  return this.gui_.container.get(0);
};

rhizo.ui.component.Template.prototype.renderSingleComponent = function(
    component) {
  this.gui_.container.append(component.render());
  return null;  // The rendering has already been appened to the container.
};

/** @inheritDoc */
rhizo.ui.component.Template.prototype.metaReady = function() {
  if (this.progress_) {
    this.progress_.update(40, 'Metadata loaded. Updating components...');
  }
  this.viewport_.metaReady();
  rhizo.ui.component.Container.prototype.metaReady.call(this);
  if (this.progress_) {
    this.progress_.update(60, 'Components updated. Loading models...');
  }
};

/** @inheritDoc */
rhizo.ui.component.Template.prototype.ready = function() {
  if (this.progress_) {
    this.progress_.update(80, 'Models loaded. Activating UI...');
  }
  this.viewport_.ready();
  rhizo.ui.component.Container.prototype.ready.call(this);
  if (this.progress_) {
    this.progress_.update(100, 'Rhizosphere ready!');
  }
};


/* ==== Specialized containers ==== */

/**
 * A vertical box container. It renders all the components contained within in
 * a linear fashion, prepending each component with an header containing its
 * title (if the component defined one).
 *
 * @param {!rhizo.Project} project The project this box belongs to.
 * @param {?string} opt_key Optional key the box will use to register
 *     itself with the project GUI.
 * @param {string} boxclass The CSS class assigned to the box.
 * @constructor
 * @extends {rhizo.ui.component.Container}
 */
rhizo.ui.component.VBox = function(project, opt_key, boxclass) {
  rhizo.ui.component.Container.call(this, project, opt_key);
  this.boxclass_ = boxclass;
  this.panel_ = null;
};
rhizo.inherits(rhizo.ui.component.VBox, rhizo.ui.component.Container);

/** @inheritDoc */
rhizo.ui.component.VBox.prototype.renderContainer = function() {
  this.panel_ = $('<div />', {'class': this.boxclass_});
  return this.panel_.get(0);
};

/** @inheritDoc */
rhizo.ui.component.VBox.prototype.renderSingleComponent = function(component) {
  var title = component.title();
  if (title) {
    var titleClass = 'rhizo-section-header';
    if (component.titleClass()) {
      titleClass += ' ' + component.titleClass();
    }
    var titleEl = $('<div />', {'class': titleClass}).
      text(title).
      appendTo(this.panel_);
  }
  this.panel_.append(component.render());
  return null;  // rendering has been appended to the panel itself.
};


/**
 * A collapsible box sitting on the right of the viewport.
 *
 * @param {!rhizo.Project} project The project this box belongs to.
 * @param {?string} opt_key Optional key the box will use to register
 *     itself with the project GUI.
 * @param {string} boxclass The CSS class assigned to the box.
 * @constructor
 * @extends {rhizo.ui.component.Container}
 */
rhizo.ui.component.RightBar = function(project, opt_key, boxclass) {
  rhizo.ui.component.Container.call(this, project, opt_key);
  this.boxclass_ = boxclass;
};
rhizo.inherits(rhizo.ui.component.RightBar, rhizo.ui.component.Container);

/** @inheritDoc */
rhizo.ui.component.RightBar.prototype.renderContainer = function() {
  this.toggle_ = $('<div />', {'class': 'rhizo-right-pop'}).html('&#x25c2;');
  this.rightBar_ = $('<div />', {'class': this.boxclass_}).
      css('display', 'none');
  this.activateToggle_();
  return [this.rightBar_.get(0), this.toggle_.get(0)];
};

/** @inheritDoc */
rhizo.ui.component.RightBar.prototype.renderSingleComponent = function(
    component) {
  var title = component.title();
  if (title) {
    var titleClass = 'rhizo-section-header';
    if (component.titleClass()) {
      titleClass += ' ' + component.titleClass();
    }
    var titleEl = $('<div />', {'class': titleClass}).
      text(title).
      appendTo(this.rightBar_);
  }
  this.rightBar_.append(component.render());
  return null;  // rendering has been appended to the rightBar directly.
};

/**
 * Activates the controls that toggles the collapsed status of the box.
 * @private
 */
rhizo.ui.component.RightBar.prototype.activateToggle_ = function() {
  this.toggle_.click(jQuery.proxy(function() {
    if (this.rightBar_.is(":visible")) {
      this.toggle_.css('right', 0).html('&#x25c2;');
      this.gui_.viewport.css('right', 5);
      this.rightBar_.css('display', 'none');
    } else {
      this.gui_.viewport.css('right', 135);
      this.toggle_.css('right', 130).html('&#x25b8;');
      this.rightBar_.css('display', '');
    }
  }, this));
};

/**
 * @return {*} The jQuery object pointing to the control that toggles the
 *     collapsed status of the box.
 */
rhizo.ui.component.RightBar.prototype.getToggle = function() {
  return this.toggle_;
};

/**
 * @return {boolean} Whether the box is currently in its collapsed status or
 *     not.
 */
rhizo.ui.component.RightBar.prototype.isCollapsed = function() {
  return this.rightBar_.is(':visible');
};


/**
 * An horizontal bar that cointains links to activate other components, which
 * will be displayed as floating panels above the links bar.
 *
 * @param {!rhizo.Project} project The project this box belongs to.
 * @param {?string} opt_key Optional key the box will use to register
 *     itself with the project GUI.
 * @param {string} boxclass The CSS class assigned to the box.
 * @constructor
 * @extends {rhizo.ui.component.Container}
 */
rhizo.ui.component.HBox = function(project, opt_key, boxclass) {
  rhizo.ui.component.Container.call(this, project, opt_key, boxclass);
  this.toggles_ = [];
  this.boxclass_ = boxclass;
  project.eventBus().subscribe('userAction', this.onUserAction_, this);
};
rhizo.inherits(rhizo.ui.component.HBox, rhizo.ui.component.Container);

/** @inheritDoc */
rhizo.ui.component.HBox.prototype.renderContainer = function() {
  this.bar_ = $('<div />', {'class': this.boxclass_});
  return this.bar_.get(0);
};

/** @inheritDoc */
rhizo.ui.component.HBox.prototype.renderSingleComponent = function(
    component, opt_position) {
  var toggle = {
    component: component,
    key: component.key(),
    clickable: this.renderClickable_(component.title(),
                                     component.titleClass()),
    renderings: component.render()
  };
  this.toggles_.push(toggle);
  if (opt_position) {
    if (opt_position > 0) {
      toggle.clickable.insertAfter(
        this.bar_.find('.rhizo-section-header:eq(' + (opt_position-1) + ')'));
    } else {  // opt_position == 0
      this.bar_.prepend(toggle.clickable);
    }
  } else {
    this.bar_.append(toggle.clickable);
  }
  $(toggle.renderings).addClass('rhizo-floating-panel').css('display', 'none');
  this.activateToggle_(toggle);
  return $(toggle.renderings).get();
};

/**
 * Renders a single clickable link in the links bar.
 * 
 * @param {string} title The link label.
 * @param {?string} opt_className Optional CSS class to assign to the link.
 * @return {*} jQuery object pointing to the clickable link.
 * @private
 */
rhizo.ui.component.HBox.prototype.renderClickable_ = function(title, 
                                                              opt_className) {
  var titleClass = 'rhizo-section-header';
  if (opt_className) {
    titleClass += ' ' + opt_className;
  }
  var div = $('<div />', {'class': titleClass}).appendTo(this.bar_);
  $('<a />', {href: 'javascript:;', title: title}).
      text(title).
      appendTo(div);
  return div;
};

/**
 * Enables the toggling of a component. When a component is toggled, by clicking
 * the correspondent link in the links bar, any other open component is closed,
 * so that only one component at a time is always visible.
 *
 * @param {*} curToggle The object describing the toggle-able component.
 * @private
 */
rhizo.ui.component.HBox.prototype.activateToggle_ = function(curToggle) {
  var eventBus = this.project_.eventBus();
  var eventSource = this;
  curToggle.clickable.click(jQuery.proxy(function() {
    jQuery.each(this.toggles_, jQuery.proxy(function(j, toggle) {
      if (toggle == curToggle) {
        $(toggle.renderings).toggle();
        $(toggle.clickable).toggleClass('rhizo-section-open');
      } else {
        $(toggle.renderings).css('display', 'none');
        $(toggle.clickable).removeClass('rhizo-section-open');
      }
      if (this.phase() == rhizo.ui.component.Phase.READY)  {
        eventBus.publish(
            'userAction', {
              'action': 'componentActivation',
              'componentKey': toggle.key,
              'active': $(toggle.clickable).hasClass('rhizo-section-open')
            }, /* callback */ null, eventSource);
      }
    }, this));
  }, this));
};

/**
 * Callback invoked whenever a user action occurs on the project. In particular
 * we care whether the user requested activation or de-activation of a
 * component hosted within this container from elsewhere in the UI.
 *
 * @param {Object} message The eventbus message describing the user action.
 * @private
 */
rhizo.ui.component.HBox.prototype.onUserAction_ = function(message) {
  if (message['action'] == 'componentActivation') {
    var key = message['componentKey'];
    var active = !!message['active'];
    for (var i = 0; i < this.toggles_.length; i++) {
      if (this.toggles_[i].key == key) {
        var currentActive = this.toggles_[i].clickable.
            hasClass('rhizo-section-open');
        if (currentActive != active) {
          this.toggles_[i].clickable.click();
        }
        break;
      }
    }
  }
};


/* ==== Viewport ==== */

/**
 * The Viewport is the core of the visualization, where all models renderings
 * are displayed and laid out.
 *
 * @param {!rhizo.Project} project The project this component belongs to.
 * @constructor
 * @extends {rhizo.ui.component.Component}
 */
rhizo.ui.component.Viewport = function(project) {
  rhizo.ui.component.Component.call(
      this, project, 'rhizo.ui.component.Viewport');
  this.universeTargetPosition_ = {top: 0, left: 0};

  /**
   * Whether viewport panning can occur limitlessly on both directions via
   * (Google Maps-style) mouse dragging.
   *
   * @type {boolean}
   * @private
   */
  this.infinitePanning_ = project.options().panningMode() == 'infinite';

  /**
   * Whether viewport panning is disabled in any form.
   *
   * @type {boolean}
   * @private
   */
  this.noPanning_ = project.options().panningMode() == 'none';

  /**
   * Whether box selection mode can be toggled on and off. If box selection is
   * not allowed a-priori this will be false. If the viewport uses native or
   * no scrolling, then the default interaction mode is selection, so again
   * toggling will be false.
   * @type {boolean}
   * @private
   */
  this.canToggleBoxSelection_ =
      project.options().isBoxSelectionMode() && this.infinitePanning_;
  this.selectionModeOn_ = false;

  if (project.options().showErrorsInViewport()) {
    project.eventBus().subscribe('error', this.onError_, this);
  }
  if (this.canToggleBoxSelection_) {
    project.eventBus().subscribe('userAction', this.onUserAction_, this);
  }
};
rhizo.inherits(rhizo.ui.component.Viewport, rhizo.ui.component.Component);

/** @override */
rhizo.ui.component.Viewport.prototype.render = function() {
  var viewportClasses = [
      'rhizo-viewport',
      'rhizo-panning-' + this.project_.options().panningMode(),
      'rhizo-selectionmode-' + this.project_.options().selectionMode()];
  if (!this.infinitePanning_ && this.project_.options().isBoxSelectionMode()) {
    viewportClasses.push('rhizo-box-selecting');
  }
  this.viewport_ = $('<div/>', {'class': viewportClasses.join(' ')});

  this.universe_ = $('<div/>', {'class': 'rhizo-universe'}).
      appendTo(this.viewport_);

  // Update the GUI object.
  this.gui_.setViewport(this.viewport_);
  this.gui_.setUniverse(this.universe_);

  if (this.canToggleBoxSelection_) {
    this.selection_trigger_ = $('<div />', {
        'class': 'rhizo-selection-trigger',
        'title': 'Start selecting items'}).appendTo(this.viewport_);
  }

  return this.viewport_.get(0);
};

/** @override */
rhizo.ui.component.Viewport.prototype.ready = function() {
  // The ordering matters: if selection is configured before dragging, the
  // latter won't work.
  if (this.infinitePanning_) {
    this.activateDraggableViewport_();
  }
  if (this.project_.options().isBoxSelectionMode()) {
    this.activateSelectableViewport_();
  }

  if (this.project_.options().isClickSelectionMode() ||
      this.project_.options().isBoxSelectionMode()) {
    // If any form of selection mechanism is allowed, let the user cancel
    // selections by clicking empty viewport areas.
    this.viewport_.click(jQuery.proxy(function(ev, ui) {
      if (this.isOnEmptySpace_(ev)) {
        this.project_.eventBus().publish('selection', {'action': 'deselectAll'});
      }
    }, this));
  }
};

/**
 * Enable drag-selection on the viewport and the selection mode toggle.
 * @private
 */
rhizo.ui.component.Viewport.prototype.activateSelectableViewport_ =
    function() {
  if (this.canToggleBoxSelection_) {
    this.selection_trigger_.click(jQuery.proxy(function() {
      this.toggleSelectionMode_(!this.selectionModeOn_);
      this.project_.eventBus().publish(
          'userAction', {
              'action': 'selectionActivation',
              'detail': this.selectionModeOn_ ? 'activate' : 'deactivate'
          }, /* callback */ null, this);
    }, this));
  }

  var xselectableOptions = {
    'distance': 3,
    'filter': this.project_.options().selectFilter()
  };

  // If the viewport allows drag-based panning, then panning is the default
  // mode and selection is initially disabled. Otherwise, the only action is
  // selection and is enabled by default.
  xselectableOptions['disabled'] = this.infinitePanning_;

  // Forbid selection gestures from starting within a model rendering
  // when drag'n'drop is enabled or when the user explicitly told us to do so.
  if (this.project_.options().isDragAndDropEnabled() ||
      !this.project_.options().isSelectionFromCardEnabled()) {
    xselectableOptions['cancel'] = this.project_.options().selectFilter();
  }

  this.viewport_.xselectable(xselectableOptions).
      bind('xselectablestart', jQuery.proxy(function() {
    this.project_.eventBus().publish('userAction', {
      'action': 'selection', 'detail': 'gesturestart'
    }, null, this);
  }, this)).bind('xselectablestop', jQuery.proxy(function() {
    this.project_.eventBus().publish('userAction', {
      'action': 'selection', 'detail': 'gesturestop'
    }, null, this);
  }, this)).bind('xselectableselecting', jQuery.proxy(function(ev, ui) {
    this.project_.eventBus().publish('userAction', {
        'action': 'selection',
        'detail': 'selecting',
        'affectedModels': [
            rhizo.ui.elementToModel(ui.selecting, this.project_).id]
    }, null, this);
  }, this)).bind('xselectableunselecting', jQuery.proxy(function(ev, ui) {
    this.project_.eventBus().publish('userAction', {
        'action': 'selection',
        'detail': 'unselecting',
        'affectedModels': [
            rhizo.ui.elementToModel(ui.unselecting, this.project_).id]
    }, null, this);
  }, this)).bind('xselectableselected', jQuery.proxy(function(ev, ui) {
    var selectedModels = [];
    for (var i = ui.selected.length - 1; i >= 0; i--) {
      var selected_id = $(ui.selected[i]).data("id");
      if (selected_id) {
        selectedModels.push(selected_id);
      }
    }
    if (selectedModels.length > 0) {
      this.project_.eventBus().publish(
          'selection', {'action': 'select', 'models': selectedModels});
    }
  }, this)).bind('xselectableunselected', jQuery.proxy(function(ev, ui) {
    var deselectedModels = [];
    for (var i = ui.unselected.length - 1; i >= 0; i--) {
      var deselected_id = $(ui.unselected[i]).data("id");
      if (deselected_id) {
        deselectedModels.push(deselected_id);
      }
    }
    if (deselectedModels.length > 0) {
      this.project_.eventBus().publish(
          'selection', {'action': 'deselect', 'models': deselectedModels});
    }
  }, this));

  // If Rhizosphere is configured not to allow any panning, set the selectable
  // scrolling threshold to a negative value, so that it will never occur.
  if (this.noPanning_) {
    this.viewport_.xselectable('option', 'scrollingThreshold', -1);
  }

  // If Rhizosphere is configured to use infinite panning, define a custom
  // scroller implementation for selection to use it when selection boxes
  // get close to the viewport edges.
  // See http://battlehorse.github.com/jquery-xselectable/#options
  if (this.infinitePanning_) {
    this.viewport_.xselectable('option', 'scroller', jQuery.proxy(function() {

      var universe = this.universe_;

      var offset = {
        top: parseInt(universe.css('top'), 10),
        left: parseInt(universe.css('left'), 10)
      };

      return {
        getScrollableDistances: function() {
          // Scrolling is limitless in all directions.
          return [
            Number.MAX_VALUE, Number.MAX_VALUE,
            Number.MAX_VALUE, Number.MAX_VALUE
          ];
        },
        scroll: function(axis, shift) {
          // shift is negative when scrolling top (content must shift bottom)
          shift = Math.round(shift);
          if (axis == 'vertical') {
            offset.top -= shift;
            universe.css('top', offset.top);
          } else if (axis == 'horizontal') {
            offset.left -= shift;
            universe.css('left', offset.left);
          }
        },
        getScrollOffset: function() {
          return offset;
        }
      };

    }, this));
  }
};

/**
 * Checks whether an event was raised on empty space, i.e. somewhere in the
 * viewport, but not on top of any models or any other elements.
 *
 * Since the viewport and the universe may be not on top of each other, the
 * method checks whether any of the two is the original target of the event.
 *
 * @param {Event} evt the event to inspect.
 * @returns {boolean} true if the click occurred on the viewport, false
 *   otherwise.
 * @private
 */
rhizo.ui.component.Viewport.prototype.isOnEmptySpace_ = function(evt) {
  return $(evt.target).hasClass('rhizo-viewport') ||
         $(evt.target).hasClass('rhizo-universe');
};

/**
 * Transitions the viewport from operating in selection mode vs dragging/panning
 * mode and viceversa.
 *
 * @param {boolean} selectionModeOn Whether the viewport selection mode should
 *     be activated or not.
 * @private
 */
rhizo.ui.component.Viewport.prototype.toggleSelectionMode_ = function(
    selectionModeOn) {
  // Update the current status.
 this.selectionModeOn_ = selectionModeOn;

  // Change the viewport operation mode.
  var selectable_status = this.selectionModeOn_ ? 'enable' : 'disable';
  var draggable_status = this.selectionModeOn_ ? 'disable' : 'enable';
  this.viewport_.xselectable(selectable_status).
      draggable(draggable_status).
      toggleClass('rhizo-box-selecting', this.selectionModeOn_);

  // Update the title of the selection trigger.
 this.selection_trigger_.attr(
     'title',
     this.selectionModeOn_ ? 'Stop selecting items' : 'Start selecting items');
};

/**
 * Activate handlers that make the viewport draggable and scrollable (using
 * the mousewheel).
 * @private
 */
rhizo.ui.component.Viewport.prototype.activateDraggableViewport_ = function() {
  this.viewport_.draggable({
    cancel: '.rhizo-model',
    helper: jQuery.proxy(function() {
      return $("<div />").appendTo(this.viewport_);
    }, this),
    start: jQuery.proxy(function(ev, ui) {
      var position = this.universe_.position();
      this.universe_.data("top0", position.top).data("left0", position.left);
    }, this),
    drag: jQuery.proxy(function(ev, ui) {
      // Computes where to reposition the universe pane from the delta movement
      // of the drag helper.
      //
      // - gui.universe.data({top0, left0}) points to the relative position of
      //   the universe (in respect to the viewport) at the start of the drag
      //   movement.
      // - ui.position.{top,left} points to the relative position of the drag
      //   helper (in respect to the viewport) at the current instant.
      var dragTop = ui.position.top + this.universe_.data("top0");
      var dragLeft = ui.position.left + this.universe_.data("left0");

      var snapDistance = 15;
      if (Math.abs(ui.position.left) <= snapDistance) {
        dragLeft = this.universe_.data("left0");
      }
      if (Math.abs(dragLeft) <= 15) {
        dragLeft = 0;
      }

      this.moveUniverse_({top: dragTop, left: dragLeft});
    }, this),
    refreshPositions: false
  });

  // Mousewheel (or trackpad) based panning.
  if ($.support.mouseWheel) {
    this.viewport_.mousewheel(jQuery.proxy(function (evt, deltaX, deltaY) {
        this.panUniverse_(deltaX, deltaY);
    }, this));
  }
};

/**
 * Moves the universe relatively to the viewport.
 *
 * @param {*} position An object exposing the 'top' and 'left' properties (both
 *     numbers) that define where the universe should be moved to. The
 *     coordinates define the position of the universe top-left corner with
 *     respect to the viewport top-left corner.
 * @private
 */
rhizo.ui.component.Viewport.prototype.moveUniverse_ = function(position) {
  this.universeTargetPosition_ = {top: position.top, left: position.left};
  this.universe_.stop().css(this.universeTargetPosition_);
};

/**
 * Pans the universe with a smooth scrolling along the requested direction(s).
 * @param {number} deltaX {-1,0,+1} to define that the universe was respectively
 *     panned right, not panned horizontally or panned left.
 * @param {number} deltaY {-1,0,+1} to define that the universe was respectively
 *     panned down, not panned vertically or panned up.
 * @private
 */
rhizo.ui.component.Viewport.prototype.panUniverse_ = function(deltaX,
                                                              deltaY) {
  var scale = Math.round(this.viewport_.get(0).offsetHeight / 10);
  this.universeTargetPosition_ = {
    top: deltaY*scale + this.universeTargetPosition_.top,
    left: deltaX*scale + this.universeTargetPosition_.left
  };
  this.universe_.stop().animate(this.universeTargetPosition_);
};

/**
 * Callback invoked whenever an error occurs in the project, if the viewport
 * has been configured to display error notifications.
 *
 * @param {Object} message The eventbus message describing the error that
 *     occurred.
 * @private
 */
rhizo.ui.component.Viewport.prototype.onError_ = function(message) {
  if (!!message['clear']) {
    $(this.viewport_).find('.rhizo-error').remove();
  } else {
    var errorContainer = $(this.viewport_).find('.rhizo-error');
    if (errorContainer.length == 0) {
      errorContainer = $("<div />", {'class': 'rhizo-error'}).
          appendTo(this.viewport_);
    }
    var args = message['arguments'] || [];
    var errorMsg = ['An error occurred: '];
    for (var i = 0; i < args.length; i++) {
      errorMsg.push(String(args[i]));
    }
    $("<p />").text(errorMsg.join(' ')).appendTo(errorContainer);
  }
};

/**
 * Callback invoked whenever a user action occurs on the project. In particular
 * we care whether the user initiated a selection operation from elsewhere in
 * the UI.
 *
 * @param {Object} message The eventbus message describing the user action.
 * @private
 */
rhizo.ui.component.Viewport.prototype.onUserAction_ = function(message) {
  if (message['action'] == 'selectionActivation') {
    this.toggleSelectionMode_(message['detail'] != 'deactivate');
  }
};


/* ==== Component specializations ==== */

/**
 * The visualization logo.
 * @param {!rhizo.Project} project The project this component belongs to.
 * @param {boolean} titleless Whether this component should have a title or not.
 * @param {boolean} sliding Whether the link section should be hidden by default
 *     and slide into view only when requested.
 * @constructor
 * @extends {rhizo.ui.component.Component}
 */
rhizo.ui.component.Logo = function(project, titleless, sliding) {
  rhizo.ui.component.Component.call(this, project, 'rhizo.ui.component.Logo');
  this.titleless_ = titleless;
  this.sliding_ = sliding;
};
rhizo.inherits(rhizo.ui.component.Logo, rhizo.ui.component.Component);

/** @override */
rhizo.ui.component.Logo.prototype.title = function() {
  return this.titleless_ ? null : '?';
};

/** @override */
rhizo.ui.component.Logo.prototype.render = function() {
  var panel = $('<div />', {'class': 'rhizo-logo'});
  var header = $('<h1>Rhizosphere</h1>').appendTo(panel);
  var links = $('<p />').appendTo(panel);

  links.append(
      $('<a />', {
        'href': 'http://www.rhizospherejs.com/doc',
        'target': '_blank'}).
          text('Help'));

  links.append('&nbsp;').append(
      $('<a />', {
        'href': 'http://sites.google.com/site/rhizosphereui/',
        'target': '_blank'}).
          text('Project Info'));

  links.append('&nbsp;').append(
      $('<a />', {
        'href': 'http://rhizosphere.googlecode.com/hg/AUTHORS.txt',
        'target': '_blank'}).
          text('Authors'));

  links.append('&nbsp;').append(
      $('<a />', {
        'href': 'http://rhizosphere.googlecode.com/hg/COPYING.txt',
        'target': '_blank'}).
          text('License'));

  if (this.sliding_) {
    header.click(function() {
      links.slideToggle('fast');
    });
  }

  return panel.get(0);
};


/**
 * The layout selector component.
 * @param {!rhizo.Project} project The project this component belongs to.
 * @constructor
 * @extends {rhizo.ui.component.Component}
 */
rhizo.ui.component.Layout = function(project) {
  rhizo.ui.component.Component.call(this, project, 'rhizo.ui.component.Layout');
  project.eventBus().subscribe('layout', this.onLayout_, this);
};
rhizo.inherits(rhizo.ui.component.Layout, rhizo.ui.component.Component);

/** @override */
rhizo.ui.component.Layout.prototype.title = function() {
  return 'Display';
};

/** @override */
rhizo.ui.component.Layout.prototype.render = function() {
  this.layoutPanel_ = $('<div />');
  this.layoutOptions_ = $('<div />', {'class': 'rhizo-layout-extra-options'}).
      appendTo(this.layoutPanel_);

  this.layoutSelector_ = $("<select />", {disabled: 'disabled'});
  this.layoutSelector_.append($("<option value=''>No layout engines</option>"));

  this.layoutPanel_.
      prepend(this.layoutSelector_).
      prepend("Keep items ordered by: ");

  return this.layoutPanel_.get(0);
};

/** @override */
rhizo.ui.component.Layout.prototype.metaReady = function() {
  this.layoutSelector_.children().remove();
  this.layoutControlsMap_ = {};
  var engineNames = this.project_.layoutManager().getEngineNames();
  for (var i = 0; i < engineNames.length; i++) {
    var engineName = engineNames[i];
    var isCurrent =
        engineName == this.project_.layoutManager().getCurrentEngineName();
    this.layoutSelector_.append(
      $("<option value='" + engineName + "' " +
        (isCurrent ? "selected" : "") +
        ">" + rhizo.layout.layouts[engineName]['name']  + "</option>"));

    var layoutEngineUi = rhizo.layout.layouts[engineName]['ui'];
    if (layoutEngineUi) {
      var layoutControls =
          new layoutEngineUi(this.project_, engineName).layoutUIControls();
      this.layoutControlsMap_[engineName] = $(layoutControls);
      if (!isCurrent) {
        layoutControls.css("display","none");
      }
      this.layoutOptions_.append(layoutControls);
    }
  }

  this.layoutSelector_.removeAttr('disabled').change(
      jQuery.proxy(this.updateVisibleEngineControls_, this));
};

/** @override */
rhizo.ui.component.Layout.prototype.ready = function() {
  this.layoutSelector_.change(jQuery.proxy(function() {
    // TODO(battlehorse): forcealign should be true only if there are
    // uncommitted filters (i.e. GREY models).
    this.project_.eventBus().publish('layout', {
      engine: this.layoutSelector_.val(),
      options: {forcealign: true}
    }, /* callback */ null, this);
  }, this));
};

/**
 * Callback invoked whenever a layout related change occurs in the project.
 * Ensure that the layout component UI reflects the currently chosen engine.
 *
 * @param {Object} message The eventbus message describing the layout change.
 * @private
 */
rhizo.ui.component.Layout.prototype.onLayout_ = function(message) {
  this.layoutSelector_.val(message['engine']);
  this.updateVisibleEngineControls_();
};

/**
 * Ensures that the correct UI matching the selected layout engine is visible.
 * @private
 */
rhizo.ui.component.Layout.prototype.updateVisibleEngineControls_ = function() {
  for (var layout in this.layoutControlsMap_) {
    if (layout == $(this.layoutSelector_).val()) {
      this.layoutControlsMap_[layout].show("fast");
    } else {
      this.layoutControlsMap_[layout].hide("fast");
    }
  }
};

/**
 * Handles selections and selection-based filtering.
 * @param {!rhizo.Project} project The project this component belongs to.
 * @constructor
 * @extends {rhizo.ui.component.Component}
 */
rhizo.ui.component.SelectionManager = function(project) {
  rhizo.ui.component.Component.call(this, project,
                                    'rhizo.ui.component.SelectionManager');
  project.eventBus().subscribe(
      'selection', this.onSelectionChanged_, this, /* committed */ true);
  project.eventBus().subscribe(
      'model', this.onModelChanged_, this, /* committed */ true);
  project.eventBus().subscribe(
      'userAction', this.onUserAction_, this);
};
rhizo.inherits(rhizo.ui.component.SelectionManager,
               rhizo.ui.component.Component);

/** @override */
rhizo.ui.component.SelectionManager.prototype.title = function() {
  return 'Selection';
};

/** @override */
rhizo.ui.component.SelectionManager.prototype.render = function() {
  var selectionPanel = $('<div />', {'class': 'rhizo-selection'});

  this.selectButton_ = $('<button />', {disabled: 'disabled'}).
      text('Work on selected items only');
  this.resetButton_ = $('<button />', {disabled: 'disabled'}).text('Reset');
  selectionPanel.append(this.selectButton_).append(this.resetButton_);

  return selectionPanel.get(0);
};

/** @override */
rhizo.ui.component.SelectionManager.prototype.ready = function() {
  this.selectButton_.removeAttr('disabled').click(jQuery.proxy(function() {
    // Don't specify the sender, so to receive callbacks even for events that
    // this same class triggers.
    this.project_.eventBus().publish('selection', {'action': 'focus'});
  }, this));


  // Reset button remains disabled until the first selection is performed.
  this.resetButton_.click(jQuery.proxy(function() {
    // Don't specify the sender, so to receive callbacks even for events that
    // this same class triggers.
    this.project_.eventBus().publish('selection', {'action': 'resetFocus'});
  }, this));
};

/**
 * Updates the number of currently hidden models because of selection.
 *
 * @param {Object} message The eventbus message describing the selection change.
 * @private
 */
rhizo.ui.component.SelectionManager.prototype.onSelectionChanged_ = function(
    message) {
  if (message['action'] == 'focus' ||
      message['action'] == 'resetFocus' ||
      message['action'] == 'hide') {
    this.setNumFilteredModels_(this.project_.selectionManager().getNumHidden());
  }
};

/**
 * Updates the number of currently hidden models because of changes in the set
 * of models part of the visualization.
 * @private
 */
rhizo.ui.component.SelectionManager.prototype.onModelChanged_ = function() {
  this.setNumFilteredModels_(this.project_.selectionManager().getNumHidden());
};

/**
 * Callback invoked whenever a user action occurs on the project. In particular
 * we care whether the user initiated a selection operation from elsewhere in
 * the UI.
 *
 * @param {Object} message The eventbus message describing the user action.
 * @private
 */
rhizo.ui.component.SelectionManager.prototype.onUserAction_ = function(
    message) {
  if (message['action'] == 'selectionActivation') {
    // User initiated a selection operation. Ensure this component is the
    // active one, by firing a component activation request.
    this.project_.eventBus().publish(
        'userAction', {
            'action': 'componentActivation',
            'componentKey': this.key(),
            'active': message['detail'] != 'deactivate'
        }, /* callback */ null, this);
  } else if (message['action'] == 'componentActivation' &&
             message['componentKey'] == this.key()) {
    // This component was activated. Initiate a user selection operation as
    // a consequence.
    this.project_.eventBus().publish(
        'userAction', {
            'action': 'selectionActivation',
            'detail': message['active'] ? 'activate' : 'deactivate'
        }, /* callback */ null, this);
  }
};

/**
 * Sets the number of models that have been filtered out via selections.
 * @param {number} numFilteredModels The number of models that are currently
 *     filtered because of selection choices.
 * @private
 */
rhizo.ui.component.SelectionManager.prototype.setNumFilteredModels_ =
    function(numFilteredModels) {
  if (numFilteredModels > 0) {
    this.resetButton_.
        removeAttr("disabled").
        text("Reset (" + numFilteredModels + " filtered)");
  } else {
    this.resetButton_.attr('disabled', 'disabled').text('Reset');
  }
};


/**
 * A panel that enables/disables filters autocommit functionality.
 *
 * @param {!rhizo.Project} project The project this component belongs to.
 * @constructor
 * @extends {rhizo.ui.component.Component}
 */
rhizo.ui.component.AutocommitPanel = function(project) {
  rhizo.ui.component.Component.call(this, project,
                                    'rhizo.ui.component.AutocommitPanel');
  this.callback_ = null;
};
rhizo.inherits(rhizo.ui.component.AutocommitPanel,
               rhizo.ui.component.Component);

/**
 * Registers a callback to be invoked anytime the autocommit setting is toggled.
 * @param {function(boolean)} callback The callback to invoke. It receives one
 *     parameter that defines whether autocommit is enabled or not.
 */
rhizo.ui.component.AutocommitPanel.prototype.registerCallback = function(
    callback) {
  this.callback_ = callback;
};

/** @override */
rhizo.ui.component.AutocommitPanel.prototype.render = function() {
  var autocommitPanel =
      $('<div />', {'class': 'rhizo-filter rhizo-autocommit-panel'});
  this.autocommit_ =
      $('<input />', {
        type: 'checkbox',
        checked: this.project_.filterManager().isFilterAutocommit(),
        disabled: 'disabled'}).
      appendTo(autocommitPanel);
  this.autocommitLabel_ =
      $('<span>Autocommit</span>').appendTo(autocommitPanel);
  this.hideButton_ =
      $('<button />', {disabled: 'disabled'}).
      text('Apply filters').
      prependTo(autocommitPanel);
  return autocommitPanel;
};

/** @override */
rhizo.ui.component.AutocommitPanel.prototype.ready = function() {
  this.autocommit_.removeAttr('disabled').click(jQuery.proxy(function(ev) {
    this.setAutocommit_(this.autocommit_.is(':checked'));
  }, this));

  this.autocommitLabel_.click(jQuery.proxy(function() {
    // Can't delegate the click directly to the checkbox, because the event
    // handler is triggered _before_ the checkbox state changes.
    if (this.autocommit_.is(':checked')) {
      this.autocommit_.removeAttr('checked');
      this.setAutocommit_(false);
    } else {
      this.autocommit_.attr('checked', 'checked');
      this.setAutocommit_(true);
    }
  }, this));

  this.hideButton_.
      attr('disabled', this.project_.filterManager().isFilterAutocommit()).
      click(jQuery.proxy(function() {
        this.project_.filterManager().commitFilter();
  }, this));
};

/**
 * Callback invoked whenever the autocommit status changes.
 * @param {boolean} autocommit Whether to enable autocommit or not.
 * @private
 */
rhizo.ui.component.AutocommitPanel.prototype.setAutocommit_ = function(
    autocommit) {
  if (autocommit) {
    this.hideButton_.attr('disabled', 'disabled');
  } else {
    this.hideButton_.removeAttr('disabled');
  }
  this.project_.eventBus().publish(
      'userAction',
      {'action': 'autocommit', 'enabled': autocommit},
      /* callback */ null, this);
  this.project_.filterManager().enableFilterAutocommit(autocommit);
};


/**
 * Renders a series of filters as a stack, with all filters showing one on
 * top of the other.
 * @param {!rhizo.Project} project The project this component belongs to.
 * @constructor
 * @extends {rhizo.ui.component.Container}
 */
rhizo.ui.component.FilterStackContainer = function(project) {
  rhizo.ui.component.Container.call(this, project,
                                    'rhizo.ui.component.FilterStackContainer');

  /**
   * Number of metaModel keys that will trigger filter selection (instead of
   * just showing all the available filters).
   * @type {number}
   * @private
   */
  this.filterSelectorThreshold_ = project.options().uiStackFiltersThreshold();

  /**
   * Defines which filters are currently visible. This set is only meaningful
   * when filter selection is active, otherwise all filters are always visible.
   * Maps metamodel keys to visibility status.
   * @type {Object.<string, boolean>}
   * @private
   */
  this.activeFilters_ = {};

  /**
   * Maps metamodel keys to the DOM nodes (or jQuery objects) for the associated
   * filter user interfaces (only for metamodels that have an associated ui).
   * @type {Object.<string, *>}
   * @private
   */
  this.filterUis_ = {};

  project.eventBus().subscribe(
      'filter', this.onFilterChanged_, this, /* committed */ true);
};
rhizo.inherits(rhizo.ui.component.FilterStackContainer,
               rhizo.ui.component.Container);

/** @override */
rhizo.ui.component.FilterStackContainer.prototype.title = function() {
  return 'Filters';
};

/** @override */
rhizo.ui.component.FilterStackContainer.prototype.renderContainer = function() {
  this.filterPanel_ = $('<div />', {'class': 'rhizo-filter-container'});

  this.noFilterNotice_ = $('<p />').text('No filters available.');
  this.filterPanel_.append(this.noFilterNotice_);

  return this.filterPanel_.get(0);
};

/** @override */
rhizo.ui.component.FilterStackContainer.prototype.renderSingleComponent =
    function(component) {
  this.filterPanel_.prepend(component.render());
  return null;  // The component has already been added to the container.
};

/** @override */
rhizo.ui.component.FilterStackContainer.prototype.metaReady = function() {
  rhizo.ui.component.Container.prototype.metaReady.call(this);
  var metaModel = this.metaModelWithUi_();
  var filtersNum = 0;
  for (var key in metaModel) {
    filtersNum++;
  }

  if (filtersNum > 0) {
    this.noFilterNotice_.remove();
  }

  var dismissableFilters = filtersNum > this.filterSelectorThreshold_;
  for (key in metaModel) {
    var ui = this.project_.metaModelRegistry().createUiForKind(
        metaModel[key].kind, this.project_, key).filterUIControls();

    if (dismissableFilters) {
      $(ui).css('display', 'none');
      $('<div />', {'class': 'rhizo-icon rhizo-close-icon'}).
          text('x').
          prependTo(ui).data('rhizo-metamodel-key', key);
    }
    this.filterPanel_.append(ui);
    this.filterUis_[key] = ui;
  }
  if (dismissableFilters) {
    this.renderFilterSelector_();
  }
};

/**
 * Renders the filter selector to let the user choose which filters to apply
 * when many filters (over filterSelectorThreshold_) exist.
 * @private
 */
rhizo.ui.component.FilterStackContainer.prototype.renderFilterSelector_ =
    function() {
  var metaModel = this.metaModelWithUi_();
  this.filterSelector_ = $('<select />',
                           {'class': 'rhizo-filter-selector',
                            disabled: 'disabled'});
  $('<option />').attr('value', '').text('Add Filter...').
      appendTo(this.filterSelector_);
  for (var key in metaModel) {
    var option = $('<option />').attr('value', key).text(metaModel[key].label);
    this.filterSelector_.append(option);
  }
  this.filterPanel_.append(this.filterSelector_);
};

/** @override */
rhizo.ui.component.FilterStackContainer.prototype.ready = function() {
  rhizo.ui.component.Container.prototype.ready.call(this);
  // Every single filter implementation auto-activates itself when created.
  // Here we only need to activate the navigation between filters.
  //
  // TODO(battlehorse): Extend filters so that they can be properly
  // disabled/enabled when needed.
  if (this.filterSelector_) {
    // Enable the filter selector dropdown
    this.enableFilterSelector_();

    // Enable filter dismissal.
    this.enableFilterDismissal_();
  }
};

/**
 * Enables the filter selector. Now the user can start choosing which filters
 * to apply.
 * @private
 */
rhizo.ui.component.FilterStackContainer.prototype.enableFilterSelector_ =
    function() {
  this.filterSelector_.removeAttr('disabled').change(jQuery.proxy(function() {
    var key = this.filterSelector_.val();
    if (!(key in this.project_.metaModel())) {
      return;
    }
    this.showFilter_(key);

    // re-select the first (default) option.
    this.filterSelector_.find('option').eq(0).attr('selected', 'selected');
  }, this));
};

/**
 * Enables filter dismissal. Now the user can dismiss filters by clicking their
 * 'close' icon.
 * @private
 */
rhizo.ui.component.FilterStackContainer.prototype.enableFilterDismissal_ =
    function() {
  var that = this;
  this.filterPanel_.find('.rhizo-close-icon').click(function() {
      var key = $(this).data('rhizo-metamodel-key');
      // remove the filter
      $(that.filterUis_[key]).slideUp('fast');
      delete that.activeFilters_[key];

      // re-align the visualization.
      var message = {};
      message[key] = null;
      that.project_.eventBus().publish(
          'filter', message, /* callback */ null, that);

      // re-enable the filter among the selectable ones.
      that.filterSelector_.
          find('option[value=' + rhizo.util.escapeSelectorToken(key) + ']').
          removeAttr('disabled');
    });
};

/**
 * Makes the filter associated to a given metamodel key visible.
 *
 * @param {string} key The metamodel key for the filter to show.
 * @private
 */
rhizo.ui.component.FilterStackContainer.prototype.showFilter_ =
    function(key) {
  var filterUi = this.filterUis_[key];
  $(filterUi).slideDown('fast');

  this.activeFilters_[key] = true;

  this.filterSelector_.
      find('option[value=' + rhizo.util.escapeSelectorToken(key) + ']').
      attr('disabled', 'disabled');
};

/**
 * Returns a metaModel copy filtered to include only those metaModel keys whose
 * kind has an associated user interface.
 * @return {!Object.<string, *>} A filtered metaModel copy to include only keys
 *     whose kind has an associated user interface.
 * @private
 */
rhizo.ui.component.FilterStackContainer.prototype.metaModelWithUi_ =
    function() {
  var metaModelWithUi = {};
  var metaModel = this.project_.metaModel();
  for (var key in metaModel) {
    if (this.project_.metaModelRegistry().uiExistsForKind(
        metaModel[key].kind)) {
      metaModelWithUi[key] = metaModel[key];
    }
  }
  return metaModelWithUi;
};

/**
 * Callback invoked whenever one or more filters are applied (or removed)
 * elsewhere on the project. Ensures that the UI for the given filter key is
 * visible to the user. This is only relevant when filter selection is active,
 * otherwise all filters are always visible.
 *
 * @param {Object} message An eventbus message describing the filter change that
 *     occurred. See rhizo.meta.FilterManager for the expected message
 *     structure.
 * @private
 */
rhizo.ui.component.FilterStackContainer.prototype.onFilterChanged_ = function(
    message) {
  if (!this.filterSelector_) {
    // The filter selector is not in use. This means that all filters are
    // always visible.
    return;
  }
  for (var key in message) {
    if (!(key in this.activeFilters_)) {
      this.showFilter_(key);
    }
  }
};


/**
 * Renders a series of filters as a 'book', with only filter showing at any
 * time, and additional controls to flip between one filter and the next.
 *
 * @param {!rhizo.Project} project The project this component belongs to.
 * @constructor
 * @extends {rhizo.ui.component.Component}
 */
rhizo.ui.component.FilterBookContainer = function(project) {
  rhizo.ui.component.Container.call(this, project,
                                    'rhizo.ui.component.FilterBookContainer');
  project.eventBus().subscribe('userAction', this.onUserAction_, this);
};
rhizo.inherits(rhizo.ui.component.FilterBookContainer,
               rhizo.ui.component.Container);

/** @override */
rhizo.ui.component.FilterBookContainer.prototype.title = function() {
  return 'Filters';
};

/** @override */
rhizo.ui.component.FilterBookContainer.prototype.renderContainer = function() {
  this.filterPanel_ = $('<div />', {'class': 'rhizo-filter-container'});

  this.nextFilter_ =
      $('<div />', {'class': 'rhizo-next-filter', title: 'Next filter'}).
      text('>').
      appendTo(this.filterPanel_);
  this.prevFilter_ =
      $('<div />', {'class': 'rhizo-prev-filter', title: 'Previous filter'}).
      text('<').
      appendTo(this.filterPanel_);
  this.commitFilterLink_ =
      $('<a />', {'href': 'javascript:;', 'class': 'rhizo-autocommit-link'}).
      text('Apply').
      appendTo(this.filterPanel_);
  return this.filterPanel_.get(0);
};

rhizo.ui.component.FilterBookContainer.prototype.renderSingleComponent =
    function(component) {
  this.filterPanel_.append(component.render());
  return null;   // The component has already been added to the container.
};

/** @override */
rhizo.ui.component.FilterBookContainer.prototype.metaReady = function() {
  rhizo.ui.component.Container.prototype.metaReady.call(this);
  if (this.project_.filterManager().isFilterAutocommit()) {
    this.commitFilterLink_.css('display', 'none');
  }

  var metaModel = this.metaModelWithUi_();
  for (var key in metaModel) {
    var filterUi = this.project_.metaModelRegistry().createUiForKind(
      metaModel[key].kind, this.project_, key).filterUIControls();
    filterUi.css('display', 'none');
    this.filterPanel_.append(filterUi);
  }
};

/** @override */
rhizo.ui.component.FilterBookContainer.prototype.ready = function() {
  rhizo.ui.component.Container.prototype.ready.call(this);
  this.commitFilterLink_.click(jQuery.proxy(function() {
    this.project_.filterManager().commitFilter();
  }, this));

  // Every single filter implementation auto-activates itself when created.
  // Here we only need to activate the navigation between filters.
  var gui = this.gui_;
  this.nextFilter_.click(function() {
    var current = $('.rhizo-filter:visible', gui.container);
    var next = current.next('.rhizo-filter:hidden').eq(0);
    if (next.length > 0) {
      // cannot use hide/show otherwise safari clips rendering
      current.css('display', 'none');
      next.css('display', '');
    }
  });

  this.prevFilter_.click(function() {
    var current = $('.rhizo-filter:visible', gui.container);
    var prev = current.prev('.rhizo-filter:hidden').eq(0);
    if (prev.length > 0) {
      // cannot use hide/show otherwise safari clips rendering
      current.css('display', 'none');
      prev.css('display', '');
    }
  });
};

/**
 * Returns a metaModel copy filtered to include only those metaModel keys whose
 * kind has an associated user interface.
 * @return {!Object.<string, *>} A filtered metaModel copy to include only keys
 *     whose kind has an associated user interface.
 * @private
 */
rhizo.ui.component.FilterBookContainer.prototype.metaModelWithUi_ = function() {
  var metaModelWithUi = {};
  var metaModel = this.project_.metaModel();
  for (var key in metaModel) {
    if (this.project_.metaModelRegistry().uiExistsForKind(
        metaModel[key].kind)) {
      metaModelWithUi[key] = metaModel[key];
    }
  }
  return metaModelWithUi;
};

/**
 * Callback invoked whenever a user action occurs on the project. In particular
 * we care whether the status of the autocommit toggle, if such component
 * exists on the project.
 *
 * @param {Object} message The eventbus message describing the user action.
 * @private
 */
rhizo.ui.component.FilterBookContainer.prototype.onUserAction_ = function(
    message) {
  if (message['action'] == 'autocommit') {
    this.commitFilterLink_.css('display', !!message['enabled'] ? 'none' : '');
  }
};


/**
 * A legend to describes model color and size coding.
 * @param {!rhizo.Project} project The project this component belongs to.
 * @constructor
 * @extends {rhizo.ui.component.Component}
 */
rhizo.ui.component.Legend = function(project) {
  rhizo.ui.component.Component.call(this, project, 'rhizo.ui.component.Legend');
  this.legendPanel_ = null;
};
rhizo.inherits(rhizo.ui.component.Legend, rhizo.ui.component.Component);

/** @override */
rhizo.ui.component.Legend.prototype.title = function() {
  return 'Legend';
};

/** @override */
rhizo.ui.component.Legend.prototype.render = function() {
  this.legendPanel_ = $('<div />', {'class': "rhizo-legend-panel"});
  $('<p />').text('Legend is not available yet.').appendTo(this.legendPanel_);
  return this.legendPanel_.get(0);
};

/** @override */
rhizo.ui.component.Legend.prototype.metaReady = function() {
  // Currently only works in tandem with rhizo.autorender.AR
  if (!this.project_.renderer().getSizeRange &&
      !this.project_.renderer().getColorRange) {
    return;
  }
  this.legendPanel_.children().remove();

  var sizeRange = null;
  if (this.project_.renderer().getSizeRange) {
    sizeRange = this.project_.renderer().getSizeRange();
  }
  var colorRange = null;
  if (this.project_.renderer().getColorRange) {
    colorRange = this.project_.renderer().getColorRange();
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


/**
 * Experimental component to handle user-specified actions on models.
 * @param {!rhizo.Project} project The project this component belongs to.
 * @constructor
 * @extends {rhizo.ui.component.Component}
 */
rhizo.ui.component.Actions = function(project) {
  rhizo.ui.component.Component.call(this, project);
};
rhizo.inherits(rhizo.ui.component.Actions, rhizo.ui.component.Component);

/** @override */
rhizo.ui.component.Actions.prototype.title = function() {
  return 'Actions';
};

/** @override */
rhizo.ui.component.Actions.prototype.render = function() {
  var actionsContainer = $('<div />', {'class': 'rhizo-actions'});

  // Create 2 sample actions
  for (var i = 0; i < 2; i++) {
    $('<div />', {'class': 'rhizo-action'}).
        text('Sample Action ' + (i+1)).
        appendTo(actionsContainer);
  }
  return actionsContainer.get(0);
};

/** @override */
rhizo.ui.component.Actions.prototype.ready = function() {
  if ($('.rhizo-action', this.gui_.container).length > 0) {
    var gui = this.gui_;
    var project = this.project_;
    $('.rhizo-action', this.gui_.container).draggable({helper: 'clone'});
    this.gui_.universe.droppable({
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
            if (!project.selectionManager().isSelected(id)) {
              alert("Action applied on " + project.model(id));
              project.model(id).rendering().
                  refreshPosition().
                  moveToMark().
                  unmarkPosition();
            } else {
              var countSelected = 0;
              var all_selected = project.selectionManager().allSelected();
              for ( id in all_selected) { countSelected++;}
              alert("Action applied on " + countSelected + " elements");

              for (id in all_selected) {
                all_selected[id].rendering().
                    refreshPosition().
                    moveToMark().
                    unmarkPosition();
              }
              project.eventBus().publish(
                  'selection', {'action': 'deselectAll'});
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

/* ==== Templates ==== */


/**
 * Barebone template that only contains Rhizosphere viewport, used when all
 * interactive controls are defined externally and all Rhizosphere interactions
 * occur via programmatic API calls.
 *
 * @param {!rhizo.Project} project The project this template belongs to.
 * @param {?string} template_key A unique key that identifies the template.
 *     Generates a CSS class name that can be used for template-specific UI
 *     skinning.
 * @constructor
 * @extends {rhizo.ui.component.Template}
 */
rhizo.ui.component.BareTemplate = function(project, template_key) {
  rhizo.ui.component.Template.call(this, project, template_key);

};
rhizo.inherits(rhizo.ui.component.BareTemplate, rhizo.ui.component.Template);


/**
 * Template used when Rhizosphere is accessed via a mobile device, or when
 * the available screen estate is reduced (such as in gadgets). Collects all
 * the visualization controls in a links bar at the bottom of the screen.
 *
 * @param {!rhizo.Project} project The project this template belongs to.
 * @param {?string} template_key A unique key that identifies the template.
 *     Generates a CSS class name that can be used for template-specific UI
 *     skinning.
 * @constructor
 * @extends {rhizo.ui.component.Template}
 */
rhizo.ui.component.BottomTemplate = function(project, template_key) {
  rhizo.ui.component.Template.call(this, project, template_key);
  this.initComponents_(project);
};
rhizo.inherits(rhizo.ui.component.BottomTemplate, rhizo.ui.component.Template);

rhizo.ui.component.BottomTemplate.prototype.initComponents_ = function(
    project) {
  this.hbox_ = new rhizo.ui.component.HBox(project,
      'rhizo.ui.component.BottomBar', 'rhizo-bottom-bar');

  var default_components = this.defaultComponents(project);
  for (var i = 0; i < default_components.length; i++) {
    this.hbox_.addComponent(default_components[i]);
  }

  rhizo.ui.component.Template.prototype.addComponent.call(this, this.hbox_);
};

/**
 * Returns the list of default template components. Subclasses can override.
 * @param {!rhizo.Project} project The project this template belongs to.
 * @return {Array.<rhizo.ui.component.Component>} The list of default
 *     components that will be part of the template.
 */
rhizo.ui.component.BottomTemplate.prototype.defaultComponents = function(
    project) {
  var filterContainer = new rhizo.ui.component.FilterBookContainer(project);
  filterContainer.addComponent(new rhizo.ui.component.AutocommitPanel(project));
  return [
      new rhizo.ui.component.Layout(project),
      new rhizo.ui.component.SelectionManager(project),
      filterContainer,
      new rhizo.ui.component.Logo(project, false, false)
  ];
};

/**
 * Overrides the default addComponent() implementation to explicitly assign
 * newly added components to the template bottom links bar.
 *
 * @param {rhizo.ui.component.Component} component The component to add.
 * @override
 */
rhizo.ui.component.BottomTemplate.prototype.addComponent = function(component) {
  this.addtoBottomBar(component);
  return null;
};

/**
 * Adds the component to the template's bottom controls bar.
 *
 * @param {rhizo.ui.component.Component} component The component to add.
 */
rhizo.ui.component.BottomTemplate.prototype.addtoBottomBar = function(
    component) {
  // Keep the Logo always as the last component. Add new components just before
  // that.
  var renderings = this.hbox_.addComponent(component, -1);
  if (renderings) {
    this.gui_.container.append(renderings);
  }
};


/**
 * Default Rhizosphere UI template.
 * @param {!rhizo.Project} project The project this template belongs to.
 * @param {?string} template_key A unique key that identifies the template.
 *     Generates a CSS class name that can be used for template-specific UI
 *     skinning.
 * @constructor
 * @extends {rhizo.ui.component.Template}
 */
rhizo.ui.component.StandardTemplate = function(project, template_key) {
  rhizo.ui.component.Template.call(this, project, template_key);
  this.initComponents_(project);
};
rhizo.inherits(rhizo.ui.component.StandardTemplate,
               rhizo.ui.component.Template);

rhizo.ui.component.StandardTemplate.prototype.initComponents_ = function(
    project) {
  this.leftbox_ = new rhizo.ui.component.VBox(project, /* key */ null,
                                              'rhizo-left');
  this.rightbox_ = new rhizo.ui.component.RightBar(
      project, 'rhizo.ui.component.RightBar', 'rhizo-right');

  var left_components = this.defaultLeftComponents(project);
  for (var i = 0; i < left_components.length; i++) {
    this.leftbox_.addComponent(left_components[i]);
  }

  var right_components = this.defaultRightComponents(project);
  for (i = 0; i < right_components.length; i++) {
    this.rightbox_.addComponent(right_components[i]);
  }

  rhizo.ui.component.Template.prototype.addComponent.call(this, this.leftbox_);
  rhizo.ui.component.Template.prototype.addComponent.call(this, this.rightbox_);
};

/**
 * Returns the list of default template components that will be added to the
 * left bar. Subclasses can override.
 * @param {!rhizo.Project} project The project this template belongs to.
 * @return {Array.<rhizo.ui.component.Component>} The list of default
 *     components that will be part of the template.
 */
rhizo.ui.component.StandardTemplate.prototype.defaultLeftComponents = function(
    project) {
  var filterContainer = new rhizo.ui.component.FilterStackContainer(project);
  filterContainer.addComponent(new rhizo.ui.component.AutocommitPanel(project));
  return [
      new rhizo.ui.component.Logo(project, true, true),
      new rhizo.ui.component.Layout(project),
      new rhizo.ui.component.SelectionManager(project),
      filterContainer
  ];
};

/**
 * Returns the list of default template components that will be added to the
 * right bar. Subclasses can override.
 * @param {!rhizo.Project} project The project this template belongs to.
 * @return {Array.<rhizo.ui.component.Component>} The list of default
 *     components that will be part of the template.
 */
rhizo.ui.component.StandardTemplate.prototype.defaultRightComponents =
    function(project) {
  return [
      new rhizo.ui.component.Actions(project)
  ];
};

/**
 * Overrides the default addComponent() implementation to explicitly assign
 * newly added components to the template left controls bar.
 *
 * @param {rhizo.ui.component.Component} component The component to add.
 * @override
 */
rhizo.ui.component.StandardTemplate.prototype.addComponent = function(
    component)  {
  this.addtoLeftBar(component);
  return null;
};

/**
 * Adds the component to the template's left controls bar.
 *
 * @param {rhizo.ui.component.Component} component The component to add.
 */
rhizo.ui.component.StandardTemplate.prototype.addtoLeftBar = function(
    component) {
  var renderings = this.leftbox_.addComponent(component);
  if (renderings) {
    this.gui_.container.append(renderings);
  }
};

/**
 * Adds the component to the template's right controls bar.
 *
 * @param {rhizo.ui.component.Component} component The component to add.
 */
rhizo.ui.component.StandardTemplate.prototype.addToRightBar = function(
    component) {
  var renderings = this.rightbox_.addComponent(component);
  if (renderings) {
    this.gui_.container.append(renderings);
  }
};


/**
 * Enumerates available template factories. A template factory is a function
 * that receives a rhizo.Project as input and returns a template instance.
 *
 * New templates can be registered by adding a factory to this enum.
 *
 * @enum {string} Enumeration of available template factories.
 */
rhizo.ui.component.templates = {
  'bare': function(project) {
    return new rhizo.ui.component.BareTemplate(project, 'bare');
  },
  'bottom': function(project) {
    return new rhizo.ui.component.BottomTemplate(project, 'bottom');
  },
  'default': function(project) {
    return new rhizo.ui.component.StandardTemplate(project, 'default');
  }
};
/* ./src/js/extra/rhizo.broadcast.js */
/**
  @license
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

// RHIZODEP=rhizo,rhizo.ui.component,rhizo.state
namespace("rhizo.broadcast");

/**
 * This file defines Rhizosphere broadcasting infrastructure. Visualizations
 * can publish their current state for other remote ones to follow.
 *
 * Broadcasting relies on existing Rhizosphere state management to distribute
 * the visualization state remotely:
 * - A 'broadcasting' visualization publishes its current state to a server.
 * - A 'follower' visualization receives notifications from the same server
 *   whenever state changes occur.
 *
 * Users can use this feature to enable a sort of 'presentation mode' for
 * visualizations.
 *
 * Broadcasting relies on AJAX and AppEngine Channel APIs respectively to send
 * and receive state changes. See appengine/src/py/handlers/broadcast.py for
 * details about the specific implementation.
 *
 * Broadcasting relies on 2 URL parameters which are shared from broadcasters to
 * all followers for them to identify and connect to the broadcasting
 * visualization:
 * - 'follow': An uuid to uniquely identify this visualization broadcasting
 *   session.
 * - 'pid': The project id of the broadcasting visualization. The following
 *   visualization must have the same pid for it to be able to follow the
 *   broadcaster.
 *
 * On the client side:
 * - both broadcasters and followers can stop/resume their activity. When
 *   following is resumed, the visualization state is updated to match the
 *   current state on the broadcasting side, reverting any local changes that
 *   may have been applied.
 * - A 'following' visualization does not explicitly disable its local controls.
 *   The follower state can therefore diverge from the broadcasting one if the
 *   user changes the local filters, selections, layout etc...
 *   It is up to the developer to roll out a restricted visualization whose UI
 *   does not permit this to happen, for example by using a custom template that
 *   disables layout, selection and filters (see rhizo.ui.component.js).
 *
 * Since broadcasting is built on top of Rhizosphere state managers, any local
 * state management feature works also for remote broadcasting. This implies,
 * for instance, that the local HTML5 history will record states received from
 * a remote broadcasting visualization. This allows a 'following' visualization
 * to replay all the operations performed remotely, even when the remote
 * broadcasting visualization is gone (or we have stopped following it).
 *
 * Broadcasting is an EXPERIMENTAL feature and as such is constrained and
 * limited in various ways:
 * - because of the use of Ajax and same-origin security policy, broadcasting
 *   will work only for visualizations that are served by the same server that
 *   is used to dispatch broadcast messages.
 *
 * - broadcasting relies on Google AppEngine Channel APIs. Any limitation that
 *   exists on the Channel API applies here too.
 *
 * - No notification exists about the number of remote users attending a given
 *   broadcasting visualization. No notification exists when new users join or
 *   leave a broadcasting visualization.
 *
 * - We do not deal with out-of-order messages.
 *
 * - Broadcasting is broken when multiple visualizations are present in a page.
 *   Since the broadcaster publishes the full state (including the state of
 *   other visualizations), this may interfere with the state of visualizations
 *   on the following side, even though they are not actively following
 *   anything.
 *
 * - Broadcasting uses unique URLs (to be shared with other participants) to
 *   let followers identify and connect to the visualization. As such,
 *   broadcasting may be impaired when the broadcaster or follower
 *   visualizations are in an embedded context, where the document URL may not
 *   be accessible / changeable.
 *
 * - Several other server-side limitations exist. See
 *   appengine/src/py/handlers/broadcast.py for details.
 */

// ToDO(battlehorse): Track the number of people attending.
// TODO(battlehorse): Detect channels closing/opening (both server and client).
// TODO(battlehorse): Handle receptoin of out-of-order states
// TODO(battlehorse): Do not broadcast the global state and/or only extract
//   the portion of state that affects the broadcast visualization, to avoid
//   corruption of other visualizations when multiple ones are present in a
//   page.

/**
 * A dual-purpose UI component to let the user start/stop broadcasting or
 * start/stop the remote following of a broadcasting visualization.
 *
 * @param {!rhizo.Project} project  The project this component belongs to.
 * @constructor
 * @extends {rhizo.ui.component.Component}
 */
rhizo.broadcast.BaseComponent = function(project) {
  rhizo.ui.component.Component.call(this, project,
                                    'rhizo.broadcast.BaseComponent');
  this.specialized_component_ = null;
};
rhizo.inherits(rhizo.broadcast.BaseComponent, rhizo.ui.component.Component);

rhizo.broadcast.BaseComponent.prototype.title = function() {
  return 'Broadcast';
};

rhizo.broadcast.BaseComponent.prototype.render = function() {
  var broadcastPanel = $('<div />', {'class': 'rhizo-broadcast'});
  if (!rhizo.broadcast.globalTransmitter()) {
    this.project_.logger().warn(
        'Channels API not loaded. Broadcasting is disabled');
    return broadcastPanel.get(0);
  }

  // Decide whether we are following or not. If not, allow broadcasting.
  var urlParams = rhizo.util.urlParams();
  if ('follow' in urlParams && urlParams.pid == this.project_.uuid()) {
    // Start the component in following mode.
    this.specialized_component_ = new rhizo.broadcast.FollowComponent(
        this.project_, urlParams['follow']);
  } else {
    // Start the component in broadcast mode.
    this.specialized_component_ = new rhizo.broadcast.BroadcastComponent(
        this.project_);
  }

  broadcastPanel.append(this.specialized_component_.render());
  return broadcastPanel.get(0);
};

rhizo.broadcast.BaseComponent.prototype.metaReady = function() {
  this.specialized_component_.metaReady();
};

rhizo.broadcast.BaseComponent.prototype.ready = function() {
  this.specialized_component_.ready();
};


/**
 * A component specialed for following visualizations, that lets the user
 * stop/resume following. The componet tries to attach to the broadcasting
 * channel at startup.
 *
 * @param {!rhizo.Project} project  The project this component belongs to.
 * @param {string} followed_channel_uuid The broadcasting channel uuid.
 * @constructor
 * @extends {rhizo.ui.component.Component}
 */
rhizo.broadcast.FollowComponent = function(project,
                                           followed_channel_uuid) {
  rhizo.ui.component.Component.call(this, project);
  this.followed_channel_uuid_ = followed_channel_uuid;
  this.following_ = false;
};
rhizo.inherits(rhizo.broadcast.FollowComponent, rhizo.ui.component.Component);

rhizo.broadcast.FollowComponent.prototype.render = function() {
  this.follow_ = $('<button />', {'disabled': 'disabled'}).text('Initializing');
  this.tip_ = $('<p />');
  return [this.follow_.get(0), this.tip_.get(0)];
};

rhizo.broadcast.FollowComponent.prototype.ready = function() {
  this.resumeFollowing_();
  this.follow_.removeAttr('disabled').click(jQuery.proxy(function() {
    if (this.following_) {
      this.stopFollowing_();
    } else {
      this.resumeFollowing_();
    }
  }, this));
};

/**
 * Resumes following the remote broadcasting visualization.
 * @private
 */
rhizo.broadcast.FollowComponent.prototype.resumeFollowing_ = function() {
  this.follow_.text('Wait ...');
  this.tip_.text('Connecting to the remote visualization...');
  rhizo.broadcast.globalTransmitter().follow(
      this.followed_channel_uuid_, true, jQuery.proxy(function(status,
                                                               text,
                                                               initial) {
    if (status) {
      // successfully following the channel.
      // The server will now send updates to us.

      // Start a binder to collect states received over the wire.
      // The project overlord is guaranteed to exist here, since the ready()
      // component phase occurs after its creation.
      var projectOverlord =
          rhizo.state.getMasterOverlord().projectOverlord(this.project_);
      var binder = new rhizo.broadcast.FollowStateBinder(
          projectOverlord, rhizo.broadcast.globalTransmitter());

      // Bind the project state to the states received over the wire.
      projectOverlord.addBinding(binder);

      if (initial && initial.state) {
        // If the broadcasting visualization is still in its initial state,
        // we won't receive any initial state here.
        rhizo.state.getMasterOverlord().setInitialState(
            rhizo.broadcast.BINDER_KEY, initial.state, true);
      }

      // Update UI.
      this.follow_.text('Stop');
      this.tip_.text('You are following a remote visualization.');

      // Flip switch.
      this.following_ = true;
    } else {
      this.follow_.text('Retry');
      this.tip_.text(text);
    }
  }, this));
};

/**
 * Stops following the remote broadcasting visualization
 * @private
 */
rhizo.broadcast.FollowComponent.prototype.stopFollowing_ = function() {
  this.follow_.text('Wait ...');
  this.tip_.text('Disconnecting from remote visualization...');
  rhizo.broadcast.globalTransmitter().follow(
      this.followed_channel_uuid_, false, jQuery.proxy(function(status, text) {
    if (status) {
      // successfully un-following the channel.
      // The server will no longer push updates to us.

      // Stop the project from receiving remote states.
      var projectOverlord =
          rhizo.state.getMasterOverlord().projectOverlord(this.project_);
      var binder = projectOverlord.removeBinding(rhizo.broadcast.BINDER_KEY);

      // Stop listening to states changes received by the transmitter.
      binder.unlisten();

      // Update UI.
      this.follow_.text('Resume');
      this.tip_.text('Resume following the visualization.');

      // Flip switch.
      this.following_ = false;
    } else {
      this.follow_.text('Retry');
      this.tip_.text(text);
    }
  }, this));
};


/**
 * A component specialed for broadcasting visualizations, that lets the user
 * start/stop broadcasting the visualization state.
 *
 * @param {!rhizo.Project} project  The project this component belongs to.
 * @constructor
 */
rhizo.broadcast.BroadcastComponent = function(project) {
  rhizo.ui.component.Component.call(this, project);
  this.broadcasting_ = false;
};
rhizo.inherits(rhizo.broadcast.BroadcastComponent,
    rhizo.ui.component.Component);

rhizo.broadcast.BroadcastComponent.prototype.render = function() {
  this.share_ = $('<button />', {'disabled': 'disabled'}).text('Broadcast');
  this.tip_ = $('<p />').text('Let others follow this visualization.');
  this.shareUrl_ = $('<input />', {type: 'text',
                                   'class': 'rhizo-broadcast-url'});

  return [this.share_.get(0), this.tip_.get(0), this.shareUrl_.get(0)];
};

rhizo.broadcast.BroadcastComponent.prototype.ready = function() {
  this.share_.removeAttr('disabled').click(jQuery.proxy(function() {
    if (this.broadcasting_) {
      this.stopBroadcasting_();
    } else {
      this.startBroadcasting_();
    }
  }, this));
};

/**
 * Starts broadcasting.
 * @private
 */
rhizo.broadcast.BroadcastComponent.prototype.startBroadcasting_ = function() {
  this.share_.text('Wait ...');
  rhizo.broadcast.globalTransmitter().open(jQuery.proxy(function(status,
                                                                 text) {
    if (status) {  // broadcast channel successfully opened.

      // Start a binder to collect state changes that occur locally.
      var projectOverlord =
          rhizo.state.getMasterOverlord().projectOverlord(this.project_);
      var binder = new rhizo.broadcast.BroadcastStateBinder(
          projectOverlord, rhizo.broadcast.globalTransmitter());

      // Start publishing local state changes that we are notified of to the
      // transmitter.
      projectOverlord.addBinding(binder);

      // Update UI.
      // Give the user a URL that he can share with any other person that
      // wants to follow this visualization state.
      this.tip_.text('Share this URL for others to join.');
      this.share_.text('Stop');
      this.shareUrl_.
          val(rhizo.util.buildUrl(null,
                                  {follow: text, pid: this.project_.uuid()})).
          show('fast').
          focus().
          select();

      // Flip the switch.
      this.broadcasting_ = true;
    } else {  // broadcast channel couldn't be opened.
      this.tip_.text(text);
      this.share_.text('Broadcast');
    }
  }, this));
};

/**
 * Stops broadcasting.
 * @private
 */
rhizo.broadcast.BroadcastComponent.prototype.stopBroadcasting_ = function() {
  // Stop collecting local state changes.
  var projectOverlord =
      rhizo.state.getMasterOverlord().projectOverlord(this.project_);
  var binder = projectOverlord.removeBinding(rhizo.broadcast.BINDER_KEY);

  // Update UI.
  this.tip_.text('Let others follow this visualization.');
  this.share_.text('Broadcast');
  this.shareUrl_.hide().val('');

  // Flip the switch.
  this.broadcasting_ = false;
};

/**
 * Unique key that identifies that broadcasting binding among other state
 * management binders.
 * @type {string}
 */
rhizo.broadcast.BINDER_KEY = 'broadcast';

/**
 * A state manager binding that listens for state changes occurred to a
 * remote visualization and publishes them to the local state manager.
 *
 * @param {rhizo.state.ProjectOverlord} overlord The state manager for the
 *     project this binder is attached to.
 * @param {rhizo.broadcast.Transmitter} transmitter The transmitter that
 *     receives notifications of state changes occurred remotely.
 * @constructor
 */
rhizo.broadcast.FollowStateBinder = function(overlord, transmitter) {
  rhizo.state.StateBinder.call(this, overlord, rhizo.broadcast.BINDER_KEY);
  this.transmitter_ = transmitter;
  this.transmitter_.listen('__binder__', jQuery.proxy(function(data) {
    this.stateReceived_(data);
  }, this));
};
rhizo.inherits(rhizo.broadcast.FollowStateBinder, rhizo.state.StateBinder);

/**
 * Callback invoked when a remote state has been received by the transmitter.
 * @param {*} data Plain javascript object containing the remote visualization
 *     state.
 * @private
 */
rhizo.broadcast.FollowStateBinder.prototype.stateReceived_ = function(data) {
  this.overlord_.transition(this.key(), data.delta, data.state, data.replace);
};

/**
 * Stops listening for remote state changes.
 */
rhizo.broadcast.FollowStateBinder.prototype.unlisten = function() {
  this.transmitter_.unlisten('__binder__');
};

/**
 * Since we are following a remote visualization, there's nothing to do when
 * a local change occurs.
 */
rhizo.broadcast.FollowStateBinder.prototype.onTransition = function() {};


/**
 * A state manager binding that publishes local state changes for remote
 * visualizations to follow.
 *
 * @param {rhizo.state.ProjectOverlord} overlord The state manager for the
 *     project this binder is attached to.
 * @param {rhizo.broadcast.Transmitter} transmitter The transmitter that
 *     publishes notifications of state changes occurred locally.
 * @constructor
 */
rhizo.broadcast.BroadcastStateBinder = function(overlord, transmitter) {
  rhizo.state.StateBinder.call(this, overlord, rhizo.broadcast.BINDER_KEY);
  this.transmitter_ = transmitter;
};
rhizo.inherits(rhizo.broadcast.BroadcastStateBinder, rhizo.state.StateBinder);

/**
 * Publishes a local state change to the transmitter, so that it can be
 * sent to remote visualizations.
 */
rhizo.broadcast.BroadcastStateBinder.prototype.onTransition = function(
    delta, state, opt_replace) {
  this.transmitter_.publish(
      {delta: delta, state: state, replace: opt_replace || false});
};


/**
 * Wrapper around the Google AppEngine Channel APIs and other Ajax callbacks
 * used to broadcast and receive visualization states to/from remote
 * visualizations.
 *
 * @constructor
 */
rhizo.broadcast.Transmitter = function() {
  this.channel_ = null;
  this.socket_ = null;
  this.channel_uuid_ = null;

  this.listen_callbacks_ = {};
};

/**
 * Registers a listener to be notified whenever a message is received.
 * @param {string} key A unique key that identifies the listener.
 * @param {function(*)} callback The callback that will be invoked when a
 *     message is received. It receives a single parameter, the message itself
 *     (which will be a plain untyped javascript object).
 */
rhizo.broadcast.Transmitter.prototype.listen = function(key, callback) {
  this.listen_callbacks_[key] = callback
};

/**
 * Removes a listener.
 * @param {string} key The unique key that identies the listener.
 */
rhizo.broadcast.Transmitter.prototype.unlisten = function(key) {
  delete this.listen_callbacks_[key];
};

/**
 * Instructs the transmitter to start/stop following a given channel. Once
 * following, this transmitter will receive all messages remotely published on
 * the channel.
 *
 * This method is asynchronous. The communication channel will be opened if it's
 * not open yet.
 *
 * @param {string} follow_uuid The uuid of the channel to follow.
 * @param {boolean} enable Whether to start or stop following the channel.
 * @param {function(boolean, string, *)} callback Callback invoked upon
 *     success/failure of the follow operation. It receives up to 3 parameters.
 *     The first is a boolean status flag for success/failure.
 *     On failure the second parameter will contain the description of the error
 *     that occurred.
 *     On success, the second parameter is unused, and the third will contain
 *     the current channel state (i.e. the current state of the remote
 *     visualization being followed), if any.
 */
rhizo.broadcast.Transmitter.prototype.follow = function(follow_uuid,
                                                        enable,
                                                        callback) {
  if (!this.channel_uuid_) {
    // Try opening the channel if it's not established yet.
    this.open(jQuery.proxy(function(status, text) {
      if (!status) {
        // bubble up if we couldn't open the channel.
        callback(status, text);
      } else {
        // otherwise try again issuing the follow statement now that the channel
        // is open.
       this.follow(follow_uuid, enable, callback); 
      }
    }, this));
    return;
  }
  $.ajax({
    url: '/broadcast/follow',
    dataType: 'json',
    type: 'POST',
    data: {uuid: this.channel_uuid_,
           follow: follow_uuid,
           enable: enable ? '1' : '0'},
    error: function(xhr, status, error) {
      callback(false, 'Error changing follow status');
    },
    success: function(data, status, xhr) {
      if (data.status != 'ok') {
        callback(false, 'Error changing follow status: ' + data.status);
      } else {
        if (enable) {
          callback(true, null, JSON.parse(data.initial));
        } else {
          callback(true);
        }

      }
    }
  })
};

/**
 * Publishes a given message on the channel managed by this transmitter.
 * The channel must be opened via open() first.
 *
 * This method is asynchronous.
 *
 * @param {*} message A plain Javascript object containing the payload to
 *     publish. Must be possible to serialize it as JSON.
 * @param {function(boolean, string)} opt_callback An optional callback function
 *     invoked upon success/failure of the publish operation.
 *     It receives 2 parameters: the first is a boolean defining
 *     success/failure, the second is an error message in case of failure.
 */
rhizo.broadcast.Transmitter.prototype.publish = function(message,
                                                         opt_callback) {
  if (!this.channel_uuid_) {
    if (opt_callback) {
      opt_callback(false, 'Channel is not established yet.');
    }
    return;
  }

  $.ajax({
    url: '/broadcast/publish',
    dataType: 'json',
    type: 'POST',
    data: {uuid: this.channel_uuid_, payload: JSON.stringify(message)},
    error: function(xhr, status, error) {
      if (opt_callback) {
        opt_callback(false, 'Error publishing message');
      }
    },
    success: function(data, status, xhr) {
      if (data.status != 'ok') {
        if (opt_callback) {
          opt_callback(false, 'Error publishing message: ' + data.status);
        }
      } else {
        if (opt_callback) {
          opt_callback(true);
        }
      }
    }
  })
};

/**
 * Opens a channel for publishing / receiving messages to/from remote
 * visualizations.
 *
 * This method is asynchronous.
 *
 * @param {function(boolean, string)} callback A callback function invoked upon
 *     success/failure of the open operation. It receives 2 parameters: the
 *     first is a boolean defining success/failure, the second is an error
 *     message in case of failure or the uuid of the opened channel in case
 *     of success.
 */
rhizo.broadcast.Transmitter.prototype.open = function(callback) {
  if (this.channel_uuid_) {
    callback(true, this.channel_uuid_);
    return;
  }
  $.ajax({
    url: '/broadcast/open',
    dataType: 'json',
    type: 'POST',
    error: function(xhr, status, error) {
      callback(false, 'Error opening channel.');
    },
    success: jQuery.proxy(function(data, status, xhr) {
      if (data.status != 'ok') {
        callback(false, 'Error opening channel: ' + data.status);
      } else {
        this.openChannel_(data.channel_token, data.channel_uuid, callback);
      }
    }, this)
  });
};

/**
 * Callback invoked whenever a message is received from the underlying channel.
 * @param {*} evt
 * @private
 */
rhizo.broadcast.Transmitter.prototype.messageReceived_ = function(evt) {
  var message = JSON.parse(evt.data);
  for (var listen_key in this.listen_callbacks_) {
    this.listen_callbacks_[listen_key](message);
  }
};

/**
 * Callback invoked after the first of the 2 handshaking steps required for
 * channel opening, once the channel has been created server side.
 *
 * @param {string} channel_token The token to create the client-side stub of the
 *     channel that has been created on the server.
 * @param {string} channel_uuid The unique id of the channel, that will be used
 *     for all future communications on the channel.
 * @param {function(boolean, string)} callback Callback function passed on by
 *     open(), to be invoked upon success/failure of the entire open operation.
 * @private
 */
rhizo.broadcast.Transmitter.prototype.openChannel_ = function(
    channel_token, channel_uuid, callback) {
  this.channel_ = new goog.appengine.Channel(channel_token);
  this.socket_ = this.channel_.open();
  this.socket_.onopen = jQuery.proxy(function() {
    this.confirmOpenChannel_(channel_uuid, callback);
  }, this);
  this.socket_.onmessage = jQuery.proxy(this.messageReceived_, this);
};

/**
 * Issues the second request to complete the handshaking and put the channel
 * into established (working) mode. Invoked once the local client channel stub
 * has been successfully created.
 *
 * @param {string} channel_uuid The unique id of the channel, that will be used
 *     for all future communications on the channel.
 * @param {function(boolean, string)} callback Callback function passed on by
 *     open(), to be invoked upon success/failure of the entire open operation.
 */
rhizo.broadcast.Transmitter.prototype.confirmOpenChannel_ = function(
    channel_uuid, callback) {
  $.ajax({
    url: '/broadcast/connect',
    dataType: 'json',
    data: {uuid: channel_uuid},
    type: 'POST',
    error: function(xhr, status, error) {
      callback(false, 'Error confirming channel opening.');
    },
    success: jQuery.proxy(function(data, status, xhr) {
      if (data.status != 'ok') {
        callback(false, 'Error confirming channel opening: ' + data.status);
      } else {
        this.channel_uuid_ = channel_uuid;
        callback(true, channel_uuid);
      }
    }, this)
  })
};


/**
 * The singleton transmitter that manages all communications to/from remote
 * visualizations.
 *
 * @type {rhizo.broadcast.Transmitter}
 * @private
 */
rhizo.broadcast.transmitter_ = null;
if (typeof(goog) != 'undefined' &&
    typeof(goog.appengine) != 'undefined' &&
    typeof(goog.appengine.Channel) != 'undefined') {
    rhizo.broadcast.transmitter_ = new rhizo.broadcast.Transmitter();
}


/**
 * @return {rhizo.broadcast.Transmitter} The singleton transmitter that manages
 * all communications to/from remote visualizations. Will be null if
 * message publishing/following is not enabled (for example, Google AppEngine
 * Channel APIs are not available or have not been loaded).
 */
rhizo.broadcast.globalTransmitter = function() {
  return rhizo.broadcast.transmitter_;
};
/* ./src/js/rhizo.ui.gui.js */
/**
  @license
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

// RHIZODEP=rhizo.ui.component,rhizo
// GUI Namespace
namespace("rhizo.ui.gui");

/**
 * The visualization GUI, defined by the overall container, viewport and
 * universe.
 *
 * The GUI is not aware of the full list of other UI components
 * that are part of it, as this list can vary depending on the template being
 * used. Components can still communicate with each other via the project
 * eventbus.
 *
 * @param {HTMLElement} container The HTML element that will contain the
 * @param {string} platform The platform we are currently running on (e.g.:
 *     'mobile', 'default' ... ).
 * @param {string} device The device we are currently running on (e.g.:
 *     'ipad', 'iphone', 'android', 'default' ... ).
 * @constructor
 */
rhizo.ui.gui.GUI = function(container, platform, device) {
  /**
   * The target platform we are rendering onto (e.g.: 'mobile').
   *
   * @type {string}
   * @private
   */
  this.platform_ = platform;

  /**
   * The specific device we are targeting (e.g.: 'ipad').
   *
   * @type {string}
   * @private
   */
  this.device_ = device;

  /**
   * A JQuery object pointing to the DOM element that contains the whole
   * Rhizosphere instance.
   *
   * @type {!Object}
   */
  this.container = $(container);
  /**
   * Whether Rhizosphere is being deployed in a 'small' environment.
   *
   * @type {boolean}
   * @private
   */
  this.is_small_container_ = false;
  this.initContainer_();

  /**
   * The universe component is the container for all the models managed
   * by Rhizosphere. A universe must always exist in a Rhizosphere
   * visualization.
   *
   * @type {Object}
   */
  this.universe = null;

  /**
   * The viewport component defines which part of the universe is visible to
   * the user. The universe may be bigger than the current visible area,
   * so the viewport is responsible for panning too.
   *
   * @type {Object}
   */
  this.viewport = null;

  /**
   * Dictates whether animations are enabled or not.
   *
   * @type {boolean}
   */
  this.noFx = false;

  /**
   * A reference to a recurring interval function to monitor the size of the
   * viewport.
   *
   * @type {number?}
   * @private
   */
  this.trackResizeInterval_ = null;

  /**
   * A reference to a debouncing timeout function that will re-layout
   * visualization models after the viewport changed its size. Debouncing is
   * required to avoid computing layouts while a resize is in progress.
   *
   * @type {number?}
   * @private
   */
  this.resizeTimeout_ = null;

  /**
   * The last computed viewport size, if any.
   *
   * @type {Object}
   * @private
   */
  this.lastViewportSize_ = null;
};

rhizo.ui.gui.GUI.prototype.done = function() {
  var kbParam = rhizo.util.urlParams()['kb'];
  if (kbParam && /true|yes|1/.test(kbParam)) {
    this.activateOnscreenKeyboard();
  }
};

/**
 * Starts tracking viewport sizes for the purpose of re-layouting visualization
 * models whenever the viewport changes its size.
 *
 * @param {!rhizo.layout.LayoutManager} layoutManager The visualization layout
 *     manager.
 */
rhizo.ui.gui.GUI.prototype.trackViewportResize = function(layoutManager) {
  this.trackResizeInterval_ = window.setInterval(
      jQuery.proxy(function() {
        this.checkViewportSize_(layoutManager);
      }, this), 150);
};

/**
 * Checks the current viewport size, scheduling a layout operation if the
 * size changed since the last check.
 *
 * @param {!rhizo.layout.LayoutManager} layoutManager The visualization layout
 *     manager.
 * @private
 */
rhizo.ui.gui.GUI.prototype.checkViewportSize_ = function(layoutManager) {
  if (!this.viewport) {
    return;
  }
  if (!this.lastViewportSize_) {
    this.lastViewportSize_ = {
      width: this.viewport.width(), height: this.viewport.height()
    };
    return;
  }

  var viewportSize = {
    width: this.viewport.width(), height: this.viewport.height()
  };
  if (viewportSize.width != this.lastViewportSize_.width ||
      viewportSize.height != this.lastViewportSize_.height) {
    this.lastViewportSize_ = {
      width: this.viewport.width(), height: this.viewport.height()
    };
    // Debounce the resize event from the actual resizing.
    if (this.resizeTimeout_) {
      window.clearTimeout(this.resizeTimeout_);
    }
    this.resizeTimeout_ = window.setTimeout(jQuery.proxy(function() {
      layoutManager.forceLayout();
    }, this), 200);
  }
};

/**
 * Reverts the Rhizosphere container back to its original state, before the
 * Rhizosphere visualization was assembled inside it, removing indiscriminately
 * any DOM element contained within.
 */
rhizo.ui.gui.GUI.prototype.destroy = function() {
  if (this.trackResizeInterval_) {
    window.clearInterval(this.trackResizeInterval_);
  }
  if (this.resizeTimeout_) {
    window.clearTimeout(this.resizeTimeout_);
  }
  var classes = this.container.get(0).className.split(' ');
  for (var i = 0; i < classes.length; i++) {
    if (classes[i].indexOf('rhizo') == 0) {
      this.container.removeClass(classes[i]);
    }
  }
  this.container.children().remove();
};

rhizo.ui.gui.GUI.prototype.initContainer_ = function() {
  // Enable device-specific and platform-specific styles.
  this.container.
      addClass('rhizo').
      addClass('rhizo-device-' + this.device_).
      addClass('rhizo-platform-' + this.platform_);
  this.is_small_container_ = this.container.width() < 600 ||
      this.container.height() < 250;
};

rhizo.ui.gui.GUI.prototype.setViewport = function(viewport) {
  this.viewport = viewport;
};

rhizo.ui.gui.GUI.prototype.setUniverse = function(universe) {
  this.universe = universe;
};

/**
 * @return {boolean} Whether the GUI is 'small' (in terms of pixel area).
 *     Renderers might use this hint to customize the renderings they produce.
 */
rhizo.ui.gui.GUI.prototype.isSmall = function() {
  return this.is_small_container_;
};

/**
 * @return {boolean} Are we running on a mobile device?
 */
rhizo.ui.gui.GUI.prototype.isMobile = function() {
  return this.platform_ == 'mobile';
};

rhizo.ui.gui.GUI.prototype.allRenderingHints = function() {
  return {
    small: this.isSmall(),
    mobile: this.isMobile()
  };
};

rhizo.ui.gui.GUI.prototype.disableFx = function(disabled) {
  this.noFx = disabled;
};

rhizo.ui.gui.GUI.prototype.activateOnscreenKeyboard = function() {
  if (rhizo.keyboard && rhizo.keyboard.Keyboard) {
    new rhizo.keyboard.Keyboard(this.container);
  }
};
/* ./src/js/rhizo.bootstrap.js */
/**
  @license
  Copyright 2009 The Rhizosphere Authors. All Rights Reserved.

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

// RHIZODEP=rhizo.options,rhizo.model.loader,rhizo.base,rhizo.ui.component,rhizo.jquery,rhizo.ui.gui
namespace('rhizo.bootstrap');


/**
 * Uuid counter to uniquely identify the container of each visualization within
 * the document.
 * @type {number}
 * @private
 */
rhizo.bootstrap.uuids_ = 0;


/**
 * A Bootstrap is the main entry point to start a Rhizosphere visualization.
 * It takes care of loading the data to visualize, create the chrome and other
 * ui elements for the visualization, and bind all the necessary event handlers.
 *
 * @param {HTMLElement} container The HTML element that will contain the
 *     visualization. It must have an explicit CSS position set (either
 *     'relative' or 'absolute'). You are free to set its width and height and
 *     Rhizosphere will render itself within the given constraints.
 * @param {(Object.<string, *>|rhizo.Options)=} opt_options Visualization-wide
 *     configuration options, specified either as a key-value map or using
 *     a rhizo.Options object. The set of allowed keys is described at
 *     http://www.rhizospherejs.com/doc/contrib_tables.html#options.
 * @param {function(rhizo.UserAgent, boolean, string=)=} opt_callback
 *     Optional callback invoked on the visualization is completely initialized.
 *     Receives 3 parameters: the rhizo.UserAgent managing the visualization, a
 *     boolean indicating whether the visualization successfully initialized
 *     and a string containing the error details if the initialization was
 *     not sucessful.
 * @constructor
 */
rhizo.bootstrap.Bootstrap = function(container, opt_options, opt_callback) {
  this.container_ = container;
  this.deployed_ = false;
  var containerId = $(container).attr('id');
  if (!containerId || containerId.length == 0) {
    // Generates a unique element id for the visualization container if one
    // isn't defined yet.
    // The generated id must be consistent over time (assuming the order of
    // bootstrap calls does not change over time when multiple visualizations
    // are present), since long-lived Rhizosphere state representations are
    // based on this.
    $(container).attr('id', 'rhizo-uuid-' + (rhizo.bootstrap.uuids_++));
  }
  this.options_ = new rhizo.Options(opt_options);
  this.callback_ = opt_callback;
};

/**
 * @return {boolean} Whether deployment of models has already occurred or not.
 */
rhizo.bootstrap.Bootstrap.prototype.isDeployed = function() {
  return this.deployed_;
};

/**
 * Performs all the necessary steps to prepare a Rhizosphere visualization, and
 * then tries loading the given datasource and display it.
 *
 * @param {string} opt_resource The URI of the datasource to load and visualize
 *     with Rhizosphere. If null and the bootstrapper is not allowed to
 *     configure itself from URL parameters, this method behaves like prepare().
 * @return {rhizo.UserAgent} A user agent bound to the visualization through
 *     which you can have programmatic access to the visualization.
 */
rhizo.bootstrap.Bootstrap.prototype.prepareAndDeploy = function(opt_resource) {
  var ua = this.prepare();
  this.deploy(opt_resource);
  return ua;
};

/**
 * Performs all the necessary steps to prepare a Rhizosphere visualization, up
 * to the point where it can receive the models to display.
 *
 * Use this method in conjunction with deploy() if you want to be in charge
 * of loading the actual models to visualize.
 *
 * @return {rhizo.UserAgent} A user agent bound to the visualization through
 *     which you can have programmatic access to the visualization.
 */
rhizo.bootstrap.Bootstrap.prototype.prepare = function() {
  // Initialize the GUI, project and template.
  this.gui_ = this.initGui_();
  this.project_ = new rhizo.Project(this.gui_, this.options_);
  this.template_ = this.initTemplate_(this.project_, this.gui_, this.options_);
  return this.project_.userAgent();
};

/**
 * Loads the data items to visualize from the given datasource URI and displays
 * them in the Rhizosphere visualization managed by this bootstrapper.
 * The boostrapper must have already been prepared before invoking this method.
 *
 * @param {string} opt_resource The URI of the datasource to load and visualize
 *     with Rhizosphere. If null, and the bootstrapper is allowed to configure
 *     itself from the URL parameters, it'll try to extract the datasource URI
 *     from the URL.
 */
rhizo.bootstrap.Bootstrap.prototype.deploy = function(opt_resource) {
  // Identify if we have to load a Rhizosphere datasource. Either we received
  // this information explicitly or we try finding it in the URL.
  var resource = opt_resource || this.tryInitResourceFromUrl_();

  if (resource) {
    rhizo.model.loader.load(resource,
                            jQuery.proxy(this.deployExplicit, this),
                            this.options_,
                            this.project_.logger());
  } else {
    this.deployExplicit();
  }
};

/**
 * Loads the data items to visualize via the given loader instance and displays
 * them in the Rhizosphere visualization managed by this bootstrapper.
 * The boostrapper must have already been prepared before invoking this method.
 *
 * @param {*} loader A model loader as defined in rhizo.model.loader.js
 */
rhizo.bootstrap.Bootstrap.prototype.deployWithLoader = function(loader) {
  loader.load(jQuery.proxy(this.deployExplicit, this),
              this.options_, this.project_.logger());
};

/**
 * Displays the given data items (models) in the Rhizosphere visualization
 * managed by this bootstrapper. The boostrapper must have already been
 * prepared before invoking this method.
 *
 * @param {Array.<*>} opt_models The optional list of data items to visualize
 *     at visualization startup. Models can be later added or removed using
 *     the provided methods on rhizo.UserAgent.
 * @param {*} opt_metamodel A descriptor for the attributes and properties that
 *     each model in the visualization has. Ignored if the metamodel has
 *     been specified via configuration options.
 * @param {*} opt_renderer A component capable of creating HTML representation
 *     of model instances. Ignored if the renderer has been specified via
 *     configuration options.
 */
rhizo.bootstrap.Bootstrap.prototype.deployExplicit = function(opt_models,
                                                              opt_metamodel,
                                                              opt_renderer) {
  this.project_.logger().time('Bootstrap::deployExplicit');

  var additionalOptions = {};
  if (opt_metamodel && !this.options_.metamodel()) {
    additionalOptions['metamodel'] = opt_metamodel;
  }
  if (opt_renderer && !this.options_.renderer()) {
    additionalOptions['renderer'] = opt_renderer;
  }
  this.options_.merge(additionalOptions);

  if (this.options_.renderer() &&
      (this.options_.renderer().getSizeRange ||
       this.options_.renderer().getColorRange)) {
    this.template_.addComponent(new rhizo.ui.component.Legend(this.project_,
                                                              this.options_));
  }

  var outcome = this.project_.deploy();
  if (!outcome.success) {
    this.project_.logger().error(outcome.details);
    this.template_.setProgressHandler(null);
    this.gui_.done();
    this.deployed_ = true;
    this.callback_ && this.callback_(
        this.project_.userAgent(), outcome.success, outcome.details);
    this.project_.logger().timeEnd('Bootstrap::deployExplicit'); 
    return;
  }

  this.template_.metaReady();
  if (opt_models && opt_models.length > 0) {

    // We manually disable animations for the initial layout (the browser is
    // already busy creating the whole dom).
    this.gui_.disableFx(true);

    this.project_.userAgent().addModels(
        opt_models, jQuery.proxy(this.modelsAdded_, this));
  } else {
    this.modelsAdded_(true);
  }
};

/**
 * Callback invoked after the project initial set of models has been deployed.
 *
 * @param {boolean} success Whether the model deployment was successful and all
 *     the models were well-formed.
 * @param {string=} opt_details The error details, if the model deployment
 *     failed for any reason.
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.modelsAdded_ = function(
    success, opt_details) {
  if (!success) {
    this.project_.logger().error(opt_details);
  }
  this.project_.alignFx();
  this.template_.ready();
  this.gui_.done();
  this.deployed_ = true;
  this.callback_ && this.callback_(
      this.project_.userAgent(), success, opt_details);
  this.project_.logger().timeEnd('Bootstrap::deployExplicit');
};

/**
 * Identify the platform and device we are running onto.
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.identifyPlatformAndDevice_ = function() {
  if (this.options_.platform() && this.options_.device()) {
    return {platform: this.options_.platform(),
            device: this.options_.device()};
  }
  var ua = navigator.userAgent;
  if (ua.toLowerCase().indexOf('ipad') != -1) {
    return {platform: 'mobile', device: 'ipad'};
  } else if (ua.toLowerCase().indexOf('iphone') != -1) {
    return {platform: 'mobile', device: 'iphone'};
  } else if (ua.toLowerCase().indexOf('android') != -1) {
    return {platform: 'mobile', 'device': 'android'};
  }
  return {platform: 'default', device: 'default'};
};

/**
 * Identifies the best template to use for the visualization.
 * @param {!rhizo.ui.gui.GUI} gui
 * @param {!rhizo.Options} options
 * @return {function(rhizo.Project):rhizo.ui.component.Template} A factory for
 *     the template to use.
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.identifyTemplate_ = function(gui, options) {
  var template = options.template();
  if (template && template in rhizo.ui.component.templates) {
    return rhizo.ui.component.templates[template];
  }

  // No specific template has been forced. Select a specific one based on
  // document size and target platform.
  if (gui.isMobile() || gui.isSmall()) {
    return rhizo.ui.component.templates['bottom'];
  }
  return rhizo.ui.component.templates['default'];
};

/**
 * Identifies the platform and device we are running upon and creates a GUI
 * for this project.
 * @return {rhizo.ui.gui.GUI} The project GUI.
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.initGui_ = function() {
  // Identify the target platform and device we are running onto.
  var platformDevice = this.identifyPlatformAndDevice_();

  // Create the GUI.
  var gui = new rhizo.ui.gui.GUI(this.container_,
                                 platformDevice.platform,
                                 platformDevice.device);
  gui.disableFx(!this.options_.areAnimationsEnabled());

  // Extends jQuery with all the additional behaviors required by Rhizosphere
  // Disable animations and other performance tunings if needed.
  //
  // TODO(battlehorse): this must happen at the global level, and not locally
  // for every single visualization.
  // See http://code.google.com/p/rhizosphere/issues/detail?id=68.
  rhizo.jquery.init(gui, this.options_.areAnimationsEnabled(), true);

  return gui;
};

/**
 * Initializes the template that will render this project chrome.
 * @param {!rhizo.Project} project
 * @param {!rhizo.ui.gui.GUI} gui
 * @param {!rhizo.Options} options
 * @return {rhizo.ui.component.Template} The project template.
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.initTemplate_ = function(project,
                                                             gui,
                                                             options) {
  // Identify the target device and template to use.
  var templateFactory = this.identifyTemplate_(gui, options);
  var template = templateFactory(project);

  // Get the minimum chrome up and running.
  template.render();
  return template;
};

/**
 * If the bootstrapper is allowed to extract parameters from the document
 * location, tries extracting the URI of the resource to display from the there.
 *
 * @return {string} The URI of the resource to load and display.
 * @private
 */
rhizo.bootstrap.Bootstrap.prototype.tryInitResourceFromUrl_ = function() {
  if (!this.options_.allowConfigFromUrl()) {
    this.project_.logger().warn(
        'Sources extraction from url is disabled');
    return null;
  }

  var urlparams = rhizo.util.urlParams();
  var resource = urlparams['source'] || urlparams['src'];
  if (!resource) {
    this.project_.logger().error(
        'Unable to identify datasource from location');
    return null;
  }
  return decodeURIComponent(resource);
};

