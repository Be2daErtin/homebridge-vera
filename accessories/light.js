//Version 2016_1031.0
var Service, Characteristic, communicationError;
var http = require('http');

module.exports = function (oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return VeraLight;
};
module.exports.VeraLight = VeraLight;

function VeraLight(log, data, client) {
  // device info
  this.domain = "light"
  this.data = data
  this.id = data.id
  this.name = data.name
  this.category = data.category
  this.client = client
  this.log = log;
}

VeraLight.prototype = {
  identify: function(callback){
    this.log("-------------------------------------------------------------");
		this.log("Identified " + this.name + " as VeraID: " + this.id);
		this.log("-------------------------------------------------------------");
    callback(null)
  },
  getPowerState: function(callback){
		this.log("Get PowerState: " + this.name + "(" + this.id + ") Category: " + this.category);
    this.client.queryDevice(this.id, 'onoff', function(data){
      //TODO: data not reported correctly
      if ((data == '0') || (data == '1')) {
        callback(null, data)
      }
      else{
        callback(communicationError)
      }
    }.bind(this))
  },
  setPowerState: function(powerOn, callback) {
    var that = this;
    if (powerOn) {
  		this.log("Set PowerState: " + this.name + "(" + this.id + "): ON");
      this.client.setDevice(this.id, 'turnOn', 100 ,function(data){
        if (data) {
          that.log("Successfully set power state on the '"+that.name+"' to on");
          callback()
        }else{
          callback(communicationError)
        }
      }.bind(this))
    }else{
  		this.log("Set PowerState: " + this.name + "(" + this.id + "): OFF");
      this.client.setDevice(this.id, 'turnOff', 0, function(data){
        if (data) {
          that.log("Successfully set power state on the '"+that.name+"' to off");
          callback()
        }else{
          callback(communicationError)
        }
      }.bind(this))
    }
  },
  getServices: function() {
    var lightbulbService = new Service.Lightbulb();
    var informationService = new Service.AccessoryInformation();

    //TODO: Set serial number
    informationService
      .setCharacteristic(Characteristic.Manufacturer, "Vera Device")
      .setCharacteristic(Characteristic.Model, "Light")
      .setCharacteristic(Characteristic.SerialNumber, "Vera Device id: " + this.id);

    lightbulbService
      .getCharacteristic(Characteristic.On)
      .on('get', this.getPowerState.bind(this))
      .on('set', this.setPowerState.bind(this));

      // setInterval(function() {
      //      lightbulbService.getCharacteristic(Characteristic.On).getValue()
      // }, 5000);

      //Lets define a port we want to listen to
      const PORT=9000 + this.id;

      console.log(PORT);

      //We need a function which handles requests and send response
      function handleRequest(request, response){
          response.end('It Works!! Path Hit: ' + request.url);
          console.log('Server request received: ' + PORT);
          lightbulbService.getCharacteristic(Characteristic.On).getValue();
      }

      //Create a server
      var server = http.createServer(handleRequest);

      //Lets start our server
      server.listen(PORT, function(){
          //Callback triggered when server is successfully listening. Hurray!
          console.log("Server listening on: http://localhost:%s", PORT);

          //cVeraLight.getCharacteristic(Characteristic.On).getValue();
      });

    return [informationService, lightbulbService];
  }

}
