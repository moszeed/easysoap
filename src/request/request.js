(function() {

    "use strict";

    var that    = module.exports;

    var fs      = require('fs');
    var path    = require('path');

    var _       = require('underscore');
    var request = require('request');
    var wsdlrdr = require('wsdlrdr');

    var requestTpl = _.template(
        fs.readFileSync(__dirname + path.sep + 'request.tpl', 'utf-8')
    );

    function baseParamsToRequestParams(baseParams) {

        var requestParams = _.extend({}, baseParams);

        if (requestParams.headers) {
            if (_.isArray(requestParams.headers)) {

                requestParams.headers = _.reduce(requestParams.headers,
                    (store, headerItem) => {
                        store[headerItem.name] = headerItem.value;
                        return store;
                    },
                {});
            }
        }

        return requestParams;
    }

    function getProtocol(opts) {

        opts = opts || {};
        if (opts.secure === void 0) {
            opts.secure = false;
        }

        return (opts.secure) ? 'https://' : 'http://';
    }

    function getRequestParamsAsString(callParams, baseParams, opts) {

        var paramTpl = _.template(
            '<<%= namespace %><%= name%><%= attributes%>><%= value%></<%= namespace %><%= name%>>'
        );

        var getTagAttributes = function(attributes) {

            return ' ' + _.map(attributes,
                (attributeValue, attributeKey) => {
                    return attributeKey + '="' + attributeValue + '"';
                }
            ).join(' ');
        };

        var getParamAsString = function(value, name, paramData, attributes) {

            paramData = paramData || {};

            var namespace = '';
            if (paramData) {
                if (paramData.namespace) {
                    namespace = paramData.namespace + ':';
                }
            }

            // get underline parameter values
            var attributesString = '';
            if (_.isObject(value)) {

                if (value._attributes) {
                    attributesString = getTagAttributes(value._attributes);
                }

                if (value._value) {
                    value = value._value;
                }
            }

            // array value given, then create item for every value
            if (_.isArray(value)) {
                return _.map(value,
                    (valueItem) => getParamAsString(valueItem, name, paramData, attributes)
                ).join('');
            }

            // object value given, create a string for object
            if (_.isObject(value)) {

                var valueAsString = _.map(value,
                    (valueItem, valueKey) => {

                        if (_.isObject(valueItem)) {
                            var valueItem = _.map(valueItem, (valueItemItem, valueKeyKey) => {
                                return getParamAsString(valueItemItem, valueKeyKey, paramData[name], attributes);
                            }).join('');
                        }

                        return getParamAsString(valueItem, valueKey, paramData[name], attributes);
                    }
                ).join('');

                return getParamAsString(valueAsString, name, paramData, attributes);

            }

            // add global attributes
            if (attributes) {
                attributesString += getTagAttributes(attributes);
            }

            // simple value given
            return paramTpl({
                'namespace' : namespace,
                'name'      : name,
                'attributes': attributesString,
                'value'     : value
            });
        };

        return wsdlrdr.getMethodParamsByName(callParams.method, baseParamsToRequestParams(baseParams), opts)
            .then((methodParams) => {

                var requestParams = methodParams.request;

                if (!callParams.params.hasOwnProperty(callParams.method)) {
                    var topObject = {};
                        topObject[callParams.method] = callParams.params;

                    callParams.params = topObject;
                }

                var result = _.map(callParams.params,
                    (paramValue, paramName) => {

                        var methodRequestParams = _.findWhere(requestParams, { 'element': paramName });
                        if (!methodRequestParams) {
                            methodRequestParams = _.findWhere(requestParams, { 'name': paramName });
                        }

                        return getParamAsString(paramValue, paramName,
                            methodRequestParams,
                            callParams.attributes
                        );
                    }
                );

                return result.join('');
            });
    }

    function getRequestEnvelopeParams(params, opts) {

        return wsdlrdr.getNamespaces(params, opts)
            .then((namespaces) => {

                namespaces = _.filter(namespaces,
                    (namespaceObj) => {
                        return namespaceObj.short !== 'xmlns';
                    }
                );

                // add custom namespaces
                if (params.headers !== void 0) {
                    _.each(params.headers, function(headerItem, index) {

                        var full = headerItem.namespace || headerItem.value;
                        namespaces.push({
                            'short': 'cns' + index,
                            'full' : full
                        });
                    });
                }

                var soap = _.findWhere(namespaces, { 'short': 'soap' });
                var xsd  = _.findWhere(namespaces, { 'short': 'xsd' }) || {};

                return {
                    'soap_env'  : 'http://schemas.xmlsoap.org/soap/envelope/',
                    'xml_schema': xsd.full || 'http://www.w3.org/2001/XMLSchema',
                    'namespaces': namespaces
                }
            });
    }

    function getRequestHeadParams(params) {

        params = params || {};

        if (!params.headers) {
            return null;
        }

        var headerTpl = _.template("<cns<%= index%>:<%= name%>><%= value%></cns<%= index%>:<%= name%>>");

        if (!_.isArray(params.headers) &&
            _.isObject(params.headers)) {

            var keyName = _.keys(params.headers)[0];

            params.headers = [{
                name : keyName,
                value: params.headers[keyName]
            }];
        }

        return _.map(params.headers, (headerItem, headerIndex) => {
            return headerTpl(
                _.extend(headerItem, {
                    index: headerIndex
                })
            );
        });
    }


    /**
     * [getRequestXml description]
     * @param  {[type]} callParams [description]
     * @param  {[type]} params     [description]
     * @param  {[type]} opts       [description]
     * @return {[type]}            [description]
     */
    that.getRequestXml = (callParams, params, opts) => {

        var reqHeadParams   = getRequestHeadParams(_.extend(params, callParams));
        var reqEnvParams    = getRequestEnvelopeParams(_.extend(params, callParams), opts);
        var reqParamsString = getRequestParamsAsString(callParams, params, opts);

        return Promise.all([reqEnvParams, reqParamsString])
            .then((reqParams) => {

                var envParams       = reqParams[0];
                var reqParamsString = reqParams[1];

                return requestTpl({
                    'envelope': envParams,
                    'head'    : reqHeadParams,
                    'body'    : reqParamsString
                });
            });
    };

    /**
     * [soapCall description]
     * @param  {[type]} callParams [description]
     * @param  {[type]} params     [description]
     * @param  {[type]} opts       [description]
     * @return {[type]}            [description]
     */
    that.soapCall = (callParams, params, opts) => {

        return that.getRequestXml(callParams, params, opts)
            .then((requestXml) => {

                // default headers
                var headers = {}
                    headers['Content-Type'] = 'text/xml; charset=utf-8';

                // custom headers
                _.each(params.headers, (headerItem) => {
                    headers[headerItem.name] = headerItem.value
                });

                return new Promise((resolve, reject) => {
                    request({
                        url               : getProtocol(opts) + params.host + params.path,
                        body              : requestXml,
                        headers           : headers,
                        rejectUnauthorized: params.rejectUnauthorized,
                        method            : 'POST'
                    }, function(error, response, body) {
                        if (error) { reject(error); }
                        else {
                            resolve({
                                'body'    : body,
                                'response': response,
                                'header'  : response.headers
                            });
                        }
                    });
                });
            });
    };

})();
