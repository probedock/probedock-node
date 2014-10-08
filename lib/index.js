var ioc = require('./ioc');

exports.client = ioc.create('client');
exports.version = require('../package').version;
