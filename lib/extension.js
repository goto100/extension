var path = require('path');
var fs = require('fs');
var async = require('async');

var baseCache = {};

/**
 */
function find(dirs, url) {
	var found;
	dirs.forEach(function(dir) {
		var expts;
		var filename;

		try {
			filename = module.constructor._resolveFilename(path.join(dir, url), module);
		} catch(e) {
		}

		if (filename) {
			if (found) {
				// 保存在cache中的key
				// https://github.com/joyent/node/blob/master/lib/module.js
				baseCache[filename] = found;
				expts = require(filename);
			} else {
				expts = require(filename);
				found = expts;
			}
		}
	});
	
	return found;
}

function wrapper(request) {
	var host = this;
	var root = this.root;
	var hostModule = this.module;
	var relative = this.relative;
	var extensions = this.extensions;
	var url = path.relative(relative, request);

	var dirs = [root];
	dirs = dirs.concat(this.extensions);

	return find(dirs, url);
}

/**
 * 建立
 */
function create(hostModule, exts, root) {
	var parent = this;
	var extensions;
	var host = function(request) {
		return wrapper.call(host, request);
	};

	// 自定义extensions
	if (exts || root) {
		root = path.resolve(path.join(path.dirname(hostModule.filename), (root || '.')));
		extensions = [];
		exts.forEach(function(ext) {
			extensions.push(path.join(root, ext));
		});
		host.root = root;
		host.extensions = extensions;
	}
	// 传递extensions
	else if (parent.extensions) {
		host.root = parent.root;
		host.extensions = parent.extensions;
	}

	host.module = hostModule;
	host.relative = path.relative(path.dirname(hostModule.filename), host.root).replace(/\\/ig, '/');
	host.create = create;
	host.all = all;

	return host;
}

/**
 * 目录下所有可以被require的成员，包括扩展
 */
function all(request, callback) {
	var host = this;
	var extensions = this.extensions;
	var root = this.root;
	if (request.indexOf('.') != 0) {
		request = request.slice(root.length);
	}
	// host的所在目录
	var hostdir = path.join(path.dirname(this.module.filename), request);
	// 遍历这些roots
	var roots = [root].concat(extensions);
	// 去掉root的相对路径
	var suffix = hostdir.slice(root.length);
	// 文件map
	var all = [];
	var err;

	async.forEachSeries(roots, function(root, callback) {

		var dir = path.join(root, suffix);

		fs.exists(dir, function(exists) {
			if (exists) {
				fs.readdir(dir, function(err, files) {
					if (err) {
						callback(err);
					} else {
						files.forEach(function(file) {
							file = path.basename(file, '.js');
							// 优先定义，后来有重复则忽略
							if (!~all.indexOf(file)) {
								all.push(file);
							} else {
								err = new Error('extension conflict: ' + path.join(dir, file));
							}
						});
						callback(err);
					}
				});
			} else {
				callback();
			}
		});
	}, function(err) {
		var result = {};
		all.forEach(function(file) {
			var request = './' + host.relative + '/' + suffix + '/' + file;
			var expts = host(request);
			result[file] = expts;
		});
		callback(err, result);
	});
}

/**
 */
function runtime(module) {
	var base = baseCache[module.filename];
	return {base: base};
}

function stripBOM(content) {
	if (content.charCodeAt(0) === 0xFEFF) {
	  	content = content.slice(1);
	}
	return content;
}

require.extensions['.js'] = function(module, filename) {
	var expts = baseCache[filename];
	if (expts) {
		module.base = expts;
	}
	var content = fs.readFileSync(filename, 'utf8');
	content = 'var extension = require("' + __filename.replace(/[\\\/]/g, '\/') + '").runtime(module);\n' + content;
	module._compile(stripBOM(content), filename);
};

exports.create = create;
exports.all = all;
exports.runtime = runtime;