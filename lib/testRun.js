var _ = require('underscore');

module.exports = function(uid) {

  function TestRun(config) {
    this.config = config;
    this.projectApiId = config.project ? config.project.apiId : null;
    this.projectVersion = config.project ? config.project.version : null;
    this.results = [];
  }

  function toArray(a) {
    return _.isArray(a) ? a : _.compact([ a ]);
  }

  function combineArrays() {
    var arrays = _.map(Array.prototype.slice.call(arguments), toArray);
    return _.union.apply(_, arrays);
  }

  function parseAnnotationValue(text, regexp) {
    var match = text.match(regexp);
    return match ? match[1] : null;
  }

  function parseAnnotationList(text, regexp, values) {
    do {
      match = text.match(regexp);
      if (match) {
        values.push(match[1]);
        text = text.replace(regexp, '');
      }
    } while (match);
  }

  var annotationRegexp = /\@rox\(([^\(\)]*)\)/;

  function parseAnnotations(testName) {

    var match = null,
        annotation = {
          tags: [],
          tickets: []
        };

    do {
      match = testName.match(annotationRegexp);
      if (!match) {
        continue;
      }

      var text = match[1];
      annotation.key = parseAnnotationValue(text, /key\=[\"\']?([^\s]+)[\"\']?/);
      annotation.category = parseAnnotationValue(text, /category\=[\"\']?([^\s]+)[\"\']?/) || annotation.category;
      parseAnnotationList(text, /tag\=[\"\']?([^\s]+)[\"\']?/, annotation.tags);
      parseAnnotationList(text, /ticket\=[\"\']?([^\s]+)[\"\']?/, annotation.tickets);

      testName = testName.replace(annotationRegexp, '');
    } while (match);

    return annotation;
  }

  function stripAnnotations(testName) {
    return testName.replace(/\s*\@rox\([^\(\)]*\)/g, '');
  }

  _.extend(TestRun.prototype, {

    start: function() {
      this.uid = uid.load(this.config);
      this.startTime = new Date().getTime();
    },

    add: function(key, name, passed, duration, options) {
      options = options || {};

      var annotation = parseAnnotations(name),
          effectiveKey = key || annotation.key;

      var existingResult = _.findWhere(this.results, { key: effectiveKey, originalName: name });
      if (existingResult) {
        existingResult.numberOfResults++;
        existingResult.duration += duration;
        existingResult.passed = existingResult.passed && passed;

        var message = _.compact([ existingResult.message, options.message ]).join("\n\n");
        if (message.length) {
          existingResult.message = message;
        }

        return existingResult;
      }

      var result = {
        key: effectiveKey,
        name: stripAnnotations(name),
        originalName: name,
        passed: passed,
        duration: duration,
        numberOfResults: 1
      };

      if (options.message) {
        result.message = options.message;
      }

      result.category = options.category || annotation.category || this.config.project.category || null;
      result.tags = combineArrays(options.tags, annotation.tags, this.config.project.tags);
      result.tickets = combineArrays(options.tickets, annotation.tickets, this.config.project.tickets);

      this.results.push(result);
      return result;
    },

    end: function() {
      if (!this.startTime) {
        throw new Error('testRun.start() was not called; call it when the test suite starts running');
      }

      this.endTime = new Date().getTime();
      this.duration = this.endTime - this.startTime;
    },

    validate: function(errors) {

      if (!this.projectApiId) {
        errors.push('Project API ID is not set (set config.project.apiId in rox.yml configuration file)');
      }

      if (!this.projectVersion) {
        errors.push('Project version is not set (set config.project.version in rox.yml configuration file)');
      }

      if (!this.results.length) {
        errors.push('No test result to send');
      }

      var keys = {},
          duplicateKeys = {};

      _.each(this.results, function(result) {
        if (result.key && keys[result.key]) {
          if (!duplicateKeys[result.key]) {
            duplicateKeys[result.key] = [ keys[result.key] ];
          }
          duplicateKeys[result.key].push(result);
        } else {
          keys[result.key] = result;
        }
      });

      _.each(duplicateKeys, function(results, key) {
        errors.push('Test key "' + key + '" is used by ' + results.length + ' results: "' + _.map(results, function(result) {
          return result.name;
        }).join('", "') + '"');
      });
    }
  });

  return TestRun;
};

module.exports['@require'] = [ 'uid' ];
