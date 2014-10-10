var _ = require('underscore'),
    q = require('q');

module.exports = function(api) {

  return {
    upload: function(payload, options) {

      var deferred = q.defer(),
          serializedPayload = JSON.stringify(payload),
          requestOptions = _.pick(options, 'apiUrl', 'apiKeyId', 'apiKeySecret'),
          startTime = new Date().getTime();

      api.request(_.extend(requestOptions, {
        rel: [ 'v1:test-payloads' ],
        method: 'POST',
        body: serializedPayload,
        headers: {
          'Content-Type': 'application/vnd.lotaris.rox.payload.v1+json',
          'Content-Length': serializedPayload.length,
        }
      })).then(function(res) {
        if (res.statusCode !== 202) {
          throw new Error('Server responded with unexpected status code ' + res.statusCode + ' (response: ' + res.body + ')');
        } else {
          deferred.resolve();
        }
      }).fail(deferred.reject);

      return deferred.promise;
    }
  };
};

module.exports['@require'] = [ 'api' ];
