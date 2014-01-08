(function() {

    var that    = module.exports;

    var fs      = require('fs');
    var http    = require('http');
    var https   = require('https');

    var _       = require('underscore');
    var Promise = require('promise');


    var path    = require('path');


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

        if (params.host === void 0 || params.path === void 0) {
            throw new Error('insufficient arguments for get');
        }

        params  = params || {};
        opts    = opts   || {};

        if (params.host === void 0 || params.path === void 0) {
            throw new Error('insufficient arguments for get');
        }

        return new Promise(function (resolve, reject) {

            var data = '';
            var protocol = _getProtocol(opts);
            var request  = protocol.get(params, function(res) {
                                res.setEncoding('utf8');
                                res.on('end',  function() { resolve(data); });
                                res.on('data', function(chunk) {
                                    data += chunk;
                                });
                            });

                request.on('error', function(error) {
                    reject(error);
                });
        });
    };

    //do a soap call
    that.soapCall = function(callParams, soapParams, stdParams, opts) {

        callParams  = callParams    || {};
        soapParams  = soapParams    || {};
        stdParams   = stdParams     || {};
        opts        = opts          || {};

        //set params
        var requestParams   = _.extend({
                method      : 'POST'
            }, stdParams, soapParams);

        // Set cookies in header
        var cookies = opts.cookies || [];
        if (0 < cookies.length) {
            requestParams.headers = requestParams.headers || {};
            requestParams.headers.Cookie = cookies.join(';');
        }

        var templateParams  = _.extend({
                method      : false,
                namespace   : false,
                header      : stdParams.header || false
            }, callParams);

            //modify params
            templateParams.params = _getParamsRequestString(callParams.params, templateParams.namespace);

        var read     = Promise.denodeify(fs.readFile);
        var protocol = _getProtocol(opts);

        return new Promise(function(resolve, reject) {
            read(__dirname + path.sep + 'request.tpl', 'utf-8')
                .then(function(tpl) {
                    var _tpl = _.template(tpl, templateParams);

                    var data = '';

                    var request  = protocol.request(requestParams);
                        request.once('error',     function(err) { reject(err); });
                        request.once('response',  function(res) {

                            res.setEncoding('utf8');
                            res.on('end', function() {

                                resolve({
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
        });
    };


})();