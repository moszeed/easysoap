(function() {

    "use strict";

    var _        = require('underscore');
    var EasySoap = require('../src/easysoap.js');

    function executeSequentially(promiseFactories) {

        var result = Promise.resolve();
        promiseFactories.forEach((promiseFactory) => {
            result = result.then(promiseFactory);
        });
        return result;
    }

    var soapTestDataArray = [
        [{ host: 'www.predic8.com:8080', path: '/base/IDService', wsdl: '/base/IDService?wsdl' }],
        [{
            host   : 'www.webservicex.net',
            path   : '/globalweather.asmx',
            wsdl   : '/globalweather.asmx?WSDL',
            headers: {
                'SOAPAction': 'http://www.webserviceX.NET/GetWeather'
            }
        }],
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

    var test = require('tape');

        //
        // global tests
        //
        test('createClient',
            (t) => {

                soapTestDataArray.forEach(
                    (soapTestDataItem) => {

                        var connectionData = soapTestDataItem[0];
                        var soapOptions    = soapTestDataItem[1] || {};

                        var soapClient = EasySoap.createClient(connectionData, soapOptions);
                            soapClients.push({
                                'url'     : connectionData.host + connectionData.path,
                                'instance': soapClient
                            });

                        t.ok(true, 'soapClient create for ' + connectionData.host);
                    }
                )

                t.end();
            }
        )

        test('getAllFunctions',
            (t) => {

                var promiseFactory = [];

                soapClients.forEach((soapClient) => {

                    promiseFactory.push(() => {
                        return soapClient.instance.getAllFunctions()
                            .then((functionArray) => {
                                var arrLength = functionArray.length;
                                t.ok(arrLength !== 0, arrLength + ' functions (' + soapClient.url + ')');
                            });
                    });
                    }
                );

                executeSequentially(promiseFactory)
                    .then(() => { t.end(); })
                    .catch((err) => { t.end(err); });
            }
        )

        //
        // specific tests
        //
        test('www.predic8.com:8080/base/IDService',
            (t) => {

                var soapClient = _.findWhere(soapClients, { 'url': 'www.predic8.com:8080/base/IDService' });
                if (!soapClient) {
                    t.end('no soap client available');
                }

                soapClient.instance.call({
                    method: 'generate',
                    params: '123'
                })
                .then((data) => {
                    t.ok(data.data.id !== void 0, 'calling "generate" successful');
                    t.end();
                })
                .catch((err) => { t.end(err); });
            }
        )

        test('www.webservicex.net/globalweather.asmx',
            (t) => {

                var soapClient = _.findWhere(soapClients, { 'url': 'www.webservicex.net/globalweather.asmx' });
                if (!soapClient) {
                    t.end('no soap client available');
                }

                soapClient.instance.call({
                    method    : 'GetWeather',
                    attributes: {
                        xmlns: "http://www.webserviceX.NET"
                    },
                    params: {
                        'CityName'   : 'Leipzig-Schkeuditz',
                        'CountryName': 'Germany'
                    }
                })
                .then((data) => {

                    var weatherData = soapClient.instance.getXmlDataAsJson(
                        data.data.GetWeatherResponse.GetWeatherResult
                    );
                    t.ok(weatherData.CurrentWeather.length !== 0, 'got some weather data');
                    t.end();
                })
                .catch((err) => { t.end(err); });

            }
        )

        test('webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso',
            (t) => {

                var soapClient = _.findWhere(soapClients, {
                    'url': 'webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso'
                });

                if (!soapClient) {
                    t.end('no soap client available');
                }

                soapClient.instance.call({
                    method    : 'FullCountryInfo',
                    attributes: {
                        xmlns: "http://www.oorsprong.org/websamples.countryinfo"
                    },
                    params: {
                        'sCountryISOCode': 'DE'
                    }
                })
                .then((data) => {
                    t.ok(data.data.FullCountryInfoResponse.FullCountryInfoResult.length !== 0, 'country info recieved');
                    t.end();
                })
                .catch((err) => { t.end(err); });

            }
        );

        test('webservices.daehosting.com/services/isbnservice.wso',
            (t) => {

                var soapClient = _.findWhere(soapClients, {
                    'url': 'webservices.daehosting.com/services/isbnservice.wso'
                });

                if (!soapClient) {
                    t.end('no soap client available');
                }

                soapClient.instance.call({
                    method    : 'IsValidISBN10',
                    attributes: {
                        xmlns: "http://webservices.daehosting.com/ISBN"
                    },
                    params: {
                        'sISBN': '1491904240'
                    }
                })
                .then((data) => {
                    t.ok(data.data.IsValidISBN10Response.IsValidISBN10Result, 'checked ISBN');
                    t.end();
                })
                .catch((err) => { t.end(err); });

            }
        );

        test('www.dataaccess.com/webservicesserver/numberconversion.wso',
            (t) => {

                var soapClient = _.findWhere(soapClients, {
                    'url': 'www.dataaccess.com/webservicesserver/numberconversion.wso'
                });

                if (!soapClient) {
                    t.end('no soap client available');
                }

                soapClient.instance.call({
                    method    : 'NumberToDollars',
                    attributes: {
                        xmlns: "http://www.dataaccess.com/webservicesserver/"
                    },
                    params: {
                        'dNum': 255
                    }
                })
                .then((data) => {
                    t.ok(data.data.NumberToDollarsResponse.NumberToDollarsResult, 'got a number conversion');
                    t.end();
                })
                .catch((err) => { t.end(err); });

            }
        );

})();
