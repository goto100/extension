var path = require('path');
var fs = require('fs');
var async = require('async');

var cache = {};

/**
 */
function find(dirs, url) {
	var host = this;
	var notFound = true; // 是否找到过，找到过则为false，没找到则为第一次没找到时的error
	var result; // 找到的结果
	dirs.forEach(function(dir) {
		var filename;

		try {
			filename = module.constructor._resolveFilename(path.join(dir, url), module);
		} catch(e) {
			if (notFound === true) { // 只记录第一个error
				notFound = e;
			}
		}

		if (filename) {
			// 首次找到
			if (notFound) {
				notFound = false;
				cache[filename] = {
					host: host
				};
				result = require(filename);
			}
			// 进行扩展
			else {
				cache[filename] = {
					host: host,
					base: result
				};
				// 暂时不接管扩展的返回值
				require(filename);
			}
		}
	});
	
	if (notFound) {
		throw notFound;
	} else {
		return result;
	}
}

function wrapper(request) {
	if (request.indexOf('.') != 0) {
		return require(request);
	}
	var host = this;
	var root = this.root;
	var hostModule = this.module;
	var extensions = this.extensions;

	var filename = path.join(path.dirname(hostModule.filename), request);
	var url = path.relative(root, filename);

	var dirs = [root];
	dirs = dirs.concat(this.extensions);

	return find.call(host, dirs, url);
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
		module.paths.push(root);
		extensions = [];
		exts.forEach(function(ext) {
			extensions.push(path.resolve(root, ext));
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
	var relative = path.relative(path.dirname(host.module.filename), host.root).replace(/\\/ig, '/');
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
			var request = './' + path.join(relative, suffix, file);
			var expts = host(request);
			result[file] = expts;
		});
		callback(err, result);
	});
}

/**
 */
function runtime(module) {
	return cache[module.filename];
}

function stripBOM(content) {
	if (content.charCodeAt(0) === 0xFEFF) {
	  	content = content.slice(1);
	}
	return content;
}

require.extensions['.js'] = function(module, filename) {
	var content = fs.readFileSync(filename, 'utf8');
	var extension = cache[filename];
	if (extension) {
		module.base = extension.base;
		module.paths.push(extension.host.root);
		content = 'var extension = require("' + __filename.replace(/[\\\/]/g, '\/') + '").runtime(module);\n' + content;
	}
	module._compile(stripBOM(content), filename);
};

exports.create = create;
exports.all = all;
exports.runtime = runtime;