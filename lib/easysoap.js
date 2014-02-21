(function () {

    var root     = module.exports;

    var _        = require('underscore');
    var events   = require('events');
    var util     = require('util');
    var Promise  = require('promise');

    var request  = require('./request/request.js');
    var wsdl     = require('./wsdl.js');

    /**
     * check if all needed data given
     * @param  {[type]}  params [description]
     * @return {Boolean}        [description]
     */
    function _isParamsComplete(params) {

        params = params || {};

        if (params.host === void 0 ||
            params.path === void 0 ||
            params.wsdl === void 0) {
            return false;
        }

        return true;
    }

    /**
     * check and correct params
     * @param  {[type]} params [description]
     * @return {[type]}        [description]
     */
    function _checkParams(params) {

        params = params || {};
        if (params.host.match('http://'))   params.host = params.host.substring(7);
        if (params.host.match('https://'))  params.host = params.host.substring(8);

        return params;
    }

    /**
     * initialize EasySoap
     * @param {[type]} params [description]
     * @param {[type]} opts   [description]
     */
    var EasySoap = function(params, opts) {

            opts = opts || {};
            if (false === (this instanceof EasySoap)) {
                return new EasySoap(params, opts);
            }

            events.EventEmitter.call(this);

            this.params     = params;
            this.opts       = opts;
            this.wsdlClient = null;
        };

        //init events
        util.inherits(EasySoap, events.EventEmitter);

        //init easysoap with given params
        EasySoap.prototype.init = function() {

            var that = this;
            if (!_isParamsComplete(this.params)) {
                that.emit('error', 'params have insufficient arguments');
                return false;
            }

            var params = _.extend({}, _checkParams(this.params), {
                "path" : this.params.wsdl
            });

            return new Promise(function (resolve, reject) {

                request.get(params, this.opts)
                    .done(function(data) {
                        that.wsdlClient = new wsdl.Client(data.body);
                        that.emit('initialized');
                        resolve();
                    }, function(err) {
                        that.emit('error', 'fail to get wsdl', err);
                        reject(err);
                    });
            });
        };

        //do a soap call
        EasySoap.prototype.call = function(params, soapParams, opts) {

            soapParams  = soapParams                        || {};
            opts        = _.extend({}, this.opts, opts)     || this.opts;
            params      = _.extend({}, this.params, params) || this.params;


            //set namespace
            var methodWsdlData = this.wsdlClient.getMethodParams(params, opts);
            params.namespace = params.namespace || methodWsdlData.request.namespace;

            if (this.wsdlClient === null) {
                var errMsg = 'no wsdl initialized';
                this.emit('error', errMsg);
                throw new Error(errMsg);
            }

            this.wsdlClient.requestCheck(params, opts);

            var that = this;
            return new Promise(function(resolve, reject) {

                request.soapCall(params, soapParams, opts)
                    .done(function(data) {

                        var responseArray = that.wsdlClient.responseToArray({
                            'response'  : data.body,
                            'path'      : opts.path,
                            'method'    : params.method
                        });

                        resolve({
                            'data'      : responseArray.data,
                            'response'  : data.response,
                            'header'    : data.header
                        });

                    }, function(err) {
                        reject(err);
                    });
            });
        };


        //get all available functions from wsdl
        EasySoap.prototype.getAllFunctions = function() {

            if (this.wsdlClient === null) {
                this.emit('error', 'no wsdl initialized');
                return false;
            }

            return this.wsdlClient.getAllFunctions(this.wsdl);
        };

        root.Client = EasySoap;

})();