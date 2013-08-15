"usr strict";

var dbus = require('dbus');

var Disk = module.exports = function() {
};

Disk.prototype.init = function(callback) {
	var self = this;

	self.dbus = dbus;

	self.dbus.start(function() {
		self.systemBus = dbus.system_bus();
		self.manager = dbus.get_interface(self.systemBus, 'org.freedesktop.UDisks2', '/org/freedesktop/UDisks2', 'org.freedesktop.DBus.ObjectManager');

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
		console.log(123123);
		callback.apply(self, [ null, devices ]);
	};

	self.manager.GetManagedObjects['timeout'] = 10000;
	self.manager.GetManagedObjects();
};
