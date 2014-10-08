var _ = require('underscore'),
    fs = require('fs-extra'),
    q = require('q');

module.exports = function(config, payloadSerializer, server, TestRun) {

  return {
    setUp: function(options) {
      return new TestRun(config.load(options));
    },

    process: function(testRun) {
      if (!testRun.endTime) {
        throw new Error('testRun.end() was not called; call it when the test suite has finished running');
      }

      var config = testRun.config,
          payload = payloadSerializer.v1(testRun),
          contents = JSON.stringify(payload),
          pretty = JSON.stringify(payload, null, 2);
      
      /*if (config.payload && config.payload.print) {
        grunt.log.writeln();
        grunt.log.writeln(pretty);
        grunt.log.writeln();
      }*/

      /*if (!validateTestRun(testRun)) {
        return done(false);
      }*/

      var sharedWorkspace = config.workspace,
          workspace = path.join(sharedWorkspace, 'jasmine');

      fs.mkdirsSync(workspace);
      fs.writeFileSync(path.join(workspace, 'payload.json'), pretty, 'utf8');

      var publish = config.publish && (!process.env.ROX_PUBLISH || process.env.ROX_PUBLISH === '1');
      if (!publish) {
        //grunt.log.writeln('ROX publishing disabled');
        return q();
      }

      return server.upload(payload, config.servers[config.server]);
    }
  };
};

module.exports['@require'] = [ 'config', 'payload', 'server', 'testRun' ];
