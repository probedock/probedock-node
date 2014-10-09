var _ = require('underscore'),
    fs = require('fs-extra'),
    q = require('q'),
    path = require('path');

module.exports = function(config, payloadSerializer, server, TestRun) {

  function validate(info) {
    info.testRun.validate(info.errors);
    return info;
  }

  function process(info) {

    var promise = q(info);

    if (!info.errors.length) {
      promise = promise.then(serialize).then(handlePayload);
    }

    return promise;
  }

  function serialize(info) {

    var deferred = q.defer();
    info.payload = payloadSerializer.v1(info.testRun);

    deferred.notify({ id: 'serialized', testRun: info.testRun, payload: info.payload });

    deferred.resolve(info);
    return deferred.promise;
  }

  function handlePayload(info) {

    var config = info.testRun.config;
    if (config.workspace) {
      var sharedWorkspace = config.workspace,
          workspace = path.join(sharedWorkspace, 'jasmine');

      fs.mkdirsSync(workspace);
      fs.writeFileSync(path.join(workspace, 'payload.json'), JSON.stringify(info.payload, null, 2), 'utf8');
    }

    return info;
  }

  function publish(info) {

    if (!config.publish) {
      return info;
    }

    return server.upload(info.payload, info.testRun.config.servers[config.server]).then(function() {
      info.published = true;
      return info;
    });
  }

  return {
    setUp: function(options) {
      return new TestRun(config.load(options));
    },

    process: function(testRun) {
      if (!testRun.endTime) {
        throw new Error('testRun.end() was not called; call it when the test suite has finished running');
      }

      return q({ testRun: testRun, published: false, errors: [] })
        .then(validate)
        .then(process);
    }
  };
};

module.exports['@require'] = [ 'config', 'payload', 'server', 'testRun' ];
