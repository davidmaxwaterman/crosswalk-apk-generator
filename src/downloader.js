/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var Q = require('q');
var path = require('path');
var fs = require('fs');
var url = require('url');

/**
 * Downloader for public files, with progress notifications.
 * @constructor
 *
 * @param {object} [deps] - objects the new instance is dependent on
 * @param {function} [deps.createHttpStream=returns new fetch.FetchStream] -
 * function which takes the downloadUrl of an archive file and returns a stream
 * which will read from that downloadUrl; the default is a function which returns a
 * new {@link external:fetch.FetchStream}
 * @param {object} [deps.fs=node's fs module] - filesystem implementation
 */
var Downloader = function (deps) {
  if (!(this instanceof Downloader)) {
    return new Downloader(deps);
  }

  deps = deps || {};

  this.createHttpStream = deps.createHttpStream;

  if (!this.createHttpStream) {
    var fetch = require('fetch');

    this.createHttpStream = function (downloadUrl) {
      return new fetch.FetchStream(downloadUrl);
    };
  }

  this.fs = deps.fs || fs;
};

/**
 * Download a file to a specified directory; the file will be placed
 * inside the directory outDir, and have the same name as it has on the
 * remote server.
 *
 * @param {string} downloadUrl - url of file to download
 * @param {string} outDir - directory to put the downloaded file into
 *
 * @returns {external:Promise} resolves to (String outFilePath, File outFile)
 * if the file was downloaded successfully, rejects otherwise;
 * the promise also notifies progress as the file is downloaded as a percentage
 * (whole numbers) of the total which remains to be downloaded.
 */
Downloader.prototype.download = function (downloadUrl, outDir) {
  var dfd = Q.defer();
  var promise = dfd.promise;

  // the output file path is outDir + the filename part of the downloadUrl
  var urlPath = url.parse(downloadUrl).pathname;
  var urlPathParts = urlPath.split('/');
  var filename = urlPathParts[urlPathParts.length - 1];
  var outFilePath = path.join(outDir, filename);

  if (this.fs.existsSync(outFilePath)) {
    dfd.reject(new Error('output file ' + outFilePath + ' already exists'));
    return promise;
  }

  var outFile = this.fs.createWriteStream(outFilePath);

  var contentLength = 1;
  var downloaded = 0;
  var lastNotifiedPercent = 0;

  var fetcher = this.createHttpStream(downloadUrl);

  // first time we get any metadata we can set the real content length
  fetcher.on('meta', function (meta) {
    contentLength = meta.responseHeaders['content-length'];
  });

  // notify each time the percentage downloaded changes
  fetcher.on('data', function (data) {
    downloaded += parseInt(data.length);

    var percent = parseInt((downloaded / contentLength) * 100);

    if (percent > lastNotifiedPercent) {
      lastNotifiedPercent = percent;
      dfd.notify(percent);
    }
  });

  fetcher.on('end', function () {
    outFile.end();
  });

  fetcher.on('error', function (e) {
    dfd.reject(e);
  });

  // this is when we're really done
  outFile.on('finish', function () {
    dfd.resolve(outFilePath, outFile);
  });

  fetcher.pipe(outFile);

  return promise;
};

module.exports = Downloader;
