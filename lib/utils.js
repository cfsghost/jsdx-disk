"usr strict";

var path = require('path');

var objectTypes = {
	'Block': 'block_devices',
	'Drive': 'drives',
	'MDRaid': 'mdraid'
};

function getObjectType(objectPath) {
	var objParts = objectPath.split('/');

	for (var type in objectTypes) {
		if (objectTypes[type] == objParts[4])
			return type;
	}
}

function getObjectName(objectPath) {
	return objectPath.split('/')[5];
}

function getInterfaceName(iface) {
	return path.extname(iface).replace('.', '');
}

function processInterfaces(interfacesData) {

	var data = {};
	for (var iface in interfacesData) {
		var ifaceName = getInterfaceName(iface);
		var ifaceData = interfacesData[iface];


		if (ifaceName == 'Block')
			ifaceData = processBlockInterface(ifaceData);

		data[ifaceName] = ifaceData;
	}

	return data;
}

function processBlockInterface(properties) {

	if (properties['Drive'] == '/')
		properties['Drive'] = null;
	else
		properties['Drive'] = path.basename(properties['Drive']);

	if (properties['MDRaid'] == '/')
		properties['MDRaid'] = null;
	else
		properties['MDRaid'] = path.basename(properties['MDRaid']);

	if (properties['MDRaidMember'] == '/')
		properties['MDRaidMember'] = null;
	else
		properties['MDRaidMember'] = path.basename(properties['MDRaidMember']);

	if (properties['CryptoBackingDevice'] == '/')
		properties['CryptoBackingDevice'] = null;
	else
		properties['CryptoBackingDevice'] = path.basename(properties['CryptoBackingDevice']);

	return properties;
}

var Utils = module.exports = {
	getObjectType: getObjectType,
	getObjectName: getObjectName,
	getInterfaceName: getInterfaceName,
	processInterfaces: processInterfaces
};
