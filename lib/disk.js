"use strict";

var util = require('util');
var events = require('events');
var DBus = require('dbus');

var Drive = require('./drive');
var BlockDevice = require('./block_device');

var dbus = new DBus();

var Disk = module.exports = function() {
	var self = this;

	self.dbus = dbus;
	self.systemBus = null;
	self.manager = null;
};

Disk.prototype.init = function(callback) {
	var self = this;

	self.systemBus = dbus.getBus('system');
	self.systemBus.getInterface(
		'org.freedesktop.UDisks2',
		'/org/freedesktop/UDisks2',
		'org.freedesktop.DBus.ObjectManager',
		function(err, iface) {
			if (err) {
				callback(err);
				return;
			}

			self.manager = iface;

			if (callback)
				callback();
		});
};

Disk.prototype.getObjects = function(callback) {
	var self = this;

	self.manager.GetManagedObjects['timeout'] = 10000;
	self.manager.GetManagedObjects['finish'] = function(objects) {

		if (callback)
			callback.apply(self, [ null, objects ]);
	};
	self.manager.GetManagedObjects();
};

Disk.prototype.getDrives = function(callback) {
	var self = this;

	self.getObjects(function(err, objects) {

		var drives = {};
		for (var objPath in objects) {

			if (objPath.search('/org/freedesktop/UDisks2/drives') == 0) {
				var obj = objects[objPath]['org.freedesktop.UDisks2.Drive'];

				// Creating drive object
				var drive = new Drive(self);
				drive.objectPath = objPath;
				drive.id = obj.Id;
				drive.serial = obj.Serial;
				drive.model = obj.Model;
				drive.vendor = obj.Vendor;
				drive.wwn = obj.WWN;
				drive.revision = obj.Revision;
				drive.removable = obj.Removable;
				drive.ejectable = obj.Ejectable;
				drive.mediaRemovable = obj.MediaRemovable;
				drive.mediaAvailable = obj.MediaAvailable;
				drive.connectionBus = obj.ConnectionBus;

				drives[objPath] = drive;
			}
		}

		if (callback)
			callback.apply(self, [ null, drives ]);
	});
};

Disk.prototype.getBlockDevice = function(deviceName, callback) {
	var self = this;

	if (!deviceName) {
		if (callback)
			process.nextTick(function() {
				callback(new Error('Require device name'));
			});

		return;
	}

	var targetObjectPath = '/org/freedesktop/UDisks2/block_devices/' + deviceName;

	// Finding target object
	self.getObjects(function(err, objects) {

		for (var objPath in objects) {

			if (objPath != targetObjectPath)
				continue;

			var object = objects[objPath];
			if (!object['org.freedesktop.UDisks2.Block']) {
				callback(new Error('Not block device'));
				return;
			}

			var blockInterface = object['org.freedesktop.UDisks2.Block'] || null;
			if (!blockInterface) {
				callback(new Error('Not block device'));
				return;
			}

			// Initializing block device
			var device = new BlockDevice(self);
			device.id = blockInterface.Id;
			device.objectPath = objPath;

			// Initializing interfaces
			var interfaceNames = Object.keys(object);
			device.initInterfaces(interfaceNames, function() {

				if (callback)
					callback(null, device);

			});

			return;		
		}
	});
};
