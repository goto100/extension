var assert = require('assert');
var fs = require('fs');
var path = require('path');

describe('extend extension', function() {

	require('../../extension.js').init(module, ['./test-extended/ext1', './test-extended/ext2'], './test-extended/app');

	it('require', function(done) {
		module.requireAll('./test-extended/app/commands', function(err, commands) {
			assert.equal(2, commands.b.b);
			done();
		});
	});

	it('extended', function() {
		var b = require('./test-extended/app/commands/b');
		assert.equal(b.package.name, 1);
		assert.equal(b.package.b, 1);
		assert.equal(b.b, 2);
	});

});
