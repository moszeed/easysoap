## What ?
`easySoap` is a WSDL SoapClient for Node.js.

## How to use ?

    var _           = require('underscore');
    var easySoap    = require('easySoap');

    var SoapClient = new easySoap.Client({
        host    : 'www.sample.com',
        path    : '/dir/soap',
        wsdl    : '/dir/wsdl'
    });

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

        SoapClient.init();