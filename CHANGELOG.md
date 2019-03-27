# easysoap changelog

## 2.2.0
* change: output gets more flatten

## 2.1.0
* bugfix: headers not interpreted
* bugfix: attributes will not be set

## 2.0.2
* bugfix: readd missing "SOAP-HEADER" tag

## 2.0.1
* bugfix: "getRequestXml" is not defined on SoapRequest

## 2.0.0
urgent needed cleanup release,
* everything is now prototype based, much cleaner
* BREAKING: createClient is no more used, now do directly EasySoap()
* BREAKING: now using template literals, async/await that need Node V8 or higher
* no request.tpl file anymore, now using template literals, also dont use _.template anymore
