"usr strict";

var util = require('util');
var events = require('events');
var dbus = require('dbus');

var Utils = require('./utils');
var StorageObject = require('./storage-object');
var JobManager = require('./job-manager');

var Disk = module.exports = function() {
	var self = this;

	self.jobManager = new JobManager(self);
	self.objects = {};
	self.storageObjects = {};
};

util.inherits(Disk, events.EventEmitter);

Disk.prototype.init = function(callback) {
	var self = this;

	self.dbus = dbus;

	self.dbus.start(function() {

		self.systemBus = dbus.system_bus();
		self.manager = dbus.get_interface(self.systemBus, 'org.freedesktop.UDisks2', '/org/freedesktop/UDisks2', 'org.freedesktop.DBus.ObjectManager');

		// Interfaces Added Event
		self.manager.InterfacesAdded.onemit = function(objectPath, data) {

			var e = {
				objectName: Utils.getObjectName(objectPath),
				objectType: Utils.getObjectType(objectPath),
				interfaces: Utils.processInterfaces(data)
			};

			// checking for job
			if (self.jobManager.check(e)) {
				self.jobManager.handle(e);
				return;
			}

			// Update objects list
			var objects = {};
			objects[objectPath] = data;

			self.updateObjects(objects, function() {

				self.emit('interfaces_added', e);
			});
		};
		self.manager.InterfacesAdded.enabled = true;

		// Interfaces Removed Event
		self.manager.InterfacesRemoved.onemit = function(objectPath, data) {

			var e = {
				objectName: Utils.getObjectName(objectPath),
				objectType: Utils.getObjectType(objectPath),
				interfaces: []
			};

			for (var index in data) {
				e.interfaces.push(Utils.getInterfaceName(data[index]));
			}

			// Ignore job interfaces
			if (self.jobManager.check(e)) {
				return;
			}

			// Update objects list
			var objects = {};
			objects[objectPath] = data;

			self.removeObjects(objects, function() {

				self.emit('interfaces_removed', e);
			});
		};
		self.manager.InterfacesRemoved.enabled = true;

		// Getting Objects
		self.getManagedObjects(function(err, objects) {

			if (callback)
				process.nextTick(function() {
					callback();
				});
		});
	});
};

Disk.prototype.updateObjects = function(objects, callback) {
	var self = this;

	for (var objectPath in objects) {

		// Object doesn't exist
		if (!self.objects[objectPath])
			self.objects[objectPath] = {}

		// Add interfaces
		var obj = objects[objectPath];
		var ifObj = {};
		for (var iface in obj) {
			self.objects[objectPath][iface] = {};
		}
	}

	process.nextTick(function() {
		if (callback)
			callback();
	});
};

Disk.prototype.removeObjects = function(objects, callback) {
	var self = this;

	for (var objectPath in objects) {

		var objectName = Utils.getObjectName(objectPath);
		var objectType = Utils.getObjectType(objectPath);

		var obj = objects[objectPath];

		for (var index in obj) {
			var iface = obj[index];

			delete self.objects[objectPath][iface];
		}

		// Remove object if no interface
		if (Object.keys(self.objects[objectPath]).length == 0) {
			delete self.objects[objectPath];

			// Remove storage object
			var key = objectType + '/' + objectName;
			if (self.storageObjects[key]) {
				self.storageObjects[key].emit('destroy');
				delete self.storageObjects[key];
			}
		}
	}

	process.nextTick(function() {
		if (callback)
			callback();
	});
};

Disk.prototype.getManagedObjects = function(callback) {
	var self = this;

	if (!callback)
		throw Error('getManagedObjects method requires a parameter for callback function');

	self.manager.GetManagedObjects['finish'] = function(objects) {

		self.updateObjects(objects, function() {

			callback.apply(self, [ null, objects ]);
		});
	};

	self.manager.GetManagedObjects['timeout'] = 10000;
	self.manager.GetManagedObjects();
};

Disk.prototype.getStorageObject = function(objectType, objectName) {
	var self = this;

	var key = objectType + '/' + objectName;
	if (!self.storageObjects[key])
		self.storageObjects[key] = new StorageObject(this, objectType, objectName);

	return self.storageObjects[key];
};
