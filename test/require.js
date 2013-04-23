var assert = require('assert');

describe('require', function() {

	require('../../extension.js').init(module, ['./test1/ext1', './test1/ext2'], './test1/app');

	it('require', function() {
		var component = require('./test1/app/component');
		assert.equal(component.b, 1);
	});

	it('bad require', function() {
		assert.throws(function() {
			require('./test1/bad');
		});
	});

	it('parent require', function() {
		var loader = require('./test1/app/package/loader');
		assert.equal(loader.package, 2);
	});

	it('sub require', function() {
		var app = require('./test1/app');
		assert.equal(app.package.b, 1);
	});

	it('extensions', function() {
		var package = require('./test1/app/package');
		assert.equal(package.module.extensions.length, 1);
	});

	it('extended', function() {
		var package = require('./test1/app/package');
		assert.equal(package.module.extended.length, 1);
		assert.equal(package.module.extended[0].exports, 1);
	});

	it('replace exports', function() {
		var component = require('./test1/app/component');
		assert.equal(component.c, 1);
	});

	it('normal require', function() {
		var path = require('path');
		assert.ok(path);
	});

});