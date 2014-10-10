var _ = require('underscore'),
    q = require('q');

module.exports = function(request) {

  return {
    request: function(options) {
      delete options.url;
      return q(options).then(getRelation).then(makeRequest);
    }
  };

  function makeRequest(options) {

    delete options.rel;
    delete options.apiUrl;

    if (!options.headers) {
      options.headers = {};
    }

    options.headers.Authorization = 'RoxApiKey id="' + options.apiKeyId + '" secret="' + options.apiKeySecret + '"';

    delete options.apiKeyId;
    delete options.apiKeySecret;

    var deferred = q.defer();
    request(options, function(err, res) {
      if (err) {
        deferred.reject(err);
      } else {
        deferred.resolve(res);
      }
    });

    return deferred.promise;
  }

  function extractRelation(options, res) {

    var body = JSON.parse(res.body),
        links = body._links;
    if (!links) {
      throw new Error('Expected hal+json response to have a "_links" property (response: ' + res.body + ')');
    }

    var relName = options.rel.shift(),
        rel = links[relName];
    if (!rel) {
      throw new Error('Expected hal+json response to have link "' + relName + '" (response links: ' + JSON.stringify(links) + ')');
    } else if (!rel.href) {
      throw new Error('Expected link ' + relName + ' in hal+json response to have an "href" property (link: ' + JSON.stringify(rel) + ')');
    }

    options.url = rel.href;
  }

  function getRelation(options) {

    var requestOptions = {
      url: options.url || options.apiUrl,
      method: 'GET',
      headers: {
        'Accept': 'application/hal+json',
        'Authorization': 'RoxApiKey id="' + options.apiKeyId + '" secret="' + options.apiKeySecret + '"'
      }
    };

    var deferred = q.defer(),
        promise = deferred.promise,
        startTime = new Date().getTime();

    request(requestOptions, function(err, res) {
      if (err) {
        deferred.reject(err);
      } else {
        extractRelation(options, res);
        if (options.rel.length) {
          deferred.resolve(getRelation(options));
        } else {
          deferred.resolve(options);
        }
      }
    });

    return deferred.promise;
  }
};

module.exports['@require'] = [ 'request' ];
