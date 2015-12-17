(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
// constructor shims
require('./shim/HTMLDocument');
require('./shim/CustomEvent');

// method shims
require('./shim/Element.matches');
require('./shim/Element.closest');
require('./shim/Element.mutation');
require('./shim/Element.classList');

},{"./shim/CustomEvent":4,"./shim/Element.classList":5,"./shim/Element.closest":6,"./shim/Element.matches":7,"./shim/Element.mutation":8,"./shim/HTMLDocument":9}],3:[function(require,module,exports){
'use strict';

/**
 * DOMTokenList constructor
 *
 * @param {Element} element - DOM element
 * @param {string} attribute - Attribute to create a token list for
 * @constructor
 */
function DOMTokenList(element, attribute) {
  this._getString = function () {
    return element.getAttribute(attribute) || '';
  };
  this._setString = function (value) {
    element.setAttribute(attribute, value);
  };
  fixIndex(this, getList(this));
}

DOMTokenList.prototype = {
  /**
   * Adds tokens to the token list
   * @param {...string} tokens
   */
  add: function add(tokens) {
    var token;
    var i = 0;
    var len = arguments.length;
    var list = getList(this);
    var updated = false;

    for (; i < len; i++) {
      token = arguments[i];
      validateToken(token);
      if (list.indexOf(token) < 0) {
        list.push(token);
        updated = true;
      }
    }

    if (updated) {
      this._setString(list.join(' ').trim());
      fixIndex(this, list);
    }
  },

  /**
   * @param {string} token
   * @return {boolean}
   */
  contains: function contains(token) {
    validateToken(token);
    return (getList(this)).indexOf(token) > -1;
  },

  /**
   * Returns the token at a given index
   * @param {number} index
   * @return {string|null} - the token
   */
  item: function item(index) {
    return (getList(this))[index] || null;
  },

  /**
   * @return {number} - length of the token list
   */
  get length () {
    return (getList(this)).length;
  },

  /**
   * Removes tokens from the token list
   * @param {...string} tokens
   */
  remove: function remove(tokens) {
    var index, token;
    var i = 0;
    var len = arguments.length;
    var list = getList(this);
    var updated = false;

    for (; i < len; i++) {
      token = arguments[i];
      validateToken(token);
      // remove multiple instances of the same class
      while ((index = list.indexOf(token)) > -1) {
        list.splice(index, 1);
        updated = true;
      }
    }

    if (updated) {
      this._setString(list.join(' ').trim());
      fixIndex(this, list);
    }
  },

  /**
   * Toggles a token's presence in the token list
   * @param {string} token
   * @param {boolean} force - true: always add; false: always remove
   * @return {boolean} - true: the value was added to the token list
   */
  toggle: function toggle(token, force) {
    var hasToken = this.contains(token);
    var method = hasToken ?
        (force !== true && 'remove') :
        (force !== false && 'add');

    if (method) {
      this[method](token);
    }

    return (typeof force == 'boolean' ? force : !hasToken);
  },

  /**
   * @return {string} - value of the token list's associated attribute
   */
  toString: function toString() {
    return this._getString();
  }
};

/**
 * Ensure the token list is indexable
 *
 * @param {Object} instance
 * @param {Array} list
 */
function fixIndex(instance, list) {
  var len = list.length;
  var i = 0;
  for (; i < len; i++) { instance[i] = list[i]; }
  delete instance[len];
}

/**
 * Get the attribute's list of values
 *
 * @param {Object} instance
 * @return {Array} - values
 */
function getList(instance) {
  var str = instance._getString();
  if (!str || str === '') {
    return [];
  } else {
    return str.split(/\s+/);
  }
}

/**
 * @param {string} token
 */
function validateToken(token) {
  if (token === '' || token === undefined) {
    throw new Error(
      'An invalid or illegal string was specified (DOM Exception 12)');
  } else if (/\s+/.test(token)) {
    throw new Error(
      'InvalidCharacterError: String contains an invalid character ' +
      '(DOM Exception 5)');
  }
}

module.exports = DOMTokenList;

},{}],4:[function(require,module,exports){
(function () {
  'use strict';

  /**
   * Detect full support
   */

  var isSupported = (
    'CustomEvent' in window &&
    // in Safari, typeof CustomEvent == 'object' but it works
    (typeof window.CustomEvent === 'function' ||
        (window.CustomEvent.toString().indexOf('CustomEventConstructor') > -1))
  );

  if (isSupported) { return; }

  /**
   * Apply shim
   */

  /**
   * http://www.w3.org/TR/dom/#customevent
   * @param {string} type
   * @param {{bubbles: (boolean|undefined),
   *          cancelable: (boolean|undefined),
   *          detail: *}=} eventInitDict
   */
  function CustomEvent(type, eventInitDict) {
    if (typeof type != 'string') {
      throw new TypeError(
        'Failed to construct "CustomEvent": An event name must be provided.');
    }

    var event = document.createEvent('CustomEvent');
    var defaultInitDict = { bubbles: false, cancelable: false, detail: null };
    eventInitDict = eventInitDict || defaultInitDict;
    event.initCustomEvent(
      type,
      eventInitDict.bubbles,
      eventInitDict.cancelable,
      eventInitDict.detail
    );
    return event;
  }

  window.CustomEvent = CustomEvent;
}());

},{}],5:[function(require,module,exports){
(function () {
  'use strict';

  /**
   * Detect full support
   */

  var DOMTokenListShim;
  var testHTMLElement = document.createElement('x');
  var testSVGElement = document.createElementNS('http://www.w3.org/2000/svg',
                                                'svg');

  var isSupported = function (element) {
    return ('classList' in element) ?
      (!element.classList.toggle('a', false) && !element.classList.contains('a')) :
      false;
  };

  /**
   * Apply classList shim
   */

  // Element.prototype.classList
  // provide SVG support in IE 9-11
  if (!isSupported(testSVGElement)) {
    DOMTokenListShim = require('../lib/DOMTokenList');

    Object.defineProperty(Element.prototype, 'classList', {
      get: function () {
        /** @constructor */
        function ClassList() {}
        ClassList.prototype = new DOMTokenListShim(this, 'class');
        return new ClassList();
      }
    });
  }

  // Fix incomplete add/remove/toggle implementations in IE 10-11, iOS 5,
  // Android 4.3
  if (!isSupported(testHTMLElement)) {
    DOMTokenListShim = require('../lib/DOMTokenList');

    var DOMTokenListPrototype = DOMTokenList.prototype;
    var shimMethod = function (original) {
      return function () {
        var i;
        var len = arguments.length;

        for (i = 0; i < len; i++) {
          original.call(this, arguments[i]);
        }
      };
    };

    DOMTokenListPrototype.add = shimMethod(DOMTokenListPrototype.add);
    DOMTokenListPrototype.remove = shimMethod(DOMTokenListPrototype.remove);

    /**
     * @param {string} token
     * @param {boolean=} force
     * @this DOMTokenList
     * @return boolean
     */
    DOMTokenListPrototype.toggle = function(token, force) {
      if (1 in arguments && this.contains(token) === force) {
        return force;
      } else {
        return DOMTokenListShim.prototype.toggle.call(this, token, force);
      }
    };
  }
}());

},{"../lib/DOMTokenList":3}],6:[function(require,module,exports){
(function () {
  'use strict';

  var ElementPrototype = Element.prototype;

  /**
   * Detect full support
   */

  if ('closest' in ElementPrototype) { return; }

  /**
   * Apply shim
   */

  ElementPrototype.closest = function (selector) {
    var element = this;

    while (element) {
      if (element.matches(selector)) {
        return element;
      } else {
        element = element.parentElement;
      }
    }

    return null;
  };
}());

},{}],7:[function(require,module,exports){
(function () {
  'use strict';

  var ElementPrototype = Element.prototype;

  /**
   * Detect full support
   */

  var nativeMatches = ElementPrototype.matches = ElementPrototype.matches ||
      ElementPrototype.mozMatchesSelector ||
      ElementPrototype.msMatchesSelector ||
      ElementPrototype.oMatchesSelector ||
      ElementPrototype.webkitMatchesSelector;

  // determine if the browser supports matching orphan elements. IE 9's
  // vendor-specific implementation doesn't work with orphans.
  var isSupported = ('matches' in ElementPrototype) ?
      nativeMatches.call(document.createElement('a'), 'a') : false;

  if (isSupported) { return; }

  /**
   * Apply shim
   */

  ElementPrototype.matches = function (selector) {
    var indexOf = Array.prototype.indexOf;
    var parentElement = this.parentNode;

    // create a parent for orphans
    if (!parentElement) {
      parentElement = document.createDocumentFragment();
      parentElement.appendChild(this);
    }

    if (nativeMatches) {
      return nativeMatches.call(this, selector);
    } else {
      return indexOf.call(parentElement.querySelectorAll(selector), this) > -1;
    }
  };
}());

},{}],8:[function(require,module,exports){
(function () {
  'use strict';

  var ElementPrototype = Element.prototype;

  /**
   * Detect full support
   */

  var isSupported = ElementPrototype.after &&
      ElementPrototype.append &&
      ElementPrototype.before &&
      ElementPrototype.prepend &&
      ElementPrototype.remove &&
      ElementPrototype.replace;

  if (isSupported) { return; }

  /**
   * Apply mutation shims
   */

  function toNode(node) {
    return typeof node === 'string' ? document.createTextNode(node) : node;
  }

  function mutationMacro(nodes) {
    var fragment, i, len;
    if (nodes) { len = nodes.length; }

    if (!len) {
      throw new Error('No node was specified (DOM Exception 8)');
    }

    if (len === 1) {
      return toNode(nodes[0]);
    } else {
      fragment = document.createDocumentFragment();
      for (i = 0; i < len; i++) {
        fragment.appendChild(toNode(nodes[i]));
      }
      return fragment;
    }
  }

  ElementPrototype.prepend = function prepend() {
    this.insertBefore(mutationMacro(arguments), this.firstChild);
  };

  ElementPrototype.append = function append() {
    this.appendChild(mutationMacro(arguments));
  };

  ElementPrototype.before = function before() {
    var parentNode = this.parentNode;
    if (parentNode) {
      parentNode.insertBefore(mutationMacro(arguments), this);
    }
  };

  ElementPrototype.after = function after() {
    var parentNode = this.parentNode;
    if (parentNode) {
      parentNode.insertBefore(mutationMacro(arguments), this.nextSibling);
    }
  };

  ElementPrototype.replace = function replace() {
    var parentNode = this.parentNode;
    if (parentNode) {
      parentNode.replaceChild(mutationMacro(arguments), this);
    }
  };

  /**
   * This method is defined with bracket notation to avoid conflicting with the
   * definition of HTMLSelectElement.
   */
  ElementPrototype['remove'] = function remove() {
    var parentNode = this.parentNode;
    if (parentNode) {
      parentNode.removeChild(this);
    }
  };
}());

},{}],9:[function(require,module,exports){
// https://developer.mozilla.org/en-US/docs/Web/API/document
if (!('HTMLDocument' in window)) {
  window.HTMLDocument = window.Document;
}

},{}],10:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],11:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],12:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],13:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":12,"_process":11,"inherits":10}],14:[function(require,module,exports){
// system wide, can't tap another button

var disableAll = false;

// system wide, one can only tap one button at a time

var current = null;

function getTouchPos(domEvent) {
	var targetTouch = domEvent.targetTouches ? domEvent.targetTouches[0] : null;

	if (targetTouch) {
		domEvent = targetTouch;
	}

	return { x: domEvent.pageX, y: domEvent.pageY, screenX: domEvent.screenX, screenY: domEvent.screenY };
}


function setActiveButton(button) {
	if (current) {
		current.emit('tapend', true);
	}

	current = button;
}

function setDisableAll(repeatDelay) {
	if (repeatDelay !== null && repeatDelay >= 0) {
		disableAll = true;
		window.setTimeout(function () {
			disableAll = false;
		}, repeatDelay);
	}
}

/**
 * buttonBehavior is wuiButtonBehavior
 * @param {WuiDom} button - a component to turn into a button
 * @param {Object} [options] - a map with the following (all optional) properties:
 * @param {Boolean} [options.disabled=false] - the button starts as unresponsive (call .enable() to turn it on)
 * @param {Number} [options.tapDelay] - the delay in msec before tap is emitted (disabled by default).
 * @param {Number} [options.repeatDelay=0] - the delay before which a button can be tappable again.
 * @param {Boolean} [options.isRepeatable=false] - the button emits tap events when held down (default: false).
 * @param {Number} [options.repeatableInitialDelay=500] - the delay in msec before the button begins repeating.
 * @param {Number} [options.repeatableDelay=200] - the delay in msec for subsequent repeats
 * @param {Object} [options.toggle]
 * @param {Array} options.toggle.values - all values the button can toggle between, which are emitted through the
 * toggle event that fires immediately after the tap event.
 * @param {*} [options.toggle.defaultValue] - the value that the toggle-button starts with (default: first value).
 */
function buttonBehavior(button, options) {
	// parse options

	if (!options) {
		options = {};
	}

	// option: disabled (off by default, can be true in order to disable the button from the start)

	var isEnabled = !options.disabled;

	// option: tapDelay (delay in msec after which tap events are emitted)

	var tapDelay = (typeof options.tapDelay === 'number') ? options.tapDelay : null;

	var repeatDelay = (typeof options.repeatDelay === 'number') ? options.repeatDelay : 0;

	var isRepeatable = options.isRepeatable ? options.isRepeatable : false;

	var repeatableInitialDelay =
		(typeof options.repeatableInitialDelay === 'number') ? options.repeatableInitialDelay : 500;

	var repeatableDelay = (typeof options.repeatableDelay === 'number') ? options.repeatableDelay : 200;

	// This holds our repeatable timer so we can cancel it on tapend.
	var repeatableTimeout;
	var repeatableInitialTimeout;

	// option: toggle (emits "togggle" event and iterates through given values)
	// eg: { values: [1,2,3,4], defaultValue: 3 }

	if (options.toggle) {
		var toggle = options.toggle;
		var selectedIndex = toggle.hasOwnProperty('defaultValue') ? toggle.values.indexOf(toggle.defaultValue) : 0;

		button.on('tap', function () {
			selectedIndex += 1;

			if (selectedIndex >= toggle.values.length) {
				selectedIndex = 0;
			}

			button.emit('toggle', toggle.values[selectedIndex]);
		});
	}

	// set up button-wide variables and start the Dom event system

	var startPos;
	var bounding;
	var pageOffset;
	var fnOverride;

	button.allowDomEvents();


	// enabling/disabling the button

	button.enable = function () {
		isEnabled = true;

		button.emit('enabled');
	};


	button.disable = function () {
		// disabling while being tapped should trigger a cancel

		if (current === button) {
			button.emit('tapend', true);
		}

		isEnabled = false;

		var argLen = arguments.length;

		if (argLen === 0) {
			button.emit('disabled');
		} else if (argLen === 1) {
			button.emit('disabled', arguments[0]);
		} else {
			var args = new Array(argLen + 1);

			args[0] = 'disabled';

			for (var i = 0; i < argLen; i += 1) {
				args[i + 1] = arguments[i];
			}

			button.emit.apply(button, args);
		}
	};


	// tap override callback management

	button.startTapOverride = function (fn) {
		fnOverride = fn;
	};


	button.stopTapOverride = function () {
		fnOverride = null;
	};


	function cancelTap() {
		if (current === button) {
			return button.emit('tapend', true);
		}
	}


	button.on('dom.touchstart', function touchstart(domEvent) {
		if (!isEnabled || disableAll) {
			return;
		}

		// if another button was active, cancel it and make this button the active one
		setActiveButton(button);

		// prevent other buttons to fire during a certain time (repeatDelay)
		// Also act like an internal stopPropagation
		setDisableAll(repeatDelay);

		startPos = getTouchPos(domEvent);

		bounding = button.rootElement.getBoundingClientRect();
		pageOffset = { x: window.pageXOffset, y: window.pageYOffset };

		button.removeListener('dom.mouseleave', cancelTap);
		button.once('dom.mouseleave', cancelTap);
		button.emit('tapstart');
	});


	button.on('dom.touchmove', function touchmove(domEvent) {
		if (!isEnabled || !current || !startPos) {
			return;
		}

		// Check if we moved outside the button

		var currentPos = getTouchPos(domEvent);
		var left = bounding.left + pageOffset.x;
		var top = bounding.top + pageOffset.y;

		var hasMoved =
			left > currentPos.x ||
			currentPos.x > left + bounding.width ||
			top > currentPos.y ||
			currentPos.y > top + bounding.height;

		if (hasMoved) {
			return button.emit('tapend', true);
		}

		// Check if we scrolled enough to be virtually outside the button

		var x = Math.abs(window.pageXOffset - pageOffset.x);
		var y = Math.abs(window.pageYOffset - pageOffset.y);

		var scrolledOut = x > bounding.width || y > bounding.height;
		if (scrolledOut) {
			return button.emit('tapend', true);
		}
	});


	button.on('dom.touchend', function touchend() {
		if (!isEnabled) {
			return;
		}

		if (button === current) {
			button.emit('tapend', false);
		}
	});


	button.on('dom.touchcancel', function touchcancel() {
		if (!isEnabled) {
			return;
		}

		button.emit('tapend', true);
	});

	button.on('tapstart', function () {
		if (isRepeatable) {
			repeatableInitialTimeout = window.setTimeout(repeatTap, repeatableInitialDelay);
		}
	});

	function repeatTap() {
		// Send another tap and wait for the shorter delay.
		repeatableTimeout = window.setTimeout(repeatTap, repeatableDelay);
		button.emit('tap');
	}

	button.on('tapend', function (wasCancelled) {
		// could be called by other sources, or multiple times

		current = null;
		startPos = null;

		if (isRepeatable) {
			window.clearTimeout(repeatableInitialTimeout);
			window.clearTimeout(repeatableTimeout);

			if (!repeatableTimeout) {
				button.emit('tap');
			}

			repeatableInitialTimeout = null;
			repeatableTimeout = null;
			return;
		}

		if (wasCancelled) {
			return;
		}

		// tap success!

		if (fnOverride) {
			fnOverride();
		} else {
			if (tapDelay === null) {
				button.emit('tap');
			} else {
				window.setTimeout(function () {
					button.emit('tap');
				}, tapDelay);
			}
		}
	});

	// Function to emulate a full tap
	button.tap = function () {
		button.emit('tapstart');
		button.emit('tapend');
	};
}

module.exports = buttonBehavior;

/**
 * Cancel the tap on the current button
 */
buttonBehavior.cancel = function () {
	if (current) {
		current.emit('tapend', true);
	}
};

},{}],15:[function(require,module,exports){
/**
 * @module domEvents
 */
/**
 * Mouse event lock timer. Set to 0 when not locked.
 *
 * Note: This lock is required to overcome an issue with touch and mouse event compatibility across
 * browsers. The main issue being that when touch events are present the mouse events are fired
 * 300ms later. As such using just mouse events proves to be too slow on mobile devices. Further to
 * this when actually using the touch events, we would end up with double events, and what's worse
 * is that mouse events don't only occur 300ms later, but they also don't exactly fire on the DOM
 * where the touch event fired. But rather so, it would fire on any element which ends up there
 * after the touch event is processed. This resulted in ghost clicks on links etc, that would appear
 * after the touch event.
 *
 * References:
 *  - http://www.html5rocks.com/en/mobile/touchandmouse/
 *  - https://developers.google.com/mobile/articles/fast_buttons
 *  - https://github.com/Polymer/PointerEvents
 *  - http://blogs.msdn.com/b/davrous/archive/2013/02/20/handling-touch-in-your-html5-apps-thanks-to-the-pointer-events-of-ie10-and-windows-8.aspx
 *
 * @type Number
 */
var mouseLock = 0;

/**
 * Mouse event lock threshold
 * @type Number
 */
var mouseLockThreshold = 500;


/**
 * Function which updates timestamp on mouse lock. This is used to determine if mouse events occur
 * within the locked threshold.
 */
function updateMouseLock() {
	mouseLock = Date.now();
}


/**
 * Function which clears mouse events lock.
 */
function clearMouseLock() {
	mouseLock = 0;
}


/**
 * Function which checks if a mouse event occured within the mouse lock threshold. If so it will
 * return true. Otherwise it will return false.
 *
 * @returns {Boolean}
 */
function isMouseLocked() {
	return mouseLock !== 0 && (Date.now() - mouseLock) < mouseLockThreshold;
}


/**
 * DOM event prefix
 * @type String
 */
var domEventPrefix = 'dom';


/**
 * Function which created DOM event listeners according to the given wui-dom events.
 * @param {String} evt
 */
exports.new = function (evt) {
	var self = this;

	// Separate DOM event prefix from DOM event name
	var evtNameParts = evt.split('.');

	// Ensure first part is in fact the prefix
	if (evtNameParts[0] !== domEventPrefix) {
		return;
	}

	// Check if DOM event name is valid and also make sure we are not already listening for
	// these DOM events
	var domEventName = evtNameParts[1];
	if (!domEventName || this.domListeners[domEventName]) {
		return;
	}

	switch (domEventName) {
	case 'touchstart':
		// If this event is a touchstart event, attach mousedown compatibility bindings along
		// with the touchstart event
		var mouseDownFn = function (e) {
			if (isMouseLocked() || e.which !== 1) {
				return;
			}

			self.emit('dom.touchstart', e);
		};

		var touchStartFn = function (e) {
			updateMouseLock();
			self.emit('dom.touchstart', e);
		};

		this.domListeners.touchstart = {
			mousedown: mouseDownFn,
			touchstart: touchStartFn
		};

		this.rootElement.addEventListener('mousedown', mouseDownFn);
		this.rootElement.addEventListener('touchstart', touchStartFn);
		break;
	case 'touchmove':
		// If this event is a touchmove event, attach mousemove compatibility bindings along
		// with the touchmove event
		var mouseMoveFn = function (e) {
			if (mouseLock || e.which !== 1) {
				return;
			}

			self.emit('dom.touchmove', e);
		};

		var touchMoveFn = function (e) {
			self.emit('dom.touchmove', e);
		};

		this.domListeners.touchmove = {
			mousemove: mouseMoveFn,
			touchmove: touchMoveFn
		};

		this.rootElement.addEventListener('mousemove', mouseMoveFn);
		this.rootElement.addEventListener('touchmove', touchMoveFn);
		break;
	case 'touchend':
		// If this event is a touchend event, attach mouseup compatibility bindings along with
		// the touchend event
		var mouseUpFn = function (e) {
			if (isMouseLocked() || e.which !== 1) {
				clearMouseLock();
				return;
			}

			self.emit('dom.touchend', e);
		};

		var touchEndFn = function (e) {
			updateMouseLock();
			self.emit('dom.touchend', e);

			// This prevents the firing of mouse events after a touchend.
			// This fixes the issue with iframes, where by if an iframe falls under your pointer
			// after touchend is processed, but before the mouse events are, the mouse events are
			// fired inside the iframe placing them out of scope. This prevents us from intervening.
			e.preventDefault();
		};

		this.domListeners.touchend = {
			mouseup: mouseUpFn,
			touchend: touchEndFn
		};

		this.rootElement.addEventListener('mouseup', mouseUpFn);
		this.rootElement.addEventListener('touchend', touchEndFn);
		break;
	default:
		// Otherwise the default is to bind event as is
		var defaultFn = function (e) {
			self.emit(evt, e);
		};

		this.domListeners[domEventName] = defaultFn;
		this.rootElement.addEventListener(domEventName, defaultFn);
		break;
	}
};

/**
 * Function which removes DOM event listeners for a given wui-dom event
 * @param {String} evt
 */
exports.remove = function (evt) {
	if (this.listeners(evt).length !== 0) {
		return;
	}

	var evtNameParts = evt.split('.');

	if (evtNameParts[0] !== domEventPrefix) {
		return;
	}

	var domEventName = evtNameParts[1];
	var domListener = this.domListeners[domEventName];

	// Ensure dom event listener exists
	if (!domListener) {
		return;
	}

	// Destroy grouped event listeners
	if (domListener !== null && typeof domListener === 'object') {
		for (var eventName in domListener) {
			var evtFn = domListener[eventName];
			this.rootElement.removeEventListener(eventName, evtFn);
		}

		delete this.domListeners[domEventName];
		return;
	}

	// Default event listener destruction
	this.rootElement.removeEventListener(domEventName, domListener);
	delete this.domListeners[domEventName];
};

/**
 * Function which destroys all bound event listeners on the current wui-dom object
 */
exports.destroy = function () {
	for (var domEventName in this.domListeners) {
		var domListener = this.domListeners[domEventName];

		// Destroy grouped event listeners
		if (domListener !== null && typeof domListener === 'object') {
			for (var eventName in domListener) {
				var evtFn = domListener[eventName];
				this.rootElement.removeEventListener(eventName, evtFn);
			}

			continue;
		}

		// Default event listener destruction
		this.rootElement.removeEventListener(domEventName, domListener);
	}

	this.domListeners = {};
};
},{}],16:[function(require,module,exports){
/**
 * @module WuiDom
 */

var inherit = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var domEvents = require('./domEvents.js');
require('dom-shims');

var cType = {
	EMPTY: null,
	WUI: 'wui',
	TEXT: 'text',
	HTML: 'html'
};

var concat = Array.prototype.concat;
function toArray(args) {
	return concat.apply([], args).filter(Boolean);
}


/**
 * HTML creation helper
 * @private
 * @param {string} tagName
 * @param {Object} [options]
 */
function createHtmlElement(tagName, options) {
	var key, elm = document.createElement(tagName);

	if (options && options.attr) {
		for (key in options.attr) {
			elm.setAttribute(key, options.attr[key]);
		}
	}

	return elm;
}


/**
 * @constructor
 * @augments EventEmitter
 * @param {string} tagName
 * @param {Object} [options]
 */
function WuiDom(tagName, options) {
	EventEmitter.call(this);
	this._elementIsVisible = true;
	this._currentTextContent = null;
	this.rootElement = null;
	this._text = null;
	this._name = null;
	this._childrenList = [];
	this._childrenMap = {};
	this._contentType = cType.EMPTY;
	this._parent = null;
	if (tagName) {
		this._assign(tagName, options);
	}
}

inherit(WuiDom, EventEmitter);
module.exports = WuiDom;


/**
 * Makes the given element the rootElement for this component.
 * If instead of an HTML element, a tagName and options are given, the element is created and assigned.
 * The logic for HTML creation follows the rules of the private createHtmlElement function.
 * @param {string} tagName
 * @param {Object} [options]
 * @param {Boolean} [options.hidden=false] - Allow to hide the DOM on creation
 * @param {string} [options.name] - Set identifier to be found by it's parent (see #getChild)
 * @param {Array} [options.className] - List of class name to set on the DOM
 * @param {Object} [options.style] - CSS Style to apply to the DOM
 * @param {String} [options.text] - Set a text in the DOM (see #setText)
 * @param {Object} [options.attr] - Set the Html attribute of the DOM
 * @private
 */
WuiDom.prototype._assign = function (tagName, options) {
	if (this.rootElement) {
		throw new Error('WuiDom has already an element assigned');
	}

	if (typeof tagName === 'string') {
		// if tagName is a real tag name, create the HTML Element with it

		this.rootElement = createHtmlElement(tagName, options);
		if (options && options.hasOwnProperty('text')) {
			this.setText(options.text);
		}
	} else if (tagName instanceof window.Element) {
		// the first passed argument already is a real HTML Element
		this.rootElement = tagName;
	} else {
		throw new Error('WuiDom.assign requires the given argument to be a DOM Element or tagName.');
	}

	options = options || {};

	// start hidden
	if (options.hidden) {
		this.hide();
	}

	// set identifier (used by getChild)
	if ('name' in options) {
		this._name = String(options.name);
	}

	if ('className' in options) {
		this.addClassNames(options.className);
	}

	if ('style' in options) {
		this.setStyles(options.style || {});
	}
};

/**
 * @deprecated
 * @param {string} tagName
 * @param {Object} [options]
 */
WuiDom.prototype.assign = function (tagName, options) {
	this._assign(tagName, options);
};

/**
 * Return the name of the WuiDom given on creation
 * @returns {string}
 */
WuiDom.prototype.getWuiName = function () {
	return this._name;
};


/**
 * @param {WuiDom|string} child
 * @returns {WuiDom} - oldChild
 */
WuiDom.prototype.removeChild = function (child) {
	var isWuiDom = child instanceof WuiDom;

	if (!isWuiDom) {
		child = this._childrenMap[child];

		if (!child) {
			throw new Error('WuiDom: Given name is not a current child');
		}
	}

	var siblingIndex = this._childrenList.indexOf(child);
	if (siblingIndex === -1) {
		throw new Error('WuiDom: Not a current child');
	}

	this.rootElement.removeChild(child.rootElement);
	this._childrenList.splice(siblingIndex, 1);
	if (this._childrenMap.hasOwnProperty(child._name)) {
		delete this._childrenMap[child._name];
	}
	child._parent = null;
	return child;
};

/**
 * @private
 */
WuiDom.prototype._unsetParent = function () {
	if (this._parent) {
		this._parent.removeChild(this);
	}
};

/**
 * @param {WuiDom} parent
 * @private
 */
WuiDom.prototype._setParent = function (parent) {
	if (parent === this._parent) {
		// Already set, nothing to do
		return;
	}

	if (this._name) {
		if (parent._childrenMap[this._name]) {
			throw new Error('WuiDom: Parent already has a child with this name');
		}
		parent._childrenMap[this._name] = this;
	}

	this._parent = parent;
};


/**
 * @returns {WuiDom|null}
 */
WuiDom.prototype.getParent = function () {
	return this._parent;
};


/**
 * @param {WuiDom} newChild
 * @returns {WuiDom}
 */
WuiDom.prototype.appendChild = function (newChild) {
	if (this._contentType && this._contentType !== cType.WUI) {
		this._clearLinearContent();
	}

	if (this === newChild._parent) {
		var siblingIndex = this._childrenList.indexOf(newChild);
		if (siblingIndex !== -1) {
			this._childrenList.splice(siblingIndex, 1);
		}
	} else {
		newChild._unsetParent();
		newChild._setParent(this);
	}

	this._childrenList.push(newChild);
	this.rootElement.appendChild(newChild.rootElement);

	// touch events are known to get lost, so rebind them
	newChild.rebindTouchListeners();
	this._contentType = cType.WUI;
	return newChild;
};

/**
 * Creates an instance of WuiDom and assigns a newly built HTML element to it,
 * following the logic of the private createHtmlElement function. It is then appended to
 * this component.
 * @param {string} tagName
 * @param {Object} [options]
 * @returns {WuiDom}
 */
WuiDom.prototype.createChild = function (tagName, options) {
	return this.appendChild(new WuiDom(tagName, options));
};


/**
 * @param {WuiDom} newParent
 */
WuiDom.prototype.appendTo = function (newParent) {
	newParent.appendChild(this);
};


/**
 * @param {WuiDom} newChild
 * @param {WuiDom} [newNextSibling]
 * @returns {WuiDom} - newChild
 */
WuiDom.prototype.insertChildBefore = function (newChild, newNextSibling) {
	if (this._contentType && this._contentType !== cType.WUI) {
		this._clearLinearContent();
	}

	var siblingIndex;

	if (this === newChild._parent) {
		var childIndex = this._childrenList.indexOf(newChild);
		if (childIndex !== -1) {
			this._childrenList.splice(childIndex, 1);
		}
	} else {
		newChild._unsetParent();
	}

	if (!newNextSibling) {
		siblingIndex = this._childrenList.length;
	} else {
		siblingIndex = this._childrenList.indexOf(newNextSibling);
		if (siblingIndex === -1) {
			throw new Error('WuiDom: Wanted sibling is not a child');
		}
	}

	newChild._setParent(this);
	this.rootElement.insertBefore(newChild.rootElement, newNextSibling && newNextSibling.rootElement);

	// touch events are known to get lost, so rebind them
	newChild.rebindTouchListeners();

	this._childrenList.splice(siblingIndex, 0, newChild);
	this._contentType = cType.WUI;
	return newChild;
};


// override this function to implement custom insertBefore behavior
/**
 * @param {WuiDom} newNextSibling
 * @returns {WuiDom} - newNextSibling
 */
WuiDom.prototype.insertBefore = function (newNextSibling) {
	if (!newNextSibling._parent) {
		throw new Error('WuiDom: sibling has no parent');
	}
	newNextSibling._parent.insertChildBefore(this, newNextSibling);

	return newNextSibling;
};

// override this function to implement custom insertAsFirstChild behavior
/**
 * @param {WuiDom} newChild
 * @returns {WuiDom} - newChild
 */
WuiDom.prototype.insertAsFirstChild = function (newChild) {
	var firstChild = this._childrenList[0];

	if (firstChild) {
		return this.insertChildBefore(newChild, firstChild);
	}

	return this.appendChild(newChild);
};

/**
 * @returns {WuiDom[]} - List of children attached to this WuiDom
 */
WuiDom.prototype.getChildren = function () {
	return this._childrenList.concat();
};

/**
 * @param {string} childName
 * @returns {WuiDom|undefined}
 */
WuiDom.prototype.getChild = function (childName) {
	return this._childrenMap[childName];
};

/**
 * Clean text or html content
 * @private
 */
WuiDom.prototype._clearLinearContent = function () {
	this._text = null;
	this._currentTextContent = null;
	this.rootElement.innerHTML = '';
};

/**
 * Set the html content of the WuiDom.
 * Be aware this will wipe out WuiDom child or text content.
 * @param {string} value
 */
WuiDom.prototype.setHtml = function (value) {
	// Clean if contain children
	if (this._contentType === cType.WUI) {
		this._destroyChildren();
	}

	// Clean if contain text
	if (this._contentType === cType.TEXT) {
		this._clearLinearContent();
	}

	this.rootElement.innerHTML = value;
	this._contentType = cType.HTML;
};

/**
 * Set a textNode as a child and inject the string value
 * Be aware this will wipe out WuiDom child or html content.
 * @param {string} value
 */
WuiDom.prototype.setText = function (value) {
	// Clean if contain children
	if (this._contentType === cType.WUI) {
		this._destroyChildren();
	}

	// Clean if contain html
	if (this._contentType === cType.HTML) {
		this._clearLinearContent();
	}

	if (value === null || value === undefined) {
		return;
	}

	value = value.valueOf();

	if (!this._text) {
		this._text = document.createTextNode('');
		this.rootElement.appendChild(this._text);
	}

	if (value !== this._currentTextContent) {
		this._currentTextContent = value;
		this._text.nodeValue = value;
	}
	this._contentType = cType.TEXT;
};

/**
 * @returns {string}
 */
WuiDom.prototype.getText = function () {
	return this._currentTextContent;
};


/**
 * Style accessors
 * @param {string} property
 * @param {string|number} value
 */
WuiDom.prototype.setStyle = function (property, value) {
	this.rootElement.style[property] = value;
};

/**
 * @param {Object} map - CSS properties
 */
WuiDom.prototype.setStyles = function (map) {
	var s = this.rootElement.style;

	for (var key in map) {
		s[key] = map[key];
	}
};

/**
 * @param {string} property
 */
WuiDom.prototype.unsetStyle = function (property) {
	this.rootElement.style[property] = '';
};

/**
 * @param {string} property
 * @returns {string}
 */
WuiDom.prototype.getStyle = function (property) {
	return this.rootElement.style[property];
};

/**
 * @param {string} property - css property (javascript notation : background-image -> backgroundImage)
 * @returns {string}
 */
WuiDom.prototype.getComputedStyle = function (property) {
	var computedStyle = window.getComputedStyle(this.rootElement);
	if (!computedStyle) {
		return null;
	}

	return computedStyle.getPropertyValue(property);
};

/**
 * @param {...string} arguments - css properties (javascript notation : background-image -> backgroundImage)
 * @returns {Object} - an object indexed by the css properties and their computed style as value.
 */
WuiDom.prototype.getComputedStyles = function () {
	var computedStyle = window.getComputedStyle(this.rootElement);
	if (!computedStyle) {
		return {};
	}

	var propertyValues = {};
	for (var i = 0, len = arguments.length; i < len; i += 1) {
		var property = arguments[i];
		propertyValues[property] = computedStyle.getPropertyValue(property);
	}

	return propertyValues;
};

// className accessors

/**
 * Returns an array of all class names
 * @returns {Array}
 */
WuiDom.prototype.getClassNames = function () {
	return toArray(this.rootElement.classList);
};

/**
 * Returns true/false depending on the given className being present
 * @param {string} className
 * @returns {boolean}
 */
WuiDom.prototype.hasClassName = function (className) {
	return this.rootElement.classList.contains(className);
};

/**
 * Allows for adding multiples in separate arguments, space separated or a mix
 * @param {...string|...string[]} arguments - classNames
 */
WuiDom.prototype.setClassNames = function () {
	this.rootElement.className = '';
	var classList = this.rootElement.classList;
	classList.add.apply(classList, toArray(arguments));
};


/**
 * Allows for adding multiples in separate arguments, space separated or a mix
 * @param {...string|...string[]} arguments - classNames
 */
WuiDom.prototype.addClassNames = function () {
	var classList = this.rootElement.classList;
	classList.add.apply(classList, toArray(arguments));
};

/**
 * Adds all classNames in addList and removes the ones in delList
 * @param {string[]} delList
 * @param {string[]} addList
 */
WuiDom.prototype.replaceClassNames = function (delList, addList) {
	var classList = this.rootElement.classList;
	classList.remove.apply(classList, toArray(delList));
	classList.add.apply(classList, toArray(addList));
};

/**
 * Allows for deleting multiples in separate arguments, space separated or a mix
 * @param {...string|...string[]} arguments - classNames
 */
WuiDom.prototype.delClassNames = function () {
	var classList = this.rootElement.classList;
	classList.remove.apply(classList, toArray(arguments));
};

/**
 * Toggle the presence of a list of classNames
 * Can enforce the addition or deletion with the second argument
 * @param {string[]} classNames
 * @param {Boolean} [shouldAdd]
 * @deprecated
 */
WuiDom.prototype.toggleClassNames = function (classNames, shouldAdd) {
	for (var i = 0; i < classNames.length; i += 1) {
		this.toggleClassName(classNames[i], shouldAdd);
	}
};

/**
 * Toggle the presence of a className
 * Can enforce the addition or deletion with the second argument
 * @param {string} className
 * @param {Boolean} [shouldAdd]
 */
WuiDom.prototype.toggleClassName = function (className, shouldAdd) {
	if (shouldAdd === true || shouldAdd === false) {
		return this.rootElement.classList.toggle(className, shouldAdd);
	} else {
		return this.rootElement.classList.toggle(className);
	}
};

/**
 * Unassign the DOM object
 * @private
 */
WuiDom.prototype._removeDom = function () {
	var elm = this.rootElement;
	if (elm) {
		// release DOM from the DOM tree
		elm.remove();
		// drop DOM references
		this.rootElement = null;
	}
};

/**
 * Destroy all children of a WuiDom
 * @private
 */
WuiDom.prototype._destroyChildren = function () {
	var children = this._childrenList.concat();
	this._childrenList = [];
	this._childrenMap = {};

	for (var i = 0, len = children.length; i < len; i += 1) {
		var child = children[i];

		child.emit('destroy');

		child._parent = null;
		child._destroyChildren();
		child._removeDom();
		child.removeAllListeners();
	}
};

/**
 * Clear any actual content of the WuiDom
 * Emitting 'cleared' so extra cleanup can be done
 */
WuiDom.prototype.clearContent = function () {
	switch (this._contentType) {
	case cType.HTML:
	case cType.TEXT:
		this._clearLinearContent();
		break;
	case cType.WUI:
		this._destroyChildren();
		break;
	}

	this._contentType = cType.EMPTY;
	this.emit('cleared');
};


/**
 * Removing the domElement and
 */
WuiDom.prototype.destroy = function () {
	this.emit('destroy');

	// clean siblings
	this._unsetParent();
	this._destroyChildren();

	// cleanup DOM tree
	this._removeDom();

	// drop any remaining event listeners
	this.removeAllListeners();
};



/**
 * Default show implementation
 */
WuiDom.prototype.showMethod = function () {
	this.rootElement.style.display = '';
};

/**
 * Default hide implementation
 */
WuiDom.prototype.hideMethod = function () {
	this.rootElement.style.display = 'none';
};

/**
 * @param {*} [data]
 */
WuiDom.prototype.show = function () {
	if (this._elementIsVisible) {
		return;
	}
	this._elementIsVisible = true;
	this.showMethod();
	this.emit('show');
};

/**
 * @param {*} [data]
 */
WuiDom.prototype.hide = function () {
	if (!this._elementIsVisible) {
		return;
	}
	this._elementIsVisible = false;
	this.hideMethod();
	this.emit('hide');
};

/**
 * Toggle the visibility of the WuiDom
 * @param {boolean} [shouldShow]
 * @param {*} [data]
 * @returns {Boolean}
 */
WuiDom.prototype.toggleDisplay = function (shouldShow) {
	if (shouldShow === undefined) {
		shouldShow = !this._elementIsVisible;
	}

	if (shouldShow) {
		this.show();
	} else {
		this.hide();
	}
	return !!shouldShow;
};

/**
 * Returns the visibility status of a WuiDom.
 * The visibility status is based on the show and hide methods and
 * if the Dom has been added to the document.
 * It is also possible to get the visibility based on its parent tree.
 * @param {Boolean} [checkTree] - Go up the tree
 * @returns {Boolean}
 */
WuiDom.prototype.isVisible = function (checkTree) {
	// If the WuiDom has been hidden
	if (!this._elementIsVisible) {
		return false;
	}

	// If asked check the parent's visibility
	if (checkTree && this._parent) {
		return this._parent.isVisible(true);
	}

	return true;
};


/**
 * rebindTouchListeners
 */
WuiDom.prototype.rebindTouchListeners = function () {
	if (this.domListeners) {
		var elm = this.rootElement;

		for (var domEventName in this.domListeners) {
			if (!domEventName.match(/^touch/)) {
				continue;
			}

			var domListener = this.domListeners[domEventName];
			for (var eventName in domListener) {
				var evtFn = domListener[eventName];
				elm.removeEventListener(eventName, evtFn);
				elm.addEventListener(eventName, evtFn);
			}
		}
	}
};

/**
 * @param {Tome} tome
 * @param {Function} cb - Update function. Receive current and old value
 */
WuiDom.prototype.bindToTome = function (tome, cb) {
	var self = this;

	if (!cb) {
		cb = function (value) {
			self.setText(value);
		};
	}

	function update(was) {
		cb(this.valueOf(), was);
	}

	tome.on('readable', update);
	cb(tome.valueOf());

	this.on('destroy', function () {
		tome.removeListener('readable', update);
	});
};


/**
 * allowDomEvents
 */
WuiDom.prototype.allowDomEvents = function () {
	// Check if DOM event listeners are already set
	if (this.domListeners) {
		return;
	}

	// Initialize DOM event listeners object
	this.domListeners = {};

	// Bind relevant DOM event listeners when the corresponding wuiDom event listener is created
	this.on('newListener', domEvents.new);

	// Remove DOM listeners when the last event listener for that event gets removed
	this.on('removeListener', domEvents.remove);

	// Destroy DOM event listeners on destroy
	this.on('destroy', domEvents.destroy);
};

},{"./domEvents.js":15,"dom-shims":2,"events":1,"util":13}],17:[function(require,module,exports){
var WuiDom = require('wuidom');
var inherits = require('util').inherits;
var wuibuttonbehavior = require('wuibuttonbehavior');
var constants = require('./constants');

function Card(symbol, game) {
    WuiDom.call(this, 'div', { className: 'card' });
    wuibuttonbehavior(this);

	this.isFlipped = true;
	this.symbol = null;

	var options = { className: 'image', attr: { src: ''}}

    if (constants.DEVELOPMENT_MODE) {
    	this.hint = this.createChild('img', { className: 'hint'});
    }

	this.cardFace = this.createChild('img', { className: 'cardFace'});

    this.on('tap', function () {
    	game.flipCard(this);
	});

	this.reset(symbol);
}

inherits(Card, WuiDom);
module.exports = Card;

Card.prototype.flip = function () {
	this.isFlipped = !this.isFlipped;
	this.cardFace.toggleDisplay(this.isFlipped);
	this.cardFace.toggleClassName('flipped', this.isFlipped);
};

Card.prototype.reset = function(symbol){

	if (constants.DEVELOPMENT_MODE) {
		this.hint.addClassNames(symbol);
		this.hint.rootElement.src = symbol;
    }

	this.cardFace.rootElement.src = symbol;
	this.symbol = symbol;

	this.isFlipped = true;
	this.flip();

	this.enable();
};


},{"./constants":19,"util":13,"wuibuttonbehavior":14,"wuidom":16}],18:[function(require,module,exports){
var constants = require('./constants');
var shuffle = require('./shuffle');
var Card = require('./Card');

var arr = [];

for (var i = 0; i < constants.col * constants.row; i ++) {
	var num = Math.floor(i / 2);
	arr.push(constants.symbolList[num]);
}

arr = shuffle(arr);


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Manage cards and user interactions
 *
 */
function GameManager() {
	this.firstFlippedCard = null;
	this.winCount = 0;
	this.isLocked = false;
	this.cards = [];
}

module.exports = GameManager;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Reset the game: flip face down alls cards, and reset all variables */
GameManager.prototype.reset = function(){
	this.firstFlippedCard = null;
	this.winCount = 0;
	this.isLocked = false;

	this.resetCards();
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** creating all cards in the game. This function is called only once at startup.
 *
 * @param {WuiDom} grid - WuiDom object that will contains the cards
 */
GameManager.prototype.createCards = function (grid) {
	for (var i = 0; i < constants.col * constants.row; i ++) {
		var card = new Card(arr[i], this);
		this.cards.push(card);
	
		grid.appendChild(card);
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** shuffle cards */
GameManager.prototype.resetCards = function(){

	arr = shuffle(arr);

	for (var i = 0; i < constants.col * constants.row; i ++) {
		var card = this.cards[i];
		card.reset(arr[i]);
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Flip a card face up
 *
 * @param {WuiDom} card - the card that user want to flip
 */
GameManager.prototype.flipCard = function (card) {

	if (this.isLocked){
		return;
	}

	var self = this;

	card.disable();

	if (this.firstFlippedCard === null) {
		// this is the first card we flip
		card.flip();
	    this.firstFlippedCard = card;
	} else {
		// this is the second card we flip
		var isSameSymbol = this.firstFlippedCard.symbol === card.symbol;
		card.flip();

		var firstCard = this.firstFlippedCard;
		this.firstFlippedCard = null;

		if (isSameSymbol) {
			this.winCount++;
			console.log("Win", this.winCount);

			if (this.winCount === constants.col * constants.row / 2) {
				clear.show();
			}
		} else {

			this.isLocked = true;

			window.setTimeout(function () {
				card.flip();
				firstCard.flip();
				card.enable();
				firstCard.enable();
				self.isLocked = false;
			}, 1000);
		}
	}
};


},{"./Card":17,"./constants":19,"./shuffle":21}],19:[function(require,module,exports){
exports.col = 6;
exports.row = 4;

exports.symbolList = [
	'http://placehold.it/100/A10559/ffffff?text=CARD',
	'http://placehold.it/100/632065/ffffff?text=CARD',
	'http://placehold.it/100/F9A487/ffffff?text=CARD',
	'http://placehold.it/100/480320/ffffff?text=CARD',
	'http://placehold.it/100/AA66FF/ffffff?text=CARD',
	'http://placehold.it/100/BF92D5/ffffff?text=CARD',
	'http://placehold.it/100/23AA9F/ffffff?text=CARD',
	'http://placehold.it/100/35131E/ffffff?text=CARD',
	'http://placehold.it/100/423A75/ffffff?text=CARD',
	'http://placehold.it/100/F6F2E7/ffffff?text=CARD',
	'http://placehold.it/100/C7DFA3/ffffff?text=CARD',
	'http://placehold.it/100/FAF9E5/ffffff?text=CARD'
];

exports.DEVELOPMENT_MODE = false;
},{}],20:[function(require,module,exports){
var WuiDom = require('wuidom');
var wuibuttonbehavior = require('wuibuttonbehavior');
var GameManager = require('./GameManager');
var constants = require('./constants');

var game = new GameManager();

var htmlElement = document.querySelector('#main');
var main = new WuiDom(htmlElement);

var clear = main.createChild('div', { className: 'clear' });
clear.createChild('h2', { className: 'clearHeader', text: 'All Clear' });
var reset = clear.createChild('div', { className: 'reset', text: "Play Again"});
wuibuttonbehavior(reset);

var grid = main.createChild('div', { className: 'grid' });

game.createCards(grid);
game.reset();

clear.hide();

reset.on('tap', function () {
	clear.hide();
	game.reset();
});

},{"./GameManager":18,"./constants":19,"wuibuttonbehavior":14,"wuidom":16}],21:[function(require,module,exports){
function shuffle(array) {
	var currentIndex = array.length, temporaryValue, randomIndex ;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {

		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
}

module.exports = shuffle;
},{}]},{},[20]);
