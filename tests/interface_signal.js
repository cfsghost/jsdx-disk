"use strict";

var Disk = require('../');

var disk = new Disk();

disk.init(function() {

	disk.on('interfaces_added', function(data) {
		console.log('INTERFACE ADDED: ' + data.objectName);
		console.log(data);
	});

	disk.on('interfaces_removed', function(data) {
		console.log('INTERFACE REMOVED: ' + data.objectName);
		console.log(data);
	});

});
