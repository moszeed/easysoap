(function() {

    "use strict";

    var that    = module.exports;

    var fs      = require("fs");
    var util    = require('util');
    var events  = require('events');
    var path    = require('path');
    var url     = require('url');

    var Promise = require('promise');
    var xmldoc  = require('xmldoc');
    var _       = require('underscore');

    var request = require('./request/request.js');

    var wsdlGetPromise = [];

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


    function searchNodeByAttribute(node, value, attribute) {

        if (node === void 0)        throw new Error('no node');
        if (value === void 0)       throw new Error('no value');
        if (attribute === void 0)   throw new Error('no attribute');

        return node.childWithAttribute(attribute, value);
    }

    function searchNodeByName(node, name) {

        return searchNodeByAttribute(node, name, 'name');
    }

    function searchNodeByNameRecursive(node, name) {

        var targetNode = searchNodeByName(node, name);
        if (targetNode !== void 0) {
            return targetNode;
        }

        if (!node ||
            node.children === void 0 ||
            node.children.length === 0) {
            return false;
        }

        _.each(node.children, function(child) {

            var searchResult = searchNodeByNameRecursive(child, name);
            if (searchResult !== false && searchResult !== void 0) {
                targetNode = searchResult;
            }
        });

        return targetNode;
    }


    function searchNode(node, name) {

        if (name === void 0) throw new Error('no name');
        if (!node ||
            node.children === void 0 ||
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


        var data = {};

        if (node.children           === void 0 ||
            node.children.length    === 0) {
            if (node.attr !== void 0 &&
                !_.isEmpty(node.attr)) {
                return {
                    '_attributes' : node.attr,
                    '_value'      : node.val
                };
            }

            return node.val ;
        }

        _(node.children).each(function(child) {

            var tmp = null;
            if (child.children        !== void 0 &&
                child.children.length !== 0) {

                var childToExtract = child;
                if (child.children.length === 1) {
                    if (child.children[0].name === getName(child.name)) {
                        childToExtract = child.children[0];
                    }

                    data[getName(child.name)] = nodeDataExtract(childToExtract);
                }
                else
                {

                    if (!_.isArray(data[getName(child.name)])) {
                        if (_.isObject(data[getName(child.name)])) {
                            tmp = data[getName(child.name)];
                            data[getName(child.name)] = [];
                            data[getName(child.name)].push(tmp);
                        } else {
                            data[getName(child.name)] = [];
                        }
                    }

                    if (childToExtract.attr !== void 0 &&
                        !_.isEmpty(childToExtract.attr)) {
                        data[getName(child.name)].push({
                            '_attributes'   : childToExtract.attr,
                            '_value'        : nodeDataExtract(childToExtract, node.name)
                        });
                    }
                    else {
                        data[getName(child.name)].push(nodeDataExtract(childToExtract, node.name));
                        if (_.isArray(data[getName(child.name)])) {
                            if (data[getName(child.name)].length === 1) {
                                data[getName(child.name)] = data[getName(child.name)][0];
                            }
                        }
                    }
                }
            }
            else
            {
                if (data[getName(child.name)] !== void 0) {
                    if (!_.isArray(data[getName(child.name)])) {
                        tmp = data[getName(child.name)];
                        data[getName(child.name)] = [];
                        data[getName(child.name)].push(tmp);
                    }
                    data[getName(child.name)].push(nodeDataExtract(child, node.name));
                } else {
                    data[getName(child.name)] = nodeDataExtract(child, node.name);
                }
            }
        });



        return data;
    }


    function getWsdl(params, opts) {

        params  = _.extend({}, params) || {};
        opts    = opts   || {};

        var cacheFileName = params.host + params.wsdl;
            cacheFileName = cacheFileName.replace(/[^a-zA-Z 0-9]+/g, "");
            cacheFileName = encodeURIComponent(cacheFileName);

        if (wsdlGetPromise[cacheFileName] === void 0) {
            wsdlGetPromise[cacheFileName] = new Promise(function(resolve, reject) {

                if (params.host === void 0 ||
                    params.wsdl === void 0) {
                    throw new Error('insufficient arguments');
                }

                var fullPath = __dirname +  path.sep + '..' +
                                            path.sep + 'cache' +
                                            path.sep + cacheFileName;

                var refresh = true;
                if (fs.existsSync(fullPath)) {
                    refresh = false;
                    var fileStat = fs.statSync(fullPath);
                    if (Date.now() - new Date(fileStat.mtime).getTime() >= 84000000) {
                        refresh = true;
                    }
                }

                if (refresh === false) {
                    resolve(fs.readFileSync(fullPath, 'UTF-8'));
                }
                else {

                    params.path = params.wsdl;

                    request.get(params, opts)
                        .done(function(res) {
                            fs.writeFile(fullPath, res.body, function(err) {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                resolve(res.body);
                            });
                        },
                        function(err) {
                            reject(err);
                        });
                }
            });
        }

        return wsdlGetPromise[cacheFileName];
    }



    that.getMethodParams = function(params, opts) {

        opts    = opts      || {};
        params  = params    || {};

        var that = this;

        return new Promise(function(resolve, reject) {

            getWsdl(params, opts)
                .done(function(wsdl) {

                    var wsdlObj     = new xmldoc.XmlDocument(wsdl);

                    var portTypes   = searchNode(wsdlObj,   'portType');
                    var messages    = searchNode(wsdlObj,   'message');
                    var types       = searchNode(wsdlObj,   'types');

                    var operations  = searchNode(portTypes[0],  'operation');
                    var schema      = searchNode(types[0],      'schema');

                    var method          = searchNodeByName(portTypes[0], params.method);

                    var methodRequest   = searchNode(method, 'input')[0];
                    var methodResponse  = searchNode(method, 'output')[0];


                    var getParams   = function(method, methodAttrName) {

                        var params = [];

                        var elements    = [];
                        var methodNode  = searchNodeByNameRecursive(types[0], method);

                        if (methodNode === void 0 &&
                            methodAttrName !== void 0) {

                            _.each(messages, function(message) {
                                if (message.attr.name === methodAttrName) {
                                    methodNode = message;
                                }
                            });

                            _.each(methodNode.children, function(child) {
                                elements.push(child);
                            });
                        } else {

                            if (methodNode !== void 0) {
                                elements = searchNode(methodNode, 'element');
                            }
                        }

                        if (elements        === false   ||
                            elements        === null    ||
                            elements.length === 0) {
                            return {};
                        }

                        _.each(elements, function(element) {

                            var paramType = element.attr.type || element.attr.element || null;

                            var item = {
                                'name'      : element.attr.name,
                                'namespace' : getNamespace(paramType),
                                'mandatory' : (element.attr.minOccurs > 0) ? true : false,
                                'type'      : getName(paramType)
                            };

                            var subParams = getParams(getName(paramType));
                            if (Object.keys(subParams).length !== 0) {
                                item.params = subParams;
                            }

                            params.push(item);
                        });

                        return params;
                    };

                    resolve({

                        request  : {
                            namespace   : getNamespace(methodRequest.attr.message),
                            name        : getName(methodRequest.attr.message),
                            params      : getParams(params.method, getName(methodRequest.attr.message))
                        },

                        response : {
                            namespace   : getNamespace(methodResponse.attr.message),
                            name        : getName(methodResponse.attr.message),
                            params      : getParams(params.method, getName(methodResponse.attr.message))
                        }
                    });

                }, function(err) { reject(err); });
        });
    };

    that.getNamespaceByNs = function(ns, params, opts) {

        var that = this;

        return new Promise(function(resolve, reject) {

            getWsdl(params, opts)
                .done(function(wsdl) {
                    resolve({
                        'short': ns,
                        'full' : getNamespaceByAttr(ns, new xmldoc.XmlDocument(wsdl))
                    });
                });
        });
    };

    that.responseToArray = function(response, params, opts) {

        params = params || {};

        return new Promise(function(resolve, reject) {

            that.getMethodParams(params, opts)
                .done(function(methodData) {

                    var response_xml    = new xmldoc.XmlDocument(response);
                    var response_body   = searchNode(response_xml, 'Body')[0];

                    if (response_body.children.length === 1) {
                        if (getName(response_body.children[0].name) === methodData.response.name) {
                            response_body = response_body.children[0];
                        }
                    }

                    var data = nodeDataExtract(response_body);

                    if (data[methodData.response.name] === void 0) {
                        resolve(data);
                        return;
                    }

                    if (data[methodData.response.name].length === 1) {
                        resolve(data[methodData.response.name][0]);
                        return;
                    }

                    resolve(data[methodData.response.name]);
                });
        });
    };

    that.requestCheck = function(params, opts) {

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

    that.getAllFunctions = function(wsdl) {

        var messages = searchNode(this.wsdlObj, 'message');
        var functions = [];
        _(messages).each(function(message) {
            functions.push(message.attr.name);
        });

        return functions;
    };


})();
