'use strict';

var util = require('util');

exports.patch = function(Tech, techOpts) {
    var PatchedTech = function() {
        Tech.apply(this, arguments);
    }
    util.inherits(PatchedTech, Tech);
    PatchedTech.prototype._saveBuildResult = function(savePath, res) {
        this._buildResult = res;
    }
    PatchedTech.prototype._saveCache = function() {}
    var tech = new PatchedTech(techOpts);

    return tech;
}
