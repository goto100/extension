var component = module.extending.exports;
component.b = 1;
component.c = 0;

// replace exports
module.extending.exports = {
	b: 1,
	c: 1
};