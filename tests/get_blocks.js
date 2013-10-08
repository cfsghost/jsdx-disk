"use strict";

var Disk = require('../');

var disk = new Disk();
disk.init(function() {

	disk.getDrives(function(err, drives) {

		for (var objectPath in drives) {
			drives[objectPath].getBlockDevices(function(err, devices) {

				console.log(devices);
				process.exit();
			});
		}

	});

});
