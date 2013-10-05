"use strict";

var async = require('async');

var BlockDevice = module.exports = function(disk) {
	var self = this;

	self._disk = disk;

	// Interfaces
	self.interfaces = {};

	// Properties
	self.objectPath = null;
	self.id = null;
};

BlockDevice.prototype.initInterface = function(interfaceName, callback) {
	var self = this;

	if (self.interfaces[interfaceName]) {
		if (callback)
			process.nextTick(function() {
				callback(null);
			});

		return;
	}

	// Getting interface via system bus
	self._disk.systemBus.getInterface(
		'org.freedesktop.UDisks2',
		self.objectPath,
		interfaceName,
		function(err, iface) {
			if (err) {
				callback(err);
				return;
			}

			self.interfaces[interfaceName] = iface;

			if (callback)
				callback();
		});
};

BlockDevice.prototype.initInterfaces = function(interfaceNames, callback) {
	var self = this;

	async.eachSeries(interfaceNames, function(interfaceName, next) {

		self.initInterface(interfaceName, function() {
			next();
		});

	}, function() {

		if (callback)
			callback();
	});
};

BlockDevice.prototype.getInterface = function(name) {
	return this.interfaces['org.freedesktop.UDisks2.' + name] || null;
};

BlockDevice.prototype.getSize = function(callback) {
	var self = this;

	var iface = self.getInterface('Block');
	iface.getProperty('Size', function(size) {
		callback(null, size);
	});
};

BlockDevice.prototype.mount = function() {
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

	// Getting interface
	var iface = self.getInterface('Filesystem');

	iface.Mount['timeout'] = 10000;
	iface.Mount['finish'] = function(mountPath) {

		if (callback)
			callback(null, mountPath);
	};
	iface.Mount(opts || {});
};

BlockDevice.prototype.unmount = function() {
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


	// Getting interface
	var iface = self.getInterface('Filesystem');

	iface.Unmount['timeout'] = 10000;
	iface.Unmount['finish'] = function() {

		if (callback)
			callback(null);
	};
	iface.Unmount(opts || {});
};
