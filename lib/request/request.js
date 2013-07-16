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

    function _getParamsRequestString(params) {

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


    var request = {};

        request.request = function(attrs, params, opts) {

            attrs   = attrs  || {};
            params  = params || {};
            opts    = opts   || {};

            var def = deferred();
            if (attrs.method === void 0)  throw new Error('no method given');

            var that = this;
            var template_params = {};
                template_params.method      = attrs.method      || false;
                template_params.namespace   = attrs.namespace   || false;
                template_params.header      = attrs.header      || params.header    ||  false;
                template_params.params      = _getParamsRequestString(attrs.params);

            function _request(tpl) {

                var _tpl = _.template(tpl, template_params);

                var data;
                var protocol = _getProtocol(opts);
                var request  = protocol.request({
                        host    : params.host       || null,
                        path    : params.path       || null,
                        method  : params.method     || 'POST',
                        headers : attrs.headers     || params.headers || null
                    });

                    request.once('error',     function(err) { def.reject(err); });
                    request.once('response',  function(res) {

                        res.setEncoding('utf8');
                        res.on('end', function() {
                            def.resolve(data, res.headers);
                        });
                        res.on('data', function(chunk) {
                            data += chunk;
                        });
                    });

                    request.write(_tpl);
                    request.end();
            }

            var readFile = deferred.promisify(fs.readFile);
                readFile(__dirname + path.sep + 'request.tpl', 'utf-8')(_request, function (err) {
                    console.log(err);
                });

            return def.promise;
        };

        request.get     = function(params, opts) {

            params  = params || {};
            opts    = opts   || {};

            var def = deferred();
            if (params.host === void 0 || params.path === void 0) {
                throw new Error('insufficient arguments for get');
            }

            var data;
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


        that.get        = request.get;
        that.request    = request.request;
})();
