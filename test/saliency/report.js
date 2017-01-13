'use strict';

var os = require('os');
var fs = require('fs');
var path = require('path');
var async = require('async');
var sharp = require('../../');

var crops = {
  centre: sharp.gravity.centre,
  entropy: sharp.strategy.entropy,
  attention: sharp.strategy.attention
};
var concurrency = os.cpus().length;

var scores = {};

var incrementScore = function (accuracy, crop) {
  if (typeof scores[accuracy] === 'undefined') {
    scores[accuracy] = {};
  }
  if (typeof scores[accuracy][crop] === 'undefined') {
    scores[accuracy][crop] = 0;
  }
  scores[accuracy][crop]++;
};

var userData = require('./userData.json');
var files = Object.keys(userData);

async.eachLimit(files, concurrency, function (file, done) {
  var filename = path.join(__dirname, 'Image', file);
  var salientWidth = userData[file].right - userData[file].left;
  var salientHeight = userData[file].bottom - userData[file].top;
  sharp(filename).metadata(function (err, metadata) {
    if (err) console.log(err);
    async.each(Object.keys(crops), function (crop, done) {
      async.parallel([
        // Left edge accuracy
        function (done) {
          sharp(filename).resize(salientWidth, metadata.height).crop(crops[crop]).toBuffer(function (err, data, info) {
            var accuracy = Math.round(Math.abs(userData[file].left - info.cropCalcLeft) / (metadata.width - salientWidth) * 100);
            incrementScore(accuracy, crop);
            done(err);
          });
        },
        // Top edge accuracy
        function (done) {
          sharp(filename).resize(metadata.width, salientHeight).crop(crops[crop]).toBuffer(function (err, data, info) {
            var accuracy = Math.round(Math.abs(userData[file].top - info.cropCalcTop) / (metadata.height - salientHeight) * 100);
            incrementScore(accuracy, crop);
            done(err);
          });
        }
      ], done);
    }, done);
  });
}, function () {
  var report = [];
  Object.keys(scores).forEach(function (accuracy) {
    report.push(
      Object.assign({
        accuracy: parseInt(accuracy, 10)
      }, scores[accuracy])
    );
  });
  fs.writeFileSync('report.json', JSON.stringify(report, null, 2));
});
