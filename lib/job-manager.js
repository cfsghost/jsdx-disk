"usr strict";

var util = require('util');
var events = require('events');

var Utils = require('./utils');

var JobManager = module.exports = function(disk) {
	var self = this;

	self.disk = disk;
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

	// Return job ID to storage object
	for (var index in e.interfaces.Job.Objects) {
		var objPath = e.interfaces.Job.Objects[index];

		var storageObject = self.disk.getStorageObject(Utils.getObjectType(objPath), Utils.getObjectName(objPath));
		storageObject.emit('job-' + e.interfaces.Job.Operation, e);
	}
};
