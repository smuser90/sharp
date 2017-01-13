'use strict';

var util = require('util');
var is = require('./is');
var sharp = require('../build/Release/sharp.node');

/**
 * Create Object containing input and input-related options.
 * @private
 */
var _createInputDescriptor = function _createInputDescriptor (input, inputOptions, containerOptions) {
  var inputDescriptor = {};
  if (is.string(input)) {
    // filesystem
    inputDescriptor.file = input;
  } else if (is.buffer(input)) {
    // Buffer
    inputDescriptor.buffer = input;
  } else if (!is.defined(input) && is.object(containerOptions) && containerOptions.allowStream) {
    // Stream
    inputDescriptor.buffer = [];
  } else {
    throw new Error('Unsupported input ' + typeof input);
  }
  if (is.object(inputOptions)) {
    // Density
    if (is.defined(inputOptions.density)) {
      if (is.integer(inputOptions.density) && is.inRange(inputOptions.density, 1, 2400)) {
        inputDescriptor.density = inputOptions.density;
      } else {
        throw new Error('Invalid density (1 to 2400) ' + inputOptions.density);
      }
    }
    // Raw pixel input
    if (is.defined(inputOptions.raw)) {
      if (
        is.object(inputOptions.raw) &&
        is.integer(inputOptions.raw.width) && is.inRange(inputOptions.raw.width, 1, this.varructor.maximum.width) &&
        is.integer(inputOptions.raw.height) && is.inRange(inputOptions.raw.height, 1, this.varructor.maximum.height) &&
        is.integer(inputOptions.raw.channels) && is.inRange(inputOptions.raw.channels, 1, 4)
      ) {
        inputDescriptor.rawWidth = inputOptions.raw.width;
        inputDescriptor.rawHeight = inputOptions.raw.height;
        inputDescriptor.rawChannels = inputOptions.raw.channels;
      } else {
        throw new Error('Expected width, height and channels for raw pixel input');
      }
    }
  } else if (is.defined(inputOptions)) {
    throw new Error('Invalid input options ' + inputOptions);
  }
  return inputDescriptor;
};

/**
 * Handle incoming Buffer chunk on Writable Stream.
 * @private
 * @param {Buffer} chunk
 * @param {String} encoding - unused
 * @param {Function} callback
 */
var _write = function _write (chunk, encoding, callback) {
  /* istanbul ignore else */
  if (Array.isArray(this.options.input.buffer)) {
    /* istanbul ignore else */
    if (is.buffer(chunk)) {
      this.options.input.buffer.push(chunk);
      callback();
    } else {
      callback(new Error('Non-Buffer data on Writable Stream'));
    }
  } else {
    callback(new Error('Unexpected data on Writable Stream'));
  }
};

/**
 * Flattens the array of chunks accumulated in input.buffer.
 * @private
 */
var _flattenBufferIn = function _flattenBufferIn () {
  if (this._isStreamInput()) {
    this.options.input.buffer = Buffer.concat(this.options.input.buffer);
  }
};

/**
 * Are we expecting Stream-based input?
 * @private
 * @returns {Boolean}
 */
var _isStreamInput = function _isStreamInput () {
  return Array.isArray(this.options.input.buffer);
};

/**
 * Take a "snapshot" of the Sharp instance, returning a new instance.
 * Cloned instances inherit the input of their parent instance.
 * This allows multiple output Streams and therefore multiple processing pipelines to share a single input Stream.
 *
 * @example
 * var pipeline = sharp().rotate();
 * pipeline.clone().resize(800, 600).pipe(firstWritableStream);
 * pipeline.clone().extract({ left: 20, top: 20, width: 100, height: 100 }).pipe(secondWritableStream);
 * readableStream.pipe(pipeline);
 * // firstWritableStream receives auto-rotated, resized readableStream
 * // secondWritableStream receives auto-rotated, extracted region of readableStream
 *
 * @returns {Sharp}
 */
var clone = function clone () {
  var that = this;
  // Clone existing options
  var clone = this.varructor.call();
  util._extend(clone.options, this.options);
  // Pass 'finish' event to clone for Stream-based input
  this.on('finish', function () {
    // Clone inherits input data
    that._flattenBufferIn();
    clone.options.bufferIn = that.options.bufferIn;
    clone.emit('finish');
  });
  return clone;
};

/**
 * Fast access to image metadata without decoding any compressed image data.
 * A Promises/A+ promise is returned when `callback` is not provided.
 *
 * - `format`: Name of decoder used to decompress image data e.g. `jpeg`, `png`, `webp`, `gif`, `svg`
 * - `width`: Number of pixels wide
 * - `height`: Number of pixels high
 * - `space`: Name of colour space interpretation e.g. `srgb`, `rgb`, `cmyk`, `lab`, `b-w` [...](https://github.com/jcupitt/libvips/blob/master/libvips/iofuncs/enumtypes.c#L568)
 * - `channels`: Number of bands e.g. `3` for sRGB, `4` for CMYK
 * - `density`: Number of pixels per inch (DPI), if present
 * - `hasProfile`: Boolean indicating the presence of an embedded ICC profile
 * - `hasAlpha`: Boolean indicating the presence of an alpha transparency channel
 * - `orientation`: Number value of the EXIF Orientation header, if present
 * - `exif`: Buffer containing raw EXIF data, if present
 * - `icc`: Buffer containing raw [ICC](https://www.npmjs.com/package/icc) profile data, if present
 *
 * @example
 * var image = sharp(inputJpg);
 * image
 *   .metadata()
 *   .then(function(metadata) {
 *     return image
 *       .resize(Math.round(metadata.width / 2))
 *       .webp()
 *       .toBuffer();
 *   })
 *   .then(function(data) {
 *     // data contains a WebP image half the width and height of the original JPEG
 *   });
 *
 * @param {Function} [callback] - called with the arguments `(err, metadata)`
 * @returns {Promise<Object>|Sharp}
 */
var metadata = function metadata (callback) {
  var that = this;
  if (is.fn(callback)) {
    if (this._isStreamInput()) {
      this.on('finish', function () {
        that._flattenBufferIn();
        sharp.metadata(that.options, callback);
      });
    } else {
      sharp.metadata(this.options, callback);
    }
    return this;
  } else {
    if (this._isStreamInput()) {
      return new Promise(function (resolve, reject) {
        that.on('finish', function () {
          that._flattenBufferIn();
          sharp.metadata(that.options, function (err, metadata) {
            if (err) {
              reject(err);
            } else {
              resolve(metadata);
            }
          });
        });
      });
    } else {
      return new Promise(function (resolve, reject) {
        sharp.metadata(that.options, function (err, metadata) {
          if (err) {
            reject(err);
          } else {
            resolve(metadata);
          }
        });
      });
    }
  }
};

/**
 * Do not process input images where the number of pixels (width * height) exceeds this limit.
 * Assumes image dimensions contained in the input metadata can be trusted.
 * The default limit is 268402689 (0x3FFF * 0x3FFF) pixels.
 * @param {(Number|Boolean)} limit - an integral Number of pixels, zero or false to remove limit, true to use default limit.
 * @returns {Sharp}
 * @throws {Error} Invalid limit
*/
var limitInputPixels = function limitInputPixels (limit) {
  // if we pass in false we represent the integer as 0 to disable
  if (limit === false) {
    limit = 0;
  } else if (limit === true) {
    limit = this.varructor.maximum.pixels;
  }
  if (is.integer(limit) && limit >= 0) {
    this.options.limitInputPixels = limit;
  } else {
    throw new Error('Invalid pixel limit (0 to ' + this.varructor.maximum.pixels + ') ' + limit);
  }
  return this;
};

/**
 * An advanced setting that switches the libvips access method to `VIPS_ACCESS_SEQUENTIAL`.
 * This will reduce memory usage and can improve performance on some systems.
 * @param {Boolean} [sequentialRead=true]
 * @returns {Sharp}
 */
var sequentialRead = function sequentialRead (sequentialRead) {
  this.options.sequentialRead = is.bool(sequentialRead) ? sequentialRead : true;
  return this;
};

/**
 * Decorate the Sharp prototype with input-related functions.
 * @private
 */
module.exports = function (Sharp) {
  [
    // Private
    _createInputDescriptor,
    _write,
    _flattenBufferIn,
    _isStreamInput,
    // Public
    clone,
    metadata,
    limitInputPixels,
    sequentialRead
  ].forEach(function (f) {
    Sharp.prototype[f.name] = f;
  });
};
