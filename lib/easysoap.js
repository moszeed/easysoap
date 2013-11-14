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

            this.params = _checkParams(this.params);
            var params  = _.extend({}, this.params, {
                    "path" : this.params.wsdl
                });

            request.get(params, this.opts)
                .done(function(data) {

                    //that.wsdl = wsdl;
                    that.wsdlClient = new wsdl.Client(data);

                    that.emit('initialized');
                }, function(err) {
                    that.emit('error', 'fail to get wsdl', error);
                });
        };

        //do a soap call
        EasySoap.prototype.call = function(params, soapParams, opts) {

            opts = _.extend({}, this.opts, opts) || this.opts;

            var that = this;
            return new Promise(function(resolve, reject) {

                if (that.wsdlClient === null) {
                    var errMsg = 'no wsdl initialized';
                    that.emit('error', errMsg);
                    reject(errMsg);
                    return false;
                }

                that.wsdlClient.requestCheck(params, opts);

                request.soapCall(params, soapParams, that.params, opts)
                    .done(function(data) {

                        data.header = data.header || {};

                        var responseArray = that.wsdlClient.responseToArray({
                            'response'  : data.response,
                            'path'      : opts.path,
                            'method'    : params.method
                        });

                        var err;
                        if (responseArray.status === false) {
                            err = responseArray.data;
                            responseArray.data = null;
                        }

                        that.emit(params.method , err, responseArray.data, data.header);
                        resolve(responseArray.data, data.header);

                    }, function(error) {
                        var errMsg = 'request failed';
                        that.emit('error', errMsg, error);
                        reject(errMsg);
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