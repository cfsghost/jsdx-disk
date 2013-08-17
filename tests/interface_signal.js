"use strict";

var Disk = require('../');

var disk = new Disk();

disk.init(function() {

	disk.on('interfaces_added', function(objectPath, data) {
		console.log('INTERFACE ADDED: ' + objectPath);
		console.log(data);
	});

	disk.on('interfaces_removed', function(objectPath, data) {
		console.log('INTERFACE REMOVED: ' + objectPath);
		console.log(data);
	});

});
