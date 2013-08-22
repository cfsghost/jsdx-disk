"use strict";

var Disk = require('../');

var disk = new Disk();

disk.init(function() {

	var obj = disk.getStorageObject('Block', 'sdb1');

	console.log('Delete Partition ...');
	obj.deletePartition(function() {
		console.log('Done');
		process.exit();
	});
});
