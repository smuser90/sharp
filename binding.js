'use strict';

var fs = require('fs');
var os = require('os');
var path = require('path');
var zlib = require('zlib');

var caw = require('caw');
var got = require('got');
var semver = require('semver');
var tar = require('tar');

var distBaseUrl = 'https://dl.bintray.com/lovell/sharp/';

// Use NPM-provided environment variable where available, falling back to require-based method for Electron
var minimumLibvipsVersion = process.env.npm_package_config_libvips || require('./package.json').config.libvips;

var platform = process.env.npm_config_platform || process.platform;

var arch = process.env.npm_config_arch || process.arch;

// -- Helpers

// Does this file exist?
var isFile = function (file) {
  try {
    return fs.statSync(file).isFile();
  } catch (err) {}
};

var unpack = function (tarPath, done) {
  var extractor = tar.Extract({ path: path.join(__dirname, 'vendor') });
  if (done) {
    extractor.on('end', done);
  }
  extractor.on('error', error);
  fs.createReadStream(tarPath)
    .on('error', error)
    .pipe(zlib.Unzip())
    .pipe(extractor);
};

var platformId = function () {
  var platformId = [platform];
  if (arch === 'arm' || arch === 'armhf' || arch === 'arch64') {
    var armVersion = (arch === 'arch64') ? '8' : process.env.npm_config_armv || process.config.variables.arm_version || '6';
    platformId.push('armv' + armVersion);
  } else {
    platformId.push(arch);
  }
  return platformId.join('-');
};

// Error
var error = function (msg) {
  if (msg instanceof Error) {
    msg = msg.message;
  }
  process.stderr.write('ERROR: ' + msg + '\n');
  process.exit(1);
};

// -- Binary downloaders

module.exports.download_vips = function () {
  // Has vips been installed locally?
  var vipsHeaderPath = path.join(__dirname, 'vendor', 'include', 'vips', 'vips.h');
  if (!isFile(vipsHeaderPath)) {
    // Ensure Intel 64-bit or ARM
    if (arch === 'ia32') {
      error('Intel Architecture 32-bit systems require manual installation - please see http://sharp.dimens.io/en/stable/install/');
    }
    // Ensure glibc >= 2.15
    var lddVersion = process.env.LDD_VERSION;
    if (lddVersion) {
      if (/(glibc|gnu libc)/i.test(lddVersion)) {
        var glibcVersion = lddVersion ? lddVersion.split(/\n/)[0].split(' ').slice(-1)[0].trim() : '';
        if (glibcVersion && semver.lt(glibcVersion + '.0', '2.13.0')) {
          error('glibc version ' + glibcVersion + ' requires manual installation - please see http://sharp.dimens.io/en/stable/install/');
        }
      } else {
        error(lddVersion.split(/\n/)[0] + ' requires manual installation - please see http://sharp.dimens.io/en/stable/install/');
      }
    }
    // Arch/platform-specific .tar.gz
    var tarFilename = ['libvips', minimumLibvipsVersion, platformId()].join('-') + '.tar.gz';
    var tarPathLocal = path.join(__dirname, 'packaging', tarFilename);
    if (isFile(tarPathLocal)) {
      unpack(tarPathLocal);
    } else {
      // Download to per-process temporary file
      var tarPathTemp = path.join(os.tmpdir(), process.pid + '-' + tarFilename);
      var tmpFile = fs.createWriteStream(tarPathTemp).on('finish', function () {
        unpack(tarPathTemp, function () {
          // Attempt to remove temporary file
          try {
            fs.unlinkSync(tarPathTemp);
          } catch (err) {}
        });
      });
      var gotOpt = {};
      if (process.env.npm_config_https_proxy) {
        // Use the NPM-configured HTTPS proxy
        gotOpt.agent = caw(process.env.npm_config_https_proxy);
      }
      var url = distBaseUrl + tarFilename;
      got.stream(url, gotOpt).on('response', function (response) {
        if (response.statusCode !== 200) {
          error(url + ' status code ' + response.statusCode);
        }
      }).on('error', function (err) {
        error('Download of ' + url + ' failed: ' + err.message);
      }).pipe(tmpFile);
    }
  }
};

module.exports.use_global_vips = function () {
  var globalVipsVersion = process.env.GLOBAL_VIPS_VERSION;
  if (globalVipsVersion) {
    var useGlobalVips = semver.gte(
      globalVipsVersion,
      minimumLibvipsVersion
    );
    process.stdout.write(useGlobalVips ? 'true' : 'false');
  } else {
    process.stdout.write('false');
  }
};
