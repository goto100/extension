var path = require('path');
var fs = require('fs');
var async = require('async');

var cache = {};

function Host(root, extensionRoots) {
	this.root = root;
	this.extensionRoots = extensionRoots;
}

function require2(request) {
	var url, filename, host, extension;

	if (request.indexOf('.') != 0) {
		return this._require(request);
	}

	extension = this.extension;
	host = extension.host;
	filename = path.join(path.dirname(this.filename), request);
	url = path.relative(extension.root, filename);

	// ignore external path
	if (filename.indexOf(extension.root) != 0) {
		return this._require(request);
	}

	var info;
	var roots = [host.root].concat(host.extensionRoots);
	var notFound = true; // found: false; not found: first error.
	var found;

	roots.forEach(function(root) {
		var filename;

		try {
			filename = module.constructor._resolveFilename(path.join(root, url), module);
		} catch(e) {
			if (notFound === true) { // 只记录第一个error
				notFound = e;
			}
		}

		if (!filename) {
			return;
		}

		// 首次找到
		if (notFound) {
			notFound = false;
			info = {
				root: root,
				host: host,
				extensions: [],
			}
			found = filename;
		}
		// 进行扩展
		else {
			info = {
				root: root,
				host: host,
			}
			cache[found].extensions.push(filename);
		}

		cache[filename] = info;
	});

	if (notFound) {
		throw notFound;
	} else {
		var result = require(found);
		var targetModule = require.cache[found];
		if (targetModule.extensions) {
			targetModule.extensions.forEach(function(ext) {
				cache[ext].extending = targetModule;
				require(ext);
			});
		}
		return result;
	}
};

/**
 * 目录下所有可以被require的成员，包括扩展
 */
function requireAll(request, callback) {
	var module = this;
	var host = this.extension.host;
	var extensionRoots = host.extensionRoots;
	var root = host.root;
	if (request.indexOf('.') != 0) {
		request = request.slice(root.length);
	}
	var relative = path.relative(path.dirname(this.filename), root).replace(/\\/ig, '/');
	// host的所在目录
	var hostdir = path.join(path.dirname(this.filename), request);
	// 遍历这些roots
	var roots = [root].concat(extensionRoots);
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
			var request = './' + path.join(relative, suffix, file);
			var expts = module.require(request);
			result[file] = expts;
		});
		callback(err, result);
	});
}

function init(hostModule, extensionRoots, root) {
	if (hostModule._require) {
		throw new Error('module already inited.');
	}

	var prefix = path.dirname(hostModule.filename);
	extensionRoots.forEach(function(extensionRoot, i) {
		extensionRoots[i] = path.resolve(prefix, extensionRoot);
	});
	root = path.resolve(prefix, root || '.');

	var host = new Host(root, extensionRoots);
	var info = {
		root: root,
		host: host,
	};
	wrapModule(hostModule, info);
}

function wrapModule(module, info) {
	module.extension = {
		root: info.root,
		host: info.host
	};
	module.extensions = info.extensions;
	module.extending = info.extending;
	module._require = module.require;
	module.require = require2;
	module.requireAll = requireAll;
}

;(function() {
	var old = require.extensions['.js'];
	require.extensions['.js'] = function(module, filename) {
		var info = cache[filename];
		if (info) {
			wrapModule(module, info);
		}

		old.apply(this, arguments);
	};
})();

exports.init = init;