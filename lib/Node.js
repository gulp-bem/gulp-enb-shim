'use strict';

var path = require('path');
var util = require('util');
var through2 = require('through2');
var VowPromise = require('vow');
var Promise = require('bluebird');
var EnbNode = require('enb/lib/node/node');

var fs = require('fs');
var path = require('path');

var EnbNodeMock = function(opts) {
    var self = this;
    this._bundle = opts.bundle;

    this._techs = [];
    this._targetNames = {}
    this._root = process.cwd();
    this._path = this._bundle.path();
    this._dirname = path.resolve(this._root, this._path);
    this._targetName = path.basename(this._path);
    this._logger = {
        logAction: console.log.bind(console),
        log: console.log.bind(console)
    }

    this._cwd = opts.cwd;
    this._depsByTech = opts.depsByTech;
    this._requiredSources = opts.sources;
    this._requiredSuffixes = {};
}

util.inherits(EnbNodeMock, EnbNode);

EnbNodeMock.prototype.patchUsages = function(tech, usages) {
    var self = this;
    var processUsages = [];
    usages.forEach(function(usage) {
        var usageType = self.guessUsageType(usage);
        if (self['processUsage_' + usageType]) {
            processUsages.push(self['processUsage_' + usageType](tech, usage));
        } else {
            throw new Error('Tech usage ' + usageType + ' is not supported');
        }
    });
    return Promise.all(processUsages);
}

EnbNodeMock.prototype.guessUsageType = function(usage) {

    if (usage._suffixesOptionName) {
        return 'BuildFlowLinkToFileList';
    } else if (usage._defaultTargetName) {
        return 'BuildFlowLinkToTargetFilename';
    }
}

EnbNodeMock.prototype.processUsage_BuildFlowLinkToFileList = function(tech, usage) {
    var self = this;
    var suffixes = tech.getOption(usage._suffixesOptionName) || usage._defaultSuffixes || usage._suffixes;
        suffixes = (Array.isArray(suffixes) ? suffixes : [suffixes]).map(function(suffix) {
            return '.' + suffix;
        });
    return new Promise(function(resolve, reject) {
        var chunks = [];
        self._bundle.src({ tech: self._depsByTech, extensions: suffixes })
            .on('error', reject)
            .pipe(through2.obj(function(chunk, enc, cb) {
                chunks.push(chunk);
                cb();
            }, function(cb) {
                self._requiredSuffixes[suffixes.join(',')] = chunks;
                resolve();
                cb();
            }))
    });
}

EnbNodeMock.prototype.processUsage_BuildFlowLinkToTargetFilename = function(tech, usage) {
    var self = this;
    var target = tech.getOption(usage._targetOptionName) || usage._defaultTargetName;

    target = tech._preprocessTargetName(target);
    var targetSource = self._requiredSources[target];
    if (!targetSource) {
        throw new Error('Target ' + target + ' not found in sources');
    }
    if (targetSource.file) {
        if (targetSource.fromFs) {
            return new Promise(function(resolve, reject) {
                targetSource.file
                    .on('error', reject)
                    .pipe(through2.obj(function(file, enc, cb) {
                        var targetPath = path.join(self._cwd, self._bundle.path(), file.path)
                        fs.writeFile(targetPath, file.contents, function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    }))
            });
        }
    } else {

    }
}

EnbNodeMock.prototype.requireSources = function(sources) {
    var self = this
    return VowPromise.resolve(sources.map(function(source) {
        if (source === self._targetName + '.files' || source === self._targetName + '.dirs') {
            return {
                getBySuffix: function(suffixes) {
                    var key = suffixes.map(function(suffix) {
                        return '.' + suffix;
                    }).join(',');
                    return self._requiredSuffixes[key].map(function(item) {
                        return { fullname: item.cwd + '/' + item.path }
                    });
                }
            }
        }
    }));
}

EnbNodeMock.prototype.getNodeCache = function() {
    return {
        needRebuildFile: function() { return true }
    }
}

module.exports = EnbNodeMock;
