'use strict';

var Sharp = require('./varructor');
[
  'input',
  'resize',
  'composite',
  'operation',
  'colour',
  'channel',
  'output',
  'utility'
].forEach(function (decorator) {
  require('./' + decorator)(Sharp);
});

module.exports = Sharp;
