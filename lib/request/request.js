(function() {

    var that        = module.exports;

    var fs          = require('fs');
    var http        = require('http');
    var https       = require('https');

    var _           = require('underscore');
    var deferred    = require('deferred');
    var path        = require('path');


    function _getProtocol(opts) {

        opts = opts || {};
        if (opts.secure === void 0 ||
            opts.secure === true) {
            return https;
        }
        return http;
    }

    function _getParamsRequestString(params, namespace) {

        if (params === void 0 || params === '') {
            return false;
        }

        var params_string = [];
        _(params).each(function(value, param) {

            if (_.isObject(value) &&
                !_.isArray(value) &&
                !_.isString(value) &&
                !_.isNumber(value)) {
                value = _getParamsRequestString(value);
            }

            var string = '<' + param + '>' + value + '</' + param + '>';
            if (value === null) string = '<' + param + '/>';
            if (_.isArray(value)) {
                var sub_string = [];
                _(value).each(function(sub_value) {
                    sub_string.push('<' + param + '>' + sub_value + '</' + param + '>');
                });

                string = sub_string.join('');
            }

            params_string.push(string);
        });

        return params_string.join('');
    }


    //do a get request
    that.get = function(params, opts) {

        params  = params || {};
        opts    = opts   || {};

        var def = deferred();
        if (params.host === void 0 || params.path === void 0) {
            throw new Error('insufficient arguments for get');
        }

        var data = '';
        var protocol = _getProtocol(opts);
        var request  = protocol.get(params, function(res) {
                            res.setEncoding('utf8');
                            res.on('end',  function() { def.resolve(data); });
                            res.on('data', function(chunk) {
                                data += chunk;
                            });
                        });

            request.on('error', function(error) {
                def.reject(error);
            });

        return def.promise;
    };

    //do a soap call
    that.soapCall = function(callParams, soapParams, stdParams, opts) {

        callParams  = callParams    || {};
        soapParams  = soapParams    || {};
        stdParams   = stdParams     || {};
        opts        = opts          || {};

        var def = deferred();

        //set params
        var requestParams   = _.extend({
                method      : 'POST'
            }, stdParams, soapParams);

        var templateParams  = _.extend({
                method      : false,
                namespace   : false,
                header      : stdParams.header || false
            }, callParams);

            //modify params
            templateParams.params = _getParamsRequestString(callParams.params, templateParams.namespace);

        //get request template
        fs.readFile(__dirname + path.sep + 'request.tpl', 'utf-8', function(err, tpl) {

            if (err) {
                throw new Error('no tpl available');
            }

            var _tpl = _.template(tpl, templateParams);

            var data = '';
            var protocol = _getProtocol(opts);
            var request  = protocol.request(requestParams);

                request.once('error',     function(err) { def.reject(err); });
                request.once('response',  function(res) {

                    res.setEncoding('utf8');
                    res.on('end', function() {

                        def.resolve({
                            'response'  : data,
                            'header'    : res.headers
                        });
                    });
                    res.on('data', function(chunk) {
                        data += chunk;
                    });
                });

                request.write(_tpl);
                request.end();
        });

        return def.promise;
    };


})();