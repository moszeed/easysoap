(() => {
    'use strict';

    const assert = require('assert');
    const wsdlrdr = require('wsdlrdr');

    const SoapRequest = require('./request.js');

    module.exports = EasySoap;

    /**
     * check given params object
     * @param  {[type]} params [description]
     * @return {[type]}        [description]
     */
    function mandatoryCheck (params = {}) {
        assert.ok(params.host !== void 0, 'no host given');
        assert.ok(params.path !== void 0, 'no path given');
        assert.ok(params.wsdl !== void 0, 'no wsdl given');
    };

    function EasySoap (params = {}, opts = {}) {
        if (!(this instanceof EasySoap)) return new EasySoap(params, opts);

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

        this._params = params;
        this._opts = opts;
    };

    /**
     * get all functions from service
     * @return {[type]} [description]
     */
    EasySoap.prototype.getAllFunctions = function () {
        return wsdlrdr.getAllFunctions(this._params, this._opts);
    };

    /**
     * get params from service by given methodName
     * @param  {[type]} methodName [description]
     * @return {[type]}            [description]
     */
    EasySoap.prototype.getMethodParamsByName = function (methodName) {
        return wsdlrdr.getMethodParamsByName(methodName, this._params, this._opts);
    };

    /**
     * [description]
     * @param  {[type]} xml [description]
     * @return {[type]}     [description]
     */
    EasySoap.prototype.getXmlDataAsJson = function (xml) {
        return wsdlrdr.getXmlDataAsJson(xml);
    };

    EasySoap.prototype.getRequestXml = function (params = {}) {
        assert.ok(params.method, 'no method given');
        return SoapRequest(this._params, this._opts).getRequestXml(params, this._params, this._opts);
    };

    /**
     * call a soap method
     * @param  {[type]} callParams [description]
     * @return {[type]}            [description]
     */
    EasySoap.prototype.call = async function (params = {}) {
        assert.ok(params.method, 'no method given');

        const soapResponse = await SoapRequest(this._params, this._opts).call(params);
        const methodParams = await this.getMethodParamsByName(params.method, this._params, this._opts);

        // get xml data as json, try to flatten the output
        let dataAsJson = this.getXmlDataAsJson(soapResponse.body);
        if (methodParams.response[0]) {
            if (dataAsJson[methodParams.response[0].name]) {
                dataAsJson = dataAsJson[methodParams.response[0].name];
            } else if (dataAsJson[methodParams.response[0].element]) {
                dataAsJson = dataAsJson[methodParams.response[0].element];
            }
        }

        if (Array.isArray(dataAsJson) && dataAsJson.length === 1) {
            dataAsJson = dataAsJson[0];
        }

        return {
            'data'    : dataAsJson,
            'response': soapResponse
        };
    };
})();
