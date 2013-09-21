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
	self.interfaces = {};
	self.initialized = false;

	// Interfaces
	self.filesystem = null;
	self.block = null;
	self.partitiontable = null;
	self.partition = null;

	// Getting all interface
	//console.log(disk.objects);
	for (var iface in disk.objects[self.objectPath]) {
		var ifaceName = path.extname(iface).replace('.', '');
		self.interfaces[ifaceName] = null;
	}
};

util.inherits(StorageObject, events.EventEmitter);

StorageObject.prototype.getProperties = function(iface, callback) {
	var self = this;

	self.disk.systemBus.getInterface(
		'org.freedesktop.UDisks2',
		self.objectPath,
		'org.freedesktop.UDisks2.' + iface,
		function(err, iface) {

			iface.getProperties(function(properties) {

				if (callback)
					callback(null, properties);
			});

		});
};

StorageObject.prototype.getInterface = function(ifaceName, callback) {
	var self = this;

	if (!callback)
		return;

	if (!(ifaceName in self.interfaces)) {
		process.nextTick(function() {
			callback(new Error('No such interface'));
		});

		return;
	}

	if (self.interfaces[ifaceName] == null) {
		self.disk.systemBus.getInterface(
			'org.freedesktop.UDisks2',
			self.objectPath,
			'org.freedesktop.UDisks2.' + ifaceName,
			function(err, iface) {
				self.interfaces[ifaceName] = iface;
				callback(null, iface);
			});
	} else {
		process.nextTick(function() {
			callback(null, self.interfaces[ifaceName]);
		});
	}
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

	self.getInterface('Filesystem', function(err, iface) {
		if (err) {
			if (callback)
				callback(new Error('This storage object couldn\'t be mounted.'));

			return;
		}

		iface.Mount['finish'] = function(mountPath) {
			if (callback)
				callback(null, mountPath);
		};

		iface.Mount['timeout'] = 10000;
		iface.Mount(opts || {});
	});
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

	self.getInterface('Filesystem', function(err, iface) {
		if (err) {
			if (callback)
				callback(new Error('This storage object couldn\'t be unmounted.'));

			return;
		}

		iface.Unmount['finish'] = function() {

			if (callback)
				callback(null);
		};

		iface.Unmount['timeout'] = 10000;
		iface.Unmount(opts || {});
	});
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

	self.getInterface('Block', function(err, iface) {
		if (err) {
			if (callback)
				callback(new Error('This storage object couldn\'t be formated.'));

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
			self.disk.systemBus.getInterface(
				'org.freedesktop.UDisks2',
				objectPath,
				'org.freedesktop.UDisks2.Job',
				function(err, job) {

					// Listen on completed signal
					job.on('Completed', function(success, msg) {

						if (callback)
							callback(null);
					});
				});
		}

		self.disk.jobManager.on('new-job', newJob);

		// Start to format block device
		var _opts = opts || {};
		_opts['no-block'] = true;
		iface.Format(fsType, _opts);
	});
};

StorageObject.prototype.createPartition = function(offset, size, type, name, opts, callback) {
	var self = this;

	var defOffset = 1048576;
	var defType = '0x83';

	self.getInterface('PartitionTable', function(err, iface) {
		if (err) {
			if (callback)
				callback(new Error('This storage object doesn\'t have partition table.'));

			return;
		}

		iface.CreatePartition['finish'] = function() {

			if (callback)
				callback(null);
		};
		iface.CreatePartition['timeout'] = 10000;
		iface.CreatePartition(offset, size, type, name || '', opts);
	});
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

	self.getInterface('Partition', function(err, iface) {
		if (err) {
			if (callback)
				callback(new Error('This storage object is not a partion can be deleted.'));

			return;
		}

		iface.Delete['finish'] = function() {

			if (callback)
				callback(null);
		};

		iface.Delete['timeout'] = 10000;
		iface.Delete(opts);
	});
};
