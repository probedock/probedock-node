var _ = require('underscore'),
    q = require('q'),
    url = require('url');

module.exports = function(http, https) {

  return {
    upload: function(payload, options) {

      var deferred = q.defer();

      $q.when({ payload: payload, options: options })
        .then(getPayloadResourceUrl)
        .then(_.bind(notifyConnected, undefined, deferred))
        .then(uploadPayload)
        .then(deferred.resolve, deferred.reject);

      return deferred.promise;
    }
  };

  function uploadPayload(publishing) {

    var payloadUrl = url.parse(publishing.payloadUrl),
        options = {
          hostname: payloadUrl.hostname,
          port: payloadUrl.port,
          path: payloadUrl.path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/vnd.lotaris.rox.payload.v1+json',
            'Content-Length': payload.length,
            'Authorization': 'RoxApiKey id="' + publishing.options.apiKeyId + '" secret="' + publishing.options.apiKeySecret + '"'
          }
        };

    var deferred = q.defer();

    var req = (payloadUrl.protocol === 'https:' ? https : http).request(options, function(res) {

      var body = '';
      res.on('data', function(chunk) {
        body += chunk;
      });

      res.on('end', function() {
        if (res.statusCode !== 202) {
          deferred.reject(new Error('Server responded with unexpected status code ' + res.statusCode + ' (response: ' + body + ')'));
        } else {
          publishing.done = true;
          deferred.resolve(publishing);
        }
      });
    });

    req.on('error', deferred.reject);
    req.write(publishing.payload);
    req.end();

    return deferred.promise;
  }

  function notifyConnected(deferred, publishing) {
    deferred.notify(publishing);
    return publishing;
  }

  function getPayloadResourceUrl(publishing) {

    var apiUrl = url.parse(publishing.options.apiUrl),
        options = {
          hostname: apiUrl.hostname,
          port: apiUrl.port,
          path: apiUrl.path,
          method: 'GET',
          headers: {
            'Accept': 'application/hal+json',
            'Authorization': 'RoxApiKey id="' + publishing.options.apiKeyId + '" secret="' + publishing.options.apiKeySecret + '"'
          }
        };

    var deferred = q.defer();

    var req = (apiUrl.protocol === 'https:' ? https : http).request(options, function(res) {

      var body = '';
      res.on('data', function(chunk) {
        body += chunk;
      });

      res.on('end', function() {
        if (res.statusCode !== 200) {
          deferred.reject(new Error('Server responded with unexpected status code ' + res.statusCode + ' (response: ' + body + ')'));
        } else {
          publishing.payloadUrl = parsePayloadResourceUrl(body);
          deferred.resolve(publishing);
        }
      });
    });

    req.on('error', deferred.reject);
    req.end();

    return deferred.promise;
  }

  function parsePayloadResourceUrl(body) {

    var apiRoot = JSON.parse(body);

    var links = apiRoot._links;
    if (!links) {
      throw new Error('Expected ROX Center API root to have _links property (response: ' + body + ')');
    }
    
    var testPayloadsLink = links['v1:test-payloads'];
    if (!testPayloadsLink) {
      throw new Error('Expected ROX Center API root to have link v1:test-payloads (response: ' + body + ')');
    }

    var href = testPayloadsLink.href;
    if (!href) {
      throw new Error('Expected ROX Center API root v1:test-payloads link to have an href property (response: ' + body + ')');
    }

    return href;
  }
};

module.exports['@require'] = [ 'http', 'https' ];
