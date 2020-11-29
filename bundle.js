(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global['@eris/image'] = global['@eris/image'] || {})));
}(this, (function (exports) { 'use strict';

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};



function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var byteLength_1 = byteLength;
var toByteArray_1 = toByteArray;
var fromByteArray_1 = fromByteArray;

var lookup = [];
var revLookup = [];
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i];
  revLookup[code.charCodeAt(i)] = i;
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62;
revLookup['_'.charCodeAt(0)] = 63;

function getLens (b64) {
  var len = b64.length;

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=');
  if (validLen === -1) validLen = len;

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4);

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64);
  var validLen = lens[0];
  var placeHoldersLen = lens[1];
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp;
  var lens = getLens(b64);
  var validLen = lens[0];
  var placeHoldersLen = lens[1];

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));

  var curByte = 0;

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen;

  for (var i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)];
    arr[curByte++] = (tmp >> 16) & 0xFF;
    arr[curByte++] = (tmp >> 8) & 0xFF;
    arr[curByte++] = tmp & 0xFF;
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4);
    arr[curByte++] = tmp & 0xFF;
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2);
    arr[curByte++] = (tmp >> 8) & 0xFF;
    arr[curByte++] = tmp & 0xFF;
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp;
  var output = [];
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF);
    output.push(tripletToBase64(tmp));
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp;
  var len = uint8.length;
  var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
  var parts = [];
  var maxChunkLength = 16383; // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ));
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1];
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    );
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1];
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    );
  }

  return parts.join('')
}

var base64Js = {
	byteLength: byteLength_1,
	toByteArray: toByteArray_1,
	fromByteArray: fromByteArray_1
};

var read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m;
  var eLen = (nBytes * 8) - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var nBits = -7;
  var i = isLE ? (nBytes - 1) : 0;
  var d = isLE ? -1 : 1;
  var s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
};

var write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c;
  var eLen = (nBytes * 8) - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
  var i = isLE ? 0 : (nBytes - 1);
  var d = isLE ? 1 : -1;
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128;
};

var ieee754 = {
	read: read,
	write: write
};

var buffer$2 = createCommonjsModule(function (module, exports) {
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict';




exports.Buffer = Buffer;
exports.SlowBuffer = SlowBuffer;
exports.INSPECT_MAX_BYTES = 50;

var K_MAX_LENGTH = 0x7fffffff;
exports.kMaxLength = K_MAX_LENGTH;

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport();

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  );
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1);
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }};
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
});

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
});

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length);
  buf.__proto__ = Buffer.prototype;
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  });
}

Buffer.poolSize = 8192; // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf();
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value);
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
};

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype;
Buffer.__proto__ = Uint8Array;

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size);
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
};

function allocUnsafe (size) {
  assertSize(size);
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
};
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
};

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8';
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0;
  var buf = createBuffer(length);

  var actual = buf.write(string, encoding);

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual);
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0;
  var buf = createBuffer(length);
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255;
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf;
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array);
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset);
  } else {
    buf = new Uint8Array(array, byteOffset, length);
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype;
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0;
    var buf = createBuffer(len);

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len);
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0;
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
};

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength);
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength);
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length;
  var y = b.length;

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i];
      y = b[i];
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
};

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
};

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i;
  if (length === undefined) {
    length = 0;
    for (i = 0; i < list.length; ++i) {
      length += list[i].length;
    }
  }

  var buffer = Buffer.allocUnsafe(length);
  var pos = 0;
  for (i = 0; i < list.length; ++i) {
    var buf = list[i];
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf);
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer
};

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length;
  var mustMatch = (arguments.length > 2 && arguments[2] === true);
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false;
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase();
        loweredCase = true;
    }
  }
}
Buffer.byteLength = byteLength;

function slowToString (encoding, start, end) {
  var loweredCase = false;

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0;
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length;
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0;
  start >>>= 0;

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8';

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase();
        loweredCase = true;
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true;

function swap (b, n, m) {
  var i = b[n];
  b[n] = b[m];
  b[m] = i;
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length;
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1);
  }
  return this
};

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length;
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3);
    swap(this, i + 1, i + 2);
  }
  return this
};

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length;
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7);
    swap(this, i + 1, i + 6);
    swap(this, i + 2, i + 5);
    swap(this, i + 3, i + 4);
  }
  return this
};

Buffer.prototype.toString = function toString () {
  var length = this.length;
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
};

Buffer.prototype.toLocaleString = Buffer.prototype.toString;

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
};

Buffer.prototype.inspect = function inspect () {
  var str = '';
  var max = exports.INSPECT_MAX_BYTES;
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim();
  if (this.length > max) str += ' ... ';
  return '<Buffer ' + str + '>'
};

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength);
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0;
  }
  if (end === undefined) {
    end = target ? target.length : 0;
  }
  if (thisStart === undefined) {
    thisStart = 0;
  }
  if (thisEnd === undefined) {
    thisEnd = this.length;
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0;
  end >>>= 0;
  thisStart >>>= 0;
  thisEnd >>>= 0;

  if (this === target) return 0

  var x = thisEnd - thisStart;
  var y = end - start;
  var len = Math.min(x, y);

  var thisCopy = this.slice(thisStart, thisEnd);
  var targetCopy = target.slice(start, end);

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i];
      y = targetCopy[i];
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
};

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset;
    byteOffset = 0;
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff;
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000;
  }
  byteOffset = +byteOffset; // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1);
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1;
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0;
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding);
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF; // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1;
  var arrLength = arr.length;
  var valLength = val.length;

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase();
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2;
      arrLength /= 2;
      valLength /= 2;
      byteOffset /= 2;
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i;
  if (dir) {
    var foundIndex = -1;
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i;
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex;
        foundIndex = -1;
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
    for (i = byteOffset; i >= 0; i--) {
      var found = true;
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false;
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
};

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
};

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
};

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0;
  var remaining = buf.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = Number(length);
    if (length > remaining) {
      length = remaining;
    }
  }

  var strLen = string.length;

  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16);
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed;
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8';
    length = this.length;
    offset = 0;
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset;
    length = this.length;
    offset = 0;
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0;
    if (isFinite(length)) {
      length = length >>> 0;
      if (encoding === undefined) encoding = 'utf8';
    } else {
      encoding = length;
      length = undefined;
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset;
  if (length === undefined || length > remaining) length = remaining;

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8';

  var loweredCase = false;
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase();
        loweredCase = true;
    }
  }
};

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
};

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64Js.fromByteArray(buf)
  } else {
    return base64Js.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end);
  var res = [];

  var i = start;
  while (i < end) {
    var firstByte = buf[i];
    var codePoint = null;
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1;

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint;

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte;
          }
          break
        case 2:
          secondByte = buf[i + 1];
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint;
            }
          }
          break
        case 3:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint;
            }
          }
          break
        case 4:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          fourthByte = buf[i + 3];
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint;
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD;
      bytesPerSequence = 1;
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000;
      res.push(codePoint >>> 10 & 0x3FF | 0xD800);
      codePoint = 0xDC00 | codePoint & 0x3FF;
    }

    res.push(codePoint);
    i += bytesPerSequence;
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000;

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length;
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = '';
  var i = 0;
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    );
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = '';
  end = Math.min(buf.length, end);

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F);
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = '';
  end = Math.min(buf.length, end);

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i]);
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i]);
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end);
  var res = '';
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256));
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length;
  start = ~~start;
  end = end === undefined ? len : ~~end;

  if (start < 0) {
    start += len;
    if (start < 0) start = 0;
  } else if (start > len) {
    start = len;
  }

  if (end < 0) {
    end += len;
    if (end < 0) end = 0;
  } else if (end > len) {
    end = len;
  }

  if (end < start) end = start;

  var newBuf = this.subarray(start, end);
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype;
  return newBuf
};

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var val = this[offset];
  var mul = 1;
  var i = 0;
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul;
  }

  return val
};

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length);
  }

  var val = this[offset + --byteLength];
  var mul = 1;
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul;
  }

  return val
};

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 1, this.length);
  return this[offset]
};

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 2, this.length);
  return this[offset] | (this[offset + 1] << 8)
};

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 2, this.length);
  return (this[offset] << 8) | this[offset + 1]
};

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, this.length);

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
};

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
};

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var val = this[offset];
  var mul = 1;
  var i = 0;
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul;
  }
  mul *= 0x80;

  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

  return val
};

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var i = byteLength;
  var mul = 1;
  var val = this[offset + --i];
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul;
  }
  mul *= 0x80;

  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

  return val
};

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 1, this.length);
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
};

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 2, this.length);
  var val = this[offset] | (this[offset + 1] << 8);
  return (val & 0x8000) ? val | 0xFFFF0000 : val
};

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 2, this.length);
  var val = this[offset + 1] | (this[offset] << 8);
  return (val & 0x8000) ? val | 0xFFFF0000 : val
};

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
};

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
};

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, this.length);
  return ieee754.read(this, offset, true, 23, 4)
};

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, this.length);
  return ieee754.read(this, offset, false, 23, 4)
};

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 8, this.length);
  return ieee754.read(this, offset, true, 52, 8)
};

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 8, this.length);
  return ieee754.read(this, offset, false, 52, 8)
};

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
    checkInt(this, value, offset, byteLength, maxBytes, 0);
  }

  var mul = 1;
  var i = 0;
  this[offset] = value & 0xFF;
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
    checkInt(this, value, offset, byteLength, maxBytes, 0);
  }

  var i = byteLength - 1;
  var mul = 1;
  this[offset + i] = value & 0xFF;
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
  this[offset] = (value & 0xff);
  return offset + 1
};

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
  this[offset] = (value & 0xff);
  this[offset + 1] = (value >>> 8);
  return offset + 2
};

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
  this[offset] = (value >>> 8);
  this[offset + 1] = (value & 0xff);
  return offset + 2
};

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
  this[offset + 3] = (value >>> 24);
  this[offset + 2] = (value >>> 16);
  this[offset + 1] = (value >>> 8);
  this[offset] = (value & 0xff);
  return offset + 4
};

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
  this[offset] = (value >>> 24);
  this[offset + 1] = (value >>> 16);
  this[offset + 2] = (value >>> 8);
  this[offset + 3] = (value & 0xff);
  return offset + 4
};

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1);

    checkInt(this, value, offset, byteLength, limit - 1, -limit);
  }

  var i = 0;
  var mul = 1;
  var sub = 0;
  this[offset] = value & 0xFF;
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1);

    checkInt(this, value, offset, byteLength, limit - 1, -limit);
  }

  var i = byteLength - 1;
  var mul = 1;
  var sub = 0;
  this[offset + i] = value & 0xFF;
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
  if (value < 0) value = 0xff + value + 1;
  this[offset] = (value & 0xff);
  return offset + 1
};

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
  this[offset] = (value & 0xff);
  this[offset + 1] = (value >>> 8);
  return offset + 2
};

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
  this[offset] = (value >>> 8);
  this[offset + 1] = (value & 0xff);
  return offset + 2
};

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
  this[offset] = (value & 0xff);
  this[offset + 1] = (value >>> 8);
  this[offset + 2] = (value >>> 16);
  this[offset + 3] = (value >>> 24);
  return offset + 4
};

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
  if (value < 0) value = 0xffffffff + value + 1;
  this[offset] = (value >>> 24);
  this[offset + 1] = (value >>> 16);
  this[offset + 2] = (value >>> 8);
  this[offset + 3] = (value & 0xff);
  return offset + 4
};

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38);
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4);
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
};

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
};

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308);
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8);
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
};

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
};

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0;
  if (!end && end !== 0) end = this.length;
  if (targetStart >= target.length) targetStart = target.length;
  if (!targetStart) targetStart = 0;
  if (end > 0 && end < start) end = start;

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length;
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start;
  }

  var len = end - start;

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end);
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start];
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    );
  }

  return len
};

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start;
      start = 0;
      end = this.length;
    } else if (typeof end === 'string') {
      encoding = end;
      end = this.length;
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0);
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code;
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255;
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0;
  end = end === undefined ? this.length : end >>> 0;

  if (!val) val = 0;

  var i;
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val;
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding);
    var len = bytes.length;
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len];
    }
  }

  return this
};

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0];
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '');
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '=';
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity;
  var codePoint;
  var length = string.length;
  var leadSurrogate = null;
  var bytes = [];

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i);

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          continue
        }

        // valid lead
        leadSurrogate = codePoint;

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
        leadSurrogate = codePoint;
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
    }

    leadSurrogate = null;

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      );
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = [];
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF);
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo;
  var byteArray = [];
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i);
    hi = c >> 8;
    lo = c % 256;
    byteArray.push(lo);
    byteArray.push(hi);
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64Js.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i];
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}
});

// tslint:disable
// @ts-ignore
self.Buffer = buffer$2.Buffer;

var types = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var EffectType;
(function (EffectType) {
    EffectType["Noise"] = "noise";
})(EffectType = exports.EffectType || (exports.EffectType = {}));
var ImageFormat;
(function (ImageFormat) {
    ImageFormat["JPEG"] = "jpeg";
    ImageFormat["PNG"] = "png";
    ImageFormat["NoTranscode"] = "no-transcode";
})(ImageFormat = exports.ImageFormat || (exports.ImageFormat = {}));
var ImageResizeFit;
(function (ImageResizeFit) {
    ImageResizeFit["Auto"] = "auto";
    ImageResizeFit["Contain"] = "contain";
    ImageResizeFit["Cover"] = "cover";
    ImageResizeFit["Exact"] = "exact";
    ImageResizeFit["Crop"] = "crop";
})(ImageResizeFit = exports.ImageResizeFit || (exports.ImageResizeFit = {}));
var ImageResizeMethod;
(function (ImageResizeMethod) {
    ImageResizeMethod["NearestNeighbor"] = "nearestNeighbor";
    ImageResizeMethod["Bilinear"] = "bilinear";
    ImageResizeMethod["Bicubic"] = "bicubic";
})(ImageResizeMethod = exports.ImageResizeMethod || (exports.ImageResizeMethod = {}));
var EdgeMethod;
(function (EdgeMethod) {
    EdgeMethod["Sobel"] = "sobel";
    EdgeMethod["Canny"] = "canny";
})(EdgeMethod = exports.EdgeMethod || (exports.EdgeMethod = {}));
var HashMethod;
(function (HashMethod) {
    HashMethod["PHash"] = "phash";
    HashMethod["LumaHash"] = "luma";
})(HashMethod = exports.HashMethod || (exports.HashMethod = {}));
var ColorChannel;
(function (ColorChannel) {
    ColorChannel["Red"] = "r";
    ColorChannel["Green"] = "g";
    ColorChannel["Blue"] = "b";
    ColorChannel["Alpha"] = "a";
    ColorChannel["Hue"] = "h";
    ColorChannel["Saturation"] = "s";
    ColorChannel["Lightness"] = "l";
    ColorChannel["Luminance255"] = "Y-255";
    ColorChannel["Luminance"] = "Y";
    ColorChannel["Chroma"] = "c";
    ColorChannel["ChromaBlue"] = "cb";
    ColorChannel["ChromaRed"] = "cr";
    ColorChannel["x"] = "x-xyy";
    ColorChannel["y"] = "y-xyy";
    ColorChannel["X"] = "x-xyz";
    ColorChannel["Y"] = "y-xyz";
    ColorChannel["Z"] = "z-xyz";
})(ColorChannel = exports.ColorChannel || (exports.ColorChannel = {}));
var Colorspace;
(function (Colorspace) {
    Colorspace["HSL"] = "hsl";
    Colorspace["HCL"] = "hcl";
    Colorspace["YCbCr"] = "ycbcr";
    Colorspace["XYZ"] = "xyz";
    Colorspace["XYY"] = "xyy";
    Colorspace["RGB"] = "rgb";
    Colorspace["RGBA"] = "rgba";
    Colorspace["Greyscale"] = "k";
})(Colorspace = exports.Colorspace || (exports.Colorspace = {}));
exports.DEFAULT_FORMAT = {
    type: ImageFormat.JPEG,
    quality: 90,
};

});

unwrapExports(types);

var env = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable strict-type-predicates */
let _global;
function getGlobal() {
    if (_global)
        return _global;
    if (typeof window !== 'undefined')
        _global = window;
    if (typeof self !== 'undefined')
        _global = self;
    if (typeof commonjsGlobal !== 'undefined')
        _global = commonjsGlobal;
    return _global;
}
function hasWASM() {
    const global = getGlobal();
    return Boolean(global['@eris/image-wasm'] && global['@eris/image-wasm'].wasmModule);
}
exports.hasWASM = hasWASM;
function isBrowser() {
    return typeof window !== 'undefined' && typeof navigator !== 'undefined';
}
exports.isBrowser = isBrowser;
function isNode() {
    return !isBrowser();
}
exports.isNode = isNode;
function getWASM() {
    return getGlobal()['@eris/image-wasm'];
}
exports.getWASM = getWASM;

});

unwrapExports(env);

var canvasEncoder = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getCanvas() {
    if ('__canvas__' in self) {
        return self.__canvas__;
    }
    return document.createElement('canvas');
}
function read(doRead) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('loadend', () => resolve(reader.result));
        doRead(reader);
    });
}
function decode(buffer) {
    const canvas = getCanvas();
    const context = canvas.getContext('2d');
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener('error', reject);
        img.addEventListener('load', () => {
            try {
                canvas.width = img.width;
                canvas.height = img.height;
                context.drawImage(img, 0, 0);
                const imageData = context.getImageData(0, 0, img.width, img.height);
                resolve({
                    width: imageData.width,
                    height: imageData.height,
                    data: imageData.data,
                });
            }
            catch (err) {
                reject(err);
            }
        });
        if (typeof buffer === 'string') {
            img.src = buffer;
        }
        else {
            read(reader => reader.readAsDataURL(new Blob([buffer])))
                .then(url => {
                img.src = url;
            })
                .catch(reject);
        }
    });
}
exports.decode = decode;
function encode(imageData, dataType, quality) {
    const canvas = getCanvas();
    const context = canvas.getContext('2d');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    context.putImageData(imageData, 0, 0);
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) {
                return reject(new Error('failed to convert canvas to blob'));
            }
            read(reader => reader.readAsArrayBuffer(blob))
                .then(arrayBuffer => {
                resolve(new Uint8Array(arrayBuffer));
            })
                .catch(reject);
        }, dataType, quality);
    });
}
exports.encode = encode;

});

unwrapExports(canvasEncoder);

var jpegJs = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function decode(buffer) {
    return canvasEncoder.decode(buffer);
}
exports.decode = decode;
function encode(imageData, quality) {
    return canvasEncoder.encode(imageData, 'image/jpeg', quality);
}
exports.encode = encode;

});

unwrapExports(jpegJs);

var pngJs = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

class PNG {
    static get sync() {
        return {
            read(buffer) {
                return canvasEncoder.decode(buffer);
            },
            write(imageData) {
                return canvasEncoder.encode(imageData, 'image/png');
            },
        };
    }
}
exports.PNG = PNG;

});

unwrapExports(pngJs);

var fileType = createCommonjsModule(function (module) {
'use strict';
const toBytes = s => Array.from(s).map(c => c.charCodeAt(0));
const xpiZipFilename = toBytes('META-INF/mozilla.rsa');
const oxmlContentTypes = toBytes('[Content_Types].xml');
const oxmlRels = toBytes('_rels/.rels');

module.exports = input => {
	const buf = (input instanceof Uint8Array) ? input : new Uint8Array(input);

	if (!(buf && buf.length > 1)) {
		return null;
	}

	const check = (header, options) => {
		options = Object.assign({
			offset: 0
		}, options);

		for (let i = 0; i < header.length; i++) {
			// If a bitmask is set
			if (options.mask) {
				// If header doesn't equal `buf` with bits masked off
				if (header[i] !== (options.mask[i] & buf[i + options.offset])) {
					return false;
				}
			} else if (header[i] !== buf[i + options.offset]) {
				return false;
			}
		}

		return true;
	};

	const checkString = (header, options) => check(toBytes(header), options);

	if (check([0xFF, 0xD8, 0xFF])) {
		return {
			ext: 'jpg',
			mime: 'image/jpeg'
		};
	}

	if (check([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
		return {
			ext: 'png',
			mime: 'image/png'
		};
	}

	if (check([0x47, 0x49, 0x46])) {
		return {
			ext: 'gif',
			mime: 'image/gif'
		};
	}

	if (check([0x57, 0x45, 0x42, 0x50], {offset: 8})) {
		return {
			ext: 'webp',
			mime: 'image/webp'
		};
	}

	if (check([0x46, 0x4C, 0x49, 0x46])) {
		return {
			ext: 'flif',
			mime: 'image/flif'
		};
	}

	// Needs to be before `tif` check
	if (
		(check([0x49, 0x49, 0x2A, 0x0]) || check([0x4D, 0x4D, 0x0, 0x2A])) &&
		check([0x43, 0x52], {offset: 8})
	) {
		return {
			ext: 'cr2',
			mime: 'image/x-canon-cr2'
		};
	}

	if (
		check([0x49, 0x49, 0x2A, 0x0]) ||
		check([0x4D, 0x4D, 0x0, 0x2A])
	) {
		return {
			ext: 'tif',
			mime: 'image/tiff'
		};
	}

	if (check([0x42, 0x4D])) {
		return {
			ext: 'bmp',
			mime: 'image/bmp'
		};
	}

	if (check([0x49, 0x49, 0xBC])) {
		return {
			ext: 'jxr',
			mime: 'image/vnd.ms-photo'
		};
	}

	if (check([0x38, 0x42, 0x50, 0x53])) {
		return {
			ext: 'psd',
			mime: 'image/vnd.adobe.photoshop'
		};
	}

	// Zip-based file formats
	// Need to be before the `zip` check
	if (check([0x50, 0x4B, 0x3, 0x4])) {
		if (
			check([0x6D, 0x69, 0x6D, 0x65, 0x74, 0x79, 0x70, 0x65, 0x61, 0x70, 0x70, 0x6C, 0x69, 0x63, 0x61, 0x74, 0x69, 0x6F, 0x6E, 0x2F, 0x65, 0x70, 0x75, 0x62, 0x2B, 0x7A, 0x69, 0x70], {offset: 30})
		) {
			return {
				ext: 'epub',
				mime: 'application/epub+zip'
			};
		}

		// Assumes signed `.xpi` from addons.mozilla.org
		if (check(xpiZipFilename, {offset: 30})) {
			return {
				ext: 'xpi',
				mime: 'application/x-xpinstall'
			};
		}

		if (checkString('mimetypeapplication/vnd.oasis.opendocument.text', {offset: 30})) {
			return {
				ext: 'odt',
				mime: 'application/vnd.oasis.opendocument.text'
			};
		}

		if (checkString('mimetypeapplication/vnd.oasis.opendocument.spreadsheet', {offset: 30})) {
			return {
				ext: 'ods',
				mime: 'application/vnd.oasis.opendocument.spreadsheet'
			};
		}

		if (checkString('mimetypeapplication/vnd.oasis.opendocument.presentation', {offset: 30})) {
			return {
				ext: 'odp',
				mime: 'application/vnd.oasis.opendocument.presentation'
			};
		}

		// https://github.com/file/file/blob/master/magic/Magdir/msooxml
		if (check(oxmlContentTypes, {offset: 30}) || check(oxmlRels, {offset: 30})) {
			const sliced = buf.subarray(4, 4 + 2000);
			const nextZipHeaderIndex = arr => arr.findIndex((el, i, arr) => arr[i] === 0x50 && arr[i + 1] === 0x4B && arr[i + 2] === 0x3 && arr[i + 3] === 0x4);
			const header2Pos = nextZipHeaderIndex(sliced);

			if (header2Pos !== -1) {
				const slicedAgain = buf.subarray(header2Pos + 8, header2Pos + 8 + 1000);
				const header3Pos = nextZipHeaderIndex(slicedAgain);

				if (header3Pos !== -1) {
					const offset = 8 + header2Pos + header3Pos + 30;

					if (checkString('word/', {offset})) {
						return {
							ext: 'docx',
							mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
						};
					}

					if (checkString('ppt/', {offset})) {
						return {
							ext: 'pptx',
							mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
						};
					}

					if (checkString('xl/', {offset})) {
						return {
							ext: 'xlsx',
							mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
						};
					}
				}
			}
		}
	}

	if (
		check([0x50, 0x4B]) &&
		(buf[2] === 0x3 || buf[2] === 0x5 || buf[2] === 0x7) &&
		(buf[3] === 0x4 || buf[3] === 0x6 || buf[3] === 0x8)
	) {
		return {
			ext: 'zip',
			mime: 'application/zip'
		};
	}

	if (check([0x75, 0x73, 0x74, 0x61, 0x72], {offset: 257})) {
		return {
			ext: 'tar',
			mime: 'application/x-tar'
		};
	}

	if (
		check([0x52, 0x61, 0x72, 0x21, 0x1A, 0x7]) &&
		(buf[6] === 0x0 || buf[6] === 0x1)
	) {
		return {
			ext: 'rar',
			mime: 'application/x-rar-compressed'
		};
	}

	if (check([0x1F, 0x8B, 0x8])) {
		return {
			ext: 'gz',
			mime: 'application/gzip'
		};
	}

	if (check([0x42, 0x5A, 0x68])) {
		return {
			ext: 'bz2',
			mime: 'application/x-bzip2'
		};
	}

	if (check([0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C])) {
		return {
			ext: '7z',
			mime: 'application/x-7z-compressed'
		};
	}

	if (check([0x78, 0x01])) {
		return {
			ext: 'dmg',
			mime: 'application/x-apple-diskimage'
		};
	}

	if (check([0x33, 0x67, 0x70, 0x35]) || // 3gp5
		(
			check([0x0, 0x0, 0x0]) && check([0x66, 0x74, 0x79, 0x70], {offset: 4}) &&
				(
					check([0x6D, 0x70, 0x34, 0x31], {offset: 8}) || // MP41
					check([0x6D, 0x70, 0x34, 0x32], {offset: 8}) || // MP42
					check([0x69, 0x73, 0x6F, 0x6D], {offset: 8}) || // ISOM
					check([0x69, 0x73, 0x6F, 0x32], {offset: 8}) || // ISO2
					check([0x6D, 0x6D, 0x70, 0x34], {offset: 8}) || // MMP4
					check([0x4D, 0x34, 0x56], {offset: 8}) || // M4V
					check([0x64, 0x61, 0x73, 0x68], {offset: 8}) // DASH
				)
		)) {
		return {
			ext: 'mp4',
			mime: 'video/mp4'
		};
	}

	if (check([0x4D, 0x54, 0x68, 0x64])) {
		return {
			ext: 'mid',
			mime: 'audio/midi'
		};
	}

	// https://github.com/threatstack/libmagic/blob/master/magic/Magdir/matroska
	if (check([0x1A, 0x45, 0xDF, 0xA3])) {
		const sliced = buf.subarray(4, 4 + 4096);
		const idPos = sliced.findIndex((el, i, arr) => arr[i] === 0x42 && arr[i + 1] === 0x82);

		if (idPos !== -1) {
			const docTypePos = idPos + 3;
			const findDocType = type => Array.from(type).every((c, i) => sliced[docTypePos + i] === c.charCodeAt(0));

			if (findDocType('matroska')) {
				return {
					ext: 'mkv',
					mime: 'video/x-matroska'
				};
			}

			if (findDocType('webm')) {
				return {
					ext: 'webm',
					mime: 'video/webm'
				};
			}
		}
	}

	if (check([0x0, 0x0, 0x0, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20]) ||
		check([0x66, 0x72, 0x65, 0x65], {offset: 4}) ||
		check([0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20], {offset: 4}) ||
		check([0x6D, 0x64, 0x61, 0x74], {offset: 4}) || // MJPEG
		check([0x77, 0x69, 0x64, 0x65], {offset: 4})) {
		return {
			ext: 'mov',
			mime: 'video/quicktime'
		};
	}

	if (
		check([0x52, 0x49, 0x46, 0x46]) &&
		check([0x41, 0x56, 0x49], {offset: 8})
	) {
		return {
			ext: 'avi',
			mime: 'video/x-msvideo'
		};
	}

	if (check([0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11, 0xA6, 0xD9])) {
		return {
			ext: 'wmv',
			mime: 'video/x-ms-wmv'
		};
	}

	if (
		check([0x0, 0x0, 0x1, 0xBA]) ||
		check([0x0, 0x0, 0x1, 0xB3])
	) {
		return {
			ext: 'mpg',
			mime: 'video/mpeg'
		};
	}

	if (check([0x66, 0x74, 0x79, 0x70, 0x33, 0x67], {offset: 4})) {
		return {
			ext: '3gp',
			mime: 'video/3gpp'
		};
	}

	// Check for MPEG header at different starting offsets
	for (let start = 0; start < 2 && start < (buf.length - 16); start++) {
		if (
			check([0x49, 0x44, 0x33], {offset: start}) || // ID3 header
			check([0xFF, 0xE2], {offset: start, mask: [0xFF, 0xE2]}) // MPEG 1 or 2 Layer 3 header
		) {
			return {
				ext: 'mp3',
				mime: 'audio/mpeg'
			};
		}

		if (
			check([0xFF, 0xE4], {offset: start, mask: [0xFF, 0xE4]}) // MPEG 1 or 2 Layer 2 header
		) {
			return {
				ext: 'mp2',
				mime: 'audio/mpeg'
			};
		}
	}

	if (
		check([0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x41], {offset: 4}) ||
		check([0x4D, 0x34, 0x41, 0x20])
	) {
		return {
			ext: 'm4a',
			mime: 'audio/m4a'
		};
	}

	// Needs to be before `ogg` check
	if (check([0x4F, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64], {offset: 28})) {
		return {
			ext: 'opus',
			mime: 'audio/opus'
		};
	}

	// If 'OggS' in first  bytes, then OGG container
	if (check([0x4F, 0x67, 0x67, 0x53])) {
		// This is a OGG container

		// If ' theora' in header.
		if (check([0x80, 0x74, 0x68, 0x65, 0x6F, 0x72, 0x61], {offset: 28})) {
			return {
				ext: 'ogv',
				mime: 'video/ogg'
			};
		}
		// If '\x01video' in header.
		if (check([0x01, 0x76, 0x69, 0x64, 0x65, 0x6F, 0x00], {offset: 28})) {
			return {
				ext: 'ogm',
				mime: 'video/ogg'
			};
		}
		// If ' FLAC' in header  https://xiph.org/flac/faq.html
		if (check([0x7F, 0x46, 0x4C, 0x41, 0x43], {offset: 28})) {
			return {
				ext: 'oga',
				mime: 'audio/ogg'
			};
		}

		// 'Speex  ' in header https://en.wikipedia.org/wiki/Speex
		if (check([0x53, 0x70, 0x65, 0x65, 0x78, 0x20, 0x20], {offset: 28})) {
			return {
				ext: 'spx',
				mime: 'audio/ogg'
			};
		}

		// If '\x01vorbis' in header
		if (check([0x01, 0x76, 0x6F, 0x72, 0x62, 0x69, 0x73], {offset: 28})) {
			return {
				ext: 'ogg',
				mime: 'audio/ogg'
			};
		}

		// Default OGG container https://www.iana.org/assignments/media-types/application/ogg
		return {
			ext: 'ogx',
			mime: 'application/ogg'
		};
	}

	if (check([0x66, 0x4C, 0x61, 0x43])) {
		return {
			ext: 'flac',
			mime: 'audio/x-flac'
		};
	}

	if (
		check([0x52, 0x49, 0x46, 0x46]) &&
		check([0x57, 0x41, 0x56, 0x45], {offset: 8})
	) {
		return {
			ext: 'wav',
			mime: 'audio/x-wav'
		};
	}

	if (check([0x23, 0x21, 0x41, 0x4D, 0x52, 0x0A])) {
		return {
			ext: 'amr',
			mime: 'audio/amr'
		};
	}

	if (check([0x25, 0x50, 0x44, 0x46])) {
		return {
			ext: 'pdf',
			mime: 'application/pdf'
		};
	}

	if (check([0x4D, 0x5A])) {
		return {
			ext: 'exe',
			mime: 'application/x-msdownload'
		};
	}

	if (
		(buf[0] === 0x43 || buf[0] === 0x46) &&
		check([0x57, 0x53], {offset: 1})
	) {
		return {
			ext: 'swf',
			mime: 'application/x-shockwave-flash'
		};
	}

	if (check([0x7B, 0x5C, 0x72, 0x74, 0x66])) {
		return {
			ext: 'rtf',
			mime: 'application/rtf'
		};
	}

	if (check([0x00, 0x61, 0x73, 0x6D])) {
		return {
			ext: 'wasm',
			mime: 'application/wasm'
		};
	}

	if (
		check([0x77, 0x4F, 0x46, 0x46]) &&
		(
			check([0x00, 0x01, 0x00, 0x00], {offset: 4}) ||
			check([0x4F, 0x54, 0x54, 0x4F], {offset: 4})
		)
	) {
		return {
			ext: 'woff',
			mime: 'font/woff'
		};
	}

	if (
		check([0x77, 0x4F, 0x46, 0x32]) &&
		(
			check([0x00, 0x01, 0x00, 0x00], {offset: 4}) ||
			check([0x4F, 0x54, 0x54, 0x4F], {offset: 4})
		)
	) {
		return {
			ext: 'woff2',
			mime: 'font/woff2'
		};
	}

	if (
		check([0x4C, 0x50], {offset: 34}) &&
		(
			check([0x00, 0x00, 0x01], {offset: 8}) ||
			check([0x01, 0x00, 0x02], {offset: 8}) ||
			check([0x02, 0x00, 0x02], {offset: 8})
		)
	) {
		return {
			ext: 'eot',
			mime: 'application/octet-stream'
		};
	}

	if (check([0x00, 0x01, 0x00, 0x00, 0x00])) {
		return {
			ext: 'ttf',
			mime: 'font/ttf'
		};
	}

	if (check([0x4F, 0x54, 0x54, 0x4F, 0x00])) {
		return {
			ext: 'otf',
			mime: 'font/otf'
		};
	}

	if (check([0x00, 0x00, 0x01, 0x00])) {
		return {
			ext: 'ico',
			mime: 'image/x-icon'
		};
	}

	if (check([0x00, 0x00, 0x02, 0x00])) {
		return {
			ext: 'cur',
			mime: 'image/x-icon'
		};
	}

	if (check([0x46, 0x4C, 0x56, 0x01])) {
		return {
			ext: 'flv',
			mime: 'video/x-flv'
		};
	}

	if (check([0x25, 0x21])) {
		return {
			ext: 'ps',
			mime: 'application/postscript'
		};
	}

	if (check([0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00])) {
		return {
			ext: 'xz',
			mime: 'application/x-xz'
		};
	}

	if (check([0x53, 0x51, 0x4C, 0x69])) {
		return {
			ext: 'sqlite',
			mime: 'application/x-sqlite3'
		};
	}

	if (check([0x4E, 0x45, 0x53, 0x1A])) {
		return {
			ext: 'nes',
			mime: 'application/x-nintendo-nes-rom'
		};
	}

	if (check([0x43, 0x72, 0x32, 0x34])) {
		return {
			ext: 'crx',
			mime: 'application/x-google-chrome-extension'
		};
	}

	if (
		check([0x4D, 0x53, 0x43, 0x46]) ||
		check([0x49, 0x53, 0x63, 0x28])
	) {
		return {
			ext: 'cab',
			mime: 'application/vnd.ms-cab-compressed'
		};
	}

	// Needs to be before `ar` check
	if (check([0x21, 0x3C, 0x61, 0x72, 0x63, 0x68, 0x3E, 0x0A, 0x64, 0x65, 0x62, 0x69, 0x61, 0x6E, 0x2D, 0x62, 0x69, 0x6E, 0x61, 0x72, 0x79])) {
		return {
			ext: 'deb',
			mime: 'application/x-deb'
		};
	}

	if (check([0x21, 0x3C, 0x61, 0x72, 0x63, 0x68, 0x3E])) {
		return {
			ext: 'ar',
			mime: 'application/x-unix-archive'
		};
	}

	if (check([0xED, 0xAB, 0xEE, 0xDB])) {
		return {
			ext: 'rpm',
			mime: 'application/x-rpm'
		};
	}

	if (
		check([0x1F, 0xA0]) ||
		check([0x1F, 0x9D])
	) {
		return {
			ext: 'Z',
			mime: 'application/x-compress'
		};
	}

	if (check([0x4C, 0x5A, 0x49, 0x50])) {
		return {
			ext: 'lz',
			mime: 'application/x-lzip'
		};
	}

	if (check([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])) {
		return {
			ext: 'msi',
			mime: 'application/x-msi'
		};
	}

	if (check([0x06, 0x0E, 0x2B, 0x34, 0x02, 0x05, 0x01, 0x01, 0x0D, 0x01, 0x02, 0x01, 0x01, 0x02])) {
		return {
			ext: 'mxf',
			mime: 'application/mxf'
		};
	}

	if (check([0x47], {offset: 4}) && (check([0x47], {offset: 192}) || check([0x47], {offset: 196}))) {
		return {
			ext: 'mts',
			mime: 'video/mp2t'
		};
	}

	if (check([0x42, 0x4C, 0x45, 0x4E, 0x44, 0x45, 0x52])) {
		return {
			ext: 'blend',
			mime: 'application/x-blender'
		};
	}

	if (check([0x42, 0x50, 0x47, 0xFB])) {
		return {
			ext: 'bpg',
			mime: 'image/bpg'
		};
	}

	if (check([0x00, 0x00, 0x00, 0x0C, 0x6A, 0x50, 0x20, 0x20, 0x0D, 0x0A, 0x87, 0x0A])) {
		// JPEG-2000 family

		if (check([0x6A, 0x70, 0x32, 0x20], {offset: 20})) {
			return {
				ext: 'jp2',
				mime: 'image/jp2'
			};
		}

		if (check([0x6A, 0x70, 0x78, 0x20], {offset: 20})) {
			return {
				ext: 'jpx',
				mime: 'image/jpx'
			};
		}

		if (check([0x6A, 0x70, 0x6D, 0x20], {offset: 20})) {
			return {
				ext: 'jpm',
				mime: 'image/jpm'
			};
		}

		if (check([0x6D, 0x6A, 0x70, 0x32], {offset: 20})) {
			return {
				ext: 'mj2',
				mime: 'image/mj2'
			};
		}
	}

	if (check([0x46, 0x4F, 0x52, 0x4D, 0x00])) {
		return {
			ext: 'aif',
			mime: 'audio/aiff'
		};
	}

	if (checkString('<?xml ')) {
		return {
			ext: 'xml',
			mime: 'application/xml'
		};
	}

	if (check([0x42, 0x4F, 0x4F, 0x4B, 0x4D, 0x4F, 0x42, 0x49], {offset: 60})) {
		return {
			ext: 'mobi',
			mime: 'application/x-mobipocket-ebook'
		};
	}

	// File Type Box (https://en.wikipedia.org/wiki/ISO_base_media_file_format)
	if (check([0x66, 0x74, 0x79, 0x70], {offset: 4})) {
		if (check([0x6D, 0x69, 0x66, 0x31], {offset: 8})) {
			return {
				ext: 'heic',
				mime: 'image/heif'
			};
		}

		if (check([0x6D, 0x73, 0x66, 0x31], {offset: 8})) {
			return {
				ext: 'heic',
				mime: 'image/heif-sequence'
			};
		}

		if (check([0x68, 0x65, 0x69, 0x63], {offset: 8}) || check([0x68, 0x65, 0x69, 0x78], {offset: 8})) {
			return {
				ext: 'heic',
				mime: 'image/heic'
			};
		}

		if (check([0x68, 0x65, 0x76, 0x63], {offset: 8}) || check([0x68, 0x65, 0x76, 0x78], {offset: 8})) {
			return {
				ext: 'heic',
				mime: 'image/heic-sequence'
			};
		}
	}

	return null;
};
});

var imageData = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });


/* tslint:disable-next-line */

/* tslint:disable-next-line */
const PNG = pngJs.PNG;
/* tslint:disable-next-line */

// Use standard sRGB conversion numbers by default
// https://en.wikipedia.org/wiki/SRGB#The_sRGB_gamut
exports.defaultCalibrationProfile = {
    xRed: 0.4124,
    yRed: 0.2126,
    zRed: 0.0193,
    xGreen: 0.3576,
    yGreen: 0.7152,
    zGreen: 0.1192,
    xBlue: 0.1805,
    yBlue: 0.0722,
    zBlue: 0.9505,
};
var ProximitySmoothingMethod;
(function (ProximitySmoothingMethod) {
    ProximitySmoothingMethod["Linear"] = "linear";
})(ProximitySmoothingMethod = exports.ProximitySmoothingMethod || (exports.ProximitySmoothingMethod = {}));
class ImageData {
    static probablyIs(obj) {
        if (!obj || !obj.data || typeof obj.width !== 'number' || typeof obj.height !== 'number') {
            return false;
        }
        return (obj.data.length % obj.width) * obj.height === 0;
    }
    static is(obj) {
        return (ImageData.probablyIs(obj) &&
            typeof obj.channels === 'number' &&
            (obj.colorspace === types.Colorspace.RGB ||
                obj.colorspace === types.Colorspace.RGBA ||
                obj.colorspace === types.Colorspace.Greyscale ||
                obj.colorspace === types.Colorspace.HSL ||
                obj.colorspace === types.Colorspace.HCL ||
                obj.colorspace === types.Colorspace.YCbCr ||
                obj.colorspace === types.Colorspace.XYY ||
                obj.colorspace === types.Colorspace.XYZ) &&
            obj.data.length === obj.width * obj.height * obj.channels);
    }
    static normalize(imageData) {
        const channels = imageData.data.length / (imageData.width * imageData.height);
        let colorspace;
        switch (channels) {
            case 3:
                colorspace = types.Colorspace.RGB;
                break;
            case 1:
                colorspace = types.Colorspace.Greyscale;
                break;
            default:
                colorspace = types.Colorspace.RGBA;
        }
        return Object.assign({ channels, colorspace }, imageData);
    }
    static assert(imageData, colorspaces) {
        if (!ImageData.is(imageData)) {
            throw new TypeError('Unexpected image data');
        }
        if (colorspaces && colorspaces.indexOf(imageData.colorspace) === -1) {
            const expected = colorspaces.join(' or ');
            const actual = imageData.colorspace;
            throw new TypeError(`Expected ${expected} colorspace but found ${actual}`);
        }
        return imageData;
    }
    static getChannelRange(channel) {
        switch (channel) {
            case types.ColorChannel.Red:
            case types.ColorChannel.Green:
            case types.ColorChannel.Blue:
            case types.ColorChannel.Alpha:
            case types.ColorChannel.Luminance255:
            case types.ColorChannel.ChromaRed:
            case types.ColorChannel.ChromaBlue:
                return 255;
            case types.ColorChannel.Hue:
                return 360;
            case types.ColorChannel.Saturation:
            case types.ColorChannel.Luminance:
            case types.ColorChannel.Lightness:
            case types.ColorChannel.Chroma:
            case types.ColorChannel.X:
            case types.ColorChannel.Y:
            case types.ColorChannel.Z:
            case types.ColorChannel.x:
            case types.ColorChannel.y:
                return 1;
            default:
                throw new Error(`Unknown channel ${channel}`);
        }
    }
    /**
     * A flexible, slightly less performant ImageData.clip
     * @param value Pixel value to clip
     * @param channel Channel of the pixel to clip
     */
    static clipChannel(value, channel = types.ColorChannel.Red) {
        switch (channel) {
            case types.ColorChannel.Hue:
                let hue = Math.round(value);
                while (hue < 0)
                    hue += 360;
                return hue % 360;
            default:
                const max = ImageData.getChannelRange(channel);
                const rounded = max === 1 ? value : Math.round(value);
                // Manually do a min/max to clip, believe it or not this became bottleneck
                return rounded < 0 ? 0 : rounded > max ? max : rounded;
        }
    }
    /**
     * Performant clip for standard 8-bit pixel values
     * @param value Pixel value to clip to 0-255
     */
    static clip255(value) {
        const rounded = Math.round(value);
        // Manually do a min/max to clip, believe it or not this became bottleneck
        return rounded < 0 ? 0 : rounded > 255 ? 255 : rounded;
    }
    static clipX(x, imageData) {
        if (x < 0)
            return 0;
        if (x >= imageData.width)
            return imageData.width - 1;
        return x;
    }
    static clipY(y, imageData) {
        if (y < 0)
            return 0;
        if (y >= imageData.height)
            return imageData.height - 1;
        return y;
    }
    static isBorder(imageData, x, y, radius = 1) {
        return (x - radius < 0 ||
            y - radius < 0 ||
            x + radius >= imageData.width ||
            y + radius >= imageData.height);
    }
    static indexFor(imageData, x, y, channel = 0) {
        const xMax = imageData.width - 1;
        const yMax = imageData.height - 1;
        // Manually do a min/max to clip, believe it or not this became bottleneck
        x = x < 0 ? 0 : x > xMax ? xMax : x;
        y = y < 0 ? 0 : y > yMax ? yMax : y;
        return (y * imageData.width + x) * imageData.channels + channel;
    }
    static pixelFor(imageData, x, y) {
        const { colorspace, data, channels } = imageData;
        const index = ImageData.indexFor(imageData, x, y);
        const values = [...data.slice(index, index + channels)];
        return { x, y, index, values, colorspace };
    }
    static valueFor(imageData, x, y, channel = 0) {
        return imageData.data[ImageData.indexFor(imageData, x, y, channel)];
    }
    static channelsFor(colorspace) {
        const { Hue, Saturation, Lightness, Red, Green, Blue, Alpha, Luminance255, Luminance, Chroma, ChromaBlue, ChromaRed, x, y, X, Y, Z, } = types.ColorChannel;
        switch (colorspace) {
            case types.Colorspace.Greyscale:
                return [Luminance255];
            case types.Colorspace.HSL:
                return [Hue, Saturation, Lightness];
            case types.Colorspace.HCL:
                return [Hue, Chroma, Luminance];
            case types.Colorspace.YCbCr:
                return [Luminance255, ChromaBlue, ChromaRed];
            case types.Colorspace.XYZ:
                return [X, Y, Z];
            case types.Colorspace.XYY:
                return [x, y, Y];
            default:
                return [Red, Green, Blue, Alpha];
        }
    }
    static channelFor(imageData, channel) {
        return ImageData.channelsFor(imageData.colorspace)[channel];
    }
    static getOffsetForAngle(angle) {
        switch (angle) {
            case 0:
                return { x: 1, y: 0 };
            case 45:
                return { x: -1, y: 1 };
            case 90:
                return { x: 0, y: 1 };
            case 135:
                return { x: 1, y: 1 };
            default:
                throw new Error(`invalid angle: ${angle}`);
        }
    }
    static getPixelsForAngle(imageData, srcX, srcY, angle, radius = 1) {
        const offset = ImageData.getOffsetForAngle(angle);
        const pixels = [];
        for (let i = -radius; i <= radius; i++) {
            if (i === 0) {
                continue;
            }
            const x = srcX + offset.x * i;
            const y = srcY + offset.y * i;
            const index = ImageData.indexFor(imageData, x, y);
            pixels.push({ x, y, index, colorspace: types.Colorspace.Greyscale, values: [imageData.data[index]] });
        }
        return pixels;
    }
    static rotateSquareArray(srcArray, dstArray, width, height, angle, channels = 1) {
        if (width !== height)
            throw new Error('Only works on squares');
        // tslint:disable-next-line
        const fakeImageData = { width, height, channels };
        const cosAngle = Math.cos(((360 - angle) * Math.PI) / 180);
        const sinAngle = Math.sin(((360 - angle) * Math.PI) / 180);
        const originX = (width - 1) / 2;
        const originY = (height - 1) / 2;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const xRelative = x - originX;
                const yRelative = y - originY;
                const xPrimeRelative = xRelative * cosAngle - yRelative * sinAngle;
                const yPrimeRelative = xRelative * sinAngle + yRelative * cosAngle;
                const xPrime = Math.round(xPrimeRelative + originX);
                const yPrime = Math.round(yPrimeRelative + originY);
                // Check if new coordinates are out of bounds
                if (ImageData.isBorder(fakeImageData, xPrime, yPrime, 0)) {
                    continue;
                }
                const srcIndex = ImageData.indexFor(fakeImageData, x, y);
                const dstIndex = ImageData.indexFor(fakeImageData, xPrime, yPrime);
                for (let channel = 0; channel < channels; channel++) {
                    const value = srcArray[srcIndex + channel];
                    dstArray[dstIndex + channel] = value;
                }
            }
        }
    }
    /**
     * Rotates the image data counter-clockwise by the specified angle.
     * TODO: convert this to clockwise rotation
     */
    static rotate(srcImageData, angle) {
        const dstImageData = Object.assign({}, srcImageData);
        const numPixels = srcImageData.width * srcImageData.height;
        const dstData = new Uint8Array(numPixels * srcImageData.channels);
        if (srcImageData.width === srcImageData.height) {
            ImageData.rotateSquareArray(srcImageData.data, dstData, srcImageData.width, srcImageData.height, angle, srcImageData.channels);
        }
        else {
            if (angle % 90 !== 0)
                throw new Error('Can only rotate by 90 degree increments');
            if (angle === 90 || angle === 270) {
                dstImageData.width = srcImageData.height;
                dstImageData.height = srcImageData.width;
            }
            for (let srcX = 0; srcX < srcImageData.width; srcX++) {
                for (let srcY = 0; srcY < srcImageData.height; srcY++) {
                    let dstX, dstY;
                    if (angle === 90) {
                        dstX = srcY;
                        dstY = srcImageData.width - srcX - 1;
                    }
                    else if (angle === 180) {
                        dstX = srcImageData.width - srcX - 1;
                        dstY = srcImageData.height - srcY - 1;
                    }
                    else if (angle === 270) {
                        dstX = srcImageData.height - srcY - 1;
                        dstY = srcX;
                    }
                    const srcIndex = ImageData.indexFor(srcImageData, srcX, srcY);
                    const dstIndex = ImageData.indexFor(dstImageData, dstX, dstY);
                    for (let c = 0; c < srcImageData.channels; c++) {
                        dstData[dstIndex + c] = srcImageData.data[srcIndex + c];
                    }
                }
            }
        }
        dstImageData.data = dstData;
        return dstImageData;
    }
    static proximityTransform(imageData, adjustments) {
        const colorChannels = ImageData.channelsFor(imageData.colorspace);
        function computeDistances({ filterChannels, filterChannelCenters, filterChannelRanges }, offset) {
            const distances = [];
            let totalDist = 0;
            for (let i = 0; i < colorChannels.length; i++) {
                const channel = colorChannels[i];
                const filterChannelIndex = filterChannels.indexOf(channel);
                if (filterChannelIndex === -1)
                    continue;
                const value = imageData.data[offset + i];
                let distance = Math.abs(filterChannelCenters[filterChannelIndex] - value);
                if (channel === types.ColorChannel.Hue) {
                    distance = distance % 360;
                    distance = Math.min(distance, 360 - distance);
                }
                distance = distance / filterChannelRanges[filterChannelIndex];
                distance = Math.min(distance, 1);
                distances.push(distance);
                totalDist += distance;
            }
            if (distances.length - totalDist < 0.05)
                return [];
            return distances;
        }
        function computeMultiplier(distances) {
            let multiplier = 0;
            if (distances.length === 1) {
                multiplier = Math.cos((distances[0] * Math.PI) / 2);
            }
            else {
                let totalDistance = 0;
                for (const distance of distances) {
                    totalDistance += distance * distance;
                }
                multiplier = totalDistance > 1 ? 0 : 1 - Math.sqrt(totalDistance);
            }
            return multiplier;
        }
        function updateTargetChannel({ targetChannel, targetIntensity }, offset, multiplier) {
            for (let i = 0; i < colorChannels.length; i++) {
                if (colorChannels[i] !== targetChannel)
                    continue;
                const value = imageData.data[offset + i];
                imageData.data[offset + i] = ImageData.clipChannel(value + multiplier * targetIntensity, targetChannel);
            }
        }
        for (let x = 0; x < imageData.width; x++) {
            for (let y = 0; y < imageData.height; y++) {
                const offset = ImageData.indexFor(imageData, x, y);
                for (let i = 0; i < adjustments.length; i++) {
                    const adjustment = adjustments[i];
                    const distances = computeDistances(adjustment, offset);
                    if (!distances.length)
                        continue;
                    const multiplier = computeMultiplier(distances);
                    updateTargetChannel(adjustment, offset, multiplier);
                }
            }
        }
        return imageData;
    }
    static mapPixels(imageData, fns) {
        if (!Array.isArray(fns))
            fns = [fns];
        if (fns.length === 0)
            return imageData;
        const channels = ImageData.channelsFor(imageData.colorspace);
        const isUint8 = [types.Colorspace.RGBA, types.Colorspace.RGB, types.Colorspace.Greyscale, types.Colorspace.YCbCr].indexOf(imageData.colorspace) >= 0;
        const { width, height } = imageData;
        const data = isUint8
            ? new Uint8Array(imageData.width * imageData.height * imageData.channels)
            : [];
        const output = Object.assign({}, imageData, { width, height, data });
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const pixel = ImageData.pixelFor(imageData, x, y);
                for (const fn of fns) {
                    pixel.values = fn(pixel);
                }
                for (let i = 0; i < imageData.channels; i++) {
                    data[pixel.index + i] = ImageData.clipChannel(pixel.values[i], channels[i]);
                }
            }
        }
        return output;
    }
    static toGreyscale(srcImageData) {
        ImageData.assert(srcImageData);
        if (srcImageData.colorspace === types.Colorspace.Greyscale) {
            return srcImageData;
        }
        else {
            srcImageData = ImageData.toRGBA(srcImageData);
        }
        const dstImageData = Object.assign({}, srcImageData);
        const numPixels = srcImageData.width * srcImageData.height;
        const rawData = new Uint8Array(numPixels);
        for (let i = 0; i < numPixels; i++) {
            const red = srcImageData.data[i * srcImageData.channels + 0];
            const green = srcImageData.data[i * srcImageData.channels + 1];
            const blue = srcImageData.data[i * srcImageData.channels + 2];
            // use luminance forumla over regular average
            // see https://en.wikipedia.org/wiki/YCbCr#JPEG_conversion
            rawData[i] = Math.round(0.3 * red + 0.59 * green + 0.11 * blue);
        }
        dstImageData.colorspace = types.Colorspace.Greyscale;
        dstImageData.channels = 1;
        dstImageData.data = rawData;
        return dstImageData;
    }
    static toHSL(srcImageData) {
        ImageData.assert(srcImageData);
        if (srcImageData.colorspace === ImageData.HSL) {
            return srcImageData;
        }
        else {
            srcImageData = ImageData.toRGB(srcImageData);
        }
        const dstImageData = Object.assign({}, srcImageData);
        const numPixels = srcImageData.width * srcImageData.height;
        const rawData = new Float32Array(numPixels * 3);
        for (let i = 0; i < numPixels; i++) {
            const offset = i * 3;
            const r = srcImageData.data[offset] / 255;
            const g = srcImageData.data[offset + 1] / 255;
            const b = srcImageData.data[offset + 2] / 255;
            const min = Math.min(r, g, b);
            const max = Math.max(r, g, b);
            const delta = max - min;
            const lightness = (max + min) / 2;
            let hue = 0;
            let saturation = 0;
            if (delta) {
                saturation = delta / (1 - Math.abs(2 * lightness - 1));
                if (max === r) {
                    hue = (360 + (60 * (g - b)) / delta) % 360;
                }
                else if (max === g) {
                    hue = 60 * ((b - r) / delta + 2);
                }
                else {
                    hue = 60 * ((r - g) / delta + 4);
                }
            }
            rawData[offset + 0] = ImageData.clipChannel(hue, types.ColorChannel.Hue);
            rawData[offset + 1] = ImageData.clipChannel(saturation, types.ColorChannel.Saturation);
            rawData[offset + 2] = ImageData.clipChannel(lightness, types.ColorChannel.Lightness);
        }
        dstImageData.colorspace = ImageData.HSL;
        dstImageData.channels = 3;
        dstImageData.data = rawData;
        return dstImageData;
    }
    static _HSLToRGB(srcImageData) {
        const dstImageData = Object.assign({}, srcImageData);
        const numPixels = srcImageData.width * srcImageData.height;
        const rawData = new Uint8Array(numPixels * 3);
        for (let i = 0; i < numPixels; i++) {
            const offset = i * 3;
            const h = srcImageData.data[offset];
            const s = srcImageData.data[offset + 1];
            const l = srcImageData.data[offset + 2];
            // We know that...
            // S = (maxColor - minColor) / (1 - |2L - 1|)
            // maxColor = minColor + S * (1 - |2L - 1|)
            // And we also know that...
            // L = (maxColor + minColor) / 2
            // maxColor = 2L - minColor
            // Therefore...
            // 2L - minColor = minColor + S * (1 - |2L - 1|)
            // minColor = L - S * (1 - |2L - 1|) / 2
            const minColor = l - (s * (1 - Math.abs(2 * l - 1))) / 2;
            const maxColor = 2 * l - minColor;
            const spread = maxColor - minColor;
            let r = 0;
            let g = 0;
            let b = 0;
            if (h <= 60) {
                // R > G > B
                // H = 60 * (G - B) / spread
                // G = H * spread / 60 + B
                r = maxColor;
                g = (h * spread) / 60 + minColor;
                b = minColor;
            }
            else if (h <= 120) {
                // G > R > B
                // H = 60 * (B - R) / spread + 120
                // R = -(H - 120) * spread / 60 + B
                r = -((h - 120) * spread) / 60 + minColor;
                g = maxColor;
                b = minColor;
            }
            else if (h <= 180) {
                // G > B > R
                // H = 60 * (B - R) / spread + 120
                // B = (H - 120) * spread / 60 + R
                r = minColor;
                g = maxColor;
                b = ((h - 120) * spread) / 60 + minColor;
            }
            else if (h <= 240) {
                // B > G > R
                // H = 60 * (R - G) / spread + 240
                // G = -(H - 240) * spread / 60 + R
                r = minColor;
                g = -((h - 240) * spread) / 60 + minColor;
                b = maxColor;
            }
            else if (h <= 300) {
                // B > R > G
                // H = 60 * (R - G) / spread + 240
                // R = (H - 240) * spread / 60 + G
                r = ((h - 240) * spread) / 60 + minColor;
                g = minColor;
                b = maxColor;
            }
            else {
                // R > B > G
                // H = 60 * (G - B) / spread + 360
                // B = -(H - 360) * spread / 60 + G
                r = maxColor;
                g = minColor;
                b = -((h - 360) * spread) / 60 + minColor;
            }
            rawData[offset + 0] = ImageData.clip255(r * 255);
            rawData[offset + 1] = ImageData.clip255(g * 255);
            rawData[offset + 2] = ImageData.clip255(b * 255);
        }
        dstImageData.colorspace = types.Colorspace.RGB;
        dstImageData.channels = 3;
        dstImageData.data = rawData;
        return dstImageData;
    }
    static toHCL(srcImageData) {
        ImageData.assert(srcImageData);
        if (srcImageData.colorspace === types.Colorspace.HCL) {
            return srcImageData;
        }
        else {
            srcImageData = ImageData.toXYY(srcImageData);
        }
        const dstImageData = Object.assign({}, srcImageData);
        const numPixels = srcImageData.width * srcImageData.height;
        const rawData = [];
        for (let i = 0; i < numPixels; i++) {
            const offset = i * 3;
            // Convert xyY into polar coordinates, https://en.wikipedia.org/wiki/HCL_color_space#Overview
            const x = srcImageData.data[offset];
            const y = srcImageData.data[offset + 1];
            const Y = srcImageData.data[offset + 2];
            // Use sRGB white point, https://en.wikipedia.org/wiki/SRGB#The_sRGB_gamut
            const xOrigin = 0.3127;
            const yOrigin = 0.329;
            const xCoord = x - xOrigin;
            const yCoord = y - yOrigin;
            const rCoord = Math.sqrt(xCoord * xCoord + yCoord * yCoord);
            let theta = (Math.atan(yCoord / xCoord) * 180) / Math.PI;
            if (xCoord < 0 && yCoord > 0)
                theta += 180;
            if (xCoord < 0 && yCoord < 0)
                theta += 180;
            if (xCoord > 0 && yCoord < 0)
                theta += 360;
            rawData[offset + 0] = theta;
            rawData[offset + 1] = rCoord;
            rawData[offset + 2] = Y;
        }
        dstImageData.colorspace = types.Colorspace.HCL;
        dstImageData.channels = 3;
        dstImageData.data = rawData;
        return dstImageData;
    }
    static _HCLToXYY(srcImageData) {
        const dstImageData = Object.assign({}, srcImageData);
        const numPixels = srcImageData.width * srcImageData.height;
        const rawData = [];
        for (let i = 0; i < numPixels; i++) {
            const offset = i * 3;
            // Convert HCL back into cartesian coordinates, https://en.wikipedia.org/wiki/HCL_color_space#Overview
            const hue = srcImageData.data[offset];
            const chroma = srcImageData.data[offset + 1];
            const Y = srcImageData.data[offset + 2];
            // Use sRGB white point, https://en.wikipedia.org/wiki/SRGB#The_sRGB_gamut
            const xOrigin = 0.3127;
            const yOrigin = 0.329;
            const xCoord = Math.cos((hue * Math.PI) / 180) * chroma;
            const yCoord = Math.sin((hue * Math.PI) / 180) * chroma;
            rawData[offset + 0] = xCoord + xOrigin;
            rawData[offset + 1] = yCoord + yOrigin;
            rawData[offset + 2] = Y;
        }
        dstImageData.colorspace = types.Colorspace.XYY;
        dstImageData.channels = 3;
        dstImageData.data = rawData;
        return dstImageData;
    }
    static toXYZ(srcImageData, calibrationProfile = exports.defaultCalibrationProfile) {
        ImageData.assert(srcImageData);
        if (srcImageData.colorspace === types.Colorspace.YCbCr) {
            return srcImageData;
        }
        else {
            srcImageData = ImageData.toRGB(srcImageData);
        }
        const dstImageData = Object.assign({}, srcImageData);
        const numPixels = srcImageData.width * srcImageData.height;
        // TODO: investigate why this is slower than the JS version in all browsers
        // 18x slower in Chrome :/
        if (env.hasWASM() && 10 < Math.random()) {
            const { wasmModule } = env.getWASM();
            const numberOfElements = numPixels * 3;
            const byteSize = numberOfElements * 4;
            const pointer = wasmModule.instance.exports.alloc(byteSize);
            const rawData = new Float32Array(wasmModule.instance.exports.memory.buffer, pointer, numberOfElements);
            for (let i = 0; i < srcImageData.data.length; i++) {
                rawData[i] = srcImageData.data[i];
            }
            wasmModule.instance.exports.toXYZ(pointer, numPixels, calibrationProfile.xRed, calibrationProfile.xGreen, calibrationProfile.xBlue, calibrationProfile.yRed, calibrationProfile.yGreen, calibrationProfile.yBlue, calibrationProfile.zRed, calibrationProfile.zGreen, calibrationProfile.zBlue);
            dstImageData.data = [...rawData];
            wasmModule.instance.exports.dealloc(pointer, byteSize);
        }
        else {
            // While this isn't 100% accurate, it's much, MUCH faster
            // See https://www.desmos.com/calculator/dip7dpicry
            // Essentially...
            //    v <= 0.2 ... y = x * x
            //    v <= 0.6 ... y = x * x - 0.125 * x + .025
            //    v <= 1.0 ... y = x * x + 0.125 * x - .125
            const gammaCorrect = (c) => {
                if (c <= 0.2)
                    return c * c;
                if (c <= 0.6)
                    return c * c - 0.125 * c + 0.025;
                return c * c + 0.125 * c - 0.125;
            };
            const rawData = [];
            for (let i = 0; i < numPixels; i++) {
                const offset = i * 3;
                const rLinear = gammaCorrect(srcImageData.data[offset] / 255);
                const gLinear = gammaCorrect(srcImageData.data[offset + 1] / 255);
                const bLinear = gammaCorrect(srcImageData.data[offset + 2] / 255);
                // From https://en.wikipedia.org/wiki/SRGB#Specification_of_the_transformation
                const X = calibrationProfile.xRed * rLinear +
                    calibrationProfile.xGreen * gLinear +
                    calibrationProfile.xBlue * bLinear;
                const Y = calibrationProfile.yRed * rLinear +
                    calibrationProfile.yGreen * gLinear +
                    calibrationProfile.yBlue * bLinear;
                const Z = calibrationProfile.zRed * rLinear +
                    calibrationProfile.zGreen * gLinear +
                    calibrationProfile.zBlue * bLinear;
                rawData[offset + 0] = X;
                rawData[offset + 1] = Y;
                rawData[offset + 2] = Z;
            }
            dstImageData.data = rawData;
        }
        dstImageData.colorspace = types.Colorspace.XYZ;
        dstImageData.channels = 3;
        return dstImageData;
    }
    static _XYZToRGB(srcImageData) {
        const dstImageData = Object.assign({}, srcImageData);
        const numPixels = srcImageData.width * srcImageData.height;
        if (env.hasWASM()) {
            const { wasmModule } = env.getWASM();
            const numberOfElements = numPixels * 3;
            const byteSize = numberOfElements * 4;
            const pointerIn = wasmModule.instance.exports.alloc(byteSize);
            const pointerOut = wasmModule.instance.exports.alloc(numberOfElements);
            const rawDataIn = new Float32Array(wasmModule.instance.exports.memory.buffer, pointerIn, numberOfElements);
            const rawDataOut = new Uint8Array(wasmModule.instance.exports.memory.buffer, pointerOut, numberOfElements);
            for (let i = 0; i < srcImageData.data.length; i++) {
                rawDataIn[i] = srcImageData.data[i];
            }
            wasmModule.instance.exports.toRGBFromXYZ(pointerIn, pointerOut, numPixels);
            dstImageData.data = new Uint8Array(rawDataOut);
            wasmModule.instance.exports.dealloc(pointerIn, byteSize);
            wasmModule.instance.exports.dealloc(pointerOut, byteSize);
        }
        else {
            const rawData = new Uint8Array(numPixels * 3);
            // Reverse our linear combination from before...
            // Pluggin in our choke points to reverse the previous functions.
            //    y <= 0.04 ... y = x * x
            //    v <= 0.31 ... y = x * x - 0.125 * x + .025
            //    v <= 1.00 ... y = x * x + 0.125 * x - .125
            const gammaCorrect = (v) => {
                if (v <= 0.04)
                    return Math.sqrt(v);
                if (v <= 0.31)
                    return (Math.sqrt(6400.0 * v - 135.0) + 5.0) / 80.0;
                return (Math.sqrt(256.0 * v + 33.0) - 1.0) / 16.0;
            };
            for (let i = 0; i < numPixels; i++) {
                const offset = i * 3;
                const x = srcImageData.data[offset];
                const y = srcImageData.data[offset + 1];
                const z = srcImageData.data[offset + 2];
                const rLinear = 3.2406 * x - 1.5372 * y - 0.4986 * z;
                const gLinear = -0.9689 * x + 1.8758 * y + 0.0415 * z;
                const bLinear = 0.0557 * x - 0.204 * y + 1.057 * z;
                // From https://en.wikipedia.org/wiki/SRGB#Specification_of_the_transformation
                rawData[offset + 0] = ImageData.clip255(gammaCorrect(rLinear) * 255);
                rawData[offset + 1] = ImageData.clip255(gammaCorrect(gLinear) * 255);
                rawData[offset + 2] = ImageData.clip255(gammaCorrect(bLinear) * 255);
            }
            dstImageData.data = rawData;
        }
        dstImageData.colorspace = types.Colorspace.RGB;
        dstImageData.channels = 3;
        return dstImageData;
    }
    static toXYY(srcImageData) {
        const dstImageData = Object.assign({}, ImageData.toXYZ(srcImageData));
        dstImageData.data = dstImageData.data.slice();
        const numPixels = srcImageData.width * srcImageData.height;
        for (let i = 0; i < numPixels; i++) {
            const offset = i * 3;
            const X = dstImageData.data[offset + 0];
            const Y = dstImageData.data[offset + 1];
            const Z = dstImageData.data[offset + 2];
            const XYZ = X + Y + Z;
            dstImageData.data[offset + 0] = X / XYZ;
            dstImageData.data[offset + 1] = Y / XYZ;
            dstImageData.data[offset + 2] = Y;
        }
        dstImageData.colorspace = types.Colorspace.XYY;
        return dstImageData;
    }
    static _XYYToRGB(srcImageData) {
        const dstImageData = Object.assign({}, srcImageData);
        dstImageData.data = dstImageData.data.slice();
        const numPixels = srcImageData.width * srcImageData.height;
        for (let i = 0; i < numPixels; i++) {
            const offset = i * 3;
            const x = dstImageData.data[offset + 0];
            const y = dstImageData.data[offset + 1];
            const Y = dstImageData.data[offset + 2];
            const XYZ = Y / y;
            const X = x * XYZ;
            dstImageData.data[offset + 0] = X;
            dstImageData.data[offset + 1] = Y;
            dstImageData.data[offset + 2] = XYZ - Y - X;
        }
        dstImageData.colorspace = types.Colorspace.XYZ;
        return ImageData._XYZToRGB(dstImageData);
    }
    static toYCbCr(srcImageData) {
        ImageData.assert(srcImageData);
        if (srcImageData.colorspace === types.Colorspace.YCbCr) {
            return srcImageData;
        }
        else {
            srcImageData = ImageData.toRGB(srcImageData);
        }
        const dstImageData = Object.assign({}, srcImageData);
        const numPixels = srcImageData.width * srcImageData.height;
        if (env.hasWASM()) {
            const { wasmModule } = env.getWASM();
            const numberOfElements = numPixels * 3;
            const byteSize = numberOfElements;
            const pointer = wasmModule.instance.exports.alloc(byteSize);
            const rawData = new Uint8Array(wasmModule.instance.exports.memory.buffer, pointer, numberOfElements);
            for (let i = 0; i < srcImageData.height * srcImageData.width * srcImageData.channels; i++) {
                rawData[i] = srcImageData.data[i];
            }
            wasmModule.instance.exports.toYCbCr(pointer, numPixels);
            dstImageData.data = new Uint8Array(rawData);
            wasmModule.instance.exports.dealloc(pointer, byteSize);
        }
        else {
            const rawData = new Uint8Array(numPixels * 3);
            for (let i = 0; i < numPixels; i++) {
                const offset = i * 3;
                const r = srcImageData.data[offset];
                const g = srcImageData.data[offset + 1];
                const b = srcImageData.data[offset + 2];
                // From https://en.wikipedia.org/wiki/YCbCr#JPEG_conversion
                rawData[offset + 0] = ImageData.clip255(0.0 + 0.299 * r + 0.587 * g + 0.114 * b);
                rawData[offset + 1] = ImageData.clip255(128 - 0.169 * r - 0.331 * g + 0.501 * b);
                rawData[offset + 2] = ImageData.clip255(128 + 0.501 * r - 0.419 * g - 0.081 * b);
            }
            dstImageData.data = rawData;
        }
        dstImageData.colorspace = types.Colorspace.YCbCr;
        dstImageData.channels = 3;
        return dstImageData;
    }
    static _YCbCrToRGB(srcImageData) {
        const dstImageData = Object.assign({}, srcImageData);
        const numPixels = srcImageData.width * srcImageData.height;
        const rawData = new Uint8Array(numPixels * 3);
        for (let i = 0; i < numPixels; i++) {
            const offset = i * 3;
            const y = srcImageData.data[offset];
            const cb = srcImageData.data[offset + 1];
            const cr = srcImageData.data[offset + 2];
            // From https://en.wikipedia.org/wiki/YCbCr#JPEG_conversion
            rawData[offset + 0] = ImageData.clip255(y + 1.402 * (cr - 128));
            rawData[offset + 1] = ImageData.clip255(y - 0.344 * (cb - 128) - 0.714 * (cr - 128));
            rawData[offset + 2] = ImageData.clip255(y + 1.772 * (cb - 128));
        }
        dstImageData.colorspace = types.Colorspace.RGB;
        dstImageData.channels = 3;
        dstImageData.data = rawData;
        return dstImageData;
    }
    static toRGB(srcImageData) {
        ImageData.assert(srcImageData);
        if (srcImageData.colorspace === types.Colorspace.RGB) {
            return srcImageData;
        }
        else if (srcImageData.colorspace === types.Colorspace.RGBA) {
            return ImageData.removeAlphaChannel(srcImageData);
        }
        else if (srcImageData.colorspace === ImageData.HSL) {
            return ImageData._HSLToRGB(srcImageData);
        }
        else if (srcImageData.colorspace === types.Colorspace.HCL) {
            return ImageData._XYYToRGB(ImageData._HCLToXYY(srcImageData));
        }
        else if (srcImageData.colorspace === types.Colorspace.YCbCr) {
            return ImageData._YCbCrToRGB(srcImageData);
        }
        else if (srcImageData.colorspace === types.Colorspace.XYZ) {
            return ImageData._XYZToRGB(srcImageData);
        }
        else if (srcImageData.colorspace === types.Colorspace.XYY) {
            return ImageData._XYYToRGB(srcImageData);
        }
        else if (srcImageData.colorspace !== types.Colorspace.Greyscale) {
            throw new Error('Image data was not greyscale');
        }
        const dstImageData = Object.assign({}, srcImageData);
        const numPixels = srcImageData.width * srcImageData.height;
        const rawData = new Uint8Array(numPixels * 3);
        for (let i = 0; i < numPixels; i++) {
            const dstOffset = i * 3;
            rawData[dstOffset + 0] = srcImageData.data[i];
            rawData[dstOffset + 1] = srcImageData.data[i];
            rawData[dstOffset + 2] = srcImageData.data[i];
        }
        dstImageData.colorspace = types.Colorspace.RGB;
        dstImageData.channels = 3;
        dstImageData.data = rawData;
        return dstImageData;
    }
    static toRGBA(srcImageData) {
        ImageData.assert(srcImageData);
        if (srcImageData.colorspace === types.Colorspace.RGBA) {
            return srcImageData;
        }
        else {
            srcImageData = ImageData.toRGB(srcImageData);
        }
        const dstImageData = Object.assign({}, srcImageData);
        const numPixels = srcImageData.width * srcImageData.height;
        const rawData = new Uint8Array(numPixels * 4);
        for (let i = 0; i < numPixels; i++) {
            const srcOffset = i * 3;
            const dstOffset = i * 4;
            rawData[dstOffset + 0] = srcImageData.data[srcOffset + 0];
            rawData[dstOffset + 1] = srcImageData.data[srcOffset + 1];
            rawData[dstOffset + 2] = srcImageData.data[srcOffset + 2];
            rawData[dstOffset + 3] = 255;
        }
        dstImageData.colorspace = types.Colorspace.RGBA;
        dstImageData.channels = 4;
        dstImageData.data = rawData;
        return dstImageData;
    }
    static toColorspace(srcImageData, colorspace) {
        switch (colorspace) {
            case types.Colorspace.Greyscale:
                return ImageData.toGreyscale(srcImageData);
            case types.Colorspace.HSL:
                return ImageData.toHSL(srcImageData);
            case types.Colorspace.YCbCr:
                return ImageData.toYCbCr(srcImageData);
            case types.Colorspace.RGB:
                return ImageData.toRGB(srcImageData);
            case types.Colorspace.RGBA:
                return ImageData.toRGBA(srcImageData);
            default:
                throw new Error(`Unrecognized colorspace '${colorspace}'`);
        }
    }
    static removeAlphaChannel(srcImageData) {
        ImageData.assert(srcImageData);
        if (srcImageData.colorspace !== types.Colorspace.RGBA) {
            return srcImageData;
        }
        const dstImageData = Object.assign({}, srcImageData);
        const numPixels = srcImageData.width * srcImageData.height;
        const rawData = new Uint8Array(numPixels * 3);
        for (let i = 0; i < numPixels; i++) {
            const srcOffset = i * 4;
            const dstOffset = i * 3;
            rawData[dstOffset + 0] = srcImageData.data[srcOffset + 0];
            rawData[dstOffset + 1] = srcImageData.data[srcOffset + 1];
            rawData[dstOffset + 2] = srcImageData.data[srcOffset + 2];
        }
        dstImageData.colorspace = types.Colorspace.RGB;
        dstImageData.channels = 3;
        dstImageData.data = rawData;
        return dstImageData;
    }
    static from(bufferLike) {
        const type = fileType(bufferLike) || { mime: 'unknown' };
        let imageData;
        switch (type.mime) {
            case 'image/jpeg':
                imageData = jpegJs.decode(bufferLike, true);
                break;
            case 'image/png':
                imageData = PNG.sync.read(bufferLike);
                break;
            default:
                return Promise.reject(new TypeError(`Unrecognized mime type: ${type.mime}`));
        }
        return Promise.resolve(imageData).then(ImageData.normalize);
    }
    static toBuffer(imageData, options) {
        const type = (options && options.type) || types.ImageFormat.JPEG;
        let buffer;
        switch (type) {
            case types.ImageFormat.JPEG:
            case types.ImageFormat.NoTranscode:
                const quality = (options && options.quality) || 90;
                buffer = jpegJs.encode(ImageData.toRGBA(imageData), quality).data;
                break;
            case types.ImageFormat.PNG:
                buffer = PNG.sync.write(ImageData.toRGBA(imageData));
                break;
            default:
                return Promise.reject(new TypeError(`Unrecognized output type: ${type}`));
        }
        return Promise.resolve(buffer);
    }
    static toBrowserImageData(imageData) {
        // tslint:disable-next-line
        if (typeof window !== 'object' || typeof window.ImageData !== 'function') {
            throw new Error('toBrowserImageData must be called in browser context');
        }
        imageData = ImageData.toRGBA(imageData);
        const clamped = new Uint8ClampedArray(imageData.data);
        return new window.ImageData(clamped, imageData.width, imageData.height);
    }
}
ImageData.GREYSCALE = types.Colorspace.Greyscale;
ImageData.RGB = types.Colorspace.RGB;
ImageData.RGBA = types.Colorspace.RGBA;
ImageData.HSL = types.Colorspace.HSL;
ImageData.YCBCR = types.Colorspace.YCbCr;
exports.ImageData = ImageData;

});

unwrapExports(imageData);

var fs = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function writeFile(file, buffer) {
    throw new Error('unimplemented');
}
exports.writeFile = writeFile;

});

unwrapExports(fs);

var fsUtils = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function writeFileAsync(file, buffer) {
    return new Promise((resolve, reject) => {
        fs.writeFile(file, Buffer.from(buffer), err => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
exports.writeFileAsync = writeFileAsync;

});

unwrapExports(fsUtils);

var sobel_1 = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function toNearestAngle(xVal, yVal) {
    const angle = (Math.atan2(yVal, xVal) * 180) / Math.PI;
    return (Math.round(angle / 45) * 45 + 180) % 180;
}
function totalMatrixWeight(matrix) {
    let weight = 0;
    for (let i = 0; i < matrix.length; i++) {
        weight += Math.max(matrix[i], 0);
    }
    return weight;
}
function generateWeightMatrix(radius, isX) {
    const maxDistToMax = 2 * radius - 1;
    let index = 0;
    let matrix = [];
    for (let y = -radius; y <= radius; y++) {
        for (let x = -radius; x <= radius; x++) {
            if (y === 0) {
                matrix[index] = 0;
            }
            else {
                const distToMax = Math.abs(x) + Math.abs(y) - 1;
                const weight = Math.pow(2, maxDistToMax - distToMax);
                matrix[index] = -1 * Math.sign(y) * weight;
            }
            index++;
        }
    }
    if (isX) {
        const matrixWidth = 2 * radius + 1;
        const rotatedMatrix = new Array(matrix.length);
        imageData.ImageData.rotateSquareArray(matrix, rotatedMatrix, matrixWidth, matrixWidth, 90);
        matrix = rotatedMatrix;
    }
    return matrix;
}
exports.generateWeightMatrix = generateWeightMatrix;
function sobel(origImageData, options) {
    const radius = (options && options.radius) || 1;
    const xMatrix = generateWeightMatrix(radius, true);
    const yMatrix = generateWeightMatrix(radius, false);
    const totalWeight = totalMatrixWeight(xMatrix);
    const imageData$$1 = imageData.ImageData.toGreyscale(origImageData);
    const srcPixels = imageData$$1.data;
    const dstPixels = new Uint8Array(srcPixels.length);
    const dstAngles = new Uint8Array(srcPixels.length);
    const imageWidth = imageData$$1.width;
    const imageHeight = imageData$$1.height;
    const matrixWidth = 2 * radius + 1;
    const matrixHalfWidth = Math.floor(matrixWidth / 2);
    var dstIndex = 0;
    for (var y = 0; y < imageHeight; y++) {
        for (var x = 0; x < imageWidth; x++) {
            var xVal = 0;
            var yVal = 0;
            if (imageData.ImageData.isBorder(imageData$$1, x, y, matrixHalfWidth)) {
                dstPixels[dstIndex] = 0;
                dstAngles[dstIndex] = 0;
                dstIndex++;
                continue;
            }
            for (var matrixY = 0; matrixY < matrixWidth; matrixY++) {
                for (var matrixX = 0; matrixX < matrixWidth; matrixX++) {
                    const srcX = x + matrixX - matrixHalfWidth;
                    const srcY = y + matrixY - matrixHalfWidth;
                    const srcOffset = srcY * imageWidth + srcX;
                    const matrixOffset = matrixY * matrixWidth + matrixX;
                    const xWeight = xMatrix[matrixOffset];
                    const yWeight = yMatrix[matrixOffset];
                    xVal += (srcPixels[srcOffset] * xWeight) / totalWeight;
                    yVal += (srcPixels[srcOffset] * yWeight) / totalWeight;
                }
            }
            dstPixels[dstIndex] = Math.round(Math.sqrt(xVal * xVal + yVal * yVal));
            dstAngles[dstIndex] = toNearestAngle(xVal, yVal);
            dstIndex++;
        }
    }
    return Object.assign({}, imageData$$1, {
        data: dstPixels,
        angles: dstAngles,
    });
}
exports.sobel = sobel;

});

unwrapExports(sobel_1);

var resize = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable */


function normalizeOptions(imageData$$1, options) {
    const originalWidth = imageData$$1.width;
    const originalHeight = imageData$$1.height;
    const originalAspectRatio = originalWidth / originalHeight;
    let targetWidth = options.width;
    let targetHeight = options.height;
    const targetAspectRatio = targetWidth / targetHeight;
    let subselect = options.subselect;
    if (!subselect) {
        subselect = { top: 0, bottom: originalHeight, left: 0, right: originalWidth };
    }
    switch (options.fit) {
        case types.ImageResizeFit.Auto:
        case types.ImageResizeFit.Exact:
            if (!targetWidth && targetHeight) {
                targetWidth = targetHeight * originalAspectRatio;
            }
            else if (targetWidth && !targetHeight) {
                targetHeight = targetWidth / originalAspectRatio;
            }
            break;
        case types.ImageResizeFit.Contain:
            if (originalAspectRatio > targetAspectRatio) {
                targetHeight = targetWidth / originalAspectRatio;
            }
            else {
                targetWidth = targetHeight * originalAspectRatio;
            }
            break;
        case types.ImageResizeFit.Cover:
            if (originalAspectRatio > targetAspectRatio) {
                targetWidth = targetHeight * originalAspectRatio;
            }
            else {
                targetHeight = targetWidth / originalAspectRatio;
            }
            break;
        case types.ImageResizeFit.Crop:
            if (options.subselect) {
                targetWidth = options.subselect.right - options.subselect.left;
                targetHeight = options.subselect.bottom - options.subselect.top;
                break;
            }
            let cropTargetWidth = originalWidth;
            let cropTargetHeight = originalHeight;
            if (originalAspectRatio > targetAspectRatio) {
                cropTargetWidth = originalHeight * targetAspectRatio;
            }
            else {
                cropTargetHeight = originalWidth / targetAspectRatio;
            }
            const heightMargin = (originalHeight - cropTargetHeight) / 2;
            const widthMargin = (originalWidth - cropTargetWidth) / 2;
            subselect = {
                top: Math.floor(heightMargin),
                bottom: originalHeight - Math.ceil(heightMargin),
                left: Math.floor(widthMargin),
                right: originalWidth - Math.ceil(widthMargin),
            };
            break;
    }
    if (!targetWidth || !targetHeight)
        throw new Error('Invalid dimensions for resize');
    return Object.assign({ fit: types.ImageResizeFit.Exact, method: types.ImageResizeMethod.Bilinear, doNotEnlarge: !!options.doNotEnlarge }, options, { width: Math.round(targetWidth), height: Math.round(targetHeight), subselect });
}
exports.normalizeOptions = normalizeOptions;
function nearestNeighbor(imageData$$1, options) {
    if (!options.width || !options.height) {
        throw new Error('Missing width or height');
    }
    imageData.ImageData.assert(imageData$$1, [types.Colorspace.RGBA, types.Colorspace.RGB, types.Colorspace.Greyscale]);
    const targetWidth = options.width;
    const targetHeight = options.height;
    const widthScaleFactor = imageData$$1.width / targetWidth;
    const heightScaleFactor = imageData$$1.height / targetHeight;
    const outPixels = new Uint8Array(targetWidth * targetHeight * imageData$$1.channels);
    for (var i = 0; i < targetWidth; i++) {
        for (var j = 0; j < targetHeight; j++) {
            const origX = Math.floor(i * widthScaleFactor);
            const origY = Math.floor(j * heightScaleFactor);
            const origPos = (origY * imageData$$1.width + origX) * imageData$$1.channels;
            var outPos = (j * targetWidth + i) * imageData$$1.channels;
            for (var channel = 0; channel < imageData$$1.channels; channel++) {
                outPixels[outPos + channel] = imageData$$1.data[origPos + channel];
            }
        }
    }
    return {
        width: targetWidth,
        height: targetHeight,
        data: outPixels,
        channels: imageData$$1.channels,
        colorspace: imageData$$1.colorspace,
    };
}
exports.nearestNeighbor = nearestNeighbor;
function bilinear(imageData$$1, options) {
    if (!options.width || !options.height) {
        throw new Error('Missing width or height');
    }
    imageData.ImageData.assert(imageData$$1, [types.Colorspace.RGBA, types.Colorspace.RGB, types.Colorspace.Greyscale]);
    var targetWidth = options.width;
    var targetHeight = options.height;
    var widthScaleFactor = imageData$$1.width / targetWidth;
    var heightScaleFactor = imageData$$1.height / targetHeight;
    var boxResizeData = null;
    var boxResizeOptions = null;
    if (widthScaleFactor >= 2 || heightScaleFactor >= 2) {
        const boxWidthScaleFactor = Math.max(Math.floor(widthScaleFactor), 1);
        const boxHeightScaleFactor = Math.max(Math.floor(heightScaleFactor), 1);
        if (widthScaleFactor === boxWidthScaleFactor && heightScaleFactor === boxHeightScaleFactor) {
            return box(imageData$$1, options);
        }
        targetWidth = targetWidth * boxWidthScaleFactor;
        targetHeight = targetHeight * boxHeightScaleFactor;
        widthScaleFactor = imageData$$1.width / targetWidth;
        heightScaleFactor = imageData$$1.height / targetHeight;
        boxResizeOptions = options;
        boxResizeData = {
            width: targetWidth,
            height: targetHeight,
            data: imageData$$1.data,
            channels: imageData$$1.channels,
            colorspace: imageData$$1.colorspace,
        };
    }
    var outPixels = new Uint8Array(targetWidth * targetHeight * imageData$$1.channels);
    for (var i = 0; i < targetWidth; i++) {
        for (var j = 0; j < targetHeight; j++) {
            // Find the ideal X,Y coordinates we'd pull from
            var srcX = i * widthScaleFactor;
            var srcY = j * heightScaleFactor;
            var srcXFloor = Math.floor(srcX);
            var srcYFloor = Math.floor(srcY);
            // Compute the source indexes we'll pull from
            // We're trying to pull from the 4 closest pixels
            // A = floor(X), floor(Y)
            // D = ceil(X), ceil(Y)
            // - - A B - -
            // - - C D - -
            var srcXOffset = srcXFloor;
            var srcRowIndexOffset = Math.floor(srcY) * imageData$$1.width;
            var srcIndexA = (srcRowIndexOffset + srcXOffset) * imageData$$1.channels;
            var srcIndexB = srcIndexA + imageData$$1.channels;
            var srcIndexC = (srcRowIndexOffset + imageData$$1.width + srcXOffset) * imageData$$1.channels;
            var srcIndexD = srcIndexC + imageData$$1.channels;
            // Make sure the edges don't fly off the image data
            if (srcXFloor === imageData$$1.width - 1) {
                srcIndexB = srcIndexA;
                srcIndexD = srcIndexC;
            }
            if (srcYFloor === imageData$$1.height - 1) {
                srcIndexC = srcIndexA;
                srcIndexD = srcIndexB;
            }
            // Compute the weights each pixel will have using the distance
            var xDistanceA = srcX - srcXFloor;
            var yDistanceA = srcY - srcYFloor;
            var xWeightA = 1 - xDistanceA;
            var yWeightB = 1 - yDistanceA;
            var weightA = xWeightA * yWeightB;
            var weightB = (1 - xWeightA) * yWeightB;
            var weightC = xWeightA * (1 - yWeightB);
            var weightD = (1 - xWeightA) * (1 - yWeightB);
            var totalWeight = weightA + weightB + weightC + weightD;
            var outIndex = (j * targetWidth + i) * imageData$$1.channels;
            for (var channel = 0; channel < imageData$$1.channels; channel++) {
                var value = (imageData$$1.data[srcIndexA + channel] * weightA) / totalWeight +
                    (imageData$$1.data[srcIndexB + channel] * weightB) / totalWeight +
                    (imageData$$1.data[srcIndexC + channel] * weightC) / totalWeight +
                    (imageData$$1.data[srcIndexD + channel] * weightD) / totalWeight;
                outPixels[outIndex + channel] = Math.round(value);
            }
        }
    }
    if (boxResizeData && boxResizeOptions) {
        boxResizeData.data = outPixels;
        targetWidth = boxResizeOptions.width;
        targetHeight = boxResizeOptions.height;
        outPixels = box(boxResizeData, boxResizeOptions).data;
    }
    return {
        width: targetWidth,
        height: targetHeight,
        data: outPixels,
        channels: imageData$$1.channels,
        colorspace: imageData$$1.colorspace,
    };
}
exports.bilinear = bilinear;
function box(imageData$$1, options) {
    if (!options.width || !options.height) {
        throw new Error('Missing width or height');
    }
    imageData.ImageData.assert(imageData$$1, [types.Colorspace.RGBA, types.Colorspace.RGB, types.Colorspace.Greyscale]);
    const targetWidth = options.width;
    const targetHeight = options.height;
    const widthScaleFactor = imageData$$1.width / targetWidth;
    const heightScaleFactor = imageData$$1.height / targetHeight;
    if (widthScaleFactor < 1 || heightScaleFactor < 1) {
        throw new Error('Box resize can only shrink images');
    }
    else if (Math.floor(widthScaleFactor) !== widthScaleFactor ||
        Math.floor(heightScaleFactor) !== heightScaleFactor) {
        throw new Error('Can only box resize in integer increments');
    }
    const outPixels = new Uint8Array(targetWidth * targetHeight * imageData$$1.channels);
    for (var i = 0; i < targetWidth; i++) {
        for (var j = 0; j < targetHeight; j++) {
            var origX = Math.floor(i * widthScaleFactor);
            var origY = Math.floor(j * heightScaleFactor);
            var outPos = (j * targetWidth + i) * imageData$$1.channels;
            for (var channel = 0; channel < imageData$$1.channels; channel++) {
                var value = 0;
                for (var dx = 0; dx < widthScaleFactor; dx++) {
                    for (var dy = 0; dy < heightScaleFactor; dy++) {
                        var origPos = ((origY + dy) * imageData$$1.width + (origX + dx)) * imageData$$1.channels;
                        value += imageData$$1.data[origPos + channel];
                    }
                }
                outPixels[outPos + channel] = value / (widthScaleFactor * heightScaleFactor);
            }
        }
    }
    return {
        width: targetWidth,
        height: targetHeight,
        data: outPixels,
        channels: imageData$$1.channels,
        colorspace: imageData$$1.colorspace,
    };
}
exports.box = box;

});

unwrapExports(resize);

var normalize_1 = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });


function findClipPoint(imageData$$1, samplePercentage, method) {
    const quickHist = [];
    for (let i = 0; i < 256; i++)
        quickHist[i] = 0;
    const numPixels = imageData$$1.width * imageData$$1.height;
    for (let i = 0; i < numPixels; i++) {
        quickHist[imageData$$1.data[i * imageData$$1.channels]]++;
    }
    let index = 0;
    let cummulativeSum = 0;
    while (cummulativeSum < samplePercentage) {
        const histValue = method === 'min' ? index : 255 - index;
        cummulativeSum += quickHist[histValue] / numPixels;
        index++;
        if (index >= 255)
            break;
    }
    return method === 'min' ? index : 255 - index;
}
function normalize(imageData$$1, options = {}) {
    if (imageData$$1.colorspace !== types.Colorspace.Greyscale && imageData$$1.colorspace !== types.Colorspace.YCbCr) {
        imageData$$1 = imageData.ImageData.toColorspace(imageData$$1, types.Colorspace.YCbCr);
    }
    const { strength = 1, blackPointPercentage = 0.02, whitePointPercentage = 0.02, midpointNormalization = 0, } = options;
    const blackPoint = findClipPoint(imageData$$1, blackPointPercentage, 'min');
    const whitePoint = findClipPoint(imageData$$1, whitePointPercentage, 'max');
    const greyPoint = findClipPoint(imageData$$1, 0.5, 'min');
    const rawMultiplier = 255 / (whitePoint - blackPoint);
    const multiplier = 1 + (rawMultiplier - 1) * strength;
    const adjustedMidpoint = multiplier * (greyPoint - blackPoint);
    const deltaForMidpointToReach128 = 128 - adjustedMidpoint;
    for (let y = 0; y < imageData$$1.height; y++) {
        for (let x = 0; x < imageData$$1.width; x++) {
            const index = imageData.ImageData.indexFor(imageData$$1, x, y);
            let pixel = imageData$$1.data[index];
            // First we adjust the white and black point, i.e. the ends of the levels
            if (pixel <= blackPoint)
                pixel = 0;
            else if (pixel >= whitePoint)
                pixel = 255;
            else
                pixel = multiplier * (pixel - blackPoint);
            // Then we drag the middle of the curve closer to 128 without adjusting ends.
            // i.e. dragging the middle of the levels curve to the middle.
            if (midpointNormalization) {
                const distanceToMidpoint = Math.abs(adjustedMidpoint - pixel);
                const distanceFactor = (128 - distanceToMidpoint) / 128;
                pixel += midpointNormalization * deltaForMidpointToReach128 * distanceFactor;
            }
            imageData$$1.data[index] = imageData.ImageData.clip255(pixel);
        }
    }
    return imageData$$1;
}
exports.normalize = normalize;

});

unwrapExports(normalize_1);

var hash = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });




const DCT_COEFFICIENT = 1 / Math.sqrt(2);
function getDCTCoefficient(index) {
    return index === 0 ? DCT_COEFFICIENT : 1;
}
function hexToBinary(hex) {
    // TODO: update ES types to use padStart
    return parseInt(hex, 16).toString(2).padStart(64, '0');
}
function toHexString(binaryString) {
    return binaryString
        .match(/.{4}/gm)
        .map(s => parseInt(s, 2).toString(16))
        .join('');
}
exports.toHexString = toHexString;
function toBinaryString(arrayOrString) {
    if (typeof arrayOrString === 'string') {
        if (/^(0|1)+$/.test(arrayOrString))
            return arrayOrString;
        if (/^[a-f0-9]+$/.test(arrayOrString))
            return hexToBinary(arrayOrString);
        throw new Error(`Invalid conversion toBinaryString: ${arrayOrString}`);
    }
    return toBits(arrayOrString).join('');
}
exports.toBinaryString = toBinaryString;
function toBits(array) {
    const bits = [];
    for (let i = 0; i < array.length; i++) {
        const byte = array[i];
        for (let k = 7; k >= 0; k--) {
            bits.push((byte >> k) & 1); // tslint:disable-line
        }
    }
    return bits;
}
exports.toBits = toBits;
function computeDCT(imageData$$1, xOffset = 0, yOffset = 0) {
    const size = Math.min(imageData$$1.width, 32);
    const output = [];
    for (let v = 0; v < size; v++) {
        for (let u = 0; u < size; u++) {
            let value = 0;
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    const du = ((i + 1 / 2) / size) * u * Math.PI;
                    const dv = ((j + 1 / 2) / size) * v * Math.PI;
                    value += Math.cos(du) * Math.cos(dv) * imageData$$1.data[(j + yOffset) * size + i + xOffset];
                }
            }
            value *= (getDCTCoefficient(u) * getDCTCoefficient(v)) / 4;
            output[v * size + u] = value;
        }
    }
    return output;
}
exports.computeDCT = computeDCT;
function reduceDCT(dct, size = 8) {
    const originalSize = Math.sqrt(dct.length);
    const output = [];
    for (let j = 0; j < size; j++) {
        for (let i = 0; i < size; i++) {
            output[j * size + i] = dct[j * originalSize + i];
        }
    }
    return output;
}
exports.reduceDCT = reduceDCT;
function averageAndThreshold(input) {
    let sum = 0;
    for (let i = 1; i < input.length; i++) {
        sum += input[i];
    }
    const average = sum / (input.length - 1);
    const output = [];
    for (let i = 0; i < input.length; i++) {
        output[i] = input[i] > average ? 1 : 0;
    }
    return output.join('');
}
exports.averageAndThreshold = averageAndThreshold;
/**
 * Heavily based on the method described in http://www.hackerfactor.com/blog/index.php?/archives/432-Looks-Like-It.html
 */
function phash(imageData$$1, hashSize) {
    hashSize = hashSize || 64;
    if (!Number.isInteger(Math.sqrt(hashSize / 64))) {
        throw new Error('Hash size must be a square-multiple of 64');
    }
    const thumbnailWidth = (hashSize / 64) * 32;
    let thumbnail = imageData$$1;
    if (imageData$$1.width !== thumbnailWidth ||
        imageData$$1.height !== thumbnailWidth ||
        imageData$$1.colorspace !== types.Colorspace.Greyscale) {
        const colorThumbnail = resize.bilinear(imageData$$1, { width: thumbnailWidth, height: thumbnailWidth });
        thumbnail = imageData.ImageData.toGreyscale(colorThumbnail);
    }
    const hashes = [];
    const numHashesToCompute = hashSize / 64;
    const numHashesPerRow = Math.sqrt(numHashesToCompute);
    for (let i = 0; i < numHashesToCompute; i++) {
        const xOffset = (i % numHashesPerRow) * 32;
        const yOffset = Math.floor(i / numHashesPerRow) * 32;
        const fullDCT = computeDCT(thumbnail, xOffset, yOffset);
        const partialDCT = reduceDCT(fullDCT);
        hashes.push(averageAndThreshold(partialDCT));
    }
    return hashes.join('');
}
exports.phash = phash;
function lumaHash(imageData$$1, options) {
    const { hashSize = 256, lumaHashThreshold = 30 } = options || {};
    const thumbnailWidth = Math.sqrt(hashSize);
    if (!Number.isInteger(thumbnailWidth)) {
        throw new Error('Hash size must be a square');
    }
    let thumbnail = imageData$$1;
    if (imageData$$1.width !== thumbnailWidth ||
        imageData$$1.height !== thumbnailWidth ||
        imageData$$1.colorspace !== types.Colorspace.Greyscale) {
        const colorThumbnail = resize.bilinear(imageData$$1, { width: thumbnailWidth, height: thumbnailWidth });
        thumbnail = imageData.ImageData.toGreyscale(colorThumbnail);
    }
    thumbnail = normalize_1.normalize(thumbnail, { strength: 0.5 });
    const bits = [];
    for (let y = 0; y < thumbnailWidth; y++) {
        for (let x = 0; x < thumbnailWidth; x++) {
            bits.push(thumbnail.data[y * thumbnailWidth + x] >= lumaHashThreshold ? '1' : '0');
        }
    }
    return bits.join('');
}
exports.lumaHash = lumaHash;
function hammingDistance(hashA, hashB) {
    const stringA = toBinaryString(hashA);
    const stringB = toBinaryString(hashB);
    let distance = 0;
    for (let i = 0; i < stringA.length; i++) {
        if (stringA[i] !== stringB[i]) {
            distance++;
        }
    }
    return distance;
}
exports.hammingDistance = hammingDistance;
function subsetDistance(hashA, hashB) {
    const stringA = toBinaryString(hashA);
    const stringB = toBinaryString(hashB);
    let distanceA = 0;
    let distanceB = 0;
    let onA = 0;
    let onB = 0;
    for (let i = 0; i < stringA.length; i++) {
        const aIsOn = stringA[i] === '1';
        const bIsOn = stringB[i] === '1';
        if (aIsOn)
            onA++;
        if (bIsOn)
            onB++;
        if (aIsOn && !bIsOn)
            distanceA++;
        if (!aIsOn && bIsOn)
            distanceB++;
    }
    return Math.min(distanceA / onA, distanceB / onB);
}
exports.subsetDistance = subsetDistance;

});

unwrapExports(hash);

var empty = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

});

unwrapExports(empty);

var instrumentation = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let invocationId = 0;
exports.instrumentation = {
    onMethodStart: [],
    onMethodComplete: [],
    wrapMethod,
    wrapAllMethods(o) {
        // tslint:disable-next-line
        for (const name of Object.getOwnPropertyNames(o)) {
            if (typeof o[name] !== 'function')
                continue;
            o[name] = wrapMethod(name, o[name]);
        }
    },
};
function runMethods(id, name, args, hooks) {
    for (const fn of hooks) {
        fn({ invocationId: id, name, args });
    }
}
function wrapMethod(name, fn) {
    return function (...args) {
        invocationId++;
        runMethods(invocationId, name, args, exports.instrumentation.onMethodStart);
        let retVal = fn.apply(this, args);
        if (retVal && typeof retVal.then === 'function') {
            retVal = retVal
                .then((value) => {
                runMethods(invocationId, name, args, exports.instrumentation.onMethodComplete);
                return value;
            })
                .catch((err) => {
                runMethods(invocationId, name, args, exports.instrumentation.onMethodComplete);
                throw err;
            });
        }
        else {
            runMethods(invocationId, name, args, exports.instrumentation.onMethodComplete);
        }
        return retVal;
    };
}

});

unwrapExports(instrumentation);

var sharpness = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });


function computeAverage(items, from, to) {
    from = from || 0;
    to = Math.min(to || items.length, items.length);
    let sum = 0;
    for (let i = from; i < to; i++) {
        sum += items[i];
    }
    const numItems = to - from;
    if (numItems === 0)
        return 0;
    return sum / numItems;
}
exports.computeAverage = computeAverage;
function sharpness_(imageData$$1, options) {
    const defaultSubselect = { x: 0, y: 0, width: imageData$$1.width, height: imageData$$1.height };
    const { threshold = 20, subselect = defaultSubselect } = options || {};
    const maxX = subselect.x + subselect.width;
    const maxY = subselect.y + subselect.height;
    let edgePixelIntensities = [];
    for (let y = subselect.y; y < maxY; y++) {
        for (let x = subselect.x; x < maxX; x++) {
            const pixel = imageData.ImageData.valueFor(imageData$$1, x, y);
            if (pixel > threshold) {
                edgePixelIntensities.push(pixel);
            }
        }
    }
    edgePixelIntensities = edgePixelIntensities.sort((a, b) => a - b);
    const percentEdges = edgePixelIntensities.length / imageData$$1.data.length;
    const lowerQuartile = edgePixelIntensities[Math.floor(edgePixelIntensities.length / 4)];
    const median = edgePixelIntensities[Math.floor(edgePixelIntensities.length / 2)];
    const upperQuartile = edgePixelIntensities[Math.floor((edgePixelIntensities.length * 3) / 4)];
    const ventileBucketSize = Math.ceil(edgePixelIntensities.length / 20);
    const lowerVentileAverage = computeAverage(edgePixelIntensities, 0, ventileBucketSize);
    const average = computeAverage(edgePixelIntensities);
    const upperVentileAverage = computeAverage(edgePixelIntensities, edgePixelIntensities.length - ventileBucketSize);
    return {
        percentEdges,
        lowerQuartile,
        median,
        upperQuartile,
        lowerVentileAverage,
        average,
        upperVentileAverage,
    };
}
exports.sharpness = instrumentation.instrumentation.wrapMethod('computeSharpness', sharpness_);

});

unwrapExports(sharpness);

var histograms_1 = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function histograms(rawImageData, options) {
    const { buckets: numBuckets = 8 } = options || {};
    const imageData$$1 = imageData.ImageData.toHSL(rawImageData);
    const hueHistogram = [];
    const saturationHistogram = [];
    const lightnessHistogram = [];
    for (let i = 0; i < numBuckets; i++) {
        hueHistogram[i] = 0;
        saturationHistogram[i] = 0;
        lightnessHistogram[i] = 0;
    }
    const bucketSize = 256 / numBuckets;
    for (let x = 0; x < imageData$$1.width; x++) {
        for (let y = 0; y < imageData$$1.height; y++) {
            const index = imageData.ImageData.indexFor(imageData$$1, x, y);
            const hue = Math.round((imageData$$1.data[index] / 360) * 255);
            const saturation = imageData$$1.data[index + 1];
            const lightness = imageData$$1.data[index + 2];
            const saturationOutOf1 = saturation;
            const lightnessOutOf1 = lightness;
            const lightnessDistanceToHalf = Math.abs(lightnessOutOf1 - 0.5);
            const trueSaturationOutOf1 = Math.sqrt(saturationOutOf1 * (1 - lightnessDistanceToHalf));
            const trueSaturationBucket = Math.floor((trueSaturationOutOf1 * 255) / bucketSize);
            const hueBucket = Math.floor(hue / bucketSize);
            const lightnessBucket = Math.floor((lightness * 255) / bucketSize);
            hueHistogram[hueBucket] += trueSaturationOutOf1;
            saturationHistogram[trueSaturationBucket] += 1;
            lightnessHistogram[lightnessBucket] += 1;
        }
    }
    return {
        hue: hueHistogram.map(n => Math.round(n)),
        saturation: saturationHistogram,
        lightness: lightnessHistogram,
    };
}
exports.histograms = histograms;

});

unwrapExports(histograms_1);

var composition_1 = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });


function computeRuleOfThirds(imageData$$1, options) {
    const { ruleOfThirdsEdgeThreshold, ruleOfThirdsFalloffPoint } = options;
    let ruleOfThirdsScore = 0;
    const topThirdsLine = imageData$$1.height / 3;
    const bottomThirdsLine = (2 * imageData$$1.height) / 3;
    const leftThirdsLine = imageData$$1.width / 3;
    const rightThirdsLine = (2 * imageData$$1.width) / 3;
    const maxDistanceToLine = Math.min(topThirdsLine, leftThirdsLine);
    const maxDistanceToIntersection = Math.sqrt(Math.pow(topThirdsLine, 2) + Math.pow(leftThirdsLine, 2));
    let totalEdgePixels = 0;
    for (let x = 0; x < imageData$$1.width; x++) {
        for (let y = 0; y < imageData$$1.height; y++) {
            const edgeIntensity = imageData.ImageData.valueFor(imageData$$1, x, y);
            if (edgeIntensity <= ruleOfThirdsEdgeThreshold)
                continue;
            // The rule of thirds score...
            //   - greatly increases for edges that are close to intersection of rule of thirds lines
            //   - increases for edges that are close to the rule of thirds lines
            //   - decreases for edges that are far from the rule of thirds lines
            let distanceToXLine = Infinity;
            let distanceToYLine = Infinity;
            if (x < imageData$$1.width / 2) {
                if (y < imageData$$1.height / 2) {
                    // TOP LEFT QUADRANT
                    distanceToXLine = Math.abs(leftThirdsLine - x);
                    distanceToYLine = Math.abs(topThirdsLine - y);
                }
                else {
                    // BOTTOM LEFT QUADRANT
                    distanceToXLine = Math.abs(leftThirdsLine - x);
                    distanceToYLine = Math.abs(bottomThirdsLine - y);
                }
            }
            else {
                if (y < imageData$$1.height / 2) {
                    // TOP RIGHT QUADRANT
                    distanceToXLine = Math.abs(rightThirdsLine - x);
                    distanceToYLine = Math.abs(topThirdsLine - y);
                }
                else {
                    // BOTTOM RIGHT QUADRANT
                    distanceToXLine = Math.abs(rightThirdsLine - x);
                    distanceToYLine = Math.abs(bottomThirdsLine - y);
                }
            }
            const distanceToIntersection = Math.sqrt(Math.pow(distanceToXLine, 2) + Math.pow(distanceToYLine, 2));
            const distanceToClosestLine = Math.min(distanceToXLine, distanceToYLine);
            const intersectionBonus = ruleOfThirdsFalloffPoint - distanceToIntersection / maxDistanceToIntersection;
            const lineScore = ruleOfThirdsFalloffPoint - distanceToClosestLine / maxDistanceToLine;
            ruleOfThirdsScore += Math.max(intersectionBonus, 0) + lineScore;
            totalEdgePixels += 1;
        }
    }
    return ruleOfThirdsScore / totalEdgePixels;
}
function computeParallelism(imageData$$1, options, isHorizontal = false) {
    const { parallelismStreakThreshold, parallelismEdgeThreshold } = options;
    const iMax = isHorizontal ? imageData$$1.height : imageData$$1.width;
    const jMax = isHorizontal ? imageData$$1.width : imageData$$1.height;
    const streaks = [];
    for (let i = 0; i < iMax; i++) {
        let numConsecutiveEdgePixels = 0;
        const streaksInRowOrColumn = [];
        for (let j = 0; j < jMax; j++) {
            const x = isHorizontal ? j : i;
            const y = isHorizontal ? i : j;
            const index = imageData.ImageData.indexFor(imageData$$1, x, y);
            // We are looking for gradient angles in the opposite direction
            // i.e. for horizontal parallelism we want horizontal lines and vertical gradients (90°)
            // i.e. for vertical parallelism we want vertical lines and horizontal gradients (0°)
            const isCorrectEdgeAngle = isHorizontal
                ? imageData$$1.angles[index] === 90
                : imageData$$1.angles[index] === 0;
            const isStrongEnoughEdge = imageData$$1.data[index] > parallelismEdgeThreshold;
            if (isCorrectEdgeAngle && isStrongEnoughEdge) {
                // Our edge streak is continuing, increment our edge counter
                numConsecutiveEdgePixels++;
            }
            else if (numConsecutiveEdgePixels) {
                // Our edge streak is ending
                // Add the streak to our set of streaks if it was long enough
                if (numConsecutiveEdgePixels / jMax > parallelismStreakThreshold)
                    streaksInRowOrColumn.push(numConsecutiveEdgePixels);
                // Reset our edge counter
                numConsecutiveEdgePixels = 0;
            }
        }
        if (numConsecutiveEdgePixels)
            streaksInRowOrColumn.push(numConsecutiveEdgePixels);
        const streak = sharpness.computeAverage(streaksInRowOrColumn) / jMax;
        if (streak > parallelismStreakThreshold)
            streaks.push(streak);
    }
    return sharpness.computeAverage(streaks);
}
function composition(imageData$$1, options) {
    const sharpnessAnalysis = (options && options.sharpnessAnalysis) || sharpness.sharpness(imageData$$1);
    const defaultEdgeThreshold = Math.min(Math.max(sharpnessAnalysis.average, 32), 128);
    const optionsWithDefaults = Object.assign({ ruleOfThirdsEdgeThreshold: defaultEdgeThreshold, ruleOfThirdsFalloffPoint: 0.4, parallelismEdgeThreshold: defaultEdgeThreshold, parallelismStreakThreshold: 0.05, sharpnessAnalysis }, options);
    return {
        ruleOfThirds: computeRuleOfThirds(imageData$$1, optionsWithDefaults),
        horizontalParallelism: computeParallelism(imageData$$1, optionsWithDefaults, true),
        verticalParallelism: computeParallelism(imageData$$1, optionsWithDefaults),
    };
}
exports.composition = composition;

});

unwrapExports(composition_1);

var tags = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// From https://raw.githubusercontent.com/hMatoba/piexifjs/master/piexif.js
// and exif-parser on npm
// @ts-ignore - filled below
exports.tags = {};
exports.tagsByCode = {};
exports.xmpTags = {
    Rating: true,
    Label: true,
    MetadataDate: true,
    DCSubjectBagOfWords: true,
};
exports.panasonicConversionTags = {
    GPSDestBearingRef: 'ISO',
};
// TODO: fill in all IFDDataTypes with -1
const _tags = [
    // Disabled for overlap with GPS
    // ['InteropIndex', 1, -1, 1],
    // ['InteropVersion', 2, -1, 1],
    // ['ProcessingSoftware', 11, 2, 1],
    ['ImageWidth', 100, 4, 1],
    ['NewSubfileType', 254, 4, 1],
    ['SubfileType', 255, 3, 1],
    ['ImageWidth', 256, 4, 1],
    ['ImageLength', 257, 4, 1],
    ['BitsPerSample', 258, 3, 1],
    ['Compression', 259, 3, 1],
    ['PhotometricInterpretation', 262, 3, 1],
    ['Thresholding', 263, 3, 1],
    ['CellWidth', 264, 3, 1],
    ['CellLength', 265, 3, 1],
    ['FillOrder', 266, 3, 1],
    ['DocumentName', 269, 2, 1],
    ['ImageDescription', 270, 2, 1],
    ['Make', 271, 2, 1],
    ['Model', 272, 2, 1],
    ['StripOffsets', 273, 4, 1],
    ['Orientation', 274, 3, 1],
    ['SamplesPerPixel', 277, 3, 1],
    ['RowsPerStrip', 278, 4, 1],
    ['StripByteCounts', 279, 4, 1],
    ['MinSampleValue', 280, -1, 1],
    ['MaxSampleValue', 281, -1, 1],
    ['XResolution', 282, 5, 1],
    ['YResolution', 283, 5, 1],
    ['PlanarConfiguration', 284, 3, 1],
    ['PageName', 285, -1, 1],
    ['XPosition', 286, -1, 1],
    ['YPosition', 287, -1, 1],
    ['FreeOffsets', 288, -1, 1],
    ['FreeByteCounts', 289, -1, 1],
    ['GrayResponseUnit', 290, 3, 1],
    ['GrayResponseCurve', 291, 3, 1],
    ['T4Options', 292, 4, 1],
    ['T6Options', 293, 4, 1],
    ['ResolutionUnit', 296, 3, 1],
    ['PageNumber', 297, -1, 1],
    ['ColorResponseUnit', 300, -1, 1],
    ['TransferFunction', 301, 3, 1],
    ['Software', 305, 2, 1],
    ['ModifyDate', 306, 2, 1],
    ['Artist', 315, 2, 1],
    ['HostComputer', 316, 2, 1],
    ['Predictor', 317, 3, 1],
    ['WhitePoint', 318, 5, 1],
    ['PrimaryChromaticities', 319, 5, 1],
    ['ColorMap', 320, 3, 1],
    ['HalftoneHints', 321, 3, 1],
    ['TileWidth', 322, 3, 1],
    ['TileLength', 323, 3, 1],
    ['TileOffsets', 324, 3, 1],
    ['TileByteCounts', 325, 3, 1],
    ['BadFaxLines', 326, -1, 1],
    ['CleanFaxData', 327, -1, 1],
    ['ConsecutiveBadFaxLines', 328, -1, 1],
    ['SubIFD', 330, 4, 1],
    ['InkSet', 332, 3, 1],
    ['InkNames', 333, 2, 1],
    ['NumberOfInks', 334, 3, 1],
    ['DotRange', 336, 1, 1],
    ['TargetPrinter', 337, 2, 1],
    ['ExtraSamples', 338, 3, 1],
    ['SampleFormat', 339, 3, 1],
    ['SMinSampleValue', 340, 3, 1],
    ['SMaxSampleValue', 341, 3, 1],
    ['TransferRange', 342, 3, 1],
    ['ClipPath', 343, 1, 1],
    ['XClipPathUnits', 344, 4, 1],
    ['YClipPathUnits', 345, 4, 1],
    ['Indexed', 346, 3, 1],
    ['JPEGTables', 347, 7, 1],
    ['OPIProxy', 351, 3, 1],
    ['GlobalParametersIFD', 400, -1, 1],
    ['ProfileType', 401, -1, 1],
    ['FaxProfile', 402, -1, 1],
    ['CodingMethods', 403, -1, 1],
    ['VersionYear', 404, -1, 1],
    ['ModeNumber', 405, -1, 1],
    ['Decode', 433, -1, 1],
    ['DefaultImageColor', 434, -1, 1],
    ['T82Options', 435, -1, 1],
    ['JPEGProc', 512, 4, 1],
    ['JPEGInterchangeFormat', 513, 4, 1],
    ['JPEGInterchangeFormatLength', 514, 4, 1],
    ['JPEGRestartInterval', 515, 3, 1],
    ['JPEGLosslessPredictors', 517, 3, 1],
    ['JPEGPointTransforms', 518, 3, 1],
    ['JPEGQTables', 519, 4, 1],
    ['JPEGDCTables', 520, 4, 1],
    ['JPEGACTables', 521, 4, 1],
    ['YCbCrCoefficients', 529, 5, 1],
    ['YCbCrSubSampling', 530, 3, 1],
    ['YCbCrPositioning', 531, 3, 1],
    ['ReferenceBlackWhite', 532, 5, 1],
    ['StripRowCounts', 559, -1, 1],
    ['XMLPacket', 700, 1, 1],
    ['USPTOMiscellaneous', 999, -1, 1],
    ['RelatedImageFileFormat', 4096, -1, 1],
    ['RelatedImageWidth', 4097, -1, 1],
    ['RelatedImageHeight', 4098, -1, 1],
    ['Rating', 18246, 3, 1],
    ['XP_DIP_XML', 18247, -1, 1],
    ['StitchInfo', 18248, -1, 1],
    ['RatingPercent', 18249, 3, 1],
    ['ImageID', 32781, 2, 1],
    ['WangTag1', 32931, -1, 1],
    ['WangAnnotation', 32932, -1, 1],
    ['WangTag3', 32933, -1, 1],
    ['WangTag4', 32934, -1, 1],
    ['Matteing', 32995, -1, 1],
    ['DataType', 32996, -1, 1],
    ['ImageDepth', 32997, -1, 1],
    ['TileDepth', 32998, -1, 1],
    ['Model2', 33405, -1, 1],
    ['CFARepeatPatternDim', 33421, 3, 1],
    ['CFAPattern', 33422, 1, 1],
    ['BatteryLevel', 33423, 5, 1],
    ['KodakIFD', 33424, -1, 1],
    ['Copyright', 33432, 2, 1],
    ['ExposureTime', 33434, 5, 1],
    ['FNumber', 33437, 5, 1],
    ['MDFileTag', 33445, -1, 1],
    ['MDScalePixel', 33446, -1, 1],
    ['MDColorTable', 33447, -1, 1],
    ['MDLabName', 33448, -1, 1],
    ['MDSampleInfo', 33449, -1, 1],
    ['MDPrepDate', 33450, -1, 1],
    ['MDPrepTime', 33451, -1, 1],
    ['MDFileUnits', 33452, -1, 1],
    ['PixelScale', 33550, -1, 1],
    ['AdventScale', 33589, -1, 1],
    ['AdventRevision', 33590, -1, 1],
    ['UIC1Tag', 33628, -1, 1],
    ['UIC2Tag', 33629, -1, 1],
    ['UIC3Tag', 33630, -1, 1],
    ['UIC4Tag', 33631, -1, 1],
    ['IPTC-NAA', 33723, -1, 1],
    ['IntergraphPacketData', 33918, -1, 1],
    ['IntergraphFlagRegisters', 33919, -1, 1],
    ['IntergraphMatrix', 33920, -1, 1],
    ['INGRReserved', 33921, -1, 1],
    ['ModelTiePoint', 33922, -1, 1],
    ['Site', 34016, -1, 1],
    ['ColorSequence', 34017, -1, 1],
    ['IT8Header', 34018, -1, 1],
    ['RasterPadding', 34019, -1, 1],
    ['BitsPerRunLength', 34020, -1, 1],
    ['BitsPerExtendedRunLength', 34021, -1, 1],
    ['ColorTable', 34022, -1, 1],
    ['ImageColorIndicator', 34023, -1, 1],
    ['BackgroundColorIndicator', 34024, -1, 1],
    ['ImageColorValue', 34025, -1, 1],
    ['BackgroundColorValue', 34026, -1, 1],
    ['PixelIntensityRange', 34027, -1, 1],
    ['TransparencyIndicator', 34028, -1, 1],
    ['ColorCharacterization', 34029, -1, 1],
    ['HCUsage', 34030, -1, 1],
    ['TrapIndicator', 34031, -1, 1],
    ['CMYKEquivalent', 34032, -1, 1],
    ['SEMInfo', 34118, -1, 1],
    ['AFCP_IPTC', 34152, -1, 1],
    ['PixelMagicJBIGOptions', 34232, -1, 1],
    ['ModelTransform', 34264, -1, 1],
    ['WB_GRGBLevels', 34306, -1, 1],
    ['LeafData', 34310, -1, 1],
    ['PhotoshopSettings', 34377, 1, 1],
    ['EXIFTag', 34665, 4, 1],
    ['InterColorProfile', 34675, 7, 1],
    ['TIFF_FXExtensions', 34687, -1, 1],
    ['MultiProfiles', 34688, -1, 1],
    ['SharedData', 34689, -1, 1],
    ['T88Options', 34690, -1, 1],
    ['ImageLayer', 34732, -1, 1],
    ['GeoTiffDirectory', 34735, -1, 1],
    ['GeoTiffDoubleParams', 34736, -1, 1],
    ['GeoTiffAsciiParams', 34737, -1, 1],
    ['ExposureProgram', 34850, -1, 1],
    ['SpectralSensitivity', 34852, -1, 1],
    ['GPSTag', 34853, 4, 1],
    ['ISO', 34855, 4, 1],
    ['Opto-ElectricConvFactor', 34856, -1, 1],
    ['Interlace', 34857, 3, 1],
    ['TimeZoneOffset', 34858, 4, 1],
    ['SelfTimerMode', 34859, 3, 1],
    ['SensitivityType', 34864, -1, 1],
    ['StandardOutputSensitivity', 34865, -1, 1],
    ['RecommendedExposureIndex', 34866, -1, 1],
    ['ISOSpeed', 34867, -1, 1],
    ['ISOSpeedLatitudeyyy', 34868, -1, 1],
    ['ISOSpeedLatitudezzz', 34869, -1, 1],
    ['FaxRecvParams', 34908, -1, 1],
    ['FaxSubAddress', 34909, -1, 1],
    ['FaxRecvTime', 34910, -1, 1],
    ['LeafSubIFD', 34954, -1, 1],
    ['EXIFVersion', 36864, -1, 1],
    ['DateTimeOriginal', 36867, -1, 1],
    ['CreateDate', 36868, -1, 1],
    ['ComponentsConfiguration', 37121, -1, 1],
    ['CompressedBitsPerPixel', 37122, -1, 1],
    ['ShutterSpeedValue', 37377, -1, 1],
    ['ApertureValue', 37378, -1, 1],
    ['BrightnessValue', 37379, -1, 1],
    ['ExposureCompensation', 37380, -1, 1],
    ['MaxApertureValue', 37381, -1, 1],
    ['SubjectDistance', 37382, -1, 1],
    ['MeteringMode', 37383, -1, 1],
    ['LightSource', 37384, -1, 1],
    ['Flash', 37385, -1, 1],
    ['FocalLength', 37386, -1, 1],
    ['FlashEnergy', 37387, 5, 1],
    ['SpatialFrequencyResponse', 37388, 7, 1],
    ['Noise', 37389, 7, 1],
    ['FocalPlaneXResolution', 37390, 5, 1],
    ['FocalPlaneYResolution', 37391, 5, 1],
    ['FocalPlaneResolutionUnit', 37392, 3, 1],
    ['ImageNumber', 37393, 4, 1],
    ['SecurityClassification', 37394, 2, 1],
    ['ImageHistory', 37395, 2, 1],
    ['SubjectArea', 37396, -1, 1],
    ['ExposureIndex', 37397, 5, 1],
    ['TIFFEPStandardID', 37398, 1, 1],
    ['SensingMethod', 37399, 3, 1],
    ['CIP3DataFile', 37434, -1, 1],
    ['CIP3Sheet', 37435, -1, 1],
    ['CIP3Side', 37436, -1, 1],
    ['StoNits', 37439, -1, 1],
    ['MakerNote', 37500, -1, 1],
    ['UserComment', 37510, -1, 1],
    ['SubSecTime', 37520, -1, 1],
    ['SubSecTimeOriginal', 37521, -1, 1],
    ['SubSecTimeDigitized', 37522, -1, 1],
    ['MSDocumentText', 37679, -1, 1],
    ['MSPropertySetStorage', 37680, -1, 1],
    ['MSDocumentTextPosition', 37681, -1, 1],
    ['ImageSourceData', 37724, -1, 1],
    ['XPTitle', 40091, 1, 1],
    ['XPComment', 40092, 1, 1],
    ['XPAuthor', 40093, 1, 1],
    ['XPKeywords', 40094, 1, 1],
    ['XPSubject', 40095, 1, 1],
    ['FlashpixVersion', 40960, -1, 1],
    ['ColorSpace', 40961, -1, 1],
    ['EXIFImageWidth', 40962, -1, 1],
    ['EXIFImageHeight', 40963, -1, 1],
    ['RelatedSoundFile', 40964, -1, 1],
    ['InteropOffset', 40965, -1, 1],
    ['SubjectLocation', 41492, -1, 1],
    ['TIFF-EPStandardID', 41494, -1, 1],
    ['FileSource', 41728, -1, 1],
    ['SceneType', 41729, -1, 1],
    ['CustomRendered', 41985, -1, 1],
    ['ExposureMode', 41986, -1, 1],
    ['WhiteBalance', 41987, -1, 1],
    ['DigitalZoomRatio', 41988, -1, 1],
    ['FocalLengthIn35mmFormat', 41989, -1, 1],
    ['SceneCaptureType', 41990, -1, 1],
    ['GainControl', 41991, -1, 1],
    ['Contrast', 41992, -1, 1],
    ['Saturation', 41993, -1, 1],
    ['Sharpness', 41994, -1, 1],
    ['DeviceSettingDescription', 41995, -1, 1],
    ['SubjectDistanceRange', 41996, -1, 1],
    ['ImageUniqueID', 42016, -1, 1],
    ['OwnerName', 42032, -1, 1],
    ['SerialNumber', 42033, -1, 1],
    ['LensMake', 42035, -1, 1],
    ['LensModel', 42036, -1, 1],
    ['LensSerialNumber', 42037, -1, 1],
    ['GDALMetadata', 42112, -1, 1],
    ['GDALNoData', 42113, -1, 1],
    ['Gamma', 42240, -1, 1],
    ['ExpandSoftware', 44992, -1, 1],
    ['ExpandLens', 44993, -1, 1],
    ['ExpandFilm', 44994, -1, 1],
    ['ExpandFilterLens', 44995, -1, 1],
    ['ExpandScanner', 44996, -1, 1],
    ['ExpandFlashLamp', 44997, -1, 1],
    ['PixelFormat', 48129, -1, 1],
    ['Transformation', 48130, -1, 1],
    ['Uncompressed', 48131, -1, 1],
    ['ImageType', 48132, -1, 1],
    // ['ImageHeight', 48257, -1, 1],
    ['WidthResolution', 48258, -1, 1],
    ['HeightResolution', 48259, -1, 1],
    ['ImageOffset', 48320, -1, 1],
    ['ImageByteCount', 48321, -1, 1],
    ['AlphaOffset', 48322, -1, 1],
    ['AlphaByteCount', 48323, -1, 1],
    ['ImageDataDiscard', 48324, -1, 1],
    ['AlphaDataDiscard', 48325, -1, 1],
    ['OceScanjobDesc', 50215, -1, 1],
    ['OceApplicationSelector', 50216, -1, 1],
    ['OceIDNumber', 50217, -1, 1],
    ['OceImageLogic', 50218, -1, 1],
    ['Annotations', 50255, -1, 1],
    ['PrintImageMatching', 50341, 7, 1],
    ['USPTOOriginalContentType', 50560, -1, 1],
    ['DNGVersion', 50706, 1, 1],
    ['DNGBackwardVersion', 50707, 1, 1],
    ['UniqueCameraModel', 50708, 2, 1],
    ['LocalizedCameraModel', 50709, 1, 1],
    ['CFAPlaneColor', 50710, 1, 1],
    ['CFALayout', 50711, 3, 1],
    ['LinearizationTable', 50712, 3, 1],
    ['BlackLevelRepeatDim', 50713, 3, 1],
    ['BlackLevel', 50714, 5, 1],
    ['BlackLevelDeltaH', 50715, 10, 1],
    ['BlackLevelDeltaV', 50716, 10, 1],
    ['WhiteLevel', 50717, 3, 1],
    ['DefaultScale', 50718, 5, 1],
    ['DefaultCropOrigin', 50719, 3, 1],
    ['DefaultCropSize', 50720, 3, 1],
    ['ColorMatrix1', 50721, 10, 1],
    ['ColorMatrix2', 50722, 10, 1],
    ['CameraCalibration1', 50723, 10, 1],
    ['CameraCalibration2', 50724, 10, 1],
    ['ReductionMatrix1', 50725, 10, 1],
    ['ReductionMatrix2', 50726, 10, 1],
    ['AnalogBalance', 50727, 5, 1],
    ['AsShotNeutral', 50728, 3, 1],
    ['AsShotWhiteXY', 50729, 5, 1],
    ['BaselineExposure', 50730, 10, 1],
    ['BaselineNoise', 50731, 5, 1],
    ['BaselineSharpness', 50732, 5, 1],
    ['BayerGreenSplit', 50733, 4, 1],
    ['LinearResponseLimit', 50734, 5, 1],
    ['CameraSerialNumber', 50735, 2, 1],
    ['LensInfo', 50736, 5, 1],
    ['ChromaBlurRadius', 50737, 5, 1],
    ['AntiAliasStrength', 50738, 5, 1],
    ['ShadowScale', 50739, 10, 1],
    ['DNGPrivateData', 50740, 1, 1],
    ['MakerNoteSafety', 50741, 3, 1],
    ['RawImageSegmentation', 50752, -1, 1],
    ['CalibrationIlluminant1', 50778, 3, 1],
    ['CalibrationIlluminant2', 50779, 3, 1],
    ['BestQualityScale', 50780, 5, 1],
    ['RawDataUniqueID', 50781, 1, 1],
    ['AliasLayerMetadata', 50784, -1, 1],
    ['OriginalRawFileName', 50827, 1, 1],
    ['OriginalRawFileData', 50828, 7, 1],
    ['ActiveArea', 50829, 3, 1],
    ['MaskedAreas', 50830, 3, 1],
    ['AsShotICCProfile', 50831, 7, 1],
    ['AsShotPreProfileMatrix', 50832, 10, 1],
    ['CurrentICCProfile', 50833, 7, 1],
    ['CurrentPreProfileMatrix', 50834, 10, 1],
    ['ColorimetricReference', 50879, 3, 1],
    ['PanasonicTitle', 50898, -1, 1],
    ['PanasonicTitle2', 50899, -1, 1],
    ['CameraCalibrationSignature', 50931, 1, 1],
    ['ProfileCalibrationSignature', 50932, 1, 1],
    ['ProfileIFD', 50933, -1, 1],
    ['AsShotProfileName', 50934, 1, 1],
    ['NoiseReductionApplied', 50935, 5, 1],
    ['ProfileName', 50936, 1, 1],
    ['ProfileHueSatMapDims', 50937, 4, 1],
    ['ProfileHueSatMapData1', 50938, 0, 1],
    ['ProfileHueSatMapData2', 50939, 0, 1],
    ['ProfileToneCurve', 50940, 0, 1],
    ['ProfileEmbedPolicy', 50941, 4, 1],
    ['ProfileCopyright', 50942, 1, 1],
    ['ForwardMatrix1', 50964, 10, 1],
    ['ForwardMatrix2', 50965, 10, 1],
    ['PreviewApplicationName', 50966, 1, 1],
    ['PreviewApplicationVersion', 50967, 1, 1],
    ['PreviewSettingsName', 50968, 1, 1],
    ['PreviewSettingsDigest', 50969, 1, 1],
    ['PreviewColorSpace', 50970, 4, 1],
    ['PreviewDateTime', 50971, 2, 1],
    ['RawImageDigest', 50972, 7, 1],
    ['OriginalRawFileDigest', 50973, 7, 1],
    ['SubTileBlockSize', 50974, 4, 1],
    ['RowInterleaveFactor', 50975, 4, 1],
    ['ProfileLookTableDims', 50981, 4, 1],
    ['ProfileLookTableData', 50982, 0, 1],
    ['OpcodeList1', 51008, 7, 1],
    ['OpcodeList2', 51009, 7, 1],
    ['OpcodeList3', 51022, 7, 1],
    ['NoiseProfile', 51041, -1, 1],
    ['TimeCodes', 51043, -1, 1],
    ['FrameRate', 51044, -1, 1],
    ['TStop', 51058, -1, 1],
    ['ReelName', 51081, -1, 1],
    ['OriginalDefaultFinalSize', 51089, -1, 1],
    ['OriginalBestQualitySize', 51090, -1, 1],
    ['OriginalDefaultCropSize', 51091, -1, 1],
    ['CameraLabel', 51105, -1, 1],
    ['ProfileHueSatMapEncoding', 51107, -1, 1],
    ['ProfileLookTableEncoding', 51108, -1, 1],
    ['BaselineExposureOffset', 51109, -1, 1],
    ['DefaultBlackRender', 51110, -1, 1],
    ['NewRawImageDigest', 51111, -1, 1],
    ['RawToPreviewGain', 51112, -1, 1],
    ['DefaultUserCrop', 51125, -1, 1],
    ['Padding', 59932, -1, 1],
    ['OffsetSchema', 59933, -1, 1],
    ['OwnerName', 65000, -1, 1],
    ['SerialNumber', 65001, -1, 1],
    ['Lens', 65002, -1, 1],
    ['KDC_IFD', 65024, -1, 1],
    ['RawFile', 65100, -1, 1],
    ['Converter', 65101, -1, 1],
    ['WhiteBalance', 65102, -1, 1],
    ['Exposure', 65105, -1, 1],
    ['Shadows', 65106, -1, 1],
    ['Brightness', 65107, -1, 1],
    ['Contrast', 65108, -1, 1],
    ['Saturation', 65109, -1, 1],
    ['Sharpness', 65110, -1, 1],
    ['Smoothness', 65111, -1, 1],
    ['MoireFilter', 65112, -1, 1],
    // GPS Tags
    ['GPSVersionID', 0, 1, 2],
    ['GPSLatitudeRef', 1, 2, 2],
    ['GPSLatitude', 2, 5, 2],
    ['GPSLongitudeRef', 3, 2, 2],
    ['GPSLongitude', 4, 5, 2],
    ['GPSAltitudeRef', 5, 1, 2],
    ['GPSAltitude', 6, 5, 2],
    ['GPSTimeStamp', 7, 5, 2],
    ['GPSSatellites', 8, 2, 2],
    ['GPSStatus', 9, 2, 2],
    ['GPSMeasureMode', 10, 2, 2],
    ['GPSDOP', 11, 5, 2],
    ['GPSSpeedRef', 12, 2, 2],
    ['GPSSpeed', 13, 5, 2],
    ['GPSTrackRef', 14, 2, 2],
    ['GPSTrack', 15, 5, 2],
    ['GPSImgDirectionRef', 16, 2, 2],
    ['GPSImgDirection', 17, 5, 2],
    ['GPSMapDatum', 18, 2, 2],
    ['GPSDestLatitudeRef', 19, 2, 2],
    ['GPSDestLatitude', 20, 5, 2],
    ['GPSDestLongitudeRef', 21, 2, 2],
    ['GPSDestLongitude', 22, 5, 2],
    ['GPSDestBearingRef', 23, 2, 2],
    ['GPSDestBearing', 24, 5, 2],
    ['GPSDestDistanceRef', 25, 2, 2],
    ['GPSDestDistance', 26, 5, 2],
    ['GPSProcessingMethod', 27, 7, 2],
    ['GPSAreaInformation', 28, 7, 2],
    ['GPSDateStamp', 29, 2, 2],
    ['GPSDifferential', 30, 3, 2],
    ['GPSHPositioningError', 31, 5, 2],
];
for (const [name, code, dataType, group] of _tags) {
    if (exports.tagsByCode[code])
        throw new Error(`Duplicate code (${code}): ${name}`);
    const defn = { name, code, dataType, group };
    exports.tags[name] = defn;
    exports.tagsByCode[code] = defn;
}
function getFriendlyName(code) {
    return (exports.tagsByCode[code] && exports.tagsByCode[code].name) || 'Unknown';
}
exports.getFriendlyName = getFriendlyName;

});

unwrapExports(tags);

var types$2 = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Endian;
(function (Endian) {
    Endian[Endian["Big"] = 0] = "Big";
    Endian[Endian["Little"] = 1] = "Little";
})(Endian = exports.Endian || (exports.Endian = {}));
exports.BIG_ENDIAN_MARKER = 0x4d4d;
exports.LITTLE_ENDIAN_MARKER = 0x4949;
var IFDTag;
(function (IFDTag) {
    IFDTag[IFDTag["JpgFromRaw"] = 46] = "JpgFromRaw";
    IFDTag[IFDTag["Compression"] = 259] = "Compression";
    IFDTag[IFDTag["StripOffsets"] = 273] = "StripOffsets";
    IFDTag[IFDTag["SamplesPerPixel"] = 277] = "SamplesPerPixel";
    IFDTag[IFDTag["RowsPerStrip"] = 278] = "RowsPerStrip";
    IFDTag[IFDTag["StripByteCounts"] = 279] = "StripByteCounts";
    IFDTag[IFDTag["XResolution"] = 282] = "XResolution";
    IFDTag[IFDTag["YResolution"] = 283] = "YResolution";
    IFDTag[IFDTag["SubIFD"] = 330] = "SubIFD";
    IFDTag[IFDTag["ThumbnailOffset"] = 513] = "ThumbnailOffset";
    IFDTag[IFDTag["ThumbnailLength"] = 514] = "ThumbnailLength";
    IFDTag[IFDTag["EXIFOffset"] = 34665] = "EXIFOffset";
    IFDTag[IFDTag["PanasonicJPEGEnd"] = 280] = "PanasonicJPEGEnd";
    IFDTag[IFDTag["ISO"] = 34855] = "ISO";
    IFDTag[IFDTag["MakerNote"] = 37500] = "MakerNote";
})(IFDTag = exports.IFDTag || (exports.IFDTag = {}));
var IFDGroup;
(function (IFDGroup) {
    IFDGroup[IFDGroup["Image"] = 0] = "Image";
    IFDGroup[IFDGroup["EXIF"] = 1] = "EXIF";
    IFDGroup[IFDGroup["GPS"] = 2] = "GPS";
})(IFDGroup = exports.IFDGroup || (exports.IFDGroup = {}));
var IFDDataType;
(function (IFDDataType) {
    IFDDataType[IFDDataType["Unknown"] = 0] = "Unknown";
    IFDDataType[IFDDataType["Byte"] = 1] = "Byte";
    IFDDataType[IFDDataType["String"] = 2] = "String";
    IFDDataType[IFDDataType["Short"] = 3] = "Short";
    IFDDataType[IFDDataType["Long"] = 4] = "Long";
    IFDDataType[IFDDataType["Rational"] = 5] = "Rational";
    IFDDataType[IFDDataType["SignedByte"] = 6] = "SignedByte";
    IFDDataType[IFDDataType["Undefined"] = 7] = "Undefined";
    IFDDataType[IFDDataType["SignedShort"] = 8] = "SignedShort";
    IFDDataType[IFDDataType["SignedLong"] = 9] = "SignedLong";
    IFDDataType[IFDDataType["SignedRational"] = 10] = "SignedRational";
    // From https://www.media.mit.edu/pia/Research/deepview/exif.html
    IFDDataType[IFDDataType["Float"] = 11] = "Float";
    IFDDataType[IFDDataType["Double"] = 12] = "Double";
})(IFDDataType = exports.IFDDataType || (exports.IFDDataType = {}));
function getDataTypeSize(dataType, name) {
    switch (dataType) {
        case IFDDataType.Unknown: // ???
        case IFDDataType.Undefined: // ???, was previously 4 but definitely not true of Olympus
        case IFDDataType.Byte: // byte
        case IFDDataType.String: // ASCII-string
        case IFDDataType.SignedByte:
            return 1;
        case IFDDataType.Short: // word
        case IFDDataType.SignedShort:
            return 2;
        case IFDDataType.Long: // double word
        case IFDDataType.SignedLong:
        case IFDDataType.Float:
            return 4;
        case IFDDataType.Rational: // rational number
        case IFDDataType.SignedRational:
        case IFDDataType.Double:
            return 8;
        default: {
            const nameComponent = name ? ` for name (${name})` : '';
            throw new TypeError(`unknown datatype${nameComponent}: ${dataType}`);
        }
    }
}
exports.getDataTypeSize = getDataTypeSize;

});

unwrapExports(types$2);

// tslint:disable
var debug = function createNoopFunc(file) {
    return function () { };
};

var log = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
 // tslint:disable-line
function createLogger(namespace) {
    namespace = `exif:${namespace}`;
    const log = debug(namespace);
    const verbose = debug(`${namespace}:verbose`);
    log.verbose = verbose;
    return log;
}
exports.createLogger = createLogger;

});

unwrapExports(log);

var writer = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

class Writer {
    constructor(buffer, options = {}) {
        this._bytes = [];
        this._position = 0;
        this._endianness = types$2.Endian.Big;
        if (buffer) {
            if (options.dangerouslyAvoidCopy)
                this._bytes = buffer;
            else
                this.writeBuffer(buffer);
        }
    }
    getPosition() {
        return this._position;
    }
    setEndianess(endian) {
        this._endianness = endian;
    }
    write(data, length = 1) {
        if (typeof data === 'string') {
            for (let i = 0; i < data.length; i++) {
                this._bytes[this._position] = data.charCodeAt(i);
                this._position++;
            }
            this._bytes[this._position] = 0;
            this._position++;
            return;
        }
        if (data > Math.pow(256, length))
            throw new Error(`Cannot fit ${data} into ${length} bytes`);
        if (length > 4)
            throw new Error('Cannot write more than 4 bytes at once');
        if (this._endianness === types$2.Endian.Little) {
            this._writeLE(data, length);
        }
        else {
            this._writeBE(data, length);
        }
    }
    _writeLE(data, length) {
        for (let i = 0; i < length; i++) {
            this._bytes[this._position] = 0xff & (data >> (i * 8));
            this._position++;
        }
    }
    _writeBE(data, length) {
        for (let i = 0; i < length; i++) {
            this._bytes[this._position] = 0xff & (data >> (8 * (length - i - 1)));
            this._position++;
        }
    }
    writeBuffer(buffer) {
        for (let i = 0; i < buffer.length; i++) {
            this._bytes[this._position] = buffer[i];
            this._position++;
        }
    }
    skip(diff) {
        this._position = this._position + diff;
    }
    seek(position) {
        this._position = position;
    }
    toBuffer() {
        return new Uint8Array(this._bytes);
    }
    static spliceBufferRange(buffer, replacement, start, end) {
        const preamble = buffer.slice(0, start);
        const postamble = buffer.slice(end);
        return Buffer.concat([preamble, replacement, postamble]);
    }
}
exports.Writer = Writer;

});

unwrapExports(writer);

var reader = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

class Reader {
    constructor(_buffer, _position = 0, _endianness = types$2.Endian.Big) {
        this._buffer = _buffer;
        this._position = _position;
        this._endianness = _endianness;
    }
    getBuffer() {
        return this._buffer;
    }
    hasNext() {
        return this._position < this._buffer.length;
    }
    getPosition() {
        return this._position;
    }
    getEndianess() {
        return this._endianness;
    }
    setEndianess(endian) {
        this._endianness = endian;
    }
    read(length) {
        const value = this._endianness === types$2.Endian.Little ? this._readLE(length) : this._readBE(length);
        this._position += length;
        return value;
    }
    _readLE(length) {
        let value = 0;
        for (let i = length - 1; i >= 0; i--) {
            value = (value << 8) | this._buffer[this._position + i];
        }
        return value;
    }
    _readBE(length) {
        let value = 0;
        for (let i = 0; i < length; i++) {
            value = (value << 8) | this._buffer[this._position + i];
        }
        return value;
    }
    readAsString(length) {
        return this.readAsBuffer(length).toString();
    }
    readAsHex(length) {
        const maxChunkLength = 2;
        const chunks = [];
        for (let i = 0; i < length; i += maxChunkLength) {
            const chunkLength = Math.min(maxChunkLength, length - i);
            let chunk = this.read(chunkLength).toString(16);
            while (chunk.length < chunkLength * 2)
                chunk = `0${chunk}`;
            chunks.push(chunk);
        }
        return this._endianness === types$2.Endian.Big ? chunks.join('') : chunks.reverse().join('');
    }
    readAsBuffer(length) {
        const value = this._buffer.slice(this._position, this._position + length);
        this._position += length;
        return value;
    }
    readAsReader(length) {
        return new Reader(this.readAsBuffer(length), 0, this._endianness);
    }
    skip(diff) {
        this._position = this._position + diff;
    }
    seek(position) {
        this._position = position;
    }
    use(func) {
        const position = this._position;
        const value = func();
        this._position = position;
        return value;
    }
}
exports.Reader = Reader;

});

unwrapExports(reader);

var ifdEntry = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });





const log$$1 = log.createLogger('ifd-entry');
class IFDEntry {
    constructor(startOffset, tag, dataType, length, dataReader) {
        this.startOffset = startOffset;
        this.tag = tag;
        this.dataType = dataType;
        this.length = length;
        this.dataReader = dataReader;
    }
    get lengthInBytes() {
        return this.length * types$2.getDataTypeSize(this.dataType, this.tag);
    }
    get friendlyTagName() {
        return tags.getFriendlyName(this.tag);
    }
    getValue(reader$$1) {
        const entryReader = this.getReader(reader$$1);
        switch (this.dataType) {
            // TODO: verify signed versions
            case types$2.IFDDataType.Byte:
            case types$2.IFDDataType.Short:
            case types$2.IFDDataType.Long:
            case types$2.IFDDataType.SignedByte:
            case types$2.IFDDataType.SignedShort:
            case types$2.IFDDataType.SignedLong:
                return entryReader.read(this.lengthInBytes);
            case types$2.IFDDataType.Rational:
            case types$2.IFDDataType.SignedRational:
                return entryReader.read(4) / entryReader.read(4);
            case types$2.IFDDataType.String:
                const chars = [];
                while (entryReader.hasNext()) {
                    const charCode = entryReader.read(1);
                    if (charCode === 0) {
                        break;
                    }
                    chars.push(String.fromCharCode(charCode));
                }
                return chars.join('');
            case types$2.IFDDataType.Float:
                return new DataView(entryReader.readAsBuffer(4).buffer).getFloat32(0);
            case types$2.IFDDataType.Double:
                return new DataView(entryReader.readAsBuffer(8).buffer).getFloat64(0);
            case types$2.IFDDataType.Undefined:
            case types$2.IFDDataType.Unknown:
                return entryReader.getBuffer();
            default:
                throw new TypeError(`Unsupported data type (${this.dataType}) for tag (${this.tag})`);
        }
    }
    getReader(reader$$1) {
        this.dataReader.seek(0);
        if (this.lengthInBytes <= 4) {
            return this.dataReader;
        }
        if (!reader$$1) {
            throw new Error('Cannot read value of IFD entry without a reader');
        }
        const offset = this.dataReader.read(4);
        return reader$$1.use(() => {
            reader$$1.seek(offset);
            return reader$$1.readAsReader(this.lengthInBytes);
        });
    }
    static read(reader$$1) {
        const startOffset = reader$$1.getPosition();
        const tag = reader$$1.read(2);
        const dataType = reader$$1.read(2);
        const length = reader$$1.read(4);
        const dataReader = reader$$1.readAsReader(4);
        log$$1.verbose(`read tag ${tags.getFriendlyName(tag)} (tag: ${tag}, length: ${length})`);
        return new IFDEntry(startOffset, tag, dataType, length, dataReader);
    }
    static mutate(buffer, simpleEntry, data, endianness) {
        if (simpleEntry.dataType !== types$2.IFDDataType.String)
            throw new Error('Can only mutate strings');
        // Always ensure the string ends with null terminator
        if (data[data.length - 1] !== 0)
            data = Buffer.concat([data, Buffer.from([0])]);
        // Read the real IFD so we have something better to work with
        const reader$$1 = new reader.Reader(buffer, simpleEntry.startOffset);
        reader$$1.setEndianess(endianness);
        const entry = IFDEntry.read(reader$$1);
        if (entry.lengthInBytes <= 4)
            throw new Error('Can only change strings of length >3');
        // Replace the length with the new length
        const newLength = data.length;
        const writer$$1 = new writer.Writer(buffer, { dangerouslyAvoidCopy: true });
        writer$$1.setEndianess(endianness);
        writer$$1.seek(entry.startOffset + 4);
        writer$$1.write(newLength, 4);
        // Replace the data itself
        entry.dataReader.seek(0);
        const dataOffset = entry.dataReader.read(4);
        return writer.Writer.spliceBufferRange(buffer, data, dataOffset, dataOffset + entry.lengthInBytes);
    }
}
exports.IFDEntry = IFDEntry;

});

unwrapExports(ifdEntry);

var ifd = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });


class IFD {
    constructor(offset, entries, nextIFDOffset) {
        this.entries = entries;
        this.nextIFDOffset = nextIFDOffset;
        this.offset = offset.offset;
        this.parent = offset.parent;
        this.children = [];
        if (offset.parent) {
            offset.parent.children.push(this);
        }
    }
    get isEXIF() {
        if (!this.parent) {
            return false;
        }
        const exifEntry = this.parent.entries.find(entry => entry.tag === types$2.IFDTag.EXIFOffset);
        const exifOffset = exifEntry && exifEntry.getValue();
        return exifOffset === this.offset;
    }
    get isThumbnail() {
        if (!this.parent) {
            return false;
        }
        return this.parent.entries.some(entry => entry.tag === types$2.IFDTag.ThumbnailOffset);
    }
    getSubIFDOffsets(reader) {
        const offsets = [];
        this.entries.forEach(entry => {
            if (entry.tag !== types$2.IFDTag.SubIFD && entry.tag !== types$2.IFDTag.EXIFOffset) {
                return;
            }
            const entryReader = entry.getReader(reader);
            while (entryReader.hasNext()) {
                offsets.push(entryReader.read(4));
            }
        });
        return offsets;
    }
    static read(reader, offset) {
        reader.seek(offset.offset);
        const numEntries = reader.read(2);
        const entries = [];
        for (let i = 0; i < numEntries; i++) {
            entries.push(ifdEntry.IFDEntry.read(reader));
        }
        const nextIFDOffset = reader.read(4);
        return new IFD(offset, entries, nextIFDOffset);
    }
}
exports.IFD = IFD;

});

unwrapExports(ifd);

var tiffEncoder = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });




const log$$1 = log.createLogger('encoder');
const DISALLOWED_TAGS = new Set([
    types$2.IFDTag.SubIFD,
    types$2.IFDTag.EXIFOffset,
    types$2.IFDTag.StripOffsets,
    types$2.IFDTag.StripByteCounts,
    types$2.IFDTag.ThumbnailOffset,
    types$2.IFDTag.ThumbnailLength,
    types$2.IFDTag.RowsPerStrip,
]);
const ALLOWLIST_TAGS = new Set([
    // These are what we really need
    tags.tags.ImageWidth.code,
    tags.tags.ImageLength.code,
    tags.tags.Orientation.code,
    tags.tags.ISO.code,
    // These were added for backcompat, but might not actually work.
    tags.tags.Compression.code,
    tags.tags.ResolutionUnit.code,
    tags.tags.PhotometricInterpretation.code,
    tags.tags.SamplesPerPixel.code,
    tags.tags.PlanarConfiguration.code,
    tags.tags.MeteringMode.code,
    tags.tags.YCbCrPositioning.code,
    tags.tags.BitsPerSample.code,
    tags.tags.NewSubfileType.code,
    tags.tags.AsShotNeutral.code,
    tags.tags.CalibrationIlluminant1.code,
    tags.tags.CalibrationIlluminant2.code,
    tags.tags.WhiteLevel.code,
    tags.tags.TileWidth.code,
    tags.tags.TileLength.code,
    tags.tags.GPSTag.code,
]);
class TIFFEncoder {
    static isSupportedEntry(tag, value) {
        if (!tag)
            return false;
        if (tag.group !== types$2.IFDGroup.EXIF)
            return false;
        if (DISALLOWED_TAGS.has(tag.code))
            return false;
        if (!ALLOWLIST_TAGS.has(tag.code))
            return false;
        if (typeof value !== 'number')
            return false;
        if (tag.dataType === types$2.IFDDataType.Short)
            return value < Math.pow(2, 16);
        if (tag.dataType === types$2.IFDDataType.Long)
            return value < Math.pow(2, 32);
        return false;
    }
    static encode(metadata) {
        const writer$$1 = new writer.Writer();
        // write the big endian signal
        writer$$1.write(types$2.BIG_ENDIAN_MARKER, 2);
        // write the magic TIFF number
        writer$$1.write(42, 2);
        // write the offset of the first IFD
        writer$$1.write(2 + 2 + 4, 4);
        // TODO: strip out SubIFD/GPSIFD tags
        // TODO: support other complex data types
        const entriesToWrite = Object.keys(metadata)
            .map(_name => {
            const name = _name;
            return { tag: tags.tags[name], value: metadata[name] };
        })
            .filter(item => TIFFEncoder.isSupportedEntry(item.tag, item.value));
        // write the number of entries we're writing
        log$$1(`writing ${entriesToWrite.length} entries`);
        writer$$1.write(entriesToWrite.length, 2);
        for (const { tag, value } of entriesToWrite) {
            log$$1.verbose(`writing ${value} to ${tag.name}`);
            writer$$1.write(tag.code, 2);
            writer$$1.write(tag.dataType, 2);
            // write the length of the entry
            writer$$1.write(1, 4);
            // write the value itself
            const valueLength = types$2.getDataTypeSize(tag.dataType) * 1;
            writer$$1.write(value, valueLength);
            writer$$1.skip(4 - valueLength);
        }
        return writer$$1.toBuffer();
    }
}
exports.TIFFEncoder = TIFFEncoder;

});

unwrapExports(tiffEncoder);

var tiffDecoder = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });








var Variant;
(function (Variant) {
    Variant["Standard"] = "standard";
    Variant["Olympus"] = "olympus";
    Variant["Panasonic"] = "panasonic";
    Variant["Unknown"] = "unknown";
})(Variant || (Variant = {}));
const TIFF_MAGIC_VERSION = 0x2a;
/**
 * Olympus raw files are basically TIFFs but with a replaced magic text
 * @see https://libopenraw.freedesktop.org/formats/orf/
 */
const OLYMPUS_MAGIC_VERSION = 0x4f52;
/**
 * Panasonic raw files are basically TIFFs but with a replaced magic text
 * @see https://libopenraw.freedesktop.org/formats/rw2/
 */
const PANASONIC_MAGIC_VERSION = 0x55;
const log$$1 = log.createLogger('decoder');
function sequenceMatch(largeArray, smallArray, startIndex) {
    for (let i = 0; i < smallArray.length; i++) {
        const iLarge = i + startIndex;
        if (largeArray[iLarge] !== smallArray[i])
            return false;
    }
    return true;
}
class TIFFDecoder {
    constructor(buffer) {
        this._buffer = buffer;
        this._reader = new reader.Reader(buffer);
        this._variant = Variant.Unknown;
    }
    _readAndValidateHeader() {
        this._reader.seek(0);
        const byteOrder = this._reader.read(2);
        if (byteOrder === types$2.LITTLE_ENDIAN_MARKER) {
            log$$1('interpreting as little endian');
            this._reader.setEndianess(types$2.Endian.Little);
        }
        else if (byteOrder === types$2.BIG_ENDIAN_MARKER) {
            log$$1('interpreting as big endian');
            this._reader.setEndianess(types$2.Endian.Big);
        }
        else {
            throw new Error('Unrecognized TIFF format');
        }
        const version = this._reader.read(2);
        if (version === TIFF_MAGIC_VERSION)
            this._variant = Variant.Standard;
        if (version === OLYMPUS_MAGIC_VERSION)
            this._variant = Variant.Olympus;
        if (version === PANASONIC_MAGIC_VERSION)
            this._variant = Variant.Panasonic;
        if (this._variant === Variant.Unknown) {
            throw new Error(`Unrecognized TIFF version: ${version.toString(16)}`);
        }
        log$$1(`detected tiff variant as ${this._variant}`);
    }
    _readIFDs() {
        if (this._ifds) {
            return;
        }
        this._ifds = [];
        const ifdOffsets = [{ offset: this._reader.read(4) }];
        while (ifdOffsets.length) {
            const ifdOffset = ifdOffsets.shift();
            if (this._ifds.some(ifd$$1 => ifd$$1.offset === ifdOffset.offset)) {
                continue;
            }
            log$$1(`reading IFD at ${ifdOffset.offset}`);
            const ifd$$1 = ifd.IFD.read(this._reader, ifdOffset);
            this._ifds.push(ifd$$1);
            const suboffsets = ifd$$1.getSubIFDOffsets(this._reader);
            log$$1(`IFD has ${suboffsets.length} child(ren)`);
            suboffsets.forEach(offset => ifdOffsets.push({ offset, parent: ifd$$1 }));
            if (ifd$$1.nextIFDOffset) {
                ifdOffsets.push({ offset: ifd$$1.nextIFDOffset, parent: ifd$$1.parent });
            }
        }
    }
    _readLargestJPEGThumbnail() {
        let maxResolutionJPEG;
        this._ifds.forEach(ifd$$1 => {
            const offsetEntry = ifd$$1.entries.find(entry => entry.tag === types$2.IFDTag.ThumbnailOffset);
            const lengthEntry = ifd$$1.entries.find(entry => entry.tag === types$2.IFDTag.ThumbnailLength);
            if (!offsetEntry || !lengthEntry) {
                return;
            }
            const offset = offsetEntry.getValue(this._reader);
            const length = lengthEntry.getValue(this._reader);
            if (!maxResolutionJPEG || length > maxResolutionJPEG.length) {
                maxResolutionJPEG = { offset, length, ifd: ifd$$1 };
            }
        });
        if (!maxResolutionJPEG) {
            return undefined;
        }
        this._reader.seek(maxResolutionJPEG.offset);
        return this._reader.readAsBuffer(maxResolutionJPEG.length);
    }
    _readStripOffsetsAsJPEG() {
        let maxResolutionJPEG;
        this._ifds.forEach(ifd$$1 => {
            const compressionEntry = ifd$$1.entries.find(entry => entry.tag === types$2.IFDTag.Compression);
            const stripOffsetsEntry = ifd$$1.entries.find(entry => entry.tag === types$2.IFDTag.StripOffsets);
            const stripBytesEntry = ifd$$1.entries.find(entry => entry.tag === types$2.IFDTag.StripByteCounts);
            if (!compressionEntry || !stripOffsetsEntry || !stripBytesEntry)
                return;
            const compression = compressionEntry.getValue(this._reader);
            // From EXIF and DNG specs, 6 and 7 signal JPEG-compressed data
            // https://www.sno.phy.queensu.ca/~phil/exiftool/TagNames/EXIF.html#Compression
            if (compression !== 6 && compression !== 7)
                return;
            const offset = stripOffsetsEntry.getValue(this._reader);
            const length = stripBytesEntry.getValue(this._reader);
            const jpegBuffer = this._reader.use(() => {
                this._reader.seek(offset);
                return this._reader.readAsBuffer(length);
            });
            if (!jpegDecoder.JPEGDecoder.isJPEG(jpegBuffer))
                return;
            const jpeg = new jpegDecoder.JPEGDecoder(jpegBuffer);
            const metadata = jpeg.extractMetadata();
            if (!metadata.ImageLength || !metadata.ImageWidth)
                return;
            if (!maxResolutionJPEG || metadata.ImageWidth > maxResolutionJPEG.metadata.ImageWidth) {
                // TODO: throw if there's more than one strip
                maxResolutionJPEG = { metadata, buffer: jpegBuffer };
            }
        });
        if (!maxResolutionJPEG) {
            return undefined;
        }
        return maxResolutionJPEG.buffer;
    }
    _findJPEGInRange(buffer, searchStartIndex, searchEndIndex) {
        const startCandidates = [];
        const endCandidates = [];
        for (let i = searchStartIndex; i < searchEndIndex; i++) {
            if (buffer[i] !== 0xff)
                continue;
            if (buffer[i + 1] !== 0xd8)
                continue;
            if (buffer[i + 2] !== 0xff)
                continue;
            startCandidates.push(i);
        }
        for (let i = searchEndIndex; i > searchStartIndex; i--) {
            if (buffer[i - 1] !== 0xff)
                continue;
            if (buffer[i] !== 0xd9)
                continue;
            endCandidates.push(i);
        }
        // If there are too many candidates to evaluate, don't guess randomly
        if (startCandidates.length * endCandidates.length > 25)
            return undefined;
        let jpeg;
        let maxWidth = -Infinity;
        for (const startIndex of startCandidates) {
            for (const endIndex of endCandidates) {
                if (!Number.isFinite(startIndex))
                    continue;
                if (!Number.isFinite(endIndex))
                    continue;
                if (endIndex - startIndex < 4000)
                    continue;
                log$$1(`evaluating possible embedded JPEG from ${startIndex} to ${endIndex}`);
                const jpegBuffer = buffer.slice(startIndex, endIndex + 1);
                if (!jpegDecoder.JPEGDecoder.isJPEG(jpegBuffer))
                    continue;
                const metadata = new jpegDecoder.JPEGDecoder(jpegBuffer).extractMetadata();
                if (typeof metadata.ImageWidth !== 'number')
                    continue;
                if (metadata.ImageWidth < maxWidth)
                    continue;
                maxWidth = metadata.ImageWidth;
                jpeg = jpegBuffer;
            }
        }
        return jpeg;
    }
    /**
     * Modern RW2 use a proprietary tag for the JPEG (0x2e - JpgFromRaw)
     * @see https://github.com/exiftool/exiftool/blob/2f235f9a5618336f199c6481b452836c55de6b0c/lib/Image/ExifTool/PanasonicRaw.pm#L198-L215
     *
     * Older Panasonic raw mislabels all of their tags so the names make no sense.
     * The only thing they really label is the offset of the RAW data and the JPEG is before that.
     * So we'll just search for JPEG markers in between the IFDs and the offset of the raw data.
     */
    _readPanasonicJPEG() {
        if (this._variant !== Variant.Panasonic)
            return;
        const ifdEntries = this.extractIFDEntries();
        const jpgFromRawEntry = ifdEntries.find(entry => entry.tag === types$2.IFDTag.JpgFromRaw);
        if (jpgFromRawEntry) {
            const value = jpgFromRawEntry.getValue(this._reader);
            if (Buffer.isBuffer(value))
                return value;
        }
        const searchStart = Math.max(...ifdEntries.map(value => value.startOffset));
        const endEntry = this._ifds[0].entries.find(entry => entry.tag === types$2.IFDTag.PanasonicJPEGEnd);
        if (!searchStart || !endEntry)
            return;
        const endEntryValue = endEntry.getValue();
        if (typeof endEntryValue !== 'number')
            return;
        return this._findJPEGInRange(this._reader.getBuffer(), searchStart, endEntryValue);
    }
    /**
     * Olympus JPEG preview is usually contained within the makernote
     */
    _readOlympusJPEG() {
        if (this._variant !== Variant.Olympus)
            return;
        // See https://github.com/exiftool/exiftool/blob/a7f6bc1e03ff3553da66aed2b552d2e2f64b71b3/lib/Image/ExifTool/Olympus.pm#L1763-L1779
        const PREVIEW_IMAGE_OFFSET_SEQUENCE = [0x01, 0x01, 0x04, 0x00, 0x01, 0x00];
        const PREVIEW_IMAGE_LENGTH_SEQUENCE = [0x02, 0x01, 0x04, 0x00, 0x01, 0x00];
        const JPEG_SEQUENCE = [0xff, 0xd8, 0xff];
        const ifdEntries = this.extractIFDEntries();
        const makerNoteEntry = ifdEntries.find(entry => entry.tag === 37500);
        if (!makerNoteEntry)
            return;
        const makernote = makerNoteEntry.getValue(this._reader);
        if (typeof makernote === 'string' || typeof makernote === 'number')
            return;
        const makernoteReader = new reader.Reader(makernote);
        makernoteReader.setEndianess(types$2.Endian.Little);
        for (let i = 0; i < makernote.length; i++) {
            // Olympus makernote has really fucked up IFD offsets.
            // So we just do a linear scan for the two tags we are looking for
            if (!sequenceMatch(makernote, PREVIEW_IMAGE_OFFSET_SEQUENCE, i))
                continue;
            if (!sequenceMatch(makernote, PREVIEW_IMAGE_LENGTH_SEQUENCE, i + 12))
                continue;
            makernoteReader.seek(i);
            const offsetEntry = ifdEntry.IFDEntry.read(makernoteReader);
            const offset = offsetEntry.getValue(makernoteReader);
            if (typeof offset !== 'number')
                continue;
            if (!sequenceMatch(makernote, JPEG_SEQUENCE, offset))
                continue;
            makernoteReader.seek(i + 12);
            const lengthEntry = ifdEntry.IFDEntry.read(makernoteReader);
            const length = lengthEntry.getValue(makernoteReader);
            if (typeof length !== 'number')
                continue;
            const jpegBuffer = makernote.slice(offset, offset + length);
            if (!jpegDecoder.JPEGDecoder.isJPEG(jpegBuffer))
                continue;
            return jpegBuffer;
        }
        return this._findJPEGInRange(makernote, 0, makernote.length);
    }
    _readLargestJPEG() {
        // Try to read the JPEG thumbnail first
        const maxThumbnailJPEG = this._readLargestJPEGThumbnail();
        const thumbnailSize = (maxThumbnailJPEG && maxThumbnailJPEG.length) || 0;
        // Only return it immediately if it seems large enough (>500KB)
        if (maxThumbnailJPEG && thumbnailSize > 500 * 1000)
            return maxThumbnailJPEG;
        // Otherwise we'll fallback to the JPEG strip offsets
        const maxStripOffsetJPEG = this._readStripOffsetsAsJPEG();
        // Only return it if it's larger than the thumbnail
        if (maxStripOffsetJPEG && maxStripOffsetJPEG.length > thumbnailSize)
            return maxStripOffsetJPEG;
        // Fallback to the small thumbnail if that's all we found
        if (maxThumbnailJPEG)
            return maxThumbnailJPEG;
        // Try the manufacturer specific previews if none the standard ones worked
        const panasonicJPEG = this._readPanasonicJPEG();
        if (panasonicJPEG)
            return panasonicJPEG;
        const olympusJPEG = this._readOlympusJPEG();
        if (olympusJPEG)
            return olympusJPEG;
        // Fail loudly if all else fails
        throw new Error('Could not find an embedded JPEG');
    }
    _mergeIFDMetadata(entries) {
        const tags$$1 = {};
        // Merge the tags from all the IFD entries:
        //    - trust data from embedded JPEGs least
        //    - trust data from EXIF tables next
        //    - pull size data from full resolution subifds
        const nonExifEntries = entries.filter(entry => !entry.ifd.isEXIF);
        const exifEntries = entries.filter(entry => entry.ifd.isEXIF);
        const fullResolutionEntries = entries.filter(entry => entry.metadata.NewSubfileType === 0);
        for (const { metadata } of nonExifEntries.concat(exifEntries)) {
            Object.assign(tags$$1, metadata);
        }
        for (const { metadata } of fullResolutionEntries) {
            const { ImageWidth, ImageLength } = metadata;
            if (!ImageWidth || !ImageLength)
                continue;
            Object.assign(tags$$1, { ImageWidth, ImageLength });
        }
        return tags$$1;
    }
    extractJPEG(options = {}) {
        if (this._cachedJPEG)
            return this._cachedJPEG.slice();
        this._readAndValidateHeader();
        this._readIFDs();
        const jpeg = this._readLargestJPEG();
        if (options.skipMetadata)
            return jpeg;
        const metadata = this.extractMetadata();
        this._cachedJPEG = TIFFDecoder.injectMetadataIntoJPEG(jpeg, metadata);
        return this._cachedJPEG.slice();
    }
    extractMetadata() {
        if (this._cachedMetadata)
            return Object.assign({}, this._cachedMetadata);
        this._readAndValidateHeader();
        this._readIFDs();
        const entries = [];
        this._ifds.forEach(ifd$$1 => {
            const tagsForIfd = {};
            ifd$$1.entries.forEach(entry => {
                const name = tags.getFriendlyName(entry.tag);
                const value = entry.getValue(this._reader);
                const displayValue = typeof value === 'string' || typeof value === 'number'
                    ? value.toString()
                    : value.slice(0, 32);
                log$$1.verbose(`evaluated ${name} (${entry.tag} - ${entry.dataType}) as ${displayValue}`);
                if (typeof value !== 'string' && typeof value !== 'number')
                    return;
                tagsForIfd[name] = value;
                const panasonicName = tags.panasonicConversionTags[name];
                if (this._variant === Variant.Panasonic && panasonicName) {
                    tagsForIfd[panasonicName] = value;
                }
                entries.push({ ifd: ifd$$1, metadata: tagsForIfd });
            });
        });
        this._cachedMetadata = this._mergeIFDMetadata(entries);
        return Object.assign({}, this._cachedMetadata);
    }
    extractIFDEntries() {
        this._readAndValidateHeader();
        this._readIFDs();
        return this._ifds.map(ifd$$1 => ifd$$1.entries).reduce((a, b) => a.concat(b), []);
    }
    static injectMetadataIntoJPEG(jpeg, metadata) {
        const metadataToInject = Object.assign({}, metadata);
        delete metadataToInject.ImageWidth;
        delete metadataToInject.ImageLength;
        delete metadataToInject.EXIFImageWidth;
        delete metadataToInject.EXIFImageHeight;
        const metadataBuffer = tiffEncoder.TIFFEncoder.encode(metadataToInject);
        return jpegDecoder.JPEGDecoder.injectEXIFMetadata(jpeg, metadataBuffer);
    }
    static isLikelyTIFF(buffer) {
        return (buffer[0] === 0x49 && buffer[1] === 0x49) || (buffer[0] === 0x4d && buffer[1] === 0x4d);
    }
    static replaceIFDEntry(decoder, tag, data) {
        const ifd$$1 = decoder.extractIFDEntries().find(ifd$$1 => tags.getFriendlyName(ifd$$1.tag) === tag);
        if (!ifd$$1)
            throw new Error(`Could not find "${tag}" in buffer`);
        return ifdEntry.IFDEntry.mutate(Buffer.from(decoder._buffer), ifd$$1, data, decoder._reader.getEndianess());
    }
}
exports.TIFFDecoder = TIFFDecoder;

});

unwrapExports(tiffDecoder);

var xmpDecoder = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const EXIF_ATTR_GLOBAL_REGEX = /(xmp|exif|tiff):([0-9a-z]+?)="(.*?)"/gim;
const EXIF_ATTR_REGEX = /:([0-9a-z]+?)="(.*?)"$/i;
const XML_TAG_GLOBAL_REGEX = /<((xmp|exif|tiff):([0-9a-z]+?))>((.|\\s)*?)<\/\1>/gim;
const XML_TAG_REGEX = new RegExp(XML_TAG_GLOBAL_REGEX.source, 'im');
function isSimpleNumber(s) {
    return /^(([1-9]\d*)|0)$/.test(s);
}
function isComplexNumber(s) {
    return /^[1-9]\d*\/[1-9]\d*$/.test(s);
}
function getXMLTagRegExp(tag, flags) {
    return new RegExp(`<${tag}>((.|\\s)*?)</${tag}>`, flags);
}
function findXMLTag(text, tag) {
    const regex = getXMLTagRegExp(tag, 'i');
    const match = text.match(regex);
    if (!match)
        return null;
    return { innerXML: match[1] };
}
function findXMLTags(text, tag) {
    const matches = text.match(getXMLTagRegExp(tag, 'ig'));
    if (!matches)
        return [];
    return matches.map(item => findXMLTag(item, tag));
}
class XMPDecoder {
    constructor(buffer) {
        this._text = buffer.toString();
    }
    _handleMatch(key, value, genericMetadata) {
        // TODO: support mixed case in the XMP
        if (!(key in tags.tags) && !(key in tags.xmpTags))
            return;
        const knownKey = key;
        let realValue;
        if (isSimpleNumber(value)) {
            realValue = Number(value);
        }
        else if (isComplexNumber(value)) {
            const [numerator, denominator] = value.split('/');
            realValue = Number(numerator) / Number(denominator);
        }
        else {
            realValue = value;
        }
        genericMetadata[knownKey] = realValue;
    }
    _decodeAttributeMetadata(metadata) {
        const matches = this._text.match(EXIF_ATTR_GLOBAL_REGEX);
        for (const attribute of matches || []) {
            // tslint:disable-next-line
            const [_, key, value] = attribute.match(EXIF_ATTR_REGEX) || ['', '', ''];
            this._handleMatch(key, value, metadata);
        }
    }
    _decodeElementMetadata(metadata) {
        const matches = this._text.match(XML_TAG_GLOBAL_REGEX);
        for (const match of matches || []) {
            // tslint:disable-next-line
            const [_, tagName, namespace, key, value] = match.match(XML_TAG_REGEX) || ['', '', '', '', ''];
            this._handleMatch(key, value, metadata);
        }
    }
    _decodeKeywords(genericMetadata) {
        const subjectEl = findXMLTag(this._text, 'dc:subject');
        if (!subjectEl)
            return;
        const bagEl = findXMLTag(subjectEl.innerXML, 'rdf:Bag');
        if (!bagEl)
            return;
        const keywords = findXMLTags(bagEl.innerXML, 'rdf:li');
        if (!keywords.length)
            return;
        genericMetadata.DCSubjectBagOfWords = JSON.stringify(keywords.map(item => item.innerXML));
    }
    extractJPEG() {
        throw new Error('No image preview available from XMP');
    }
    extractMetadata() {
        const metadata = {};
        this._decodeAttributeMetadata(metadata);
        this._decodeElementMetadata(metadata);
        this._decodeKeywords(metadata);
        return metadata;
    }
    static isXMP(buffer) {
        const xmpHeader = '<x:xmpmet';
        const xmpAltHeader = '<?xpacket';
        for (let i = 0; i < xmpHeader.length; i++) {
            if (buffer[i] !== xmpHeader.charCodeAt(i) && buffer[i] !== xmpAltHeader.charCodeAt(i))
                return false;
        }
        return true;
    }
}
exports.XMPDecoder = XMPDecoder;

});

unwrapExports(xmpDecoder);

var jpegDecoder = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });






const log$$1 = log.createLogger('jpeg-decoder');
const EXIF_HEADER = 0x45786966; // "Exif"
const XMP_HEADER = 0x68747470; // The "http" in "http://ns.adobe.com/xap/1.0/"
const XMP_URL = 'http://ns.adobe.com/xap/1.0/\x00';
const APP1 = 0xffe1;
const START_OF_IMAGE = 0xffd8;
const START_OF_FRAME0 = 0xffc0;
const START_OF_FRAME1 = 0xffc1;
const START_OF_FRAME2 = 0xffc2;
const START_OF_SCAN = 0xffda;
const END_OF_IMAGE = 0xffd9;
function bufferFromNumber(x, minSize = 2) {
    const writer$$1 = new writer.Writer();
    writer$$1.write(x, minSize);
    return writer$$1.toBuffer();
}
class JPEGDecoder {
    constructor(buffer) {
        this._buffer = buffer;
        this._reader = new reader.Reader(buffer);
        this._reader.setEndianess(types$2.Endian.Big);
    }
    _handleEXIFMarker(state) {
        const reader$$1 = this._reader;
        const lastMarker = this._markers[this._markers.length - 1];
        const exifBuffers = this._exifBuffers;
        // mark the last marker as an EXIF marker
        lastMarker.isEXIF = true;
        // skip over the 4 header bytes and 2 empty bytes
        reader$$1.skip(6);
        // the data is the rest of the marker (-6 for 2 empty bytes and 4 for EXIF header)
        exifBuffers.push(reader$$1.readAsBuffer(state.length - 6));
        return { nextMarker: reader$$1.read(2) };
    }
    /**
     * @see https://en.wikipedia.org/wiki/Extensible_Metadata_Platform#Example
     * @see https://wwwimages2.adobe.com/content/dam/acom/en/devnet/xmp/pdfs/XMP%20SDK%20Release%20cc-2016-08/XMPSpecificationPart3.pdf
     */
    _handleXMPMarker(state) {
        const reader$$1 = this._reader;
        const lastMarker = this._markers[this._markers.length - 1];
        const xmpBuffers = this._xmpBuffers;
        // Let's double check we're actually looking at XMP data
        const fullHeader = reader$$1.readAsBuffer(XMP_URL.length).toString();
        if (fullHeader !== XMP_URL) {
            // We aren't actually looking at XMP data, let's abort
            reader$$1.seek(state.nextPosition);
            return { nextMarker: reader$$1.read(2) };
        }
        xmpBuffers.push(reader$$1.readAsBuffer(state.length - XMP_URL.length));
        // mark the last marker as an XMP marker
        lastMarker.isXMP = true;
        return { nextMarker: reader$$1.read(2) };
    }
    _handleNonAppMarker(state) {
        const reader$$1 = this._reader;
        const { marker, nextPosition } = state;
        // Skip through the other header payloads that aren't APP1
        // Width and Height information will be in the Start Of Frame (SOFx) payloads
        if (marker === START_OF_FRAME0 || marker === START_OF_FRAME1 || marker === START_OF_FRAME2) {
            reader$$1.skip(1);
            this._height = reader$$1.read(2);
            this._width = reader$$1.read(2);
        }
        reader$$1.seek(nextPosition);
        return { nextMarker: reader$$1.read(2) };
    }
    _handleMarker(state) {
        const reader$$1 = this._reader;
        const { marker, nextPosition } = state;
        if (marker === APP1) {
            // Read the EXIF/XMP data from APP1 Marker
            const header = reader$$1.use(() => reader$$1.read(4));
            if (header === EXIF_HEADER) {
                return this._handleEXIFMarker(state);
            }
            else if (header === XMP_HEADER) {
                return this._handleXMPMarker(state);
            }
            else {
                reader$$1.seek(nextPosition);
                return { nextMarker: reader$$1.read(2) };
            }
        }
        else if (marker >> 8 === 0xff) {
            return this._handleNonAppMarker(state);
        }
        else {
            throw new Error(`Unrecognized marker: ${marker.toString(16)}`);
        }
    }
    _readFileMarkers() {
        if (this._markers) {
            return;
        }
        const baseMarker = { isEXIF: false, isXMP: false };
        const reader$$1 = this._reader;
        this._markers = [Object.assign({ marker: START_OF_IMAGE, buffer: Buffer.from([]) }, baseMarker)];
        this._exifBuffers = [];
        this._xmpBuffers = [];
        reader$$1.seek(2);
        let marker = reader$$1.read(2);
        while (marker !== END_OF_IMAGE && reader$$1.hasNext()) {
            log$$1(`read marker ${marker.toString(16)}`);
            if (marker === START_OF_SCAN) {
                // If we reached the scan data, we won't find anymore metadata, skip to the end
                break;
            }
            // Subtract 2 for the length that we already read
            const length = reader$$1.use(() => reader$$1.read(2)) - 2;
            const markerBuffer = reader$$1.use(() => reader$$1.readAsBuffer(length + 2));
            // Push the marker and data onto our markers list
            this._markers.push(Object.assign({ marker, buffer: markerBuffer }, baseMarker));
            // Skip over the length we just read
            reader$$1.skip(2);
            const nextPosition = reader$$1.getPosition() + length;
            marker = this._handleMarker({ marker, nextPosition, length }).nextMarker;
        }
        this._markers.push(Object.assign({ marker, buffer: this._buffer.slice(reader$$1.getPosition()) }, baseMarker));
    }
    extractJPEG() {
        return this._buffer;
    }
    extractMetadata() {
        this._readFileMarkers();
        const metadata = {
            ImageLength: this._height,
            ImageWidth: this._width,
        };
        for (const exifBuffer of this._exifBuffers) {
            const decoder = new tiffDecoder.TIFFDecoder(exifBuffer);
            Object.assign(metadata, decoder.extractMetadata());
        }
        for (const xmpBuffer of this._xmpBuffers) {
            const decoder = new xmpDecoder.XMPDecoder(xmpBuffer);
            Object.assign(metadata, decoder.extractMetadata());
        }
        return metadata;
    }
    extractEXIFBuffer() {
        this._readFileMarkers();
        return this._exifBuffers[0];
    }
    extractXMPBuffer() {
        this._readFileMarkers();
        return this._xmpBuffers[0];
    }
    static isJPEG(buffer) {
        try {
            new JPEGDecoder(buffer)._readFileMarkers();
            return true;
        }
        catch (err) {
            log$$1(`not a JPEG, decoding failed with ${err.message}`);
            return false;
        }
    }
    static isLikelyJPEG(buffer) {
        return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    static injectEXIFMetadata(jpegBuffer, exifBuffer) {
        const decoder = new JPEGDecoder(jpegBuffer);
        decoder._readFileMarkers();
        const hasEXIFDataAlready = decoder._markers.some(marker => marker.isEXIF);
        const buffers = [];
        for (const { marker, buffer, isEXIF } of decoder._markers) {
            if (isEXIF || (marker === START_OF_IMAGE && !hasEXIFDataAlready)) {
                if (marker === START_OF_IMAGE)
                    buffers.push(bufferFromNumber(START_OF_IMAGE));
                buffers.push(bufferFromNumber(APP1));
                // add 8 bytes to the buffer length
                // 4 bytes for header, 2 bytes of empty space, 2 bytes for length itself
                buffers.push(bufferFromNumber(exifBuffer.length + 8, 2));
                buffers.push(bufferFromNumber(EXIF_HEADER, 4));
                buffers.push(bufferFromNumber(0, 2));
                buffers.push(exifBuffer);
            }
            else {
                buffers.push(bufferFromNumber(marker), buffer);
            }
        }
        // @ts-ignore - TODO investigate why this is error-y
        return Buffer.concat(buffers);
    }
    static injectXMPMetadata(jpegBuffer, xmpBuffer) {
        const decoder = new JPEGDecoder(jpegBuffer);
        decoder._readFileMarkers();
        const hasXMPDataAlready = decoder._markers.some(marker => marker.isXMP);
        const buffers = [];
        for (const { marker, buffer, isXMP } of decoder._markers) {
            if (isXMP || (marker === START_OF_IMAGE && !hasXMPDataAlready)) {
                if (marker === START_OF_IMAGE)
                    buffers.push(bufferFromNumber(START_OF_IMAGE));
                buffers.push(bufferFromNumber(APP1));
                // add 2 bytes to the buffer length for length itself
                buffers.push(bufferFromNumber(xmpBuffer.length + XMP_URL.length + 2, 2));
                buffers.push(Buffer.from(XMP_URL));
                buffers.push(xmpBuffer);
            }
            else {
                buffers.push(bufferFromNumber(marker), buffer);
            }
        }
        // @ts-ignore - TODO investigate why this is error-y
        return Buffer.concat(buffers);
    }
}
exports.JPEGDecoder = JPEGDecoder;

});

unwrapExports(jpegDecoder);

var fujiDecoder = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });




/**
 * @fileoverview Process Fujifilm .raf RAW CCD files.
 * @see https://libopenraw.freedesktop.org/formats/raf/
 * @see https://web.archive.org/web/20090214101740/http://crousseau.free.fr:80/imgfmt_raw.htm
 */
const log$$1 = log.createLogger('decoder');
exports.FUJI_MAGIC_STRING = 'FUJIFILMCCD-RAW';
class FujiDecoder {
    constructor(buffer) {
        this._reader = new reader.Reader(buffer);
    }
    _readAndValidateHeader() {
        this._reader.seek(0);
        this._reader.setEndianess(types$2.Endian.Big);
        const magic = this._reader.readAsString(exports.FUJI_MAGIC_STRING.length);
        this._reader.skip(1); // skip the null terminator
        if (magic !== exports.FUJI_MAGIC_STRING)
            throw new Error('Missing magic FUJI marker');
        const version = this._reader.readAsString(4);
        if (version !== '0200' && version !== '0201') {
            throw new Error(`Unrecognized Fuji version: "${version}"`);
        }
        const cameraId = this._reader.read(8);
        const cameraName = this._reader.readAsString(32);
        log$$1(`read from fujifilm raf - ${cameraName} (${cameraId})`);
    }
    extractJPEG() {
        this._readAndValidateHeader();
        // Skip the directory version and unknown bytes (4 + 20)
        this._reader.skip(24);
        const jpegOffset = this._reader.read(4);
        const jpegLength = this._reader.read(4);
        this._reader.seek(jpegOffset);
        return this._reader.readAsBuffer(jpegLength);
    }
    extractMetadata() {
        return new jpegDecoder.JPEGDecoder(this.extractJPEG()).extractMetadata();
    }
}
exports.FujiDecoder = FujiDecoder;

});

unwrapExports(fujiDecoder);

var cr3Decoder = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });




/**
 * @fileoverview Process Canon .cr3 RAW
 * @see https://en.wikipedia.org/wiki/ISO_base_media_file_format
 * @see https://github.com/patrickhulce/canon_cr3/blob/master/parse_cr3.py
 */
const log$$1 = log.createLogger('decoder');
const NESTED_BOX_TYPES = new Set(['moov', 'trak', 'mdia', 'minf', 'dinf', 'stbl']);
const TIFF_BOX_TYPES = new Set(['CMT1', 'CMT2', 'CMT3', 'CMT4', 'CMTA']);
const UUID_PRIMARY = '85c0b687820f11e08111f4ce462b6a48';
const UUID_PREVIEW = 'eaf42b5e1c984b88b9fbb7dc406e4d16';
class Cr3Decoder {
    constructor(buffer) {
        this._reader = new reader.Reader(buffer);
        this._data = [];
    }
    _handleUuidBox(parents) {
        const uuid = this._reader.readAsHex(16);
        const position = this._reader.getPosition();
        if (uuid === UUID_PRIMARY)
            this._readFileBox(position, parents);
        if (uuid === UUID_PREVIEW)
            this._readFileBox(position + 8, parents);
    }
    _readFileBox(start, parents) {
        this._reader.seek(start);
        if (!this._reader.hasNext())
            return;
        let totalDataLength = this._reader.read(4);
        const chunkName = this._reader.readAsString(4);
        if (totalDataLength === 1)
            totalDataLength = this._reader.read(8);
        log$$1(`discovered ${chunkName} box with size ${totalDataLength}`);
        const dataOffset = this._reader.getPosition();
        const dataLength = totalDataLength - (dataOffset - start);
        const entry = { chunkName, parents, dataOffset, dataLength };
        this._data.push(entry);
        const newParents = [...parents, entry];
        if (NESTED_BOX_TYPES.has(chunkName))
            this._readFileBox(dataOffset, newParents);
        if (chunkName === 'uuid')
            this._handleUuidBox(newParents);
        if (this._reader.hasNext())
            this._readFileBox(start + totalDataLength, parents);
    }
    _readAndValidateBoxes() {
        if (this._data.length)
            return;
        if (!Cr3Decoder._isLikelyCr3(this._reader))
            throw new Error('Invalid cr3 file');
        this._reader.setEndianess(types$2.Endian.Big);
        this._readFileBox(0, []);
    }
    extractJPEG() {
        this._readAndValidateBoxes();
        const previews = this._data
            .filter(entry => entry.chunkName === 'PRVW')
            .sort((a, b) => b.dataLength - a.dataLength);
        if (!previews.length)
            throw new Error('No preview available');
        const largestPreview = previews[0];
        this._reader.seek(largestPreview.dataOffset);
        this._reader.skip(6); // padding
        const width = this._reader.read(2);
        const height = this._reader.read(2);
        this._reader.skip(2); // unknown
        const jpegLength = this._reader.read(4);
        log$$1(`extracting jpeg preview ${width}x${height}, ${jpegLength} bytes`);
        const jpeg = this._reader.readAsBuffer(jpegLength);
        const metadata = this.extractMetadata();
        return tiffDecoder.TIFFDecoder.injectMetadataIntoJPEG(jpeg, metadata);
    }
    extractMetadata() {
        this._readAndValidateBoxes();
        const metadata = {};
        for (const entry of this._data) {
            if (!TIFF_BOX_TYPES.has(entry.chunkName))
                continue;
            this._reader.seek(entry.dataOffset);
            const buffer = this._reader.readAsBuffer(entry.dataLength);
            if (!tiffDecoder.TIFFDecoder.isLikelyTIFF(buffer))
                continue;
            Object.assign(metadata, new tiffDecoder.TIFFDecoder(buffer).extractMetadata());
        }
        return metadata;
    }
    static _isLikelyCr3(reader$$1) {
        return reader$$1.use(() => {
            reader$$1.seek(4);
            const fileBoxType = reader$$1.readAsString(4);
            const brand = reader$$1.readAsString(4).trim();
            return fileBoxType === 'ftyp' && brand === 'crx';
        });
    }
    static isLikelyCr3(buffer) {
        return Cr3Decoder._isLikelyCr3(new reader.Reader(buffer));
    }
}
exports.Cr3Decoder = Cr3Decoder;

});

unwrapExports(cr3Decoder);

var keywordsParser = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function parseKeywords(data) {
    if (typeof data.DCSubjectBagOfWords !== 'string')
        return undefined;
    try {
        return JSON.parse(data.DCSubjectBagOfWords);
    }
    catch (_) {
        return undefined;
    }
}
exports.parseKeywords = parseKeywords;

});

unwrapExports(keywordsParser);

var xmpEncoder = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });



var XMPMatchType;
(function (XMPMatchType) {
    XMPMatchType["Element"] = "element";
    XMPMatchType["Attribute"] = "attribute";
})(XMPMatchType || (XMPMatchType = {}));
const writableTags = Object.assign({}, tags.xmpTags, { DateTimeOriginal: true });
const log$$1 = log.createLogger('xmp-encoder');
const XMP_BASE_RDF_DESCRIPTION = `
  <rdf:Description rdf:about=""
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:tiff="http://ns.adobe.com/tiff/1.0/"
    xmlns:exif="http://ns.adobe.com/exif/1.0/"
    xmlns:dc="http://purl.org/dc/elements/1.1/">
  </rdf:Description>
`.trim();
const XMP_BASE_RDF = `
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  ${XMP_BASE_RDF_DESCRIPTION}
 </rdf:RDF>
`.trim();
const XMP_BASE_FILE = `
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.6-c140 79.160451, 2017/05/06-01:08:21">
 ${XMP_BASE_RDF}
</x:xmpmeta>
`.trim();
const XMP_PACKET_START = '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>';
const XMP_PACKET_END = '<?xpacket end="w"?>';
const BASE_NEWLINE = '\n   ';
class XMPEncoder {
    static isWrappedInPacket(xmpData) {
        const firstBytes = xmpData.slice(0, XMP_PACKET_START.length).toString();
        return firstBytes === XMP_PACKET_START;
    }
    static generateWhitespaceOfLength(length) {
        let whitespace = '';
        while (whitespace.length < length) {
            whitespace += whitespace.length % 100 === 0 || whitespace.length === length - 1 ? '\n' : ' ';
        }
        return whitespace;
    }
    static wrapInPacket(xmpData) {
        if (XMPEncoder.isWrappedInPacket(xmpData))
            return xmpData;
        return Buffer.from([
            XMP_PACKET_START,
            xmpData.toString(),
            XMPEncoder.generateWhitespaceOfLength(2048),
            XMP_PACKET_END,
        ].join('\n'));
    }
    static encode(metadata, original) {
        let { xmpData, extraLength } = XMPEncoder._ensureRdfDescription(original);
        for (const key of Object.keys(metadata)) {
            const tagName = key;
            if (!(tagName in writableTags)) {
                log$$1(`skipping ${tagName} which is not a writable tag`);
                continue;
            }
            const newXmpData = XMPEncoder._processEntry(xmpData, tagName, metadata[tagName]);
            extraLength += newXmpData.length - xmpData.length;
            xmpData = newXmpData;
        }
        if (XMPEncoder.isWrappedInPacket(xmpData)) {
            const PACKET_END_REGEX = /(\s*)(<\?xpacket end)/im;
            const existingWhitespaceMatch = xmpData.match(PACKET_END_REGEX);
            if (!existingWhitespaceMatch)
                throw new Error('Cannot find XMP packet end');
            const existingWhitespaceLength = existingWhitespaceMatch[1].length;
            if (existingWhitespaceLength > extraLength) {
                // We only need to adjust the whitespace if we had enough room to fit our data into it
                log$$1(`adjusting whitespace, our ${extraLength} will fit into ${existingWhitespaceLength}`);
                const indexOfMatch = xmpData.indexOf(existingWhitespaceMatch[0]);
                const preamble = xmpData.slice(0, indexOfMatch);
                const postamble = xmpData.slice(indexOfMatch + existingWhitespaceLength);
                const newWhitespaceLength = existingWhitespaceLength - extraLength;
                const whitespace = XMPEncoder.generateWhitespaceOfLength(newWhitespaceLength);
                xmpData = `${preamble}${whitespace}${postamble}`;
            }
        }
        return Buffer.from(xmpData);
    }
    static _ensureRdfDescription(original) {
        let xmpData = (original || XMP_BASE_FILE).toString();
        let extraLength = 0;
        // It already has an rdf:Description, no need to do anything else.
        if (xmpData.includes('<rdf:Description')) {
            return { xmpData, extraLength };
        }
        // It's missing a description but has an rdf:RDF, just inject the description.
        if (xmpData.includes('</rdf:RDF>')) {
            const newData = xmpData.replace(/(\s*)<\/rdf:RDF>/, `${XMP_BASE_RDF_DESCRIPTION}$1</rdf:RDF>`);
            extraLength += newData.length - xmpData.length;
            xmpData = newData;
            return { xmpData, extraLength };
        }
        // It's missing rdf:RDf completely, inject everything
        if (xmpData.includes('</x:xmpmeta>')) {
            const newData = xmpData.replace(/(\s*)<\/x:xmpmeta>/, `${XMP_BASE_RDF}$1</x:xmpmeta>`);
            extraLength += newData.length - xmpData.length;
            xmpData = newData;
            return { xmpData, extraLength };
        }
        throw new Error(`XMP data did not contain any discernible rdf markers:\n${xmpData}`);
    }
    static _processEntry(xmpData, tagName, value) {
        log$$1(`processing ${tagName}`);
        const existing = XMPEncoder._findExisting(xmpData, tagName);
        // If we are unsetting, branch.
        if (typeof value === 'undefined') {
            if (!existing) {
                // If we didn't have an existing value to begin with, we're done.
                log$$1(`${tagName} already missing from XMP, skipping`);
                return xmpData;
            }
            log$$1(`unsetting ${tagName}`);
            // Remove the existing reference and cleanup whitespace
            let preamble = xmpData.slice(0, existing.start);
            const postamble = xmpData.slice(existing.start + existing.length);
            if (postamble.match(/^(\n|>)/))
                preamble = preamble.replace(/\n +$/, '');
            return `${preamble}${postamble}`;
        }
        log$$1(`writing ${tagName} with value "${value}"`);
        if (existing) {
            // If we have an existing value, replace the token range with our new payload
            log$$1(`found existing ${tagName}`);
            const preamble = xmpData.slice(0, existing.start);
            const postamble = xmpData.slice(existing.start + existing.length);
            const replacement = XMPEncoder._buildReplacement(tagName, value, existing.type);
            return `${preamble}${replacement}${postamble}`;
        }
        else {
            // If we don't have an existing value, inject the payload with appropriate whitespace.
            log$$1(`did not find existing ${tagName}`);
            const insertionIndex = XMPEncoder._findInsertionPoint(xmpData, tagName).start;
            const preamble = xmpData.slice(0, insertionIndex);
            const postamble = xmpData.slice(insertionIndex);
            const replacement = XMPEncoder._buildReplacement(tagName, value, XMPMatchType.Attribute);
            const replacementWithNewline = `${BASE_NEWLINE}${replacement}`;
            return `${preamble}${replacementWithNewline}${postamble}`;
        }
    }
    static _findWithRegex(xmp, regex, type) {
        const match = xmp.match(regex);
        if (!match)
            return;
        return { start: match.index, length: match[0].length, type };
    }
    static _findExisting(xmp, tagName) {
        if (tagName === 'DCSubjectBagOfWords')
            return this._findWithRegex(xmp, /<dc:subject>(.|\s)*?<\/dc:subject>/, XMPMatchType.Element);
        const attributeRegex = new RegExp(`([a-z]+):(${tagName})="(.*?)"`, 'i');
        const attributeMatch = this._findWithRegex(xmp, attributeRegex, XMPMatchType.Attribute);
        if (attributeMatch)
            return attributeMatch;
        const elementRegex = new RegExp(`<([a-z]+:${tagName})(\\s*/>|(.*?)</\\1>)`, 'i');
        return this._findWithRegex(xmp, elementRegex, XMPMatchType.Element);
    }
    static _findInsertionPoint(xmp, tagName) {
        const regex = /<rdf:Description[^<]*?>/im;
        const match = xmp.match(regex);
        if (!match)
            throw new Error('Unable to find end of rdf:description');
        const rdfDescription = match[0];
        const rdfDescriptionEndIndex = xmp.indexOf(rdfDescription) + rdfDescription.length - 1;
        const start = rdfDescriptionEndIndex + (tagName === 'DCSubjectBagOfWords' ? 1 : 0);
        return { start };
    }
    static _buildReplacement(tagName, value, type) {
        if (tagName === 'DCSubjectBagOfWords') {
            const keywords = keywordsParser.parseKeywords({ DCSubjectBagOfWords: value });
            if (!keywords)
                throw new Error('Invalid keywords payload');
            return [
                `<dc:subject>`,
                ` <rdf:Bag>`,
                ...keywords.map(word => `  <rdf:li>${word.replace(/</g, '')}</rdf:li>`),
                ` </rdf:Bag>`,
                `</dc:subject>`,
            ].join(BASE_NEWLINE);
        }
        const namespace = tagName === 'DateTimeOriginal' ? 'exif' : 'xmp';
        if (type === XMPMatchType.Attribute) {
            return `${namespace}:${tagName}="${value}"`;
        }
        else {
            return `<${namespace}:${tagName}>${value}</${namespace}:${tagName}>`;
        }
    }
}
exports.XMPEncoder = XMPEncoder;

});

unwrapExports(xmpEncoder);

var dateParser = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const isColonDate = (s) => /^\d+:\d+:\d+ \d+:\d+:\d+$/.test(s);
const isISODateWithTz = (s) => /^\d{4}-\d{2}-\d{2}T[0-9.:]+(-|\+)\d{2}:\d{2}/.test(s);
const isISODate = (s) => /^\d{4}-\d{2}-\d{2}T/.test(s);
function parseNumericDate(timestamp) {
    return new Date(timestamp * 1000);
}
function parseColonDate(date) {
    const parts = date.split(' ');
    const dayPart = parts[0].replace(/:/g, '-');
    const timePart = parts[1];
    return new Date(`${dayPart}T${timePart}Z`);
}
// TODO: Accept optional target timezone instead of assuming GMT with appending `Z`
function parseDate(date) {
    let parsed = undefined;
    if (typeof date === 'number') {
        parsed = parseNumericDate(date);
    }
    else if (isColonDate(date)) {
        parsed = parseColonDate(date);
    }
    else if (isISODateWithTz(date)) {
        parsed = new Date(date);
    }
    else if (isISODate(date)) {
        parsed = new Date(`${date}Z`);
    }
    return parsed && parsed.getTime() ? parsed : undefined;
}
exports.parseDate = parseDate;

});

unwrapExports(dateParser);

var lensParser = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const patterns = {
    make: /^(\w+)/,
    focalLength: /\b(\d+(-\d+)?mm)\b/,
    aperture: /\b(F[\d.]+(-[\d.]+)?)\b/,
};
function exec(s, regex) {
    const match = s.match(regex);
    return (match && match[1]) || undefined;
}
function parseLens(data) {
    const lensModel = data.LensModel;
    if (!lensModel || typeof lensModel !== 'string') {
        return undefined;
    }
    return {
        model: lensModel,
        make: exec(lensModel, patterns.make),
        focalLength: exec(lensModel, patterns.focalLength),
        aperture: exec(lensModel, patterns.aperture),
    };
}
exports.parseLens = parseLens;

});

unwrapExports(lensParser);

var normalize$1 = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });



const properties = {
    // TODO: look into how to normalize GPS coordinates
    make: ['Make'],
    model: ['Model'],
    width: ['EXIFImageWidth', 'ImageWidth'],
    height: ['EXIFImageHeight', 'ImageLength'],
    xResolution: ['XResolution'],
    yResolution: ['YResolution'],
    createdAt: [
        ['DateTimeOriginal', dateParser.parseDate],
        ['CreateDate', dateParser.parseDate],
    ],
    modifiedAt: [['ModifyDate', dateParser.parseDate]],
    iso: ['ISO'],
    exposureTime: ['ExposureTime'],
    fNumber: ['FNumber'],
    focalLength: ['FocalLength', 'FocalLengthIn35mmFormat'],
    normalizedFocalLength: ['FocalLengthIn35mmFormat', 'FocalLength'],
    exposureCompensation: ['ExposureCompensation'],
    lens: [lensParser.parseLens],
    rating: ['Rating'],
    colorLabel: ['Label'],
    keywords: [keywordsParser.parseKeywords],
};
function getResultValue(item, results) {
    if (typeof item === 'string') {
        return results[item];
    }
    else if (typeof item === 'function') {
        return item(results);
    }
    else if (Array.isArray(item)) {
        const value = getResultValue(item[0], results);
        return item[1](value);
    }
    else {
        throw new TypeError(`Unsupported item: ${item}`);
    }
}
function normalizeMetadata(results) {
    const output = { _raw: results };
    for (const key of Object.keys(properties)) {
        const candidates = properties[key];
        let value = undefined;
        for (const candidate of candidates) {
            value = getResultValue(candidate, results);
            if (typeof value !== 'undefined') {
                break;
            }
        }
        output[key] = value;
    }
    if ((results.Orientation || 0) > 4) {
        const height = output.width;
        output.width = output.height;
        output.height = height;
    }
    return output;
}
exports.normalizeMetadata = normalizeMetadata;

});

unwrapExports(normalize$1);

var dist = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

exports.JPEGDecoder = jpegDecoder.JPEGDecoder;

exports.FujiDecoder = fujiDecoder.FujiDecoder;


exports.TIFFDecoder = tiffDecoder.TIFFDecoder;

exports.XMPDecoder = xmpDecoder.XMPDecoder;

exports.TIFFEncoder = tiffEncoder.TIFFEncoder;

exports.XMPEncoder = xmpEncoder.XMPEncoder;

exports.normalizeMetadata = normalize$1.normalizeMetadata;
function isDecoder(obj) {
    return typeof obj.extractMetadata === 'function';
}
function isLikelyFuji(buffer) {
    for (let i = 0; i < fujiDecoder.FUJI_MAGIC_STRING.length; i++) {
        if (buffer[i] !== fujiDecoder.FUJI_MAGIC_STRING.charCodeAt(i))
            return false;
    }
    return true;
}
function createDecoder_(bufferOrDecoder) {
    if (isDecoder(bufferOrDecoder)) {
        return bufferOrDecoder;
    }
    else if (isLikelyFuji(bufferOrDecoder)) {
        return new fujiDecoder.FujiDecoder(bufferOrDecoder);
    }
    else if (cr3Decoder.Cr3Decoder.isLikelyCr3(bufferOrDecoder)) {
        return new cr3Decoder.Cr3Decoder(bufferOrDecoder);
    }
    else if (tiffDecoder.TIFFDecoder.isLikelyTIFF(bufferOrDecoder)) {
        return new tiffDecoder.TIFFDecoder(bufferOrDecoder);
    }
    else if (jpegDecoder.JPEGDecoder.isLikelyJPEG(bufferOrDecoder)) {
        return new jpegDecoder.JPEGDecoder(bufferOrDecoder);
    }
    else if (xmpDecoder.XMPDecoder.isXMP(bufferOrDecoder)) {
        return new xmpDecoder.XMPDecoder(bufferOrDecoder);
    }
}
function isParseable(buffer) {
    return !!createDecoder_(buffer);
}
exports.isParseable = isParseable;
function createDecoder(bufferOrDecoder) {
    const decoder = createDecoder_(bufferOrDecoder);
    if (!decoder)
        throw new Error('Unrecognizable file type');
    return decoder;
}
exports.createDecoder = createDecoder;
function parse(bufferOrDecoder) {
    return normalize$1.normalizeMetadata(createDecoder(bufferOrDecoder).extractMetadata());
}
exports.parse = parse;

});

unwrapExports(dist);

var tone_1 = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable */


function validateCurvesInput(curve) {
    if (!curve)
        throw new Error('curve is not defined');
    let lastEntry = -Infinity;
    for (const entry of curve) {
        if (entry.length !== 2)
            throw new Error(`curve entry ${JSON.stringify(entry)} is not a tuple`);
        if (entry[0] <= lastEntry)
            throw new Error('curve entry is not ascending');
        if (entry[0] < 0 || entry[0] > 255)
            throw new Error(`invalid curve entry input ${entry[0]}`);
        if (entry[1] < 0 || entry[1] > 255)
            throw new Error(`invalid curve entry input ${entry[0]}`);
    }
    if (!curve.length || curve[0][0] !== 0)
        curve = [[0, 0], ...curve];
    if (curve[curve.length - 1][0] !== 255)
        curve = [...curve, [255, 255]];
    return curve;
}
/**
 * Use monotonic cubic interpolation to map lightness values according to the provided curve.
 * @see https://en.wikipedia.org/wiki/Monotone_cubic_interpolation#Example_implementation
 * @param options
 */
function computeCurvesValues(curve) {
    const xDiffs = [];
    const yDiffs = [];
    const slopes = [];
    for (let i = 0; i < curve.length - 1; i++) {
        const [x0, y0] = curve[i];
        const [x1, y1] = curve[i + 1];
        const dx = x1 - x0;
        const dy = y1 - y0;
        xDiffs.push(dx);
        yDiffs.push(dy);
        slopes.push(dy / dx);
    }
    const firstDegreeCoefficients = [];
    // Beyond the known points, the interpolation is a continued straight line
    firstDegreeCoefficients.push(slopes[0]);
    // Between the known points, we use a fancy equation combining the slopes and dx of the current and next intervals
    for (let i = 0; i < slopes.length - 1; i++) {
        const slope0 = slopes[i];
        const slope1 = slopes[i + 1];
        if (slope0 * slope1 <= 0) {
            // If slope changes direction, use 0
            firstDegreeCoefficients.push(0);
        }
        else {
            const dx0 = xDiffs[i];
            const dx1 = xDiffs[i + 1];
            const dxTotal = dx0 + dx1;
            firstDegreeCoefficients.push((3 * dxTotal) / ((dxTotal + dx1) / slope0 + (dxTotal + dx0) / slope1));
        }
    }
    // Continue the straight line beyond the known points
    firstDegreeCoefficients.push(slopes[slopes.length - 1]);
    const secondDegreeCoefficients = [];
    const thirdDegreeCoefficients = [];
    // Use our math magic to fill in the 2nd and 3rd degree coefficients, only need n - 1 of them since beyond the points its straight line
    for (let i = 0; i < firstDegreeCoefficients.length - 1; i++) {
        const firstDegreeCoefficient0 = firstDegreeCoefficients[i];
        const firstDegreeCoefficient1 = firstDegreeCoefficients[i + 1];
        const slope = slopes[i];
        const dxInverse = 1 / xDiffs[i];
        const magicNumber = firstDegreeCoefficient0 + firstDegreeCoefficient1 - 2 * slope;
        secondDegreeCoefficients.push((slope - firstDegreeCoefficient0 - magicNumber) * dxInverse);
        thirdDegreeCoefficients.push(magicNumber * dxInverse * dxInverse);
    }
    const precomputedValues = [];
    for (let yValue = 0; yValue <= 255; yValue++) {
        let closestIndex = -1;
        for (let i = 0; i < curve.length; i++) {
            const curvePoint = curve[i][0];
            if (curvePoint > yValue)
                break;
            closestIndex = i;
        }
        if (closestIndex === -1)
            throw new Error('Error precomputing indexes');
        const [xBase, yBase] = curve[closestIndex];
        const xDiff = yValue - xBase;
        const c1 = firstDegreeCoefficients[closestIndex];
        const c2 = secondDegreeCoefficients[closestIndex];
        const c3 = thirdDegreeCoefficients[closestIndex];
        let yPrime;
        if (xDiff === 0)
            yPrime = yBase;
        else if (closestIndex >= secondDegreeCoefficients.length)
            yPrime = yBase + c1 * xDiff;
        else
            yPrime = yBase + c1 * xDiff + c2 * xDiff * xDiff + c3 * xDiff * xDiff * xDiff;
        precomputedValues[yValue] = imageData.ImageData.clip255(yPrime);
    }
    return precomputedValues;
}
function runCurves(imageData$$1, precomputedValues, channel) {
    const channels = imageData.ImageData.channelsFor(imageData$$1.colorspace);
    const indexOfChannel = channels.indexOf(channel);
    if (indexOfChannel === -1)
        throw new Error('Curves must operate on a channel in the image');
    for (let x = 0; x < imageData$$1.width; x++) {
        for (let y = 0; y < imageData$$1.height; y++) {
            const offset = imageData.ImageData.indexFor(imageData$$1, x, y, indexOfChannel);
            const yValue = imageData$$1.data[offset];
            imageData$$1.data[offset] = precomputedValues[yValue];
        }
    }
    return imageData$$1;
}
function flattenCurvesValues(unsafeCurves) {
    const inputOutputMappings = [];
    for (const unsafeCurve of unsafeCurves) {
        const curve = validateCurvesInput(unsafeCurve);
        if (curve.every(([x, y]) => x === y))
            continue;
        inputOutputMappings.push(computeCurvesValues(curve));
    }
    if (!inputOutputMappings.length)
        return [];
    const precomputedValues = [];
    for (let initialYValue = 0; initialYValue <= 255; initialYValue++) {
        let finalYValue = initialYValue;
        for (const phase of inputOutputMappings) {
            finalYValue = phase[finalYValue];
        }
        precomputedValues[initialYValue] = finalYValue;
    }
    return precomputedValues;
}
function curves(imageData$$1, unsafeCurvesInput, channel = types.ColorChannel.Luminance255) {
    // @ts-ignore - TODO: look into why this is being dumb
    unsafeCurvesInput = unsafeCurvesInput.filter((curve) => curve.length);
    if (!unsafeCurvesInput.length)
        return imageData$$1;
    let unsafeCurves = unsafeCurvesInput;
    if (typeof unsafeCurvesInput[0][0] === 'number')
        unsafeCurves = [unsafeCurvesInput];
    const flattenedCurveValues = flattenCurvesValues(unsafeCurves);
    if (!flattenedCurveValues.length)
        return imageData$$1;
    if (flattenedCurveValues.length !== 256)
        throw new Error('Error computing flattened curve');
    return runCurves(imageData$$1, flattenedCurveValues, channel);
}
exports.curves = curves;
function generateIdentityCurvesPoints(numPoints) {
    const curves = [];
    const increment = 255 / (numPoints - 1);
    for (let i = 0; i < numPoints; i++) {
        const value = Math.round(i * increment);
        curves.push([value, value]);
    }
    return curves;
}
function convertContrastToCurves({ contrast = 0 }) {
    return [
        [0, 0],
        [64, 64 - contrast * 64],
        [192, 192 + contrast * 62],
        [255, 255],
    ];
}
function convertToneToCurves(options) {
    let hasAdjustment = false;
    const cosine0 = Math.PI / 2;
    const curves = generateIdentityCurvesPoints(32);
    function adjustCurvesTargetPoints(target, range, adjustment) {
        for (let i = 0; i < curves.length; i++) {
            const [x, y] = curves[i];
            const distanceRatio = Math.abs(target - x) / range;
            if (distanceRatio >= 1)
                continue;
            hasAdjustment = true;
            const cosDistance = Math.cos(distanceRatio * cosine0);
            curves[i][1] = imageData.ImageData.clip255(y + adjustment * cosDistance);
        }
    }
    if (options.whites)
        adjustCurvesTargetPoints(256, 32, options.whites);
    if (options.highlights)
        adjustCurvesTargetPoints(192, 64, options.highlights);
    if (options.midtones)
        adjustCurvesTargetPoints(128, 128, options.midtones);
    if (options.shadows)
        adjustCurvesTargetPoints(64, 64, options.shadows);
    if (options.blacks)
        adjustCurvesTargetPoints(0, 32, options.blacks);
    if (!hasAdjustment)
        return [];
    return curves;
}
function hslAdjustments(imageData$$1, adjustments) {
    if (!adjustments.length)
        return imageData$$1;
    imageData$$1 = imageData.ImageData.toHSL(imageData$$1);
    const hueAdjustments = new Int8Array(360);
    const saturationAdjustments = new Float32Array(360);
    const lightnessAdjustments = new Float32Array(360);
    for (let i = 0; i < 360; i++) {
        hueAdjustments[i] = 0;
        saturationAdjustments[i] = 0;
        lightnessAdjustments[i] = 0;
    }
    for (const adjustment of adjustments) {
        const { targetHue, targetBreadth = 45, hueShift = 0, saturationShift = 0, lightnessShift = 0, } = adjustment;
        if (!Number.isInteger(targetHue) || !Number.isInteger(targetBreadth))
            throw new Error('Invalid hue target range');
        for (let i = targetHue - targetBreadth; i < targetHue + targetBreadth; i++) {
            let hueToShift = i;
            while (hueToShift < 0)
                hueToShift += 360;
            hueToShift = hueToShift % 360;
            const distanceRatioFromTarget = Math.min(Math.abs(targetHue - hueToShift), Math.abs(targetHue + 360 - hueToShift), Math.abs(targetHue - 360 - hueToShift)) / targetBreadth;
            const percentageToApply = Math.sqrt(1 - distanceRatioFromTarget);
            hueAdjustments[hueToShift] += hueShift * percentageToApply;
            saturationAdjustments[hueToShift] += saturationShift * percentageToApply;
            lightnessAdjustments[hueToShift] += lightnessShift * percentageToApply;
        }
    }
    for (let x = 0; x < imageData$$1.width; x++) {
        for (let y = 0; y < imageData$$1.height; y++) {
            const index = imageData.ImageData.indexFor(imageData$$1, x, y);
            const hue = imageData$$1.data[index];
            const saturation = imageData$$1.data[index + 1];
            const lightness = imageData$$1.data[index + 2];
            if (hueAdjustments[hue] === 0 &&
                saturationAdjustments[hue] === 0 &&
                lightnessAdjustments[hue] === 0)
                continue;
            const saturationDistance = 1 - saturation;
            const lightnessDistance = Math.abs(0.5 - lightness) / 0.5;
            const overallDistance = Math.sqrt(Math.pow(saturationDistance, 2) + Math.pow(lightnessDistance, 2));
            if (overallDistance >= 1)
                continue;
            const adjustmentPercentage = 1 - overallDistance;
            imageData$$1.data[index + 0] = imageData.ImageData.clipChannel(hue + adjustmentPercentage * hueAdjustments[hue], types.ColorChannel.Hue);
            imageData$$1.data[index + 1] = imageData.ImageData.clipChannel(saturation + adjustmentPercentage * saturationAdjustments[hue], types.ColorChannel.Saturation);
            imageData$$1.data[index + 2] = imageData.ImageData.clipChannel(lightness + adjustmentPercentage * lightnessAdjustments[hue], types.ColorChannel.Lightness);
        }
    }
    return imageData$$1;
}
exports.hslAdjustments = hslAdjustments;
function saturation(imageData$$1, options) {
    imageData$$1 = imageData.ImageData.toHSL(imageData$$1);
    for (let x = 0; x < imageData$$1.width; x++) {
        for (let y = 0; y < imageData$$1.height; y++) {
            const index = imageData.ImageData.indexFor(imageData$$1, x, y, 1);
            const saturation = imageData$$1.data[index];
            imageData$$1.data[index] = imageData.ImageData.clipChannel(saturation * (1 + options.saturation), types.ColorChannel.Saturation);
        }
    }
    return imageData$$1;
}
function tone(imageData$$1, options) {
    const { colorspace } = imageData$$1;
    const unsafeCurves = [];
    const toneCurve = convertToneToCurves(options);
    if (toneCurve)
        unsafeCurves.push(toneCurve);
    if (options.contrast)
        unsafeCurves.push(convertContrastToCurves(options));
    if (options.curve)
        unsafeCurves.push(options.curve);
    if (unsafeCurves.length) {
        imageData$$1 = imageData.ImageData.toYCbCr(imageData$$1);
        imageData$$1 = curves(imageData$$1, unsafeCurves);
    }
    if (options.hsl)
        imageData$$1 = hslAdjustments(imageData$$1, options.hsl);
    if (options.saturation)
        imageData$$1 = saturation(imageData$$1, options);
    if (options.redCurve || options.greenCurve || options.blueCurve) {
        imageData$$1 = imageData.ImageData.toRGB(imageData$$1);
        if (options.redCurve)
            curves(imageData$$1, options.redCurve, types.ColorChannel.Red);
        if (options.greenCurve)
            curves(imageData$$1, options.greenCurve, types.ColorChannel.Green);
        if (options.blueCurve)
            curves(imageData$$1, options.blueCurve, types.ColorChannel.Blue);
    }
    return imageData.ImageData.toColorspace(imageData$$1, colorspace);
}
exports.tone = tone;

});

unwrapExports(tone_1);

var matrix = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isDeepMatrix(matrix) {
    return Array.isArray(matrix[0]);
}
function ensureFlatMatrix(matrix) {
    if (!matrix.length) {
        throw new Error('Matrix must have length');
    }
    let flatMatrix = matrix;
    if (isDeepMatrix(matrix)) {
        flatMatrix = matrix.reduce((acc, arr) => acc.concat(arr), []);
    }
    const matrixSize = Math.sqrt(flatMatrix.length);
    if (matrixSize !== Math.round(matrixSize)) {
        throw new Error('Matrix must be square');
    }
    return flatMatrix;
}
exports.ensureFlatMatrix = ensureFlatMatrix;

});

unwrapExports(matrix);

var convolve_1 = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable */



function convolve(imageData$$1, flatOrDeepMatrix) {
    imageData.ImageData.assert(imageData$$1, [types.Colorspace.RGBA]);
    const matrix$$1 = matrix.ensureFlatMatrix(flatOrDeepMatrix);
    const srcPixels = imageData$$1.data;
    const dstPixels = new Uint8Array(imageData$$1.data.length);
    const imageWidth = imageData$$1.width;
    const imageHeight = imageData$$1.height;
    const matrixWidth = Math.sqrt(matrix$$1.length);
    const matrixHalfWidth = Math.floor(matrixWidth / 2);
    for (var y = 0; y < imageHeight; y++) {
        for (var x = 0; x < imageWidth; x++) {
            var r = 0;
            var g = 0;
            var b = 0;
            var a = 0;
            var totalWeight = 0;
            for (var matrixY = 0; matrixY < matrixWidth; matrixY++) {
                for (var matrixX = 0; matrixX < matrixWidth; matrixX++) {
                    const srcX = x + matrixX - matrixHalfWidth;
                    const srcY = y + matrixY - matrixHalfWidth;
                    if (srcX >= 0 && srcY >= 0 && srcX < imageWidth && srcY < imageHeight) {
                        const srcOffset = (srcY * imageWidth + srcX) * 4;
                        const weight = matrix$$1[matrixY * matrixWidth + matrixX];
                        totalWeight += weight;
                        r += srcPixels[srcOffset] * weight;
                        g += srcPixels[srcOffset + 1] * weight;
                        b += srcPixels[srcOffset + 2] * weight;
                        a += srcPixels[srcOffset + 3] * weight;
                    }
                }
            }
            var outputIndex = (y * imageWidth + x) * 4;
            dstPixels[outputIndex] = imageData.ImageData.clip255(Math.round(r / totalWeight));
            dstPixels[outputIndex + 1] = imageData.ImageData.clip255(Math.round(g / totalWeight));
            dstPixels[outputIndex + 2] = imageData.ImageData.clip255(Math.round(b / totalWeight));
            dstPixels[outputIndex + 3] = imageData.ImageData.clip255(Math.round(a / totalWeight));
        }
    }
    return Object.assign({}, imageData$$1, { data: dstPixels });
}
exports.convolve = convolve;

});

unwrapExports(convolve_1);

var blur = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable */



/**
 * Computes the convolution matrix weights for a gaussian blur of given sigma.
 * @see https://en.wikipedia.org/wiki/Gaussian_filter
 *
 * @param sigma
 */
function weightsForGauss(sigma) {
    var width = 4 * (sigma - 1);
    if (width % 2 === 0) {
        width++;
    }
    const center = Math.floor(width / 2);
    const denominator = 2 * sigma * sigma;
    const weights = [];
    for (var y = 0; y < width; y++) {
        const row = [];
        for (var x = 0; x < width; x++) {
            const xComponent = Math.pow(y - center, 2) / denominator;
            const yComponent = Math.pow(x - center, 2) / denominator;
            // Note that the 1 / 2π term can be omitted because it is constant with respect to x and y
            row[x] = Math.exp(-1 * (xComponent + yComponent));
        }
        weights.push(row);
    }
    return weights;
}
/**
 * Gaussian blur can be approximated by a series of box blurs much faster than real gauss.
 * Inspired by https://www.peterkovesi.com/matlabfns/Spatial/solveinteg.m
 *
 * @param sigma The desired gaussian sigma
 * @param numPasses Total number of approximation passes to use
 */
function approximateWidthsForGauss(sigma, numPasses) {
    const idealWidth = Math.sqrt((12 * sigma * sigma) / numPasses + 1);
    var lowerWidth = Math.floor(idealWidth);
    if (lowerWidth % 2 === 0) {
        lowerWidth--;
    }
    const upperWidth = lowerWidth + 2;
    const totalArea = numPasses * lowerWidth * lowerWidth;
    const numPassesWithSmallerWidth = (12 * sigma * sigma - totalArea - 4 * numPasses * lowerWidth - 3 * numPasses) /
        (-4 * lowerWidth - 4);
    const sizes = [];
    for (var i = 0; i < numPasses; i++) {
        sizes.push(i < numPassesWithSmallerWidth ? lowerWidth : upperWidth);
    }
    return sizes;
}
/**
 *
 * @param iterationDimension The dimension to iterate over (i.e. width/height), pixels will **not** blur in this direction
 * @param blurDimension The dimension to blur over (i.e width/height), pixels **will** blur in this direction
 * @param channels
 * @param getIndex Function to get the index for a particular dimension pair and channel
 * @param srcPixels
 * @param radius
 */
function boxBlur1D(iterationDimension, blurDimension, channels, getIndex, srcPixels, radius) {
    // TODO: refactor this function to pass enum of blur direction
    // weight = box dimension = radius + center pixel + radius = 2r + 1
    const weight = radius * 2 + 1;
    const outPixels = new Uint8Array(srcPixels.length);
    for (var i = 0; i < iterationDimension; i++) {
        for (var channel = 0; channel < channels; channel++) {
            const firstValueIndex = getIndex(i, 0, channel);
            const lastValueIndex = getIndex(i, blurDimension - 1, channel);
            const firstValue = srcPixels[firstValueIndex];
            const lastValue = srcPixels[lastValueIndex];
            // value will hold our average values and become the new pixel value
            var value = firstValue * (radius + 1);
            // compute the initial value
            for (var j = 0; j < radius; j++) {
                const index = getIndex(i, j, channel);
                value += srcPixels[index];
            }
            // Special handling for the first edge
            for (var j = 0; j <= radius; j++) {
                const index = getIndex(i, j, channel);
                const nextIndex = getIndex(i, j + radius, channel);
                value += srcPixels[nextIndex] - firstValue;
                outPixels[index] = value / weight;
            }
            // Blur the middle by sliding the box across the blurDimension
            for (var j = radius + 1; j < blurDimension - radius; j++) {
                const index = getIndex(i, j, channel);
                const nextIndex = getIndex(i, j + radius, channel);
                const falloffIndex = getIndex(i, j - radius - 1, channel);
                value += srcPixels[nextIndex] - srcPixels[falloffIndex];
                outPixels[index] = value / weight;
            }
            // Special handling for the last edge
            for (var j = blurDimension - radius; j < blurDimension; j++) {
                const index = getIndex(i, j, channel);
                const falloffIndex = getIndex(i, j - radius, channel);
                value += lastValue - srcPixels[falloffIndex];
                outPixels[index] = value / weight;
            }
        }
    }
    return outPixels;
}
function boxBlur(imageData$$1, options) {
    imageData.ImageData.assert(imageData$$1, [types.Colorspace.RGBA, types.Colorspace.RGB, types.Colorspace.Greyscale]);
    var radius = options.radius;
    if (!radius) {
        radius = Math.ceil(imageData$$1.width / 1000);
    }
    // Blur vertically, i.e. iterate over all columns blurring within each column
    const intermediate = boxBlur1D(imageData$$1.width, imageData$$1.height, imageData$$1.channels, (i, j, c) => imageData.ImageData.indexFor(imageData$$1, i, j, c), imageData$$1.data, radius);
    // Blur horizontally, note that height/width and j/i are transposed here
    const outPixels = boxBlur1D(imageData$$1.height, imageData$$1.width, imageData$$1.channels, (j, i, c) => imageData.ImageData.indexFor(imageData$$1, i, j, c), intermediate, radius);
    for (var i = 0; i < outPixels.length; i++) {
        outPixels[i] = Math.round(outPixels[i]);
    }
    return Object.assign({}, imageData$$1, { data: outPixels });
}
exports.boxBlur = boxBlur;
function gaussianBlur(imageData$$1, options) {
    imageData.ImageData.assert(imageData$$1, [types.Colorspace.RGBA, types.Colorspace.RGB, types.Colorspace.Greyscale]);
    var sigma = options.sigma;
    if (!sigma) {
        const radius = options.radius || 2;
        sigma = 1 + radius / 2;
    }
    const approximate = typeof options.approximate === 'boolean' ? options.approximate : sigma >= 5;
    if (approximate) {
        const widths = approximateWidthsForGauss(sigma, 3);
        var blurred = imageData$$1;
        widths.forEach(width => {
            blurred = boxBlur(blurred, { radius: (width - 1) / 2 });
        });
        return blurred;
    }
    else {
        const weights = weightsForGauss(sigma);
        return convolve_1.convolve(imageData$$1, weights);
    }
}
exports.gaussianBlur = gaussianBlur;

});

unwrapExports(blur);

var canny_1 = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable */



function sumArray(arr) {
    return arr.reduce((a, b) => a + b, 0);
}
/**
 * Non-maximal supression is "edge thinning".
 * It finds the local contrast maxima and, in a sobel image, sets all other weaker values to black.
 *
 * @param imageData
 * @param radius
 */
function nonMaximalSuppresion(imageData$$1, radius) {
    const dstPixels = new Uint8Array(imageData$$1.data.length);
    var dstIndex = 0;
    for (var y = 0; y < imageData$$1.height; y++) {
        for (var x = 0; x < imageData$$1.width; x++) {
            // Ignore all borders
            if (imageData.ImageData.isBorder(imageData$$1, x, y)) {
                dstPixels[dstIndex] = 0;
                dstIndex++;
                continue;
            }
            var srcIndex = y * imageData$$1.width + x;
            var srcPixel = imageData$$1.data[srcIndex];
            var pixels = imageData.ImageData.getPixelsForAngle(imageData$$1, x, y, imageData$$1.angles[srcIndex], radius);
            var isMaxima = true;
            for (var i = 0; i < pixels.length; i++) {
                if (pixels[i].values[0] > srcPixel) {
                    isMaxima = false;
                    break;
                }
            }
            if (isMaxima) {
                dstPixels[dstIndex] = srcPixel;
            }
            else {
                dstPixels[dstIndex] = 0;
            }
            dstIndex++;
        }
    }
    return Object.assign({}, imageData$$1, { data: new Uint8Array(dstPixels) });
}
/**
 * Hysteresis is "edge removal"
 * Strong edges are edges with an intensity above highThreshold.
 * Weak edges are edges with an intensity above lowThreshold.
 *
 * Strong edges are kept, and weak edges *that connect strong edges* are kept.
 *
 * @param imageData
 * @param options
 */
function hysteresis(imageData$$1, options) {
    const dstPixels = new Uint8Array(imageData$$1.data.length);
    const seen = new Uint8Array(imageData$$1.data.length);
    for (var y = 0; y < imageData$$1.height; y++) {
        for (var x = 0; x < imageData$$1.width; x++) {
            const srcIndex = y * imageData$$1.width + x;
            // We've already traced this pixel's edge, skip it
            if (seen[srcIndex]) {
                continue;
            }
            // Ignore all borders
            if (imageData.ImageData.isBorder(imageData$$1, x, y)) {
                dstPixels[srcIndex] = 0;
                continue;
            }
            const srcPixel = imageData$$1.data[srcIndex];
            // If the pixel is not even a weak edge, we can skip it
            if (srcPixel < options.lowThreshold) {
                dstPixels[srcIndex] = 0;
                continue;
            }
            // If the pixel is already a strong edge, we can skip it
            if (srcPixel >= options.highThreshold) {
                dstPixels[srcIndex] = 255;
                continue;
            }
            // We're now in a weak edge situation, we need to traverse this entire edge
            // until we reach the end or we find a strong edge it's connected to.
            const queue = [
                { x, y, values: [srcPixel], index: srcIndex, colorspace: types.Colorspace.Greyscale },
            ];
            const traversed = new Set();
            var foundStrongEdge = false;
            while (queue.length) {
                const location = queue.shift();
                traversed.add(location.index);
                // We found our strong edge, we can stop
                if (location.values[0] >= options.highThreshold) {
                    foundStrongEdge = true;
                    break;
                }
                // Get the edge angle and queue up the neighboring pixels
                const edgeAngle = (imageData$$1.angles[location.index] + 90) % 180;
                const pixels = imageData.ImageData.getPixelsForAngle(imageData$$1, x, y, edgeAngle);
                pixels.forEach(pixel => {
                    const index = pixel.index;
                    if (traversed.has(index)) {
                        // We already looked at this pixel, don't add it to the queue again
                        return;
                    }
                    else if (pixel.values[0] >= options.lowThreshold) {
                        // We found another edge pixel, queue it up for inspection
                        queue.push(pixel);
                    }
                    else {
                        // We reached the end of the edge, nothing more to queue
                        dstPixels[index] = 0;
                        seen[index] = 1;
                    }
                });
            }
            // Everything left in the queue must be a strong edge too, the queue would be empty if it were weak
            for (const pixel of queue) {
                dstPixels[pixel.index] = 255;
                seen[pixel.index] = 1;
            }
            // Update everything we saw with the result of the strong edge search
            for (const seenIndex of traversed) {
                dstPixels[seenIndex] = foundStrongEdge ? 255 : 0;
                seen[seenIndex] = 1;
            }
        }
    }
    return Object.assign({}, imageData$$1, { data: dstPixels });
}
function autoThreshold(imageData$$1) {
    var buckets = [];
    for (var i = 0; i < 256; i++) {
        buckets[i] = 0;
    }
    for (var i = 0; i < imageData$$1.data.length; i++) {
        buckets[imageData$$1.data[i]]++;
    }
    var variance = -Infinity;
    var threshold = 100;
    var left = buckets.slice(0, 20);
    var right = buckets.slice(20);
    var leftSum = sumArray(left.map((x, i) => x * i));
    var rightSum = sumArray(right.map((x, i) => x * (i + 20)));
    var leftCount = sumArray(left);
    var rightCount = sumArray(right);
    for (var i = 20; i < 240; i++) {
        var bucketVal = buckets[i];
        leftSum += bucketVal * i;
        rightSum -= bucketVal * i;
        leftCount += bucketVal;
        rightCount -= bucketVal;
        var leftMean = leftSum / leftCount;
        var rightMean = rightSum / rightCount;
        var bucketVariance = Math.pow(leftMean - rightMean, 2) *
            (leftCount / imageData$$1.data.length) *
            (rightCount / imageData$$1.data.length);
        if (bucketVariance > variance) {
            variance = bucketVariance;
            threshold = i;
        }
    }
    return threshold;
}
/**
 * Performs Canny edge detection on the image data.
 * If a sobel filter has not already been run, this function will run sobel as well.
 *
 * @see https://en.wikipedia.org/wiki/Canny_edge_detector
 * @param imageData
 * @param options
 */
function canny(imageData$$1, options) {
    options = options || {};
    options.radius = options.radius || 1;
    var sobelImageData = imageData$$1;
    if (!sobelImageData.angles) {
        sobelImageData = sobel_1.sobel(imageData$$1, options);
    }
    imageData.ImageData.assert(sobelImageData, [types.Colorspace.Greyscale]);
    if (!options.lowThreshold && !options.highThreshold) {
        const threshold = autoThreshold(sobelImageData);
        options.highThreshold = threshold;
        options.lowThreshold = threshold / 2;
    }
    else if (!options.lowThreshold) {
        options.lowThreshold = options.highThreshold / 2;
    }
    else if (!options.highThreshold) {
        options.highThreshold = options.lowThreshold * 2;
    }
    const suppressed = nonMaximalSuppresion(sobelImageData, options.radius);
    return hysteresis(suppressed, options);
}
exports.canny = canny;

});

unwrapExports(canny_1);

var sharpen_1 = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function createSharpenMatrix(options) {
    const { strength = 1 } = options;
    const edgeValue = -1 * strength;
    const centerValue = -4 * edgeValue + 1;
    return [
        [0, edgeValue, 0],
        [edgeValue, centerValue, edgeValue],
        [0, edgeValue, 0],
    ];
}
function sharpen(imageData, options) {
    return convolve_1.convolve(imageData, createSharpenMatrix(options));
}
exports.sharpen = sharpen;

});

unwrapExports(sharpen_1);

var calibrate_1 = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable */


function toXYZ(hue, saturation, lightness) {
    const imageData$$1 = {
        width: 1,
        height: 1,
        channels: 3,
        colorspace: types.Colorspace.HSL,
        data: [hue, saturation, lightness],
    };
    return imageData.ImageData.toXYZ(imageData$$1).data;
}
function getCalibrationProfile(options) {
    const { redHueShift = 0, greenHueShift = 0, blueHueShift = 0 } = options;
    const [xRed, yRed, zRed] = toXYZ((360 + redHueShift * 45) % 360, 1, 0.5);
    const [xGreen, yGreen, zGreen] = toXYZ(120 + greenHueShift * 45, 1, 0.5);
    const [xBlue, yBlue, zBlue] = toXYZ(240 + blueHueShift * 45, 1, 0.5);
    return {
        xRed,
        yRed,
        zRed,
        xGreen,
        yGreen,
        zGreen,
        xBlue,
        yBlue,
        zBlue,
    };
}
function saturate(imageData$$1, intensity, channel) {
    const channelIndex = imageData.ImageData.channelsFor(imageData$$1.colorspace).indexOf(channel);
    for (let x = 0; x < imageData$$1.width; x++) {
        for (let y = 0; y < imageData$$1.height; y++) {
            const offset = imageData.ImageData.indexFor(imageData$$1, x, y);
            const primaryValue = imageData$$1.data[offset + channelIndex];
            for (let c = 0; c < imageData$$1.channels; c++) {
                if (c === channelIndex)
                    continue;
                const secondaryValue = imageData$$1.data[offset + c];
                const diffToPrimary = Math.max(primaryValue - secondaryValue, 0);
                imageData$$1.data[offset + c] = imageData.ImageData.clip255(secondaryValue - diffToPrimary * intensity);
            }
        }
    }
    return imageData$$1;
}
function desaturate(imageData$$1, intensity, targetChannel) {
    const channels = imageData.ImageData.channelsFor(imageData$$1.colorspace);
    const channelIndex = channels.indexOf(targetChannel);
    // Green desaturates most, then blue, then red, red ends up desaturating everything later
    const intensityByChannel = [0.5, 0.7, 0.6];
    for (let x = 0; x < imageData$$1.width; x++) {
        for (let y = 0; y < imageData$$1.height; y++) {
            const offset = imageData.ImageData.indexFor(imageData$$1, x, y);
            const primaryValue = imageData$$1.data[offset + channelIndex];
            for (let c = 0; c < imageData$$1.channels; c++) {
                if (c === channelIndex)
                    continue;
                const secondaryValue = imageData$$1.data[offset + c];
                const diffToPrimary = Math.max(primaryValue - secondaryValue, 0);
                const multiplier = intensity * intensityByChannel[channelIndex];
                imageData$$1.data[offset + c] = imageData.ImageData.clip255(secondaryValue + diffToPrimary * multiplier);
            }
            let r = imageData$$1.data[offset + 0];
            let g = imageData$$1.data[offset + 1];
            let b = imageData$$1.data[offset + 2];
            const saturationIntensity = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
            if (targetChannel === types.ColorChannel.Red) {
                // Desaturate blue and green too
                const gr = Math.max(g - r, 0) * 1.5;
                const gb = Math.max(g - b, 0) * 1.5;
                const br = Math.max(b - r, 0) * 0.75;
                const bg = Math.max(b - g, 0) * 0.75;
                r += Math.max(gr, br) * intensity * 0.3;
                g += bg * intensity * 0.3;
                b += gb * intensity * 0.3;
            }
            else if (targetChannel === types.ColorChannel.Green) {
                // Desaturate red a little more
                const rg = Math.max(r - g, 0);
                const rb = Math.max(r - b, 0);
                g += rg * intensity * 0.2;
                b += rb * intensity * 0.2;
            }
            else if (targetChannel === types.ColorChannel.Blue) {
                // Step 2, bring green up for red and red up for green slightly
                const rgTradeoff = Math.abs(r - g) * 0.05 * saturationIntensity;
                if (r > g) {
                    r -= rgTradeoff * 3;
                    g += rgTradeoff;
                }
                else {
                    r += rgTradeoff * 6;
                    g -= rgTradeoff * 2;
                }
            }
            // Clip the color intensities based on how saturated they are
            // i.e. 255,0,0 -> 230,0,0 BUT 255,255,255 -> 255,255,255
            r *= 1 - saturationIntensity * 0.12;
            g *= 1 - saturationIntensity * 0.12;
            b *= 1 - saturationIntensity * 0.12;
            imageData$$1.data[offset + 0] = imageData.ImageData.clip255(r);
            imageData$$1.data[offset + 1] = imageData.ImageData.clip255(g);
            imageData$$1.data[offset + 2] = imageData.ImageData.clip255(b);
        }
    }
    return imageData$$1;
}
function calibrate(imageData$$1, options) {
    const { colorspace } = imageData$$1;
    if (options.redHueShift || options.greenHueShift || options.blueHueShift) {
        // Hue transforms are conversion to XYZ colorspace using the RGB values of the hue shifted primaries
        const profile = getCalibrationProfile(options);
        imageData$$1 = imageData.ImageData.toXYZ(imageData$$1, profile);
        imageData$$1 = imageData.ImageData.toRGB(imageData$$1);
    }
    imageData$$1 = imageData.ImageData.toRGB(imageData$$1);
    const { Red, Green, Blue } = types.ColorChannel;
    const { redSaturationShift = 0, greenSaturationShift = 0, blueSaturationShift = 0 } = options;
    if (redSaturationShift > 0)
        imageData$$1 = saturate(imageData$$1, redSaturationShift, Red);
    if (greenSaturationShift > 0)
        imageData$$1 = saturate(imageData$$1, greenSaturationShift, Green);
    if (blueSaturationShift > 0)
        imageData$$1 = saturate(imageData$$1, blueSaturationShift, Blue);
    if (redSaturationShift < 0)
        imageData$$1 = desaturate(imageData$$1, -redSaturationShift, Red);
    if (greenSaturationShift < 0)
        imageData$$1 = desaturate(imageData$$1, -greenSaturationShift, Green);
    if (blueSaturationShift < 0)
        imageData$$1 = desaturate(imageData$$1, -blueSaturationShift, Blue);
    return imageData.ImageData.toColorspace(imageData$$1, colorspace);
}
exports.calibrate = calibrate;

});

unwrapExports(calibrate_1);

var opacity_1 = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });


// tslint:disable-next-line
const BufferConstructor = typeof Buffer === 'undefined' ? Uint8Array : Buffer;
function opacity(background, foreground, opacity) {
    const isUint8 = background.data instanceof Uint8Array ||
        background.data instanceof Uint8ClampedArray ||
        background.data instanceof BufferConstructor;
    if (background.colorspace !== foreground.colorspace)
        throw new Error('Colorspaces must match');
    if (background.data.length !== foreground.data.length)
        throw new Error('Sizes must match');
    if (!isUint8)
        throw new Error(`Must be Uint8Array but got ${background.data}`);
    const newData = new Uint8Array(background.data.length);
    if (background.colorspace === types.Colorspace.RGBA) {
        for (let x = 0; x < background.width; x++) {
            for (let y = 0; y < background.height; y++) {
                const index = imageData.ImageData.indexFor(background, x, y);
                const opacityForegroundSrc = foreground.data[index + 3] / 255;
                const opacityForeground = opacity * opacityForegroundSrc;
                const opacityBackground = background.data[index + 3] / 255;
                if (opacityBackground !== 1)
                    throw new Error('Cannot handle transparent backgrounds');
                const foregroundMultiplier = opacityForeground;
                const backgroundMultiplier = 1 - opacityForeground;
                newData[index] = Math.round(background.data[index] * backgroundMultiplier +
                    foreground.data[index] * foregroundMultiplier);
                newData[index + 1] = Math.round(background.data[index + 1] * backgroundMultiplier +
                    foreground.data[index + 1] * foregroundMultiplier);
                newData[index + 2] = Math.round(background.data[index + 2] * backgroundMultiplier +
                    foreground.data[index + 2] * foregroundMultiplier);
                newData[index + 3] = 255;
            }
        }
    }
    else {
        const foregroundMultiplier = opacity;
        const backgroundMultiplier = 1 - opacity;
        for (let i = 0; i < background.data.length; i++) {
            // Assuming the input data is clipped, there's no need to clip here either
            newData[i] = Math.round(background.data[i] * backgroundMultiplier + foreground.data[i] * foregroundMultiplier);
        }
    }
    return Object.assign({}, background, { data: newData });
}
exports.opacity = opacity;

});

unwrapExports(opacity_1);

var alea = createCommonjsModule(function (module, exports) {
"use strict";
// A port of an algorithm by Johannes Baagøe <baagoe@baagoe.com>, 2010
// http://baagoe.com/en/RandomMusings/javascript/
// https://github.com/nquinlan/better-random-numbers-for-javascript-mirror
// Original work is under MIT license -
Object.defineProperty(exports, "__esModule", { value: true });
function createPRNG(seed) {
    const mash = Mash();
    const generator = {
        // Apply the seeding algorithm from Baagoe.
        c: 1,
        s0: mash(' '),
        s1: mash(' '),
        s2: mash(' '),
        next() {
            const t = 2091639 * generator.s0 + generator.c * 2.3283064365386963e-10; // 2^-32
            generator.s0 = generator.s1;
            generator.s1 = generator.s2;
            return (generator.s2 = t - (generator.c = t | 0));
        },
    };
    generator.s0 -= mash(seed);
    if (generator.s0 < 0) {
        generator.s0 += 1;
    }
    generator.s1 -= mash(seed);
    if (generator.s1 < 0) {
        generator.s1 += 1;
    }
    generator.s2 -= mash(seed);
    if (generator.s2 < 0) {
        generator.s2 += 1;
    }
    return generator;
}
exports.createPRNG = createPRNG;
function Mash() {
    let n = 0xefc8249d;
    const mash = function (data) {
        data = data.toString();
        for (let i = 0; i < data.length; i++) {
            n += data.charCodeAt(i);
            let h = 0.02519603282416938 * n;
            n = h >>> 0;
            h -= n;
            h *= n;
            n = h >>> 0;
            h -= n;
            n += h * 0x100000000; // 2^32
        }
        return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
    };
    return mash;
}

});

unwrapExports(alea);

var noise_1 = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });



function noise(width, height, options = {}) {
    const { seed = 'noise' } = options;
    const prng = alea.createPRNG(seed);
    const data = new Uint8Array(width * height);
    const imageData$$1 = { width, height, data, colorspace: types.Colorspace.Greyscale, channels: 1 };
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            data[imageData.ImageData.indexFor(imageData$$1, x, y)] = imageData.ImageData.clip255(prng.next() * 255);
        }
    }
    return imageData$$1;
}
exports.noise = noise;

});

unwrapExports(noise_1);

var image = createCommonjsModule(function (module, exports) {
"use strict";
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });




















function isEmpty(o) {
    return Object.keys(o).every(key => !o[key]);
}
class Image {
    constructor() {
        this._output = {};
    }
    reset() {
        this._output = {};
        return this;
    }
    options(options) {
        if (options.analyze)
            this.analyze(options.analyze);
        if (options.format)
            this.format(options.format);
        if (options.resize)
            this.resize(options.resize);
        if (options.layers)
            this.layers(options.layers);
        if (options.normalize)
            this.normalize(options.normalize);
        if (options.calibrate)
            this.calibrate(options.calibrate);
        if (options.tone)
            this.tone(options.tone);
        if (options.greyscale)
            this.greyscale(options.greyscale);
        if (options.sharpen)
            this.sharpen(options.sharpen);
        if (options.edges)
            this.edges(options.edges);
        if (options.effects)
            this.effects(options.effects);
        return this;
    }
    format(options) {
        if (typeof options === 'string') {
            options = { type: options };
        }
        const { type } = options;
        if (type !== types.ImageFormat.JPEG &&
            type !== types.ImageFormat.PNG &&
            type !== types.ImageFormat.NoTranscode) {
            throw new Error(`Unrecognized format: ${type}`);
        }
        const defaultOpts = type === types.ImageFormat.JPEG ? { quality: 90 } : {};
        this._output.format = Object.assign({}, defaultOpts, options);
        return this;
    }
    resize(options) {
        const { Exact, Auto } = types.ImageResizeFit;
        if (!options.width && !options.height && !options.subselect) {
            throw new TypeError('Must specify a width, height, or subselect');
        }
        const canCalculateDimensions = options.fit && (options.fit === Exact || options.fit === Auto);
        if ((!options.width || !options.height) && !canCalculateDimensions) {
            throw new TypeError(`Must specify width and height with "${options.fit}" fit`);
        }
        this._output.resize = Object.assign({ fit: Exact, method: types.ImageResizeMethod.Bilinear }, options);
        return this;
    }
    layers(layers) {
        this._output.layers = layers;
        return this;
    }
    normalize(normalize) {
        this._output.normalize = normalize;
        return this;
    }
    calibrate(options) {
        this._output.calibrate = options;
        return this;
    }
    tone(options) {
        this._output.tone = options;
        return this;
    }
    greyscale(isGreyscale = true) {
        this._output.greyscale = isGreyscale;
        return this;
    }
    sharpen(options = {}) {
        this._output.sharpen = options;
        return this;
    }
    edges(method = types.EdgeMethod.Sobel) {
        let options = method;
        if (typeof method === 'string') {
            options = { method };
        }
        this._output.edges = Object.assign({ radius: 1, blurSigma: 2 }, options);
        return this;
    }
    effects(effects) {
        this._output.effects = effects;
        return this;
    }
    analyze(options) {
        this._analyze = options;
        return this;
    }
    toAnalysis() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._analyze) {
                return Promise.resolve({});
            }
            const { hash: hash$$1, faces, objects, sharpness: sharpness$$1, histograms, composition } = this._analyze;
            if (Object.keys(this._analyze).length === 0) {
                return Promise.resolve({});
            }
            const imageData$$1 = yield this.toImageData();
            const edges = sharpness$$1 || composition || (hash$$1 && hash$$1.method === types.HashMethod.LumaHash)
                ? sobel_1.sobel(imageData$$1, sharpness$$1)
                : null;
            const analysis = {};
            if (hash$$1) {
                switch (hash$$1.method) {
                    case types.HashMethod.LumaHash:
                        analysis.hash = hash.lumaHash(edges, hash$$1);
                        break;
                    case types.HashMethod.PHash:
                    default:
                        analysis.hash = hash.phash(imageData$$1, hash$$1.hashSize);
                }
            }
            if (objects) {
                analysis.objects = yield empty.detectObjects(imageData$$1, objects);
            }
            if (sharpness$$1) {
                analysis.sharpness = sharpness.sharpness(edges, sharpness$$1);
            }
            if (histograms) {
                analysis.histograms = histograms_1.histograms(imageData$$1, histograms);
            }
            if (composition) {
                analysis.composition = composition_1.composition(edges, Object.assign({}, composition, { sharpnessAnalysis: analysis.sharpness }));
            }
            if (faces) {
                analysis.faces = yield empty.detectFaces(imageData$$1, faces);
                if (sharpness$$1) {
                    for (const face of analysis.faces.slice(0, 3)) {
                        const boundingBox = {
                            x: Math.round(imageData$$1.width * face.boundingBox.x),
                            y: Math.round(imageData$$1.height * face.boundingBox.y),
                            width: Math.round(imageData$$1.width * face.boundingBox.width),
                            height: Math.round(imageData$$1.height * face.boundingBox.height),
                        };
                        face.sharpness = sharpness.sharpness(edges, Object.assign({}, sharpness$$1, { subselect: boundingBox }));
                    }
                }
            }
            return analysis;
        });
    }
    _applyLayers(image) {
        if (!this._output.layers) {
            return image;
        }
        let imageWithLayers = image;
        for (const layer of this._output.layers) {
            const convertedLayer = imageData.ImageData.toColorspace(layer.imageData, image.colorspace);
            imageWithLayers = opacity_1.opacity(imageWithLayers, convertedLayer, layer.opacity);
        }
        return imageWithLayers;
    }
    _applyNormalize(image) {
        if (!this._output.normalize || isEmpty(this._output.normalize)) {
            return image;
        }
        return normalize_1.normalize(image, this._output.normalize);
    }
    _applyCalibrate(image) {
        if (!this._output.calibrate || isEmpty(this._output.calibrate)) {
            return image;
        }
        return calibrate_1.calibrate(image, this._output.calibrate);
    }
    _applyTone(image) {
        if (!this._output.tone || isEmpty(this._output.tone)) {
            return image;
        }
        return tone_1.tone(image, this._output.tone);
    }
    _applySharpen(image) {
        if (!this._output.sharpen) {
            return image;
        }
        return sharpen_1.sharpen(image, this._output.sharpen);
    }
    _applyEdges(image) {
        if (!this._output.edges) {
            return image;
        }
        const edgeOptions = this._output.edges;
        image = imageData.ImageData.toRGBA(image);
        let edges = image;
        if (edgeOptions.blurSigma) {
            edges = blur.gaussianBlur(image, { sigma: edgeOptions.blurSigma });
        }
        edges = sobel_1.sobel(edges, edgeOptions);
        if (edgeOptions.method === types.EdgeMethod.Canny) {
            edges = canny_1.canny(edges, edgeOptions);
        }
        return edges;
    }
    _applyEffects(image) {
        if (!this._output.effects) {
            return image;
        }
        let imageWithEffects = image;
        for (const effect of this._output.effects) {
            switch (effect.type) {
                case types.EffectType.Noise:
                    const options = effect.options || {};
                    if (options.opacity === 0)
                        continue;
                    const opacityValue = options.opacity || 0.05;
                    const noiseLayer = noise_1.noise(imageWithEffects.width, imageWithEffects.height, effect.options);
                    const noiseMatched = imageData.ImageData.toColorspace(noiseLayer, imageWithEffects.colorspace);
                    imageWithEffects = opacity_1.opacity(imageWithEffects, noiseMatched, opacityValue);
                    break;
                default:
                    throw new Error(`Unrecognized type: ${effect.type}`);
            }
        }
        return imageWithEffects;
    }
    toFile(path) {
        return this.toBuffer().then(buffer => fsUtils.writeFileAsync(path, buffer));
    }
    static from(bufferOrImageData) {
        if (imageData.ImageData.probablyIs(bufferOrImageData)) {
            return this._fromImageData(bufferOrImageData);
        }
        let buffer = bufferOrImageData;
        let exif;
        if (dist.isParseable(buffer)) {
            const decoder = dist.createDecoder(buffer);
            buffer = decoder.extractJPEG();
            exif = dist.parse(decoder);
        }
        return this._fromBuffer(buffer, { exif });
    }
    static _fromBuffer(buffer, metadata) {
        throw new Error('unimplemented');
    }
    static _fromImageData(imageData$$1) {
        throw new Error('unimplemented');
    }
}
exports.Image = Image;
instrumentation.instrumentation.wrapAllMethods(Image.prototype);
// @ts-ignore tslint:disable-next-line
Image._instrumentation = instrumentation.instrumentation;

});

unwrapExports(image);

var subselect_1 = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });


function subselect(imageData$$1, options) {
    if (options.top === 0 &&
        options.bottom === imageData$$1.height &&
        options.left === 0 &&
        options.right === imageData$$1.width) {
        return imageData$$1;
    }
    imageData.ImageData.assert(imageData$$1, [types.Colorspace.RGBA, types.Colorspace.RGB, types.Colorspace.Greyscale]);
    const width = options.right - options.left;
    const height = options.bottom - options.top;
    var data = new Uint8Array(width * height * imageData$$1.channels);
    var output = Object.assign({}, imageData$$1, { width, height, data });
    for (var y = options.top; y < options.bottom; y++) {
        for (var x = options.left; x < options.right; x++) {
            var srcIndex = imageData.ImageData.indexFor(imageData$$1, x, y);
            var dstIndex = imageData.ImageData.indexFor(output, x - options.left, y - options.top);
            for (var c = 0; c < imageData$$1.channels; c++) {
                data[dstIndex + c] = imageData$$1.data[srcIndex + c];
            }
        }
    }
    return output;
}
exports.subselect = subselect;

});

unwrapExports(subselect_1);

var browserImage = createCommonjsModule(function (module, exports) {
"use strict";
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });






class BrowserImage extends image.Image {
    constructor(image$$1, metadata, buffer) {
        super();
        this._image = Promise.resolve(image$$1);
        this._metadata = metadata;
        this._buffer = buffer;
    }
    _applyEXIFOrientation(image$$1) {
        const exif = this._metadata && this._metadata.exif;
        if (!exif || !exif._raw.Orientation) {
            return image$$1;
        }
        /** @see https://www.sno.phy.queensu.ca/~phil/exiftool/TagNames/EXIF.html */
        switch (exif._raw.Orientation) {
            case 1:
                // Do nothing
                break;
            case 3:
                image$$1 = imageData.ImageData.rotate(image$$1, 180);
                break;
            case 6:
                image$$1 = imageData.ImageData.rotate(image$$1, 270); // our rotate is CCW so 360 - 90
                break;
            case 8:
                image$$1 = imageData.ImageData.rotate(image$$1, 90); // our rotate is CCW so 360 - 270
                break;
            default:
                throw new Error(`Unable to handle orientation ${exif._raw.Orientation}`);
        }
        return image$$1;
    }
    _applyResize(image$$1) {
        if (!this._output.resize) {
            return image$$1;
        }
        const options = resize.normalizeOptions(image$$1, this._output.resize);
        if (options.doNotEnlarge) {
            const { width: realWidth = 0, height: realHeight = 0 } = image$$1;
            if (realWidth < options.width)
                return image$$1;
            if (realHeight < options.height)
                return image$$1;
        }
        if (options.subselect) {
            image$$1 = subselect_1.subselect(image$$1, options.subselect);
        }
        switch (options.method) {
            case types.ImageResizeMethod.NearestNeighbor:
                return resize.nearestNeighbor(image$$1, options);
            case types.ImageResizeMethod.Bilinear:
            default:
                return resize.bilinear(image$$1, options);
        }
    }
    _applyGreyscale(image$$1) {
        if (!this._output.greyscale) {
            return image$$1;
        }
        return imageData.ImageData.toGreyscale(image$$1);
    }
    _applyAll(imagePromise) {
        return __awaiter(this, void 0, void 0, function* () {
            let image$$1 = yield imagePromise;
            image$$1 = yield this._applyEXIFOrientation(image$$1);
            image$$1 = yield this._applyGreyscale(image$$1);
            image$$1 = yield this._applyResize(image$$1);
            image$$1 = yield this._applyLayers(image$$1);
            image$$1 = yield this._applyNormalize(image$$1);
            image$$1 = yield this._applyCalibrate(image$$1);
            image$$1 = yield this._applyTone(image$$1);
            image$$1 = yield this._applySharpen(image$$1);
            image$$1 = yield this._applyEdges(image$$1);
            image$$1 = yield this._applyEffects(image$$1);
            return image$$1;
        });
    }
    toMetadata() {
        return this._image.then(imageData$$1 => {
            return Object.assign({}, this._metadata, { width: imageData$$1.width, height: imageData$$1.height, aspectRatio: imageData$$1.width / imageData$$1.height });
        });
    }
    toImageData() {
        return this._applyAll(this._image);
    }
    toBuffer() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._output.format && this._output.format.type === types.ImageFormat.NoTranscode) {
                if (!this._buffer)
                    throw new Error('Unable to return original buffer');
                return this._buffer;
            }
            return this._applyAll(this._image).then(imageData$$1 => imageData.ImageData.toBuffer(imageData$$1, this._output.format || types.DEFAULT_FORMAT));
        });
    }
    static _fromBuffer(buffer, metadata) {
        return new BrowserImage(imageData.ImageData.from(buffer), metadata, buffer);
    }
    static _fromImageData(imageData$$1) {
        return new BrowserImage(imageData.ImageData.normalize(imageData$$1));
    }
}
exports.BrowserImage = BrowserImage;
instrumentation.instrumentation.wrapAllMethods(BrowserImage.prototype);

});

unwrapExports(browserImage);

var sharedIndex = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });



exports.instrumentation = instrumentation.instrumentation;

exports.ImageData = imageData.ImageData;
var hash_1 = hash;
exports.hammingDistance = hash_1.hammingDistance;
exports.subsetDistance = hash_1.subsetDistance;
var types_1 = types;
exports.ImageFormat = types_1.ImageFormat;
exports.ImageResizeFit = types_1.ImageResizeFit;
exports.ImageResizeMethod = types_1.ImageResizeMethod;
exports.EdgeMethod = types_1.EdgeMethod;
exports.HashMethod = types_1.HashMethod;
exports.types = types;
exports.hashes = hash;

});

unwrapExports(sharedIndex);

var browserIndex = createCommonjsModule(function (module, exports) {
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });


exports.Image = browserImage.BrowserImage;
__export(sharedIndex);

});

var browserIndex$1 = unwrapExports(browserIndex);
var browserIndex_1 = browserIndex.Image;

exports['default'] = browserIndex$1;
exports.Image = browserIndex_1;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=bundle.js.map
