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
