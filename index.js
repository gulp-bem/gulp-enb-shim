'use strict';

var Readable = require('stream').Readable;
var through2 = require('through2');
var File = require('vinyl');

var Tech = require('./lib/Tech');
var Node = require('./lib/Node');
var EnbNodeConfig = require('enb/lib/config/node-config');

var EnbShim = function(opts) {
    this._bundle = opts.bundle;
    this._langs = opts.langs;
    this._cwd = opts.cwd;
}

EnbShim.prototype.tech = function(originalTech, techOpts, _opts) {
    if (!originalTech.buildFlow) {
        throw new Error('Tech is not supported');
    }
    var self = this;
    var opts = _opts || {};
    var resStream = new Readable({ objectMode: true });
    resStream._read = function(){};
    var nodeConfig = new EnbNodeConfig();
    nodeConfig.setLanguages(this._langs);
    var techOptions = nodeConfig._processTechOptions(techOpts);
    var node = new Node({
        bundle: this._bundle,
        cwd: this._cwd,
        sources: opts.sources || {},
        depsByTech: opts.depsByTech || '*'
    });
    Promise.all(techOptions.map(function(techOption) {
        var tech = Tech.patch(originalTech, techOption);
        return self.run(tech, originalTech.buildFlow()._usages, node)
            .then(function(file) {
                resStream.push(file);
            })
    }))
    .then(function() {
        resStream.push(null);
    }, function(err) {
        console.log('err', err, err.stack)
    });

    return resStream;
}

EnbShim.prototype.run = function(tech, usages, node) {
    tech.init(node);
    return node.patchUsages(tech, usages)
        .then(function() {
            node._registerTarget(tech._target, {
                getName: function() { return tech._name }
            });
            var resPromise = node._getTarget(tech._target).deferred.promise().then(function(res) {
                var file = new File({
                    cwd: undefined,
                    base: undefined,
                    path: tech._target,
                    contents: new Buffer(res)
                });
                return file;
            });
            tech.build().then(function() {}, function (err) {
                console.log('err', err, err.stack);
            });
            return resPromise;
        });
}

module.exports = function(opts) {
    return new EnbShim(opts);
};
