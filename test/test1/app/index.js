require = require('../../../../extension.js').create(module, ['../ext1', '../ext2']);

var app = {
	require: require,
	package: require('./package')
};

module.exports = app;