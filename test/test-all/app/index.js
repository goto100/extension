require = require('../../../../extension.js').create(module, ['../ext1', '../ext2']);

var app = {
	require: require
};

module.exports = app;
