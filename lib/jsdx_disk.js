"usr strict";

var util = require('util');
var events = require('events');
var dbus = require('dbus');

var Disk = module.exports = function() {
};

util.inherits(Disk, events.EventEmitter);

Disk.prototype.init = function(callback) {
	var self = this;

	self.dbus = dbus;

	self.dbus.start(function() {
		self.systemBus = dbus.system_bus();
		self.manager = dbus.get_interface(self.systemBus, 'org.freedesktop.UDisks2', '/org/freedesktop/UDisks2', 'org.freedesktop.DBus.ObjectManager');

		self.manager.InterfacesAdded.onemit = function(objectPath, data) {
			self.emit('interfaces_added', objectPath, data);
		};
		self.manager.InterfacesAdded.enabled = true;

		self.manager.InterfacesRemoved.onemit = function(objectPath, data) {
			self.emit('interfaces_removed', objectPath, data);
		};
		self.manager.InterfacesRemoved.enabled = true;

		if (callback)
			process.nextTick(function() {
				callback();
			});
	});
};

Disk.prototype.getManagedObjects = function(callback) {
	var self = this;

	if (!callback)
		throw Error('getManagedObjects method requires a parameter for callback function');

	self.manager.GetManagedObjects['finish'] = function(devices) {
		callback.apply(self, [ null, devices ]);
	};

	self.manager.GetManagedObjects['timeout'] = 10000;
	self.manager.GetManagedObjects();
};
