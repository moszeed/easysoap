## What ?

**easysoap** is a WSDL SoapClient for Node.js.

[![Join the chat at https://gitter.im/moszeed/easysoap](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/moszeed/easysoap?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)  


## How to get ?

    npm i easysoap


## available methods

#### *createClient*
**params** createParams, soapOptions  
**response** instance of easysoap  

*createParams*

	{
        host   			: 'www.example.com',
        path   			: '/soap/path',
        wsdl   			: '/wsdl/path',
        headers			: Array or Object,
		rejectUnauthorized : true/false
    }

*soapOptions*

	{
    	secure : true/false //is https or http
    }



###### the following methods available after getting an *easysoap* instance with "createClient"

#### *call*
**params** callParams  
**response** callResponseObject  

#### *getRequestXml*
**params** callParams  
**response** xml (string)  

*callParams*

	{
        method    : "sampleMethodName",
        attributes: Object of custom tag attributes for given params,
        params	: Object/Array of params
    }


#### *getXmlDataAsJson*
**params** xml (string)  
**response** xmldata as json  

#### *getAllFunctions*
**response** Function Names (array)

#### *getMethodParamsByName*
**params** methodName (string)  
**response** methodParams (object)

## How to use ?

	(function() {
		
        "use strict";

		var easysoap = require('easysoap');
		
        // define soap params
        var params = {
			host   : 'www.sample.com',
			path   : '/path/soap/',
            wsdl   : '/path/wsdl/,

			// set soap headers (optional)
			headers: [{
                'name'     : 'item_name',
                'value'    : 'item_value',
                'namespace': 'item_namespace'
            }]
        }
		
        /*
         * create the client
         */ 
        var soapClient = easysoap.createClient(params);
			
            
            /*
			 * get all available functions
        	 */
			soapClient.getAllFunctions()
            	.then((functionArray) => { console.log(functionArray); })
				.catch((err) => { throw new Error(err); });
	

			/*
			 * get the method params by given methodName
             */
    		soapClient.getMethodParamsByName('methodName')
            	.then((methodParams) => { 
					console.log(methodParams.request);
					console.log(methodParams.respone); 
				})
				.catch((err) => { throw new Error(err); });


			/*
			 * call soap method
             */
        	soapClient.call({
            	method    : 'methodName',
				attributes: {
                	xmlns: 'http://www.sample.com'
                },
				params: {
					testParam: 1,
					testParam: [2, 3],
					testParam: {
						'_value'     : 4,
						'_attributes': {
                        	'xmlns1': 'http://www.sample.com/other'
                        }
                    }
                } 
            })
            .then((callResponse) => { 
				console.log(callResponse.data);	// response data as json
                console.log(callResponse.body);	// response body
				console.log(callResponse.header);  //response header
            })
			.catch((err) => { throw new Error(err); });

    }();
