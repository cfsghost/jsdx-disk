"use strict";

var Disk = require('../');

var disk = new Disk();
disk.init(function() {

	disk.getBlockDevice('sdb', function(err, device) {

		device.mount({}, function(err, mountPath) {
			console.log(mountPath);
			process.exit();
		});
	});

});
