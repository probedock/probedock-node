var _ = require('underscore'),
    fs = require('fs-extra'),
    q = require('q'),
    path = require('path');

module.exports = function(Config, payloadSerializer, publisher, TestRun) {

  function validate(info) {
    info.config.validate(info.errors);
    info.testRun.validate(info.errors);
    return info;
  }

  function processTestRun(info) {

    var promise = q(info);

    if (!info.errors.length) {
      promise = promise.then(serializePayload).then(handlePayload).then(publishPayload);
    }

    return promise;
  }

  function serializePayload(info) {

    var deferred = q.defer();
    info.payload = payloadSerializer.v1(info.testRun);

    deferred.resolve(info);
    return deferred.promise;
  }

  function handlePayload(info) {

    var config = info.config;
    if (config.workspace) {
      var sharedWorkspace = config.workspace,
          workspace = path.join(sharedWorkspace, 'jasmine');

      fs.mkdirsSync(workspace);
      fs.writeFileSync(path.join(workspace, 'payload.json'), JSON.stringify(info.payload, null, 2), 'utf8');
    }

    return info;
  }

  function publishPayload(info) {

    if (!info.config.publish) {
      return info;
    }

    return publisher.upload(info.payload, info.config.getServerOptions()).then(function() {
      info.published = true;
      return info;
    });
  }

  return {
    loadConfig: function(configOverrides) {
      var config = new Config();
      config.load(configOverrides);
      return config;
    },

    startTestRun: function(config) {
      var testRun = new TestRun(config);
      testRun.start();
      return testRun;
    },

    process: function(testRun) {
      if (!testRun.endTime) {
        throw new Error('testRun.end() was not called; call it when the test suite has finished running');
      }

      return q({ config: testRun.config, testRun: testRun, published: false, errors: [] })
        .then(validate)
        .then(processTestRun);
    }
  };
};

module.exports['@require'] = [ 'config', 'payload', 'publisher', 'testRun' ];
