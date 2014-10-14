var ioc = require('./ioc');

exports.Config = ioc.create('config');
exports.TestRun = ioc.create('testRun');

exports.api = ioc.create('api');
exports.client = ioc.create('client');
exports.uid = ioc.create('uid');

exports.version = require('../package').version;
