"use strict";

var Disk = require('../');

var disk = new Disk();

disk.init(function() {

	var obj = disk.getStorageObject('Block', 'sdb');

	console.log(obj.interfaces);
});
