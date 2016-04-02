'use strict';

var through2 = require('through2');
var File = require('vinyl');

var Tech = require('./lib/Tech');
var Node = require('./lib/Node');

var EnbShim = function(opts) {
    this._path = opts.path;
}

EnbShim.prototype.tech = function(originalTech, techOpts) {

    var tech = Tech.patch(originalTech, techOpts);
    var node = new Node({
        path: this._path
    });
    var chunks = [];
    return through2.obj(function(chunk, enc, cb) {
        chunks.push(chunk);
        cb();
    }, function(cb) {
        var self = this;
        node.__chunks = chunks;
        tech.init(node);
        node._registerTarget(tech._target, {
            getName: function() { return tech._name }
        });
        node._getTarget(tech._target).deferred.promise().then(function(res) {
            var file = new File({
                cwd: undefined,
                base: undefined,
                path: tech._target,
                contents: new Buffer(res)
            });
            self.push(file);
            // console.log(res);
            cb();
        })
        .then(function() {

        }, function(err) {
            console.log('err', err, err.stack);
        });
        tech.build().then(function() {
        }, function (err) {
            console.log('err', err, err.stack);
        });
    });
}

module.exports = function(opts) {
    return new EnbShim(opts);
};
