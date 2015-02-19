(function() {

    "use strict";

    var that    = module.exports;

    var fs      = require('fs');
    var http    = require('http');
    var https   = require('https');

    var _       = require('underscore');
    var Promise = require('promise');
    var request = require('request');

    var path    = require('path');

    var wsdl    = require('../wsdl.js');


    function _getProtocol(opts) {

        opts = opts || {};
        return (opts.secure === void 0 ||
                opts.secure === true) ? 'https://' : 'http://';
    }


    function _getRequestEnvelope(callParams, namespaces, opts) {

        callParams.soap = callParams.soap || {};

        return new Promise(function(resolve, reject) {

            var namespacePromises = [];

            if (namespaces.indexOf("tns") === -1) {
                namespacePromises.push(wsdl.getNamespaceByNs("tns", callParams, opts));
            }

            _.each(namespaces, function(namespace) {
                namespacePromises.push(wsdl.getNamespaceByNs(namespace, callParams, opts));
            });

            Promise.all(namespacePromises)
                .done(function(namespaceData) {

                    if (callParams.header !== void 0) {
                        _.each(callParams.header, function(headerItem, index) {
                            namespaceData.push({
                                short : 'cns' + index,
                                full  : headerItem.namespace
                            });
                        });
                    }

                    resolve({
                        soap_env    : callParams.soap.soap_env      || 'http://schemas.xmlsoap.org/soap/envelope/',
                        xml_schema  : callParams.soap.xml_schema    || 'http://www.w3.org/2001/XMLSchema',
                        namespaces  : namespaceData
                    });

                }, function(err) { console.log(err); });
        });
    }

    function _getRequestHead(callParams, namespaces, opts) {

        callParams = callParams || {};

        return new Promise(function(resolve, reject) {

            if (callParams.header === void 0 ||
                Object.keys(callParams.header).length === 0) {
                resolve(null);
                return;
            }

            var headerParts = [];
            _.each(callParams.header, function(headerItem, index) {

                var item = '<cns' + index + ':' + headerItem.name + '>';
                    item += headerItem.value;
                    item += '</cns' + index + ':' + headerItem.name + '>';

                headerParts.push(item);
            });

            resolve(headerParts);
        });
    }

    function _getTemplateParams(callParams, methodParams, opts) {

        var namespaces = [];

        var requestParamsFunc = function(name, params) {

            if (_.isArray(params) && _.isObject(params)) {

                var returnValue = null;
                _.each(params, function(param) {
                    if (returnValue === null) {
                        returnValue = requestParamsFunc(name, param);
                    }
                });

                return returnValue;
            }

            if (name === params.name) {
                return params;
            }

            if (params.params === void 0) {
                return null;
            }

            return requestParamsFunc(name, params.params);
        };

        var requestItems = function(cParams, mParams, namespace) {

            namespace  = namespace || null;

            if (namespaces.indexOf(mParams.namespace) === -1) {
                if (mParams.namespace !== null) {
                    namespaces.push(mParams.namespace);
                }
            }

            var item = '';
            _.each(cParams, function(cParam, cParamName) {

                var methodItem = requestParamsFunc(cParamName, mParams);

                if (namespace === null &&
                    methodItem !== void 0 &&
                    methodItem !== null) {
                    namespace = methodItem.namespace;
                }

                if (namespaces.indexOf(namespace) === -1) {
                    if (namespace !== null) {
                        namespaces.push(namespace);
                    }
                }

                var namespace_string = '';
                if (namespace !== null && namespace !== 'xsd') {
                    namespace_string = namespace + ':';
                }

                var attributes = '';
                if (_.isObject(cParam) && cParam._attributes) {
                    _.each(cParam._attributes, function(attrVal, attrKey) {
                        attributes += ' ' + attrKey + '="' + attrVal + '"';
                    });

                    cParam = cParam._value || null;
                }

                if (cParam === null) {
                    item += '<' + namespace_string + cParamName + attributes + ' />';
                }
                else {

                    if (_.isObject(cParam)) {

                        if (_.isArray(cParam)) {

                            _.each(cParam, function(cParamValue) {
                                item += '<' + namespace_string + cParamName + '>';
                                item += cParamValue;
                                item += '</' + namespace_string + cParamName + '>';
                            });
                        }
                        else {
                            item += '<' + namespace_string + cParamName + attributes + '>';
                            item += requestItems(cParam, mParams, namespace);
                            item += '</' + namespace_string + cParamName + '>';
                        }
                    }
                    else {
                        item += '<' + namespace_string + cParamName + attributes + '>';
                        item += cParam;
                        item += '</' + namespace_string + cParamName + '>';
                    }
                }
            });

            return item;
        };


        var requestParamString = requestItems(callParams.params, methodParams.request);

        return new Promise(function(resolve, reject) {

            _getRequestEnvelope(callParams, namespaces, opts)
                .done(function(requestEnvelope) {

                    _getRequestHead(callParams, namespaces, opts)
                        .done(function(requestHead) {
                            resolve([
                                requestEnvelope,
                                requestHead,
                                requestParamString
                            ]);
                        });
                });
        });
    }


    that._template = _.template(fs.readFileSync(__dirname + path.sep + 'request.tpl', 'utf-8'));


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
                        'body'      : body,
                        'response'  : response,
                        'header'    : response.headers
                    });
                }
            });
        });
    };

    //do a soap call
    that.soapCall = function(params, opts) {

        params  = params    || {};
        opts    = opts      || {};

        var that = this;

        if (params.rejectUnauthorized === void 0) {
            params.rejectUnauthorized = true;
        }

        return new Promise(function(resolve, reject) {

            wsdl.getMethodParams(params, opts)
                .done(function(methodParams) {

                    _getTemplateParams(params, methodParams, opts)
                        .done(function(data) {

                            request({
                                url                 : _getProtocol(opts) + params.host + params.path,
                                body                : that._template({
                                    'envelope'  : data[0],
                                    'head'      : data[1],
                                    'body'      : {
                                        'method'    : params.method,
                                        'params'    : data[2],
                                        'namespace' : methodParams.request.namespace
                                    }
                                }),
                                headers             : _.extend({}, params.headers),
                                rejectUnauthorized  : params.rejectUnauthorized,
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


                }, function(err) {
                    reject(err);
                });
        });
    };

})();
