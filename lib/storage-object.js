"use strict";

var util = require('util');
var events = require('events');
var path = require('path');

var Utils = require('./utils');

var StorageObject = module.exports = function(disk, objectType, objectName) {
	var self = this;

	self.disk = disk;
	self.objectName = objectName;
	self.objectType = objectType;
	self.objectPath = '/org/freedesktop/UDisks2/' + Utils.objectTypes[objectType] + '/' + objectName;
	self.interfaces = [];

	// Interfaces
	self.filesystem = null;
	self.block = null;
	self.partitiontable = null;
	self.partition = null;

	for (var iface in disk.objects[self.objectPath]) {
		var ifaceName = path.extname(iface).replace('.', '');

		self[ifaceName.toLowerCase()] = disk.dbus.get_interface(self.disk.systemBus,
			'org.freedesktop.UDisks2',
			self.objectPath,
			'org.freedesktop.UDisks2.' + ifaceName);

		self.interfaces.push(ifaceName);
	}

	self.properties = disk.dbus.get_interface(disk.systemBus, 'org.freedesktop.UDisks2', self.objectPath, 'org.freedesktop.DBus.Properties');
};

util.inherits(StorageObject, events.EventEmitter);

StorageObject.prototype.getProperties = function(iface, callback) {
	var self = this;

	self.properties.GetAll['finish'] = function(properties) {

		if (iface == 'Block') {
			properties = Utils.processBlockInterface(properties);
		}

		if (callback)
			callback(null, properties);
	};
	self.properties.GetAll['timeout'] = 10000;

	self.properties.GetAll('org.freedesktop.UDisks2.' + iface);
};

StorageObject.prototype.mount = function() {
	var self = this;

	var opts = null;
	var callback = null;
	if (arguments.length == 1) {
		if (arguments[0] instanceof Function) {
			callback = arguments[0];
			opts = {};
		} else {
			opts = arguments[0];
		}
	} else {
		opts = arguments[0] || {};
		callback = arguments[1] || null;
	}

	if (!self.filesystem) {
		process.nextTick(function() {
			if (callback)
				callback(new Error('This storage object couldn\'t be mounted.'));
		})
		return;
	}

	self.filesystem.Mount['finish'] = function(mountPath) {
		if (callback)
			callback(null, mountPath);
	};

	self.filesystem.Mount['timeout'] = 10000;
	self.filesystem.Mount(opts || {});
};

StorageObject.prototype.unmount = function() {
	var self = this;

	var opts = null;
	var callback = null;
	if (arguments.length == 1) {
		if (arguments[0] instanceof Function) {
			callback = arguments[0];
			opts = {};
		} else {
			opts = arguments[0];
		}
	} else {
		opts = arguments[0] || {};
		callback = arguments[1] || null;
	}

	if (!self.filesystem) {
		process.nextTick(function() {
			if (callback)
				callback(new Error('This storage object couldn\'t be unmounted.'));
		})
		return;
	}

	self.filesystem.Unmount['finish'] = function() {

		if (callback)
			callback(null);
	};

	self.filesystem.Unmount['timeout'] = 10000;
	self.filesystem.Unmount(opts || {});
};

StorageObject.prototype.format = function() {
	var self = this;

	var fsType = null;
	var opts = null;
	var callback = null;
	if (arguments.length == 0) {

		throw new Error('format method requires argument.');

	}

	fsType = arguments[0];
	if (arguments.length > 1) {

		if (arguments[1] instanceof Function) {
			opts = {};
			callback = arguments[1];
		} else {
			opts = arguments[1];
			callback = arguments[2] || null;
		}
	}

	if (!self.block) {
		process.nextTick(function() {
			if (callback)
				callback(new Error('This storage object couldn\'t be formated.'));
		})
		return;
	}

	var jobID = null;
	function newJob(e) {

		// Handle format job only
		if (e.interfaces.Job.Operation != 'format-mkfs')
			return;

		var gotJob = false;

		// Ignore job if it doesn't belong to this storage object
		for (var index in e.interfaces.Job.Objects) {
			var objPath = e.interfaces.Job.Objects[index];

			if (objPath == self.objectPath) {
				gotJob = true;
				break;
			}
		}

		if (!gotJob)
			return;

		// Remove this listener
		self.disk.jobManager.removeListener('new-job', newJob);

		// Getting job ID
		jobID = e.objectName;

		// Waiting for job
		var objectPath = '/org/freedesktop/UDisks2/' + Utils.objectTypes[e.objectType] + '/' + e.objectName;
		var job = self.disk.dbus.get_interface(self.disk.systemBus, 'org.freedesktop.UDisks2', objectPath, 'org.freedesktop.UDisks2.Job');

		// Listen on completed signal
		job.Completed.onemit = function(success, msg) {

			if (callback)
				callback(null);
		};
		job.Completed.enabled = true;
	}

	self.disk.jobManager.on('new-job', newJob);

	// Start to format block device
	var _opts = opts || {};
	_opts['no-block'] = true;
	self.block.Format(fsType, _opts);
};

StorageObject.prototype.createPartition = function(offset, size, type, name, opts, callback) {
	var self = this;

	if (!self.partitiontable) {
		process.nextTick(function() {
			if (callback)
				callback(new Error('This storage object doesn\'t have partition table.'));
		})
		return;
	}

	var defOffset = 1048576;
	var defType = '0x83';

	self.partitiontable.Createpartition['finish'] = function() {

		if (callback)
			callback(null);
	};
	self.partitiontable.Createpartition['timeout'] = 10000;
	self.partitiontable.CreatePartition(offset, size, type, name || '', opts);
};

StorageObject.prototype.deletePartition = function() {
	var self = this;

	var opts = null;
	var callback = null;
	if (arguments.length == 1) {
		if (arguments[0] instanceof Function) {
			callback = arguments[0];
			opts = {};
		} else {
			opts = arguments[0];
		}
	} else {
		opts = arguments[0] || {};
		callback = arguments[1] || null;
	}

	if (!self.partition) {
		process.nextTick(function() {
			if (callback)
				callback(new Error('This storage object is not a partion can be deleted.'));
		})
		return;
	}

	self.partition.Delete['finish'] = function() {

		if (callback)
			callback(null);
	};

	self.partition.Delete['timeout'] = 10000;
	self.partition.Delete(opts);
};
