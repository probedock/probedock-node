var _ = require('underscore'),
    q = require('q'),
    url = require('url');

module.exports = function(http, https) {

  return {
    upload: function(payload, options) {
      return q.when({ payload: payload, options: options })
        .then(getPayloadResourceUrl)
        .then(uploadPayload);
    }
  };

  function uploadPayload(publishing) {

    var payload = JSON.stringify(publishing.payload),
        payloadUrl = url.parse(publishing.payloadUrl),
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

    var deferred = q.defer(),
        startTime = new Date().getTime();

    var req = (payloadUrl.protocol === 'https:' ? https : http).request(options, function(res) {

      var body = '';
      res.on('data', function(chunk) {
        body += chunk;
      });

      res.on('end', function() {
        if (res.statusCode !== 202) {
          deferred.reject(new Error('Server responded with unexpected status code ' + res.statusCode + ' (response: ' + body + ')'));
        } else {
          deferred.notify({
            id: 'published',
            time: new Date().getTime() - startTime
          });
          deferred.resolve(publishing);
        }
      });
    });

    req.on('error', deferred.reject);
    req.write(payload);
    req.end();

    return deferred.promise;
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

    var deferred = q.defer(),
        startTime = new Date().getTime();

    var req = (apiUrl.protocol === 'https:' ? https : http).request(options, function(res) {

      var body = '';
      res.on('data', function(chunk) {
        body += chunk;
      });

      res.on('end', function() {
        if (res.statusCode !== 200) {
          deferred.reject(new Error('Server responded with unexpected status code ' + res.statusCode + ' (response: ' + body + ')'));
        } else {
          publishing.apiUrl = publishing.options.apiUrl;
          publishing.payloadUrl = parsePayloadResourceUrl(body);

          deferred.notify({
            id: 'connected',
            apiUrl: publishing.apiUrl,
            payloadUrl: publishing.payloadUrl,
            time: new Date().getTime() - startTime
          });

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
