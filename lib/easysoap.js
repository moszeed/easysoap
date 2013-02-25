(function () {

    var root    = module.exports;
    var https   = require('https');
    var events  = require('events');
    var util    = require('util');

    var Wsdl    = require('./wsdl.js');
    var Soap    = require('./soap.js');

    function Client(params, opts) {

        opts = opts || {};

        if (false === (this instanceof Client)) {
            return new Client(params, opts);
        }

        events.EventEmitter.call(this);


        this.params = params;

        if (opts.checks !== void 0 ||
            opts.checks === true) {
            this._checkParams();
        }
    }
    util.inherits(Client, events.EventEmitter);

    Client.prototype.params = null;

    Client.prototype._cache = {

        wsdl : {}
    };


    Client.prototype._checkParams = function() {

        if (this.params      === null ||
            this.params      === void 0) throw new Error('no params given');
        if (this.params.host === void 0) throw new Error('no host given');
        if (this.params.path === void 0) throw new Error('no path given');
        if (this.params.wsdl === void 0) throw new Error('no wsdl given');
    };

    Client.prototype.init = function() {

        var that = this;
        var wsdl = new Wsdl.Handler();
            wsdl.once('get', function(wsdl) {
                that._cache.wsdl[that.params.wsdl] = wsdl;
                that.emit('initialized');
            });
            wsdl.get(that.params);
    };

    Client.prototype.getAllFunctions = function() {

        var that = this;
        if (that._cache.wsdl[that.params.wsdl] === void 0 ||
            that._cache.wsdl[that.params.wsdl] === null) {
            throw new Error('no wsdl in cache');
        }

        var wsdl = new Wsdl.Handler();
        return wsdl.getAllFunctions(that._cache.wsdl[that.params.wsdl]);
    };

    Client.prototype.call = function(attrs, opts) {

        if (attrs === void 0) throw new Error('no attrs');

        opts = opts || {};
        opts.path = opts.path || this.params.path;

        var that = this;
            that._checkParams();

        if (that._cache.wsdl[that.params.wsdl] === void 0 ||
            that._cache.wsdl[that.params.wsdl] === null) {
            throw new Error('no wsdl in cache');
        }

        var wsdl = new Wsdl.Handler();
            wsdl.requestCheck(attrs, that._cache.wsdl[that.params.wsdl], opts);

        var soap = new Soap.Handler();
            soap.on('call', function(xml, header) {

                var responseArray = wsdl.responseToArray({
                    'response'  : xml,
                    'path'      : opts.path,
                    'method'    : attrs.method
                });

                var err = false;
                if (responseArray.status === false) {
                    err = responseArray.data;
                    responseArray.data = null;
                }

                that.emit(attrs.method, err, responseArray.data, header);
            });
            soap.call(attrs, that.params, opts);
    };

    root.Client = Client;
})();