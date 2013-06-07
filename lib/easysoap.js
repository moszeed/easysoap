(function () {

    var root    = module.exports;

    var _       = require('underscore');
    var events  = require('events');
    var util    = require('util');

    var request = require('./request/request.js');
    var wsdl    = require('./wsdl.js').Handler();


    function _isParamsComplete(params) {

        params = params || {};

        if (params.host === void 0 ||
            params.path === void 0 ||
            params.wsdl === void 0) {
            return false;
        }

        return true;
    }

    function _checkParams(params) {

        params = params || {};

        if (params.host.match('http://'))   params.host = params.host.substring(7);
        if (params.host.match('https://'))  params.host = params.host.substring(8);

        return params;
    }

    var EasySoap = function(params, opts) {

            opts = opts || {};
            if (false === (this instanceof EasySoap)) {
                return new EasySoap(params, opts);
            }

            events.EventEmitter.call(this);

            this.params = params;
            this.opts   = opts;
            this.wsdl   = null;
        };

        //init events
        util.inherits(EasySoap, events.EventEmitter);

        //init soap client, get wsdl
        EasySoap.prototype.init = function() {

            var that = this;
            var initOk = function(wsdl) {
                that.wsdl = wsdl;
                that.emit('initialized');
            };

            if (!_isParamsComplete(this.params)) {
                that.emit('error', 'params have insufficient arguments');
            }

            //check and correct if possible
            this.params = _checkParams(this.params);

            var get_params = {
                host : this.params.host,
                path : this.params.wsdl
            };

            var wsdl = request.get(get_params, this.opts)
                .then(initOk, function(err) {
                    that.emit('error', 'fail to get wsdl', error);
                });
        };

        //get all available functions from wsdl
        EasySoap.prototype.getAllFunctions = function() {

            if (this.wsdl === void 0 || this.wsdl === null) {
                this.emit('error', 'no wsdl given');
                return false;
            }

            return wsdl.getAllFunctions(this.wsdl);
        };

        //call a method
        EasySoap.prototype.call = function(attrs, opts) {

            opts = _.extend(this.opts, opts) || this.opts;

            var that = this;
            if (attrs === void 0) {
                this.emit('error', 'no attrs given');
                return false;
            }

            wsdl.requestCheck(attrs, this.wsdl, opts);

            var requestSuccess = function(responseXML, header) {

                header = header || {};

                var responseArray = wsdl.responseToArray({
                    'response'  : responseXML,
                    'path'      : opts.path,
                    'method'    : attrs.method
                });

                var err = false;
                if (responseArray.status === false) {
                    err = responseArray.data;
                    responseArray.data = null;
                }

                that.emit(attrs.method, err, responseArray.data, header);
            };

            request.request(attrs, this.params, opts)
                .then(requestSuccess, function(error) {
                    that.emit('error', 'request failed', error);
                })
        };


        root.Client = EasySoap;

})();