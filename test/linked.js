var assert = require('assert');
var fs = require('fs');
var path = require('path');

describe('linked extension', function() {

	var src = path.join(__dirname, './test-linked/ext1');
	var dist = path.join(__dirname, './test-linked/linked-ext1');

	before(function(done) {
		fs.symlink(src, dist, done);
	});

	after(function(done) {
		fs.unlink(dist, done);
	});

	require('../../extension.js').init(module, ['./test-linked/linked-ext1', './test-linked/ext2'], './test-linked/app');

	it('require', function(done) {
		module.requireAll('./test-linked/app/commands', function(err, commands) {
			assert.equal(2, commands.b.b);
			done();
		});
	});

	it('extended', function() {
		var b = require('./test-linked/app/commands/b');
		assert.equal(b.package.name, 1);
		assert.equal(b.package.b, 1);
		assert.equal(b.b, 2);
	});

});
