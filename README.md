## What ?
`easySoap` is a WSDL SoapClient for Node.js.

## How to get ?

    npm install easysoap

## How to use ?

    var easySoap    = require('easysoap');

    //soap client params
    var clientParams = {

        //set soap connection data (mandatory values)
        host    : 'www.sample.com',
        path    : '/dir/soap',
        wsdl    : '/dir/wsdl',

        //set soap header (optional)
        header  : [{
            'name'      : 'item_name',
            'value'     : 'item_value',
            'namespace' : 'item_namespace'
        }]
    };

    //soap client options
    var clientOptions = {
        secure : true/false //is https or http
    };

    //create new soap client
    var SoapClient = new easySoap.Client(clientParams, clientOptions);

        SoapClient.call({
            'method'    : 'soapMethod2',

            //optional namespace for call
            'namespace' : 'soapMethod2Namespace',

            //optional headers for call
            'headers'       : {
                'Cookie' : 'test'
            },

            'params' : {

                //default
                'test'  : 2,

                //list of items
                'test1' : ['item1', 'item2']

                //if attributes needed
                'test2' : {

                    '_attributes'   : {
                        'id' : 1
                    },
                    '_value'        : 'test1data'
                }
            }
        })
        .done(

            //success
            function(res) {
                res.data        // response data as array
                res.response    // full response data (including xml)
                res.header      // response header
            },

            //method fail
            function(err) {
                console.log(err);
            }
        );