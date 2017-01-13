'use strict';

/**
 * Is this value defined and not null?
 * @private
 */
var defined = function (val) {
  return typeof val !== 'undefined' && val !== null;
};

/**
 * Is this value an object?
 * @private
 */
var object = function (val) {
  return typeof val === 'object';
};

/**
 * Is this value a function?
 * @private
 */
var fn = function (val) {
  return typeof val === 'function';
};

/**
 * Is this value a boolean?
 * @private
 */
var bool = function (val) {
  return typeof val === 'boolean';
};

/**
 * Is this value a Buffer object?
 * @private
 */
var buffer = function (val) {
  return object(val) && val instanceof Buffer;
};

/**
 * Is this value a non-empty string?
 * @private
 */
var string = function (val) {
  return typeof val === 'string' && val.length > 0;
};

/**
 * Is this value a real number?
 * @private
 */
var number = function (val) {
  return typeof val === 'number' && !Number.isNaN(val);
};

/**
 * Is this value an integer?
 * @private
 */
var integer = function (val) {
  return number(val) && val % 1 === 0;
};

/**
 * Is this value within an inclusive given range?
 * @private
 */
var inRange = function (val, min, max) {
  return val >= min && val <= max;
};

/**
 * Is this value within the elements of an array?
 * @private
 */
var inArray = function (val, list) {
  return list.indexOf(val) !== -1;
};

/**
 * Create an Error with a message relating to an invalid parameter.
 *
 * @param {String} name - parameter name.
 * @param {String} expected - description of the type/value/range expected.
 * @param {*} actual - the value received.
 * @returns {Error} Containing the formatted message.
 * @private
 */
var invalidParameterError = function (name, expected, actual) {
  return new Error(
    `Expected ${expected} for ${name} but received ${actual} of type ${typeof actual}`
  );
};

module.exports = {
  defined: defined,
  object: object,
  fn: fn,
  bool: bool,
  buffer: buffer,
  string: string,
  number: number,
  integer: integer,
  inRange: inRange,
  inArray: inArray,
  invalidParameterError: invalidParameterError
};
