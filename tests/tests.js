(() => {
    'use strict';

    const test = require('tape');
    const EasySoap = require('..');

    var soapTestDataArray = [
        [{
            host: 'webservices.oorsprong.org',
            path: '/websamples.countryinfo/CountryInfoService.wso',
            wsdl: '/websamples.countryinfo/CountryInfoService.wso?WSDL'
        }],
        [{
            host: 'webservices.daehosting.com',
            path: '/services/isbnservice.wso',
            wsdl: '/services/isbnservice.wso?WSDL'
        }],
        [{
            host: 'www.dataaccess.com',
            path: '/webservicesserver/numberconversion.wso',
            wsdl: '/webservicesserver/numberconversion.wso?WSDL'
        }]
    ];

    // store all soap clients
    var soapClients = [];

    test('createClient', (t) => {
        soapTestDataArray.forEach((soapTestDataItem) => {
            let connectionData = soapTestDataItem[0];
            let soapOptions = soapTestDataItem[1] || {};

            let soapClient = EasySoap(connectionData, soapOptions);
            soapClients.push({
                'url'     : connectionData.host + connectionData.path,
                'instance': soapClient
            });

            t.ok(true, 'soapClient create for ' + connectionData.host);
        });

        t.end();
    });

    test('getAllFunctions', async (t) => {
        try {
            for (let soapClient of soapClients) {
                t.comment(`=> ${soapClient.instance._params.host}`);
                let functionsAsArray = await soapClient.instance.getAllFunctions();
                t.ok(functionsAsArray.length !== 0, `${functionsAsArray.length} functions (${soapClient.instance._params.host})`);
            }

            t.end();
        } catch (err) {
            t.end(err);
        }
    });

    test('www.dataaccess.com/webservicesserver/numberconversion.wso', async (t) => {
        try {
            const soapClient = soapClients.find((item) => item.url === 'www.dataaccess.com/webservicesserver/numberconversion.wso');
            if (!soapClient) {
                t.end('no soap client available');
            }

            const callParams = {
                method    : 'NumberToDollars',
                attributes: {
                    xmlns: 'http://www.dataaccess.com/webservicesserver/'
                },
                params: {
                    'dNum': 255
                }
            };

            const response = await soapClient.instance.call(callParams);
            t.ok(response.data.NumberToDollarsResponse.NumberToDollarsResult, 'got a number conversion');
            t.end();
        } catch (err) {
            t.end(err);
        }
    });

    test('webservices.daehosting.com/services/isbnservice.wso', async (t) => {
        try {
            const soapClient = soapClients.find((item) => item.url === 'webservices.daehosting.com/services/isbnservice.wso');
            if (!soapClient) {
                t.end('no soap client available');
            }

            const response = await soapClient.instance.call({
                method    : 'IsValidISBN10',
                attributes: {
                    xmlns: 'http://webservices.daehosting.com/ISBN'
                },
                params: {
                    'sISBN': '1491904240'
                }
            });

            t.ok(response.data.IsValidISBN10Response.IsValidISBN10Result, 'checked ISBN');
            t.end();
        } catch (err) {
            t.end(err);
        }
    });

    test('webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso', async (t) => {
        try {
            const soapClient = soapClients.find((item) => item.url === 'webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso');
            if (!soapClient) {
                t.end('no soap client available');
            }

            const response = await soapClient.instance.call({
                method    : 'FullCountryInfo',
                attributes: {
                    xmlns: 'http://www.oorsprong.org/websamples.countryinfo'
                },
                params: {
                    'sCountryISOCode': 'DE'
                }
            });

            t.ok(response.data.FullCountryInfoResponse.FullCountryInfoResult.length !== 0, 'country info recieved');
            t.end();
        } catch (err) {
            t.end(err);
        }
    });
})();
