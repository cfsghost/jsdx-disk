"use strict";

var util = require('util');
var events = require('events');
var path = require('path');

var Utils = require('./utils');

var StorageObject = module.exports = function(disk, objectType, objectName) {
	var self = this;

	self.disk = disk;
	self.objectPath = '/org/freedesktop/UDisks2/' + Utils.objectTypes[objectType] + '/' + objectName;
	self.interfaces = [];

	// Interfaces
	self.filesystem = null;
	self.block = null;

	for (var iface in disk.objects[self.objectPath]) {
		var ifaceName = path.extname(iface).replace('.', '');

		self[ifaceName.toLowerCase()] = disk.dbus.get_interface(self.disk.systemBus,
			'org.freedesktop.UDisks2',
			self.objectPath,
			'org.freedesktop.UDisks2.' + ifaceName);

		self.interfaces.push(ifaceName);
	}

	self.properties = disk.dbus.get_interface(self.disk.systemBus, 'org.freedesktop.UDisks2', self.objectPath, 'org.freedesktop.DBus.Properties');
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

StorageObject.prototype.format = function(fsType, opts) {
	var self = this;

	if (!self.block) {
		process.nextTick(function() {
			if (callback)
				callback(new Error('This storage object couldn\'t be formated.'));
		})
		return;
	}

	var _opts = opts || {};
	_opts['no-block'] = true;

	self.block.Format['finish'] = function() {

		if (callback)
			callback(null);
	};

	self.block.Format['timeout'] = 10000;
	self.block.Format(fsType, _opts);
};
