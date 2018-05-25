(() => {
    'use strict';

    const _ = require('underscore');
    const request = require('request');
    const wsdlrdr = require('wsdlrdr');

    module.exports = SoapRequest;

    function getProtocol (opts = {}) {
        if (opts.secure === void 0) {
            opts.secure = false;
        }

        return (opts.secure) ? 'https://' : 'http://';
    }

    function asyncRequest (params = {}) {
        return new Promise((resolve, reject) => {
            request(params, function (error, response, body) {
                if (error) {
                    reject(error);
                } else {
                    resolve({
                        'body'    : body,
                        'response': response
                    });
                }
            });
        });
    }

    function baseParamsToRequestParams (baseParams) {
        var requestParams = Object.assign({}, baseParams);
        if (requestParams.headers) {
            if (_.isArray(requestParams.headers)) {
                requestParams.headers = _.reduce(requestParams.headers, (store, headerItem) => {
                    store[headerItem.name] = headerItem.value;
                    return store;
                }, {});
            }
        }

        return requestParams;
    }

    function getRequestParamsAsString (callParams, baseParams, opts) {
        var getTagAttributes = function (attributes) {
            return ' ' + _.map(attributes,
                (attributeValue, attributeKey) => {
                    return attributeKey + '="' + attributeValue + '"';
                }
            ).join(' ');
        };

        var getParamAsString = function (value, name, paramData, attributes) {
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
                            valueItem = _.map(valueItem, (valueItemItem, valueKeyKey) => {
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

            return `<${namespace}${name}${attributesString}>${value}</${namespace}${name}>`;
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

    function getRequestEnvelopeParams (params, opts) {
        return wsdlrdr.getNamespaces(params, opts)
            .then((namespaces) => {
                namespaces = _.filter(namespaces,
                    (namespaceObj) => {
                        return namespaceObj.short !== 'xmlns';
                    }
                );

                // add custom namespaces
                if (params.headers !== void 0) {
                    _.each(params.headers, function (headerItem, index) {
                        var full = headerItem.namespace || headerItem.value;
                        namespaces.push({
                            'short': 'cns' + index,
                            'full' : full
                        });
                    });
                }

                // var soap = _.findWhere(namespaces, { 'short': 'soap' });
                var xsd = _.findWhere(namespaces, { 'short': 'xsd' }) || {};

                return {
                    'soap_env'  : 'http://schemas.xmlsoap.org/soap/envelope/',
                    'xml_schema': xsd.full || 'http://www.w3.org/2001/XMLSchema',
                    'namespaces': namespaces
                };
            });
    }

    function getRequestHeadParams (params = {}) {
        if (!params.headers) {
            return null;
        }

        if (!_.isArray(params.headers) &&
            _.isObject(params.headers)) {
            var keyName = _.keys(params.headers)[0];

            params.headers = [{
                name : keyName,
                value: params.headers[keyName]
            }];
        }

        return params.headers
            .map((item, index) => `<cns${index}:${item.name}>${item.value}</cns${index}:${item.name}>`);
    }

    function SoapRequest (params = {}, opts = {}) {
        if (!(this instanceof SoapRequest)) return new SoapRequest(params, opts);

        this._url = getProtocol(opts) + params.host + params.path;
        this._headers = {
            'Content-Type': 'text/xml; charset=utf-8'
        };

        this._opts = opts;
        this._params = params;
    };

    SoapRequest.prototype.getRequestXml = async function (params = {}, defaultParams = {}, opts = {}) {
        const combinedParams = Object.assign({}, defaultParams, params);

        const head = await getRequestHeadParams(combinedParams);
        const envelope = await getRequestEnvelopeParams(combinedParams, opts);
        const body = await getRequestParamsAsString(params, defaultParams, opts);

        const $namespaces = envelope.namespaces.map((namespace) => `xmlns:${namespace.short}="${namespace.full}"`);
        const $namespacesAsString = $namespaces.join(' ');

        const $head = (head !== null) ? head.map((headItem) => headItem) : '';
        const $body = `<SOAP-ENV:Body>${body}</SOAP-ENV:Body>`;

        const $soapEnvelope = `<SOAP-ENV:Envelope
            xmlns:SOAP-ENV="${envelope.soap_env}"
            ${$namespacesAsString}>
            ${$head}
            ${$body}
        </SOAP-ENV:Envelope>`;

        return `<?xml version="1.0" encoding="UTF-8"?>${$soapEnvelope}`;
    };

    SoapRequest.prototype.call = async function (params = {}) {
        const self = this;

        // add custom headers
        if (params.headers) {
            if (Array.isArray(params.headers)) {
                params.headers.forEach((headerItem) => {
                    self._headers[headerItem.name] = headerItem.value;
                });
            } else {
                self._headers = params.headers;
            }
        }

        const requestXml = await self.getRequestXml(params, this._params, this._opts);
        const result = await asyncRequest({
            url               : this._url,
            body              : requestXml,
            headers           : this._headers,
            rejectUnauthorized: this._params.rejectUnauthorized,
            method            : 'POST'
        });

        return {
            'body'    : result.body,
            'response': result.response,
            'header'  : result.response.headers
        };
    };
})();
