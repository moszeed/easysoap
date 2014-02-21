(function() {

    var that    = module.exports;

    var fs      = require('fs');
    var http    = require('http');
    var https   = require('https');

    var _       = require('underscore');
    var Promise = require('promise');
    var request = require('request');

    var path    = require('path');


    function _getProtocol(opts) {

        opts = opts || {};
        return (opts.secure === void 0 ||
                opts.secure === true) ? 'https://' : 'http://';
    }

    function _getParamsRequestString(params) {

        if (params          === void 0 ||
            params.length   === 0) {
            return {};
        }

        var requestParams = [];
        _.each(params, function(value, param) {

            if (_.isObject(value) &&
                !_.isArray(value) &&
                !_.isString(value) &&
                !_.isNumber(value) &&

                (value._attributes  === void 0 ||
                 value._value       === void 0)) {

                value = _getParamsRequestString(value);
            }

            var attributes = '';
            if(_.isObject(value) &&
                value._attributes !== void 0) {

                var attributeItems = [];
                _.each(value._attributes, function(attrItem, attrValue) {
                    attributeItems.push(attrItem + '="' + attrValue + '"');
                });

                delete value._attributes;
                value = value._value;

                attributes = ' ' + attributeItems.join(' ');
            }

            var entitie = '<' + param + '' + attributes + '>' + value + '</' + param + '>';
            if (value === null) {
                entitie = '<' + param + '/>';
            }

            if (_.isArray(value)) {
                var sub_string = [];
                _(value).each(function(sub_value) {
                    sub_string.push('<' + param + '>' + sub_value + '</' + param + '>');
                });

                entitie = sub_string.join('');
            }


            requestParams.push(entitie);
        });

        return requestParams.join('');
    }



    function _getRequestEnvelope(params) {

        params = _.extend({}, params || {});

        var returnValue = {
            soap_env    : params.soap.soap_env      || 'http://schemas.xmlsoap.org/soap/envelope/',
            xml_schema  : params.soap.xml_schema    || 'http://www.w3.org/2001/XMLSchema',
            namespaces  : []
        };

        var namespaces = [];

        //set namespace to header
        if (params.namespace !== void 0) {
            namespaces.push(params.namespace);
        }

        _.each(params.header, function(headerItem) {
            if (headerItem.namespace !== void 0) {
                namespaces.push(headerItem.namespace);
            }
        });

        returnValue.namespaces = namespaces;

        return returnValue;
    }

    function _getRequestHead(params) {

        params = _.extend({}, params || {});
        if (params.header.length === 0) {
            return {};
        }

        var returnValue = [];
        _.each(params.header, function(headerItem) {

            var namespace   = '';
            if (headerItem.namespace !== void 0) {
                var nsIndex     = params.envelope.namespaces.indexOf(headerItem.namespace);
                if (nsIndex     !== -1) {
                    namespace = 'ns' + nsIndex + ':';
                }
            }

            var itemString = '<' + namespace + '' + headerItem.name + '>';
                itemString += headerItem.value;
                itemString += '</' + namespace + '' + headerItem.name + '>';

            returnValue.push(itemString);
        });

        return returnValue;
    }

    function _getRequestBody(params) {

        params = params || {};

        var namespace = null;
        if (params.namespace) {
            namespace = params.envelope.namespaces.indexOf(params.namespace);
        }

        return {
            'params'    : _getParamsRequestString(params.params),
            'namespace' : namespace,
            'method'    : params.method
        };
    }


    function _getTemplateParams(callParams, soapParams) {

        var envelope = _getRequestEnvelope({
            'namespace' : callParams.namespace  || {},
            'soap'      : callParams.soap       || {},
            'header'    : callParams.header     || {}
        });

        var head = _getRequestHead({
            'envelope'  : envelope,
            'header'    : callParams.header     || {}
        });

        var body = _getRequestBody({
            'envelope'  : envelope,
            'method'    : callParams.method,
            'namespace' : callParams.namespace,
            'params'    : callParams.params
        });

        return {
            'envelope'  : envelope,
            'head'      : head,
            'body'      : body
        };
    }


    //do a get request
    that.get = function(params, opts) {

        params  = params || {};
        opts    = opts   || {};

        if (params.host === void 0 ||
            params.path === void 0) {
            throw new Error('insufficient arguments for get');
        }

        if (params.rejectUnauthorized === void 0) {
            params.rejectUnauthorized = true;
        }

        return new Promise(function (resolve, reject) {

            request({
                url                 : _getProtocol(opts) + params.host + params.path,
                headers             : params.headers || {},
                rejectUnauthorized  : params.rejectUnauthorized
            }, function(error, response, body) {

                if (error) { reject(error); }
                else {
                    resolve({
                        response    :   response,
                        body        :   body
                    });
                }
            });
        });
    };

    //do a soap call
    that.soapCall = function(callParams, soapParams, opts) {

        callParams  = callParams    || {};
        soapParams  = soapParams    || {};
        opts        = opts          || {};

        if (callParams.rejectUnauthorized === void 0) {
            callParams.rejectUnauthorized = true;
        }

        return new Promise(function(resolve, reject) {

            var template_params = _getTemplateParams(callParams, soapParams);

            var read = Promise.denodeify(fs.readFile);
                read(__dirname + path.sep + 'request.tpl', 'utf-8')
                    .done(function(tpl) {

                        request({
                            url                 : _getProtocol(opts) + callParams.host + callParams.path,
                            body                : _.template(tpl, template_params),
                            headers             : _.extend({}, soapParams.headers, callParams.headers),
                            rejectUnauthorized  : callParams.rejectUnauthorized,
                            method              : 'POST'
                        }, function(error, response, body) {

                            if (error) { reject(error); }
                            else {

                                resolve({
                                    'body'      : body,
                                    'response'  : response,
                                    'header'    : response.headers
                                });
                            }
                        });
                    });

        });
    };

})();