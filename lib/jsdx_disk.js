"usr strict";

var util = require('util');
var events = require('events');
var dbus = require('dbus');

var StorageObject = require('./object');

var Disk = module.exports = function() {
	var self = this;

	self.objects = {};
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

			// Update objects list
			self.objects[objectPath] = data;

			self.emit('interfaces_added', objectPath, data);
		};
		self.manager.InterfacesAdded.enabled = true;

		// Interfaces Removed Event
		self.manager.InterfacesRemoved.onemit = function(objectPath, data) {

			// update objects list
			delete self.objects[objectPath];

			self.emit('interfaces_removed', objectPath, data);
		};
		self.manager.InterfacesRemoved.enabled = true;

		// Getting Objects
		self.getManagedObjects(function(err, objects) {
/*
			for (var objectPath in objects) {

				self.objects[objectPath] = {}

				// Getting interfaces
				var obj = objects[objectPath];
				var ifObj = {};
				for (var iface in obj) {
					ifObj[iface] = {};
				}
				self.objects[objectPath][iface] = ifObj;
			}
*/
			if (callback)
				process.nextTick(function() {
					callback();
				});
		});
	});
};

Disk.prototype.getManagedObjects = function(callback) {
	var self = this;

	if (!callback)
		throw Error('getManagedObjects method requires a parameter for callback function');

	self.manager.GetManagedObjects['finish'] = function(objects) {

		self.objects = objects;

		callback.apply(self, [ null, objects ]);
	};

	self.manager.GetManagedObjects['timeout'] = 10000;
	self.manager.GetManagedObjects();
};

Disk.prototype.getStorageObject = function(objectType, objectName) {

	return new StorageObject(this, objectType, objectName);
};
