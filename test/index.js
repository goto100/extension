var assert = require('assert');
var path = require('path');

describe('global', function() {

	it('api', function(done) {
		assert.ok(require('../../extension.js').init);
		done();
	});

});

