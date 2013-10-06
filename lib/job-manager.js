"usr strict";

var util = require('util');
var events = require('events');

var JobManager = module.exports = function() {
};

util.inherits(JobManager, events.EventEmitter);

JobManager.prototype.check = function(e) {
	var self = this;

	if (e.objectType == 'Job')
		return true;

	return false;
};

JobManager.prototype.handle = function(e) {
	var self = this;

	self.emit('new-job', e);
};
