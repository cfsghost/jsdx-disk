"use strict";

var Disk = require('../');

var disk = new Disk();

disk.init(function() {

	var obj = disk.getStorageObject('Block', 'sdb');

	console.log('Getting size of disk');
	obj.getProperties('Block', function(err, props) {
		var availSize = props.Size - 1048576;
		console.log('Available size: ' + availSize);

		console.log('Create Partition ...');
		obj.createPartition(1048576, availSize, '0x83', null, {}, function() {
			console.log('Done');
			process.exit();
		});

	});

});
