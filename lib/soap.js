(function() {

    var root    = module.exports;

    var https   = require('https');
    var url     = require('url');
    var util    = require('util');
    var events  = require('events');
    var fs      = require('fs');
    var _       = require('underscore');

    function Handler() {
        if (false === (this instanceof Handler)) {
            return new Handler();
        }
        events.EventEmitter.call(this);
    }

    function _getParamsRequestString(params) {

        if (params === void 0 || params === '') return false;
        var params_string = [];
        _(params).each(function(value, param) {

            if (_.isObject(value) &&
                !_.isArray(value) &&
                !_.isString(value) &&
                !_.isNumber(value)) {
                value = _getParamsRequestString(value);
            }

            var string = '<' + param + '>' + value + '</' + param + '>';
            if (value === null) string = '<' + param + '/>';
            if (_.isArray(value)) {
                var sub_string = [];
                _(value).each(function(sub_value) {
                    sub_string.push('<' + param + '>' + sub_value + '</' + param + '>');
                });

                string = sub_string.join('');
            }

            params_string.push(string);
        });

        return params_string.join('');
    }

    util.inherits(Handler, events.EventEmitter);

    Handler.prototype._cache = [];

    Handler.prototype.call = function(attrs, params, opts) {

        opts = opts || {};

        if (attrs  === void 0)  throw new Error('no attrs');
        if (params === void 0)  throw new Error('no params');

        var template_params = {
            'namespace' : attrs.namespace  || false,
            'header'    : attrs.header     || params.header || false,
            'method'    : attrs.method     || false,
            'params'    : _getParamsRequestString(attrs.params)
        };

        var that = this;

        fs.readFile(__dirname + '/request.tpl', 'utf8', function(err, template) {

            if (err) throw new Error(err);

            var _tpl    =  _.template(template, template_params);

            var req     = https.request({
                host    : params.host       || null,
                path    : params.path       || null,
                method  : params.method     || 'POST',
                headers : params.headers    || attrs.headers    || null
            });

                req.once('error',     function(err) { console.log(err); });
                req.once('response',  function(res) {
                    var data = '';
                    res.setEncoding('utf8');
                    res.on('data', function(chunk) { data += chunk; });
                    res.on('end', function() {
                        that.emit('call', data, res.headers);
                    });
                });

                req.write(_tpl);
                req.end();

        });
    };

    root.Handler = Handler;
})();
