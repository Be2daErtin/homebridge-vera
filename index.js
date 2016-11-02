///////////////////////////////////////
// Vera Plugin for HomeBridge    //
// Version 2016_1101.0               //
// Author: Bertin		          			 //
///////////////////////////////////////

var Accessory, Service, Characteristic;
var url      = require('url')
var request  = require('request');
var fs       = require('fs');
//var async    = require('async');
var http = require('http');

var communicationError = new Error('Can not communicate with Vera!')

var VeraDimLight;
var VeraLight;
var VeraSwitch;
var VeraSensor;
var VeraSecurity;
//TODO: Add vera scene, rooms and alarm here


var valueH, valueS, valueV;
var readValue = 0;

if(!fs.existsSync('./setup.js'))
{
  console.log("No setup file exists. Creating one...");

  //return;
}

module.exports = function(homebridge){
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  Accessory = homebridge.platformAccessory;

  VeraDimLight = require('./accessories/dimlight')(Service, Characteristic, communicationError);
  VeraLight = require('./accessories/light')(Service, Characteristic, communicationError);
  VeraSwitch = require('./accessories/switch')(Service, Characteristic, communicationError);
  VeraSensor = require('./accessories/sensor')(Service, Characteristic, communicationError);
  VeraSecurity = require('./accessories/security')(Service, Characteristic, communicationError);

  homebridge.registerPlatform("homebridge-vera", "Vera", VeraLitePlatform, false);
}

function VeraLitePlatform(log, config, api) {
  console.log("Starting Vera Platform...");
	//Read from config file
	this.log          = log;
  this.rooms        = {};
  this.host         = config.VeraIP;
  this.excludedid   = config.excludeID;

  if (api) {
    // Save the API object as plugin needs to register new accessory via this object.
    this.api = api;

    // Listen to event "didFinishLaunching", this means homebridge already finished loading cached accessories
    // Platform Plugin should only register new accessory that doesn't exist in homebridge after this event.
    // Or start discover new accessories
    this.api.on('didFinishLaunching', function() {
      console.log("Plugin - DidFinishLaunching");
    }.bind(this));
  }
}

VeraLitePlatform.prototype = {

  doRequest: function(url, callback){
    request({url:url}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      readValue = body;
      readValue = parseInt(readValue);
      callback(null,readValue);
    }
    else{
      //TODO: Test errors
      //this.log(error);
      callback(error);
    }
  });
},//doRequest

  queryDevice: function(device_id, command, callback){
    var url = ""
    switch (command){
      case 'onoff':
         url = "http://"+this.host +":3480/data_request?id=variableget&DeviceNum="+device_id+"&serviceId=urn:upnp-org:serviceId:SwitchPower1&Variable=Status";
         break;
      case 'dim':
        url = "http://"+this.host +":3480/data_request?id=variableget&DeviceNum="+device_id+"&serviceId=urn:upnp-org:serviceId:Dimming1&Variable=LoadLevelStatus";
        break;
      case 'motion':
        url = "http://"+this.host +":3480/data_request?id=variableget&DeviceNum="+device_id+"&serviceId=urn:micasaverde-com:serviceId:SecuritySensor1&Variable=Tripped";
        break;
      case 'temperature':
        url = "http://"+this.host +":3480/data_request?id=variableget&DeviceNum="+device_id+"&serviceId=urn:upnp-org:serviceId:TemperatureSensor1&Variable=CurrentTemperature";
        break;
      case 'humidity':
        url = "http://"+this.host +":3480/data_request?id=variableget&DeviceNum="+device_id+"&serviceId=urn:micasaverde-com:serviceId:HumiditySensor1&Variable=CurrentLevel";
        break;
      case 'lux':
        url = "http://"+this.host +":3480/data_request?id=variableget&DeviceNum="+device_id+"&serviceId=urn:micasaverde-com:serviceId:LightSensor1&Variable=CurrentLevel";
        break;
      case 'batterylow':
        url = "http://"+this.host +":3480/data_request?id=variableget&DeviceNum="+device_id+"&serviceId=urn:micasaverde-com:serviceId:HaDevice1&Variable=BatteryLevel";
        break;
      case 'securitystate':
        url = "http://"+this.host +":3480/data_request?id=variableget&DeviceNum="+device_id+"&serviceId=urn:upnp-empuk-net:serviceId:SimpleAlarm1&Variable=Status";
        break;

      default:
         this.log.error("I don't know what to query for " + command)
         callback(null)
         return
    }

    this.doRequest(url, function(error, response){
      if (error) {
        callback(communicationError)
      }else{
        callback(response)
      }
    })
  },

  setDevice: function(device_id, command, value, callback){
    var url = ""

    switch (command){
      case 'turnOn':
         url = "http://"+this.host+":3480/data_request?id=lu_action&output_format=xml&DeviceNum=" + device_id + "&serviceId=urn:upnp-org:serviceId:SwitchPower1&action=SetTarget&newTargetValue=1";
         break;
      case 'turnOff':
         url = "http://"+this.host+":3480/data_request?id=lu_action&output_format=xml&DeviceNum=" + device_id + "&serviceId=urn:upnp-org:serviceId:SwitchPower1&action=SetTarget&newTargetValue=0";
         break;
      case 'brightness':
         url = "http://" + this.host + ":3480/data_request?id=lu_action&output_format=xml&DeviceNum=" + device_id + "&serviceId=urn:upnp-org:serviceId:Dimming1&action=SetLoadLevelTarget&newLoadlevelTarget=" + value;
         break;
      case 'securityset':
         url = "http://" + this.host + ":3480/data_request?id=lu_action&output_format=xml&DeviceNum=" + device_id + "&serviceId=urn:upnp-empuk-net:serviceId:SimpleAlarm1&action=" + value;
         console.log(url);
      break;


      default:
         this.log.error("I don't know what to do with command: " + command)
         url = "UNKNOWN"
         //callback(communicationError)
         //return
    }

    this.doRequest(url, function(error, response){
      if (error) {
        callback(communicationError)
      }else{
        //console.log("R:" +response)
        callback(true)
      }
    })

  },//setDevice

  accessories: function(callback) {

		this.log("Looking for devices on VeraLite (" + this.host + ")...");

		var url = "http://"+this.host+":3480/data_request?id=lu_sdata";
		var that = this;
		var DiscoveredAccessories = [];
    var DiscoveredRooms = [];

    var exludelist = this.excludedid;

		request({ url: url, json: true }, function (error, response, body) {

      if (error) {
        that.log.error(error)

      }
      else {
        body.devices.forEach(function(device) {
          for (var i = 0; i < exludelist.length; i++){
            if (device.id == exludelist[i]){
              that.log("Skipping this device: " + device.name + "("+ device.id + ")");
              device.category = 0;
              return;
            }
          }//for

          switch (device.category)
          {
              case 2:
                  that.log("Found dimmable device: " + device.name + " (" + device.id + ") with status " + device.status + " at level " + device.level);
                  var accessory = null;
                  accessory = new VeraDimLight(that.log, device, that)
                  break;
              case 3:
                  that.log("Found switched device: " + device.name);
                  var accessory = null;
                  accessory = new VeraLight(that.log, device, that)
                  //accessory = new VeraBridgedAccessory([{controlService: new Service.Lightbulb(device.name), characteristics: [Characteristic.On]}]);
                  break;
                case 4:
                  that.log("Found motion sensor device: " + device.name);
                  accessory = new VeraSensor(that.log, device, that, "Motion")
                  //accessory = new VeraBridgedAccessory([{controlService: new Service.MotionSensor(device.name), characteristics: [Characteristic.MotionDetected]}]);
                  break;
                case 16:
                  that.log("Found humidity sensor device: " + device.name);
                  accessory = new VeraSensor(that.log, device, that, "Humidity")
                  //accessory = new VeraBridgedAccessory([{controlService: new Service.HumiditySensor(device.name), characteristics: [Characteristic.CurrentRelativeHumidity]}]);
                  break;
                case 17:
                  that.log("Found temperature sensor device: " + device.name);
                  accessory = new VeraSensor(that.log, device, that, "Temperature")
                  //accessory = new VeraBridgedAccessory([{controlService: new Service.TemperatureSensor(device.name), characteristics: [Characteristic.CurrentTemperature]}]);
                  break;
                case 18:
                  that.log("Found light sensor device: " + device.name);
                  accessory = new VeraSensor(that.log, device, that, "Lux")
                  //accessory = new VeraBridgedAccessory([{controlService: new Service.LightSensor(device.name), characteristics: [Characteristic.CurrentAmbientLightLevel]}]);
                  break;
                case 22:
                    that.log("Found security panel: " + device.name);
                    accessory = new VeraSecurity(that.log, device, that)
                    //accessory = new VeraBridgedAccessory([{controlService: new Service.SecuritySystem(device.name), characteristics: [Characteristic.SecuritySystemCurrentState,Characteristic.SecuritySystemTargetState,Characteristic.SecuritySystemAlarmType]}]);
                    break;
                default:
                  that.log("Device not recognised... Skipping category: " + device.category);
              }//switch

              if (accessory) {
                //accessory.serialNumber		= "Vera Device id:" + device.id;
                //console.log("ACC" + JSON.stringify(accessory))
                DiscoveredAccessories.push(accessory)
                }
            });//forEach
            callback(DiscoveredAccessories);
          }//else no error
    });//request
	},//Accessories

};//PROTOTYPE

// function SetColourWheel(){
// 	var valueR, valueG, valueB, hexR, hexG, hexB, hexValue;
//     var C, X,  m;
// 	//Converting value to rgb then hex
//
//
//                 	valueV = 100;
//
//                 	valueS = valueS/100;
//                 	valueV = valueV/100;
//
//                 	if (valueH == 360)
//                 		valueH = 0;
//
//                 	console.log ("valueH = "+ valueH);
//                 	console.log ("valueS = "+ valueS);
//                 	console.log ("valueV = "+ valueV);
//
//                 	C = valueS * valueV;
//                 	X = C * (1 - Math.abs((valueH/60) % 2 - 1 ));
//                 	m = valueV - C;
//
//                 	if (valueH < 60){
//                 		valueR = C;
//                 		valueG = X;
//                 		valueB = 0;
//                 	}
//                 	else if (valueH < 120){
//                 		valueR = X;
//                 		valueG = C;
//                 		valueB = 0;
//                 	}
//                 	else if (valueH < 180){
//                 		valueR = 0;
//                 		valueG = C;
//                 		valueB = X;
//                 	}
//                 	else if (valueH < 240){
//                 		valueR = 0;
//                 		valueG = X;
//                 		valueB = C;
//                 	}
//                 	else if (valueH < 300){
//                 		valueR = X;
//                 		valueG = 0;
//                 		valueB = C;
//                 	}
//                 	else if (valueH < 360){
//                 		valueR = C;
//                 		valueG = 0;
//                 		valueB = X;
//                 	}
//
//                 	valueR = Math.floor((valueR + m) * 255);
//                 	valueG = Math.floor((valueG + m) * 255);
//                 	valueB = Math.floor((valueB + m) * 255);
//                 	hexR = valueR.toString(16).toUpperCase();
//                 	hexG = valueG.toString(16).toUpperCase();
//                 	hexB = valueB.toString(16).toUpperCase();
//
//                 	padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;
//                 	while (hexR.length < padding) {
//                 		hexR = "0" + hexR;
//                 	}
//                 	while (hexG.length < padding) {
//                 		hexG = "0" + hexG;
//                 	}
//                 	while (hexB.length < padding) {
//                 		hexB = "0" + hexB;
//                 	}
//
//                 	hexValue = hexR+hexG+hexB;
//                 	//console.log("Colour Wheel Change value " + value);
//                 	console.log("The colour is set to: " + hexValue);
//
//                 	valueS = valueS * 100;
//                 	valueV = valueV * 100;
//                 	return hexValue;
//
// }

function VeraBridgedAccessory(services) {
	//console.log("VERABRIDGEACCESSORY: " + this.services);
    this.services = services;

}

console.log('DONE!');


////////////////////////////////////////
//These are old functions not being used
////////////////////////////////////////

/*setInterval(function() {
    //   lightbulbService.getCharacteristic(Characteristic.On).getValue()


    var url = "http://192.168.1.24:3480/data_request?id=lu_sdata";
    var lightbulbService = new Service.Lightbulb();

    console.log("URL " + url)
    request({ url: url, json: true }, function (error, response, body) {

      body.devices.forEach(function(device) {
        console.log("device: " + device.id + " " + device.name)
        characteristic = lightbulbService.getCharacteristic(Characteristic.On).getValue()
        console.log(characteristic)
      })
      //console.log(body)
      //console.log(error)
    }
  )
}, 5000);*/

// Alarm Detected characteristic
/*AlarmDetected = function() {
  Characteristic.call(this, 'Alarm Detected', '51258EAA-A505-3B3B-BF7F-FEFF819CDC9F')

  this.setProps({
    format: Characteristic.Formats.BOOL,
    perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
  });

  this.value = this.getDefaultValue();
};

inherits(AlarmDetected, Characteristic);*/

// command: function(commandSet ,value, that) {
// 		console.log("---------------------------------------");
// 		console.log("Commands received: " + commandSet + " for device: " + that.id);
// 		console.log("---------------------------------------");
// 		var url = null;
// 		var setColour = "000000";
//
// 		switch (commandSet){
// 			case "turnOn":
// 			  url = "http://"+this.host+":3480/data_request?id=lu_action&output_format=xml&DeviceNum=" + that.id + "&serviceId=urn:upnp-org:serviceId:SwitchPower1&action=SetTarget&newTargetValue=1";
//         break;
//       case "turnOff":
//         url = "http://"+this.host+":3480/data_request?id=lu_action&output_format=xml&DeviceNum=" + that.id + "&serviceId=urn:upnp-org:serviceId:SwitchPower1&action=SetTarget&newTargetValue=0";
//         break;
//       case "setDim":
//         url = "http://" + this.host + ":3480/data_request?id=lu_action&output_format=xml&DeviceNum=" + that.id + "&serviceId=urn:upnp-org:serviceId:Dimming1&action=SetLoadLevelTarget&newLoadlevelTarget=" + value;
//         break;
//       case "setHue":
//         console.log("Setting Hue: " + value );
//         valueH = value;
//         console.log("Setting for LED: " + valueH + " " + valueS);
//         setColour = SetColourWheel();
//         console.log("Colour: " + setColour);
//         url = "http://"+this.host +":3480/data_request?id=lu_action&output_format=xml&DeviceNum=19&serviceId=urn:upnp-org:serviceId:RGBController1&action=SetColorTarget&newColorTargetValue="+setColour;
//         break;
//       case "setSat":
//         console.log("Setting Saturation: " + value);
//         valueS = value;
//         console.log("Setting for LED: " + valueH + " " + valueS);
//         setColour = SetColourWheel();
//         console.log("Colour: " + setColour);
//         url = "http://"+this.host +":3480/data_request?id=lu_action&output_format=xml&DeviceNum=19&serviceId=urn:upnp-org:serviceId:RGBController1&action=SetColorTarget&newColorTargetValue="+setColour;
//         break;
//     }//Switch
//
// 		var body = value != undefined ? JSON.stringify({
// 			"args": [	value ]
// 		}) : null;
//
//    	request.get({url: url},
// 			function(err, response, body) {
// 				if (!err && response.statusCode == 200) {
// 					console.log("Success!");
// 				}
// 				else{
// 					console.log(err);
// 				}
// 			}
// 		);
// },//Command


//
// getAccessoryHue: function(callback, homebridgeAccessory) {
//
//     console.log("---------------------------------------");
//     console.log("Reading device Hue: "+homebridgeAccessory.name + "("+homebridgeAccessory.id+")");
//     console.log("---------------------------------------");
//
//     url ="http://"+this.host +":3480/data_request?id=lu_action&output_format=json&DeviceNum=19&serviceId=urn:upnp-org:serviceId:RGBController1&action=GetColor"
//
//
//     request({url:url, }, function (error, response, body) {
//     if (!error && response.statusCode == 200) {
//
//     	//var newBody = body.match(#/d+/g);
//     	var n = body.indexOf("#") + 1;
//     	var r,g,b;
//
//     	r = body.substr(n,2);
//     	g = body.substr(n+2,2);
//     	b = body.substr(n+4,2);
//
//     	console.log ("Colour to convert: "+r+" " + g+ " " +b);
//
//     	//r = r.toString(10);
//     	r = parseInt(r, 16);
//     	g = parseInt(g, 16);
//     	b = parseInt(b, 16);
//
//     	console.log (r+" " + g+ " " +b);
//
//     	r = r/255;
//     	g = g/255;
//     	b = b/255;
//
//     	console.log (r+" " + g+ " " +b);
//     	var Cmax = Math.max(r,g,b);
//     	var Cmin = Math.min(r,g,b);
//     	console.log("Max: " + Cmax + " Min: " + Cmin);
//
//     	var Delta = Cmax-Cmin;
//
//     	console.log("Delta: " + Delta);
//
//     	if (Delta == 0){
//     		valueH=0;
//     	}
//     	else if (Cmax == r)
//     	{
//     		valueH = (g-b)/Delta;
//     		valueH = valueH % 6;
//     		valueH = valueH*60;
//     	}
//     	else if (Cmax == g)
//     	{
//     		valueH = (b-r)/Delta;
//     		valueH = valueH + 2;
//     		valueH = valueH*60;
//     	}
//     	else if (Cmax == b)
//     	{
//     		valueH = (r-g)/Delta;
//     		valueH = valueH + 4;
//     		valueH = valueH*60;
//     	}
//
//     	if (valueH < 0){
//     		valueH = 360 + valueH;
//     	}
//
//
//     	if (Cmax == 0) {
//     		valueS = 0;
//     	}
//     	else{
//     		valueS = Delta/Cmax;
//     	}
//
//     	valueV = Cmax;
//
//     	valueH = Math.round(valueH);
//     	valueS = valueS* 100;
//     	valueV = valueV * 100;
//     	console.log("valueH: " + valueH);
//     	console.log("valueS: " + valueS);
//     	console.log("valueV: " + valueV);
//
//
//
//         console.log("Returning Hue: " + valueH);
//
// 	callback(null,valueH);
//
//     }
// 	});
// },//getAccessoryHue
//
// getAccessorySat: function(callback, homebridgeAccessory) {
//
//     console.log("---------------------------------------");
//     console.log("Reading device Saturation: "+homebridgeAccessory.name + "("+homebridgeAccessory.id+")");
//     console.log("---------------------------------------");
//
//     url ="http://"+this.host +":3480/data_request?id=lu_action&output_format=json&DeviceNum=19&serviceId=urn:upnp-org:serviceId:RGBController1&action=GetColor"
//
//     request({url:url, }, function (error, response, body) {
//     if (!error && response.statusCode == 200) {
//
//     	//var newBody = body.match(#/d+/g);
//     	var n = body.indexOf("#") + 1;
//     	var r,g,b;
//
//     	r = body.substr(n,2);
//     	g = body.substr(n+2,2);
//     	b = body.substr(n+4,2);
//
//     	console.log ("Colour to convert: "+r+" " + g+ " " +b);
//
//     	//r = r.toString(10);
//     	r = parseInt(r, 16);
//     	g = parseInt(g, 16);
//     	b = parseInt(b, 16);
//
//     	console.log (r+" " + g+ " " +b);
//
//     	r = r/255;
//     	g = g/255;
//     	b = b/255;
//
//     	console.log (r+" " + g+ " " +b);
//     	var Cmax = Math.max(r,g,b);
//     	var Cmin = Math.min(r,g,b);
//     	console.log("Max: " + Cmax + " Min: " + Cmin);
//
//     	var Delta = Cmax-Cmin;
//
//     	console.log("Delta: " + Delta);
//
//     	if (Delta == 0){
//     		valueH=0;
//     	}
//     	else if (Cmax == r)
//     	{
//     		valueH = (g-b)/Delta;
//     		valueH = valueH % 6;
//     		valueH = valueH*60;
//     	}
//     	else if (Cmax == g)
//     	{
//     		valueH = (b-r)/Delta;
//     		valueH = valueH + 2;
//     		valueH = valueH*60;
//     	}
//     	else if (Cmax == b)
//     	{
//     		valueH = (r-g)/Delta;
//     		valueH = valueH + 4;
//     		valueH = valueH*60;
//     	}
//
//     	if (valueH < 0){
//     		valueH = 360 + valueH;
//     	}
//
//
//     	if (Cmax == 0) {
//     		valueS = 0;
//     	}
//     	else{
//     		valueS = Delta/Cmax;
//     	}
//
//     	valueV = Cmax;
//
//     	valueH = Math.round(valueH);
//     	valueS = valueS* 100;
//     	valueV = valueV * 100;
//     	console.log("valueH: " + valueH);
//     	console.log("valueS: " + valueS);
//     	console.log("valueV: " + valueV);
//
//         console.log("Returning Saturation: " + valueS);
//
//     //readValue = parseInt(readValue);
// 	callback(null,valueS);
//
//     }
// 	});
// },//getAccessorySat
//
// getAccessoryMotionDetection: function(callback, homebridgeAccessory) {
//
//     	console.log("---------------------------------------");
//     	console.log("Reading device "+homebridgeAccessory.name + "("+homebridgeAccessory.id+")");
//     	console.log("---------------------------------------");
//
//     	var url = "http://"+this.host +":3480/data_request?id=variableget&DeviceNum="+homebridgeAccessory.id+"&serviceId=urn:micasaverde-com:serviceId:SecuritySensor1&Variable=Tripped";
//
//     request({url:url}, function (error, response, body) {
//     if (!error && response.statusCode == 200) {
//
//         console.log("body: " + body); // Show the HTML for the Modulus homepage.
//         readValue = body;
//
//         console.log("ReadValue: " + readValue);
//     	readValue = parseInt(readValue);
// 		callback(null,readValue);
//
//     }
//     else{
//     	console.log(error);
//     	callback(error);
//     }
// 	});
//
//   },//getAccessoryMotionDetection
//
// getAccessoryLux: function(callback, homebridgeAccessory) {
//
//     	console.log("---------------------------------------");
//     	console.log("Reading device "+homebridgeAccessory.name + "("+homebridgeAccessory.id+")");
//     	console.log("---------------------------------------");
//
//     	var url = "http://"+this.host +":3480/data_request?id=variableget&DeviceNum="+homebridgeAccessory.id+"&serviceId=urn:micasaverde-com:serviceId:LightSensor1&Variable=CurrentLevel";
//
//     request({url:url}, function (error, response, body) {
//     if (!error && response.statusCode == 200) {
//
//         console.log("body: " + body); // Show the HTML for the Modulus homepage.
//         readValue = body;
//
//         console.log("ReadValue: " + readValue);
//     	readValue = parseInt(readValue);
// 		callback(null,readValue);
//
//     }
//     else{
//     	console.log(error);
//     	callback(error);
//     }
// 	});
//
//   },//getAccessoryLux
//
// getNewSecurityState: function(oldValue, newValue, homebridgeAccessory) {
// 	console.log("Fdsfdsafhjkdshfjkdshfjkdsjkfhdsjkfhjkdshfjkhdsfk");
// 	console.log("Old value" + this.homebridgeAccessory);
//
// 	//var me = homebridgeAccessory.services.controlService;
// 	//var sme = JSON.stringify(me)
// 	//console.log("Unknown arm state: %s", sme);
// },
//
// getSecurityState: function(callback, homebridgeAccessory) {
// 	console.log("---------------------------------------");
// 	console.log("Reading device: "+homebridgeAccessory.name + "("+homebridgeAccessory.id+")");
// 	console.log("---------------------------------------");
//
// 	var url = "http://"+this.host +":3480/data_request?id=variableget&DeviceNum="+homebridgeAccessory.id+"&serviceId=urn:upnp-org:serviceId:SwitchPower1&Variable=Status";
//
//
// 	request({url:url}, function (error, response, body) {
// 		if (!error && response.statusCode == 200) {
// 			console.log("body: " + body); // Show the HTML for the Modulus homepage.
// 	    readValue = body;
// 			console.log("ReadValue: " + readValue);
// 	    readValue = parseInt(readValue);
//
// 			// The value property of SecuritySystemTargetState must be one of the following:
// 			//Characteristic.SecuritySystemTargetState.STAY_ARM = 0;
// 			//Characteristic.SecuritySystemTargetState.AWAY_ARM = 1;
// 			//Characteristic.SecuritySystemTargetState.NIGHT_ARM = 2;
// 			//Characteristic.SecuritySystemTargetState.DISARM = 3;
//
// 			//TODO: Remove when virtual is not just on/off
// 			if (readValue == 0){
// 				readValue = 3;
// 			}
//
// 			switch(readValue) {
//
// 	      case 0:
// 	      console.log("System is STAY armed");
// 	      //callback(null, Characteristic.SecuritySystemCurrentState.STAY_ARM);
// 	      break;
//
// 	      case 1:
// 	      console.log("System is AWAY armed");
// 	      //callback(null, Characteristic.SecuritySystemCurrentState.AWAY_ARM);
// 	      break;
//
// 	      case 2:
// 	      console.log("System is NIGHT armed");
// 	      //callback(null, Characteristic.SecuritySystemCurrentState.NIGHT_ARM);
// 	      break;
//
// 	      case 3:
// 	      console.log("System is DISARMED");
// 	      //callback(null, Characteristic.SecuritySystemCurrentState.DISARM);
// 	      break;
//
// 	      default:
// 	      //this.log("Unknown arm state: %s", JSON.stringify(alarm_status));
// 	      //callback(new Error("Could not determine state of alarm"));
// 	      break;
// 	    }
// 			console.log("READVALUE: " + readValue);
// 			callback(null,readValue);
//
// 	    }
// 	    else{
// 	    	console.log(error);
// 	    	callback(new Error("Could not determine state of alarm"));
// 	    }
// 		});
//
// 	/*
//
//   var url = "http://"+this.host +":3480/data_request?id=variableget&DeviceNum=3&serviceId=urn:upnp-org:serviceId:SwitchPower1&Variable=Status";
//   var handle_data = function (alarm_status) {
// 		if(alarm_status == undefined) {
//       callback(new Error("Could not determine state of alarm"));
//       return;
//     }
//
// 		if(alarm_status["armed"] == false) {
//       callback(null, Characteristic.SecuritySystemCurrentState.DISARMED);
//       return;
//     }
//
//     if(alarm_status["in_alarm"] == true || alarm_status["alarm_in_memory"] == true) {
//       callback(null, Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED);
//       return;
//     }
//
// 		switch(alarm_status["arm-mode"]) {
//
//       case "away":
//       this.log("System is away armed");
//       callback(null, Characteristic.SecuritySystemCurrentState.AWAY_ARM);
//       break;
//
//       case "stay":
//       this.log("System is stay armed");
//       callback(null, Characteristic.SecuritySystemCurrentState.STAY_ARM);
//       break;
//
//       case "night":
//       this.log("System is night armed");
//       callback(null, Characteristic.SecuritySystemCurrentState.NIGHT_ARM);
//       break;
//
//       case "armed":
//       this.log("System is armed2");
//       callback(null, Characteristic.SecuritySystemCurrentState.AWAY_ARM);
//       break;
//
//       default:
//       this.log("Unknown arm state: %s", JSON.stringify(alarm_status));
//       callback(new Error("Could not determine state of alarm"));
//       break;
//     }
// 	}.bind(this);//handle_data
// 	this.performWithStatus(handle_data);
//  /*
// 	/*
//
// 	request({url:url}, function (error, response, body) {
// 		if (!error && response.statusCode == 200) {
// 			console.log("body: " + body); // Show the HTML for the Modulus homepage.
// 	    readValue = body;
// 			console.log("ReadValue: " + readValue);
// 	    readValue = parseInt(readValue);
//
// 			// The value property of SecuritySystemTargetState must be one of the following:
// 			//Characteristic.SecuritySystemTargetState.STAY_ARM = 0;
// 			//Characteristic.SecuritySystemTargetState.AWAY_ARM = 1;
// 			//Characteristic.SecuritySystemTargetState.NIGHT_ARM = 2;
// 			//Characteristic.SecuritySystemTargetState.DISARM = 3;
//
// 			if (readValue == 0){
// 				//STAY_ARM force to DISARM
// 				readValue = 3;
// 			}
//
// 			callback(null,readValue);
//
// 	    }
// 	    else{
// 	    	console.log(error);
// 	    	callback(error);
// 	    }
// 		});*/
//
// 	  },//getSecurityState
//
// setSecurityState: function(value, callback, that) {
// 			console.log("---------------------------------------");
// 			console.log("Change security state: " + that.name + "(" + that.id + ") to: " + value);
// 			console.log("---------------------------------------");
// 			var url = null;
//
//
// 			switch (value){
// 				case 0:
// 					console.log("Set state to STAY arm");
// 				  url = "http://"+this.host+":3480/data_request?id=lu_action&output_format=text&DeviceNum="+ that.id +"&serviceId=urn:upnp-org:serviceId:SwitchPower1&action=SetTarget&newTargetValue=1";
// 					break;
// 			  case 1:
// 					console.log("Set state to AWAY arm");
// 					url = "http://"+this.host+":3480/data_request?id=lu_action&output_format=text&DeviceNum=" + that.id + "&serviceId=urn:upnp-org:serviceId:SwitchPower1&action=SetTarget&newTargetValue=1";
// 					break;
// 			  case 2:
// 					console.log("Set state to NIGHT arm");
// 					url = "http://"+this.host+":3480/data_request?id=lu_action&output_format=text&DeviceNum=" + that.id + "&serviceId=urn:upnp-org:serviceId:SwitchPower1&action=SetTarget&newTargetValue=1";
// 					break;
// 			  case 3:
// 					console.log("Set state to DISARM");
// 			    url = "http://"+this.host+":3480/data_request?id=lu_action&output_format=text&DeviceNum="+ that.id +"&serviceId=urn:upnp-org:serviceId:SwitchPower1&action=SetTarget&newTargetValue=0";
// 			    break;
// 				default:
// 					url = "";
// 					break
// 				}//Switch
//
// 				if(url == "") {
// 				  callback(new Error("Error setting state to %s", value));
// 				  return;
// 				}
//
// 				var body = value != undefined ? JSON.stringify({
// 			  	"args": [	value ]
// 			}) : null;
//
//
//
// 			request.get({url:url},
// 				function (error, response, body) {
// 	    if (!error && response.statusCode == 200) {
//
//
// 					if (value != 3){
// 						value = 1;
// 					}
// 					console.log("Success state:" + value);
//
// 				 //callback(null);
// 			//callback(null,readValue);
//
// 	    }
// 	    else{
// 	    	console.log(error);
// 	    	callback(new Error("Could not issue command"));
// 	    }
// 		});
//
// 		//function(callback) {homebridgeAccessory.platform.getSecurityState(callback, homebridgeAccessory);
// 		//}.bind(this) );
//
//
//
//
//   },//setSecurityState

// bindCharacteristicEvents: function(characteristic, service, homebridgeAccessory) {
//
//     var onOff = characteristic.props.format == "bool" ? true : false;
//
// 	//homebridgeAccessory
//
// 	switch (characteristic.displayName){
// 		case 'On':
// 			characteristic.on('set', function(value, callback) {homebridgeAccessory.platform.command(value == 0 ? "turnOff": "turnOn", null, homebridgeAccessory);
// 			callback();
//       }.bind(this) );
//       characteristic.on('get', function(callback) {homebridgeAccessory.platform.getAccessoryValue(callback, homebridgeAccessory, false);
//       }.bind(this) );
//       break;
//     case 'Brightness':
// 			characteristic.on('set', function(value, callback) {homebridgeAccessory.platform.command("setDim", value, homebridgeAccessory);
// 			callback();
//       }.bind(this) );
//       characteristic.on('get', function(callback) {homebridgeAccessory.platform.getAccessoryValue(callback, homebridgeAccessory, true);
//       }.bind(this) );
//       break;
//     case 'Hue':
// 		  characteristic.on('set', function(value, callback) {homebridgeAccessory.platform.command("setHue", value, homebridgeAccessory);
// 		  callback();
//       }.bind(this) );
//       characteristic.on('get', function(callback) {homebridgeAccessory.platform.getAccessoryHue(callback, homebridgeAccessory);
//       }.bind(this) );
//       break;
//     case 'Saturation':
// 			characteristic.on('set', function(value, callback) {homebridgeAccessory.platform.command("setSat", value, homebridgeAccessory);
// 			callback();
//       }.bind(this) );
//       characteristic.on('get', function(callback) {homebridgeAccessory.platform.getAccessorySat(callback, homebridgeAccessory);
//       }.bind(this) );
//       break;
//     case 'Motion Detected':
//       characteristic.on('get', function(callback) {homebridgeAccessory.platform.getAccessoryMotionDetection(callback, homebridgeAccessory);
//       }.bind(this) );
//       break;
//     case 'Current Temperature':
//       characteristic.on('get', function(callback) {homebridgeAccessory.platform.getAccessoryTemperature(callback, homebridgeAccessory);
//       }.bind(this) );
//       break;
//     case 'Current Ambient Light Level':
//       characteristic.on('get', function(callback) {homebridgeAccessory.platform.getAccessoryLux(callback, homebridgeAccessory);
//       }.bind(this) );
//       break;
//     case 'Current Relative Humidity':
//       characteristic.on('get', function(callback) {homebridgeAccessory.platform.getAccessoryHumidity(callback, homebridgeAccessory);
//       }.bind(this) );
//     	break;
// 		case 'Security System Current State':
// 		  //characteristic.on('set', function(value, callback) {homebridgeAccessory.platform.setSecurityState(value, callback, homebridgeAccessory);
// 		  //callback(null,value);
// 		  //}.bind(this) );
//       characteristic.on('get', function(callback) {homebridgeAccessory.platform.getSecurityState(callback, homebridgeAccessory);
//       }.bind(this) );
// 			//characteristic.on('change', function(oldValue, newValue) {homebridgeAccessory.platform.getNewSecurityState(oldValue, newValue, homebridgeAccessory);
//       //}.bind(this) );
//     	break;
//  	  case 'Security System Alarm Type':
//       characteristic.on('get', function(callback) {homebridgeAccessory.platform.getSecurityState(callback, homebridgeAccessory);
//       }.bind(this) );
// 		  break;
// 		case 'Security System Target State':
// 	    characteristic.on('set', function(value, callback) {homebridgeAccessory.platform.setSecurityState(value, callback, homebridgeAccessory);
// 			callback(null,value);
// 	    }.bind(this) );
// 			characteristic.on('get', function(callback) {homebridgeAccessory.platform.getSecurityState(callback, homebridgeAccessory);
// 	    }.bind(this) );
//
//
// 			//characteristic.on('change', function(oldvalue, newvalue) {homebridgeAccessory.platform.getNewSecurityState(oldvalue, newvalue, homebridgeAccessory);
// 		  //}.bind(this) );
//     	break;
//     default:
//     	this.log("Something went belly up... Characteristic not found: " + characteristic.displayName);
//   	break;
// 	}
//
// },//bindCharacteristicEvents

// getInformationService: function(homebridgeAccessory) {
//     var informationService = new Service.AccessoryInformation();
//     informationService
//                 .setCharacteristic(Characteristic.Name, homebridgeAccessory.name)
// 				.setCharacteristic(Characteristic.Manufacturer, homebridgeAccessory.manufacturer)
// 			    .setCharacteristic(Characteristic.Model, homebridgeAccessory.model)
// 			    .setCharacteristic(Characteristic.SerialNumber, homebridgeAccessory.serialNumber);
//   	return informationService;
//   },//getInformationServices
//
// getServices: function(homebridgeAccessory) {
//   	var services = [];
//   	var informationService = homebridgeAccessory.platform.getInformationService(homebridgeAccessory);
//   	services.push(informationService);
//
//   	for (var s = 0; s < homebridgeAccessory.services.length; s++){
//   		var service = homebridgeAccessory.services[s];
//   		for (var i=0; i < service.characteristics.length; i++) {
//   			var characteristic = service.controlService.getCharacteristic(service.characteristics[i]);
// 			homebridgeAccessory.platform.bindCharacteristicEvents(characteristic, service, homebridgeAccessory);
//   		}//for i
//
//   	services.push(service.controlService);
//   	}//for s
//
//     return services;
//   },  //getServices

// fetchHTTPWithCallback: function (callback) {
//
// 	var url = "http://"+this.host +":3480/data_request?id=variableget&DeviceNum=3&serviceId=urn:upnp-org:serviceId:SwitchPower1&Variable=Status";
//
// 	request({url:url}, function (error, response, body) {
// 		if (!error && response.statusCode == 200) {
// 			console.log("body: " + body); // Show the HTML for the Modulus homepage.
// 	    alarm_status = body;
// 			console.log("alarm_status: " + alarm_status);
// 	    alarm_status = parseInt(alarm_status);
//
// 			// The value property of SecuritySystemTargetState must be one of the following:
// 			//Characteristic.SecuritySystemTargetState.STAY_ARM = 0;
// 			//Characteristic.SecuritySystemTargetState.AWAY_ARM = 1;
// 			//Characteristic.SecuritySystemTargetState.NIGHT_ARM = 2;
// 			//Characteristic.SecuritySystemTargetState.DISARM = 3;
//
// 			//TODO: Remove when virtual is not just on/off
// 			if (alarm_status == 0){
// 				alarm_status = 3;
// 			}
//
// 			switch(alarm_status) {
//
// 	      case 0:
// 	      console.log("System is STAY armed");
// 	      callback(Characteristic.SecuritySystemCurrentState.STAY_ARM);
// 	      break;
//
// 	      case 1:
// 	      console.log("System is AWAY armed");
// 	      callback(Characteristic.SecuritySystemCurrentState.AWAY_ARM);
// 	      break;
//
// 	      case 2:
// 	      console.log("System is NIGHT armed");
// 	      callback(Characteristic.SecuritySystemCurrentState.NIGHT_ARM);
// 	      break;
//
// 	      case 3:
// 	      console.log("System is DISARMED");
// 	      callback(Characteristic.SecuritySystemCurrentState.DISARM);
// 	      break;
//
// 	      default:
// 				console.log("FAILED RESPONSE: " + error);
// 			  callback(undefined);
// 	      //this.log("Unknown arm state: %s", JSON.stringify(alarm_status));
// 	      //callback(new Error("Could not determine state of alarm"));
// 	      break;
// 	    }
//
// 			//callback(alarm_status);
// 	 }
// 	 else {
// 		console.log("FAILED RESPONSE: " + error);
// 	  callback(undefined);
// 	 }
// 	});
// },//fetchHTTPWithCallback
//
// performWithStatus: function (callback) {
// 	/*//ORIGINAL code
// 	if(this.needsUpdate(this.cache_timeout)) {
//     //this.log("Using direct poll for status update");
//     this.fetchStatusWithCallback(callback);
//   }
//   else {
//     // this.log("Using cached data for status update");
//     callback(this.last_update_dict);
//   }*/
//
//
// 	//My code
// 	this.fetchHTTPWithCallback(callback);
//
// }//performWithStatus
