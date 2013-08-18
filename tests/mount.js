"use strict";

var Disk = require('../');

var disk = new Disk();

disk.init(function() {

	var obj = disk.getStorageObject('Block', 'sdb1');

	obj.mount(function(err, mountPath) {

		if (err) {
			console.log(err);
			process.exit();
			return;
		}

		console.log('It was mounted on ' + mountPath);
		process.exit();
	});
});
