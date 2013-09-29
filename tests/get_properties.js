"use strict";

var Disk = require('../');

var disk = new Disk();

disk.init(function() {

	var obj = disk.getStorageObject('Block', 'sdb');

	obj.getProperties('Block', function(err, props) {
		console.log(props);
		process.exit();
	});
});
