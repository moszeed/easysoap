(function() {

    var root    = module.exports;

    var util    = require('util');
    var events  = require('events');

    var xmldoc  = require('xmldoc');
    var _       = require('underscore');


    //privates

    function getName(name) {

        var attr = name.split(':');
        if (attr.length > 1) {
            return attr[1];
        }

        return name;
    }

    function getNamespace(name) {

        var attr = name.split(':');
        if (attr.length > 1) {
            return attr[0];
        }

        return name;
    }

    function getNamespaceByAttr(nsAttr, wsdlObj) {

        var data;
        _(wsdlObj.attr).each(function(value, key) {
            if (getName(key) === getNamespace(nsAttr)) {
                data = value;
            }
        });

        return data;
    }


    function searchNodeByName(node, name) {

        if (node === void 0) throw new Error('no node');
        if (name === void 0) throw new Error('no name');

        return node.childWithAttribute('name', name);
    }

    function searchNode(node, name) {

        if (name === void 0) throw new Error('no name');
        if (node.children === void 0 ||
            node.children === null   ||
            _.isEmpty(node.children)) {
            return false;
        }

        var target_node = null;
        _(node.children).each(function(node_children) {

            if (target_node !== null) return true;

            var childrens = null;
            if (name == getName(node_children.name)) {
                childrens = node.childrenNamed(node_children.name);
            }

            if (childrens === null) {
                childrens = searchNode(node_children, name);
            }

            if (childrens !== null &&
                childrens !== false) {
                target_node = childrens;
            }
        });

        return target_node;
    }


    function nodeDataExtract(node) {

        // Leaf node
        if (node.children           === void 0 ||
            node.children.length    === 0) {
            if (node.val) {
                return node.val;
            } else {
                return node.attr;
            }
        }

        // Non-leaf node
        var data = {};
        if (node.attr) {
            data = node.attr;
        }
        _(node.children).each(function(child) {
            var childData = nodeDataExtract(child);
            var childName = getName(child.name);

            if (data.hasOwnProperty( childName )) {
                if (! (data[childName] instanceof Array) ) {
                    // If there is more than one child with the same node name,
                    //   put them all in an array when the second one is seen.
                    data[childName] = [ data[childName] ];
                }
                data[childName].push(childData);
            }
            else {
                data[childName] = childData;
            }

        });
        return data;
    }


    function Client(wsdl) {

        if (wsdl  === void 0) throw new Error('no wsdl given');
        if (false === (this instanceof Client)) {
            return new Client();
        }

        events.EventEmitter.call(this);

        this.wsdlObj = new xmldoc.XmlDocument(wsdl);
        this.wsdl    = wsdl;
        this._cache  = [];
    }

    util.inherits(Client, events.EventEmitter);


    Client.prototype.requestCheck = function(params, opts) {

        opts = opts || {};

        if (params.method === void 0) throw new Error('no method');

        var checkedParams = {};
        _.each(params.params, function(data, value) {
            checkedParams[getName(value)] = data;
        });

        var methodData = this.getMethodParams(params, opts);

        //check namespace
        if (methodData.request.namespace !== void 0) {
            if (params.namespace === void 0) {
                params.namespace = methodData.request.namespace;
            }
        }

        //check params
        _(methodData.request.params).each(function(param) {
            if (param.mandatory === true) {
                if (!_.has(checkedParams, getName(param.name))) {
                    throw new Error('mandatory ' + param.name + ' not given');
                }
            }
        });
    };

    Client.prototype.getMethodParams = function(params, opts) {

        opts = opts || {};

        var that = this;

        if (params.method   === void 0) throw new Error('no method');

        if (this._cache[opts.path]                  === void 0) this._cache[opts.path] = [];
        if (this._cache[opts.path][params.method]   === void 0) {

            var request  = {};
            var response = {};

            var portTypes   = searchNode(this.wsdlObj,   'portType');
            var messages    = searchNode(this.wsdlObj,   'message');
            var types       = searchNode(this.wsdlObj,   'types');

            var operations  = searchNode(portTypes[0],  'operation');
            var schema      = searchNode(types[0],      'schema');

            _(operations).each(function(operation) {

                if (params.method == getName(operation.attr.name)) {

                    var input   = searchNode(operation, 'input')[0];
                    var output  = searchNode(operation, 'output')[0];

                    request.namespace    = getNamespaceByAttr(input.attr.message, that.wsdlObj);
                    request.name         = getName(input.attr.message);

                    response.namespace   = getNamespaceByAttr(output.attr.message, that.wsdlObj);
                    response.name        = getName(output.attr.message);

                }
            });

            var getParams   = function(method) {

                var param_types = ['string', 'int', 'boolean'];
                var params = [];

                _(messages).each(function(message) {

                    if (message.attr.name === method) {

                        _(message.children).each(function(part) {

                            var attr_data_type = part.attr.type || part.attr.element || null;
                            if (_.indexOf(param_types, getName(attr_data_type)) !== -1) {
                                return params.push({
                                    'name'      : part.attr.name,
                                    'namespace' : getNamespace(attr_data_type),
                                    'type'      : getName(attr_data_type)
                                });
                            }

                            var complex_type = searchNodeByName(schema[0], getName(attr_data_type));
                            if (complex_type === void 0) {
                                return true;
                            }

                            var complex_content = searchNode(complex_type, 'complexContent');
                            if (_.isEmpty(complex_content)) {

                                var elements = searchNode(complex_type, 'element');
                                return _(elements).each(function(element) {
                                    params.push({
                                        'name'      : element.attr.name,
                                        'mandatory' :(element.attr.minOccurs > 0) ? true : false,
                                        'namespace' : getNamespace(element.attr.type),
                                        'type'      : getName(element.attr.type)
                                    });
                                });
                            }

                            _(complex_content).each(function(complex_content_item) {

                                var attribute   = searchNode(complex_content_item, 'attribute');

                                var array_type  = getName(attribute[0].attr['wsdl:arrayType']);
                                    array_type  = array_type.split('[]');

                                var complex_type = searchNodeByName(schema[0], array_type[0]);
                                var elements     = searchNode(complex_type, 'element');

                                var param = {};
                                    param.name      = array_type[0];
                                    param.mandatory = false;
                                    param.children  = [];

                                _(elements).each(function(element) {
                                    param.children.push({
                                        'name'      : element.attr.name,
                                        'mandatory' : false,
                                        'namespace' : null,
                                        'type'      : null
                                    });
                                });

                                params.push(param);
                            });
                        });
                    }
                });

                return params;
            };

            request.params   = getParams(request.name);
            response.params  = getParams(response.name);

            this._cache[opts.path][params.method] = {
                'request'   :   request,
                'response'  :   response
            };
        }

        return this._cache[opts.path][params.method];
    };

    Client.prototype.responseToArray = function(params) {


        params = params || {};

        if (params.response                         === void 0) throw new Error('no response');
        if (params.method                           === void 0) throw new Error('no method');
        if (this._cache[params.path][params.method] === void 0) throw new Error('no cache data');

        if (params.response.length === 0) {
            return {
                status : true,
                data   : ''
            };
        }

        var response_xml    = new xmldoc.XmlDocument(params.response);
        var response_body   = searchNode(response_xml, 'Body')[0];

        //search for wsdl response data
        var node_data = {};
        _(this._cache[params.path][params.method].response.params).each(function(item) {
            var node_parts = searchNode(response_body, item.name);
            _(node_parts).each(function(part) {
                node_data = _.extend(node_data, nodeDataExtract(part));
            });
        });

        //grep for not in wsdl listed response data
        var not_in_list = [];
        if (response_body.children[0].children !== void 0) {
            node_data = _.extend(node_data, nodeDataExtract(response_body));
        }

        var returnValue = {
            status : true,
            data   : node_data,
            response_xml : response_xml
        };

        if (returnValue.data.length === 0) {

            var fault = searchNode(response_body, 'Fault');
            if (fault !== void 0 &&
                fault !== null &&
                !_.isEmpty(fault[0])) {
                var errors = [];
                _(fault[0].children).each(function(fault_child) {
                    errors.push(fault_child);
                });

                returnValue.status  = false;
                returnValue.data    = errors;

                return returnValue;
            }
        }

        if (returnValue.data.length === 1) {
            returnValue.data = node_data[0];
        }
        return returnValue;
    };


    Client.prototype.getAllFunctions = function(wsdl) {

        var messages = searchNode(this.wsdlObj, 'message');
        var functions = [];
        _(messages).each(function(message) {
            functions.push(message.attr.name);
        });

        return functions;
    };



    root.Client = Client;
})();