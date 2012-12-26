var assert = require('assert');
var path = require('path');

describe('global', function() {

	var require = module.require('../../extension.js');

	it('api', function(done) {
		assert.ok(require.create);
		done();
	});

});

describe('require', function() {

	var app = module.require('./test1/app');
	var require = app.require.create(module);

	it('require', function(done) {
		var component = require('./test1/app/component');
		assert.equal(component.b, 1);
		done();
	});

	it('sub require', function(done) {
		assert.equal(app.package.b, 1);
		done();
	});
});

describe('all', function() {

	var app = module.require('./test-all/app');
	var require = app.require.create(module);

	it('length', function(done) {
		require.all('./test-all/app/components', function(err, components) {
			assert.equal(components.length, 4);
			done();
		});
	});

	it('require', function(done) {
		require.all('./test-all/app/components', function(err, components) {
			components.forEach(function(component, i) {
				assert.equal(component.name, 'component' + (i + 1));
			});
			done();
		});
	});

});

describe('extend extension', function() {

	var app = module.require('./test-extended/app');
	var require = app.require.create(module);

	it('require', function(done) {
		require.all('./test-extended/app/commands', function(err, commands) {
			assert.equal(2, commands[1].b);
			done();
		});
	});

});
