var path = require('path');
var fs = require('fs');
var async = require('async');

var baseCache = {};

/**
 * 加载扩展中的同名模块
 * @param request 请求的模块
 * @param base 被扩展的模块的exports
 * @returns 扩展中同名加载成功后的模块
 */
function extRequire(request, base) {
	var extensions = this.extensions;
	request = path.join(path.dirname(this.module.filename), request);

	var mods = [];
	if (~request.indexOf(this.root)) {
		request = request.slice(this.root.length + 1);
	} else {
		return mods;
	}

	extensions.forEach(function(ext) {
		var extRequest = path.join(ext, request);
		try {
			// 保存在cache中的key
			// https://github.com/joyent/node/blob/master/lib/module.js
			var filename = module.constructor._resolveFilename(extRequest, module);
			baseCache[filename] = base;
			require(extRequest);
			var mod = require.cache[filename];
			mods.push(mod);
			// TODO 把log放到hook中，避免多次出现
			// console.log('extension %s extended for %s', ext.name, ext.filename);
		} catch(e) {
			// 只吞掉没有模块的情况，其他引用失败则是扩展的问题，报出来
			if (e.code != 'MODULE_NOT_FOUND') {
				throw e;
			}
		}
	});

	return mods;
}

/**
 * 建立
 */
function create(hostModule, exts, root) {
	var parent = this;
	var extensions;
	var host = function(request) {
		// 是否是不存在的模块，需要返回扩展中的同名模块
		var isNew = false;
		// 当不存在时，从扩展获取的所有模块
		var mods;
		try {
			var expts = hostModule.require(request);
		} catch (e) {
			// 出错，则通过扩展返回这个模块
			isNew = e;
		}

		// 暂时仅仅加载第一个存在此文件的扩展中的文件，不支持扩展一个扩展的用法
		if (isNew) {
			mods = extRequire.call(host, request);
			// 多个扩展都返回了这个模块，冲突报错。
			if (mods.length > 1) {
				throw new Error(mods.map(function(mod) {return mod.filename}).join(', ') + ' conflict for ' + request + '.');
			}
			if (mods.length) {
				expts = mods[0].exports;
			}
			if (!expts) {
				throw isNew;
			}
		}
		// 加载扩展中的同名模块
		else {
			// require所有扩展中的同名模块
			extRequire.call(host, request, expts);
		}
		return expts;
	};

	// 自定义extensions
	if (exts || root) {
		root = path.join(path.dirname(hostModule.filename), ('.' || root));
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
	host.create = create;
	host.all = all;

	return host;
}

/**
 * 目录下所有可以被require的成员，包括扩展
 */
function all(request, callback) {
	var extensions = this.extensions;
	var root = this.root;
	// host的所在目录
	var hostdir = path.join(path.dirname(this.module.filename), request);
	// 遍历这些dirs
	var dirs = [hostdir];
	// 文件map
	var all = {};
	// 去掉root的相对路径
	var suffix;
	var err;

	if (~hostdir.indexOf(root)) {
		suffix = hostdir.slice(root.length + 1);
		extensions.forEach(function(extension) {
			var extdir = path.join(extension, suffix);
			dirs.push(extdir);
		});
	}

	async.forEachSeries(dirs, function(dir, callback) {
		fs.exists(dir, function(exists) {
			if (exists) {
				fs.readdir(dir, function(err, files) {
					if (err) {
						callback(err);
					} else {
						files.forEach(function(file) {
							// 优先定义，后来有重复则忽略
							if (!all[file]) {
								all[file] = path.join(dir, file);
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
		var result = [];
		Object.keys(all).forEach(function(key) {
			var filename = all[key];
			var expts = require(filename);
			result.push(expts)
		});
		callback(err, result);
	});
}


/**
 * 扩展获取被扩展的引用
 */
function base(extModule) {
	return baseCache[extModule.filename];
}

exports.create = create;
exports.base = base;
exports.all = all;