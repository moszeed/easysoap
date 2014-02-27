(function () {

    "use strict";

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
        };

        //init events
        util.inherits(EasySoap, events.EventEmitter);

        //do a soap call
        EasySoap.prototype.call = function(params, opts) {

            opts        = _.extend({}, this.opts, opts)     || this.opts;
            params      = _.extend({}, this.params, params) || this.params;

            var that = this;
            return new Promise(function(resolve, reject) {

                request.soapCall(params, opts)
                    .done(function(response) {

                        wsdl.responseToArray(response.body, params, opts)
                            .done(function(resArray) {

                                var result = {
                                    'data'      : resArray,
                                    'response'  : response
                                };

                                that.emit(params.method, result);
                                resolve(result);
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