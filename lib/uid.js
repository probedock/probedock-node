var path = require('path');

module.exports = function(env, fs) {

  return {
    load: function(config) {

      if (env.ROX_TEST_RUN_UID) {
        return env.ROX_TEST_RUN_UID;
      } else if (config.workspace === undefined) {
        return null;
      }

      var uidFile = path.join(config.workspace, 'uid');
      return fs.existsSync(uidFile) ? fs.readFileSync(uidFile, { encoding: 'utf8' }).split('\n')[0] : null;
    }
  };
};

module.exports['@require'] = [ 'env', 'fs' ];
