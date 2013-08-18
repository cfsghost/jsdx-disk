"use strict";

var util = require('util');
var events = require('events');
var path = require('path');

var objectTypes = {
	'Block': 'block_devices',
	'Drive': 'drives',
	'MDRaid': 'mdraid'
};

var StorageObject = module.exports = function(disk, objectType, objectName) {
	var self = this;

	self.disk = disk;
	self.objectPath = '/org/freedesktop/UDisks2/' + objectTypes[objectType] + '/' + objectName;
	self.interfaces = [];
	self.filesystem = null;

	for (var iface in disk.objects[self.objectPath]) {
		var ifaceName = path.extname(iface).replace('.', '');

		if (ifaceName == 'Filesystem') {

			self.filesystem = disk.dbus.get_interface(self.disk.systemBus,
				'org.freedesktop.UDisks2',
				self.objectPath,
				'org.freedesktop.UDisks2.Filesystem');
		}

		self.interfaces.push(ifaceName);
	}

	self.properties = disk.dbus.get_interface(self.disk.systemBus, 'org.freedesktop.UDisks2', self.objectPath, 'org.freedesktop.DBus.Properties');
};

util.inherits(StorageObject, events.EventEmitter);

StorageObject.prototype.getProperties = function(iface, callback) {
	var self = this;

	self.properties.GetAll['finish'] = function(properties) {

		if (iface == 'Block') {
			if (properties['Drive'] == '/')
				properties['Drive'] = null;
			else
				properties['Drive'] = path.basename(properties['Drive']);

			if (properties['MDRaid'] == '/')
				properties['MDRaid'] = null;
			else
				properties['MDRaid'] = path.basename(properties['MDRaid']);

			if (properties['MDRaidMember'] == '/')
				properties['MDRaidMember'] = null;
			else
				properties['MDRaidMember'] = path.basename(properties['MDRaidMember']);

			if (properties['CryptoBackingDevice'] == '/')
				properties['CryptoBackingDevice'] = null;
			else
				properties['CryptoBackingDevice'] = path.basename(properties['CryptoBackingDevice']);
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
