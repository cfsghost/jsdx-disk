"use strict";

var Disk = require('../');

var disk = new Disk();

disk.init(function() {

	var obj = disk.getStorageObject('Block', 'sdb1');

	obj.unmount(function(err) {
		console.log('Unmounted');
		process.exit();
	});
});
