## What ?
`easySoap` is a WSDL SoapClient for Node.js.

## How to get ?

    npm install easysoap

## How to use ?

    var easySoap    = require('easySoap');

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
        SoapClient.once('initialized', function() {

            //successful initialized
            SoapClient.once('soapMethod', function(data, header) {
                //soap response
            });

            SoapClient.call({
                'method' : 'soapMethod',
                'params' : {
                    'test' : 1
                }
            });
        });

        //initialize soap client
        SoapClient.init();