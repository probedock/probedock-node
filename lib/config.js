var _ = require('underscore'),
    merge = require('deepmerge'),
    path = require('path'),
    yaml = require('js-yaml');

module.exports = function(env, fs) {
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
      }, { publish: true });

      if (options) {
        config = merge(config, options);
      }

      // TODO: parse environment variables
      if (env.ROX_PUBLISH !== undefined) {
        config.publish = env.ROX_PUBLISH.match(/^(?:1|t|true|y|yes)$/);
      }

      return config;
    }
  };
};

module.exports['@require'] = [ 'env', 'fs' ];
