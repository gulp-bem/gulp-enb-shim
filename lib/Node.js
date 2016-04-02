'use strict';

var path = require('path');
var util = require('util');
var Promise = require('vow');
var EnbNode = require('enb/lib/node/node');

var EnbNodeMock = function(opts) {
    this._techs = [];
    this._targetNames = {}
    this._root = process.cwd();
    this._path = opts.path;
    this._dirname = path.resolve(this._root, this._path);
    this._targetName = path.basename(opts.path);
    this._logger = {
        logAction: console.log.bind(console),
        log: console.log.bind(console)
    }
}

util.inherits(EnbNodeMock, EnbNode);

EnbNodeMock.prototype.requireSources = function(sources) {
    var self = this
    console.log(sources);
    return Promise.resolve(sources.map(function() {
        return {
            getBySuffix: function(suffixes) {
                return self.__chunks.map(function(item) {
                    return { fullname: item.cwd + '/' + item.path }
                })
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
