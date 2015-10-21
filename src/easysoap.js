(function () {

    "use strict";

    var _           = require('underscore');
    var wsdlrdr     = require('wsdlrdr');

    var soapRequest = require('./request/request.js');

    /**
     * check given params object
     * @param  {[type]} params [description]
     * @return {[type]}        [description]
     */
    function mandatoryCheck(params) {

        params = params || {};

        if (params.host === void 0) throw new Error('no host given');
        if (params.path === void 0) throw new Error('no path given');
        if (params.wsdl === void 0) throw new Error('no wsdl path given');
    };

    /**
     * EasySoap
     * @param {[type]} params [description]
     * @param {[type]} opts   [description]
     */
    var EasySoap = function(params, opts) {

        params = params || {},
        opts   = opts || {};

        return {

            /**
             * call a soap method
             * @param  {[type]} callParams [description]
             * @return {[type]}            [description]
             */
            call: (callParams) => {

                callParams = callParams || {};

                if (!callParams.method) {
                    throw new Error('no method given');
                }

                return soapRequest.soapCall(callParams, params, opts)
                    .then((soapResponse) => {

                        return wsdlrdr.getMethodParamsByName(callParams.method, params, opts)
                            .then((methodParams) => {

                                // get xml data as json, try to flatten the output
                                var dataAsJson = wsdlrdr.getXmlDataAsJson(soapResponse.body);
                                if (methodParams.response[0]) {

                                    if (dataAsJson[methodParams.response[0].name]) {
                                        dataAsJson = dataAsJson[methodParams.response[0].name];
                                    }
                                }

                                return {
                                    'data'    : dataAsJson,
                                    'response': soapResponse
                                };
                            });
                    });
            },

            /**
             * [description]
             * @param  {[type]} callParams [description]
             * @return {[type]}            [description]
             */
            getRequestXml: (callParams) => {

                callParams = callParams || {};

                if (!callParams.method) {
                    throw new Error('no method given');
                }

                return soapRequest.getRequestXml(callParams, params, opts);
            },


            /**
             * [description]
             * @param  {[type]} xml [description]
             * @return {[type]}     [description]
             */
            getXmlDataAsJson: (xml) => {
                return wsdlrdr.getXmlDataAsJson(xml);
            },

            /**
             * get all functions from service
             * @return {[type]} [description]
             */
            getAllFunctions: () => {
                return wsdlrdr.getAllFunctions(params, opts);
            },

            /**
             * get params from service by given methodName
             * @param  {[type]} methodName [description]
             * @return {[type]}            [description]
             */
            getMethodParamsByName: (methodName) => {
                return wsdlrdr.getMethodParamsByName(methodName, params, opts);
            }
        }
    };

    /**
     * create a new soapClient
     * @param  {[type]} params [description]
     * @param  {[type]} opts   [description]
     * @return {[type]}        [description]
     */
    exports.createClient = function (params, opts) {

        params = params || {};
        opts   = opts || {};

        //check if all data is set
        mandatoryCheck(params);

        if (!opts.secure) {
            opts.secure = false;
        }

        // fix params and opts
        if (params.host.match('http://')) {
            params.host = params.host.substring(7);
            opts.secure = false;
        }

        if (params.host.match('https://')) {
            params.host = params.host.substring(8);
            opts.secure = true;
        }

        return new EasySoap(params, opts);
    };

})();
