var assert = require('assert');

describe('all', function() {

	require('../../extension.js').init(module, ['./test-all/ext1', './test-all/ext2'], './test-all/app');

	it('length', function(done) {
		module.requireAll('./test-all/app/components', function(err, components) {
			assert.equal(Object.keys(components).length, 4);
			assert.ok(components.a);
			assert.ok(components.b);
			assert.ok(components.c);
			assert.ok(components.d);
			done();
		});
	});

	it('require', function(done) {
		module.requireAll('./test-all/app/components', function(err, components) {
			Object.keys(components).forEach(function(name, i) {
				var component = components[name];
				assert.equal(component.name, 'component' + (i + 1));
			});
			done();
		});
	});

});
