var _ = require('underscore'),
    merge = require('deepmerge'),
    path = require('path'),
    yaml = require('js-yaml');

module.exports = function(fs) {
  return {
    load: function(options) {

      var configFiles = [
        path.join(process.env.HOME, '.rox', 'config.yml'),
        path.join(process.env.ROX_CONFIG || '.', 'rox.yml')
      ];

      // TODO: log warning if yaml is invalid
      var config = _.reduce(configFiles, function(memo, path) {
        if (fs.existsSync(path)) {
          memo = merge(memo, yaml.safeLoad(fs.readFileSync(path, { encoding: 'utf-8' })));
        }
        return memo;
      }, {});

      if (options) {
        config = merge(config, options);
      }

      // TODO: parse environment variables

      return config;
    }
  };
};

module.exports['@require'] = [ 'fs' ];
