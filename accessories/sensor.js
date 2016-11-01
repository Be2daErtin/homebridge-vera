//Version: 2016_0515.0
var Service, Characteristic, communicationError;
var http = require('http');

module.exports = function (oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return VeraSensor;
};
module.exports.VeraSensor = VeraSensor;

function VeraSensor(log, data, client, type) {
  // device info
  this.domain = type || "sensor"
  this.data = data
  this.id = data.id
  this.name = data.name
  this.category = data.category
  this.client = client
  this.log = log;
}

VeraSensor.prototype = {
  identify: function(callback){
    this.log("-------------------------------------------------------------");
		this.log("Identified " + this.name + " as VeraID: " + this.id);
		this.log("-------------------------------------------------------------");
    callback()
  },
  getBattery: function(callback){
    this.log("Get Low Battery Status: " + this.name + "(" + this.id + ") Category: " + this.category);
    this.client.queryDevice(this.id, 'batterylow', function(data){
      //TODO: data not reported correctly
     if (data == null){
       data = '9999'
     }
      if (data < '1000') {
        //powerState = data.state == 'on'
        if (data <= 10) {
          data = 1
        }
        else{
          data = 0
        }
        callback(null, data)
      }
      else{
        data = 99
        callback(communicationError, data)
      }
    }.bind(this))
  },
  getMotion: function(callback){
		this.log("Get Motion: " + this.name + "(" + this.id + ") Category: " + this.category);
    this.client.queryDevice(this.id, 'motion', function(data){
      //TODO: data not reported correctly
      if ((data == 1) || (data == 0)) {
        callback(null, data)
      }
      else{
        callback(communicationError)
      }
    }.bind(this))
  },
  getTemperature: function(callback){
		this.log("Get Temperature: " + this.name + "(" + this.id + ") Category: " + this.category);
    this.client.queryDevice(this.id, 'temperature', function(data){
      //TODO: data not reported correctly
      if (data < '100') {
        callback(null, data)
      }
      else{
        callback(communicationError)
      }
    }.bind(this))
  },
  getHumidity: function(callback){
		this.log("Get Humidity: " + this.name + "(" + this.id + ") Category: " + this.category);
    this.client.queryDevice(this.id, 'humidity', function(data){
      //TODO: data not reported correctly
      if (data < '1000') {
        callback(null, data)
      }
      else{
        callback(communicationError)
      }
    }.bind(this))
  },
  getLux: function(callback){
		this.log("Get Lux: " + this.name + "(" + this.id + ") Category: " + this.category);
    this.client.queryDevice(this.id, 'lux', function(data){
      //TODO: data not reported correctly
      if (data < '1000') {
        data = data + 0.01
        callback(null, data)
      }
      else{
        callback(communicationError)
      }
    }.bind(this))
  },
  getServices: function() {
    var informationService = new Service.AccessoryInformation();
    var model

    //TODO: Add support for UV sensor.
    switch (this.domain) {
      case "Motion":
        model = "Motion Sensor"
        var sensorService = new Service.MotionSensor();
        break;
      case "Temperature":
        model = "Temperature Sensor"
        var sensorService = new Service.TemperatureSensor();
        break;
      case "Humidity":
        model = "Humidity Sensor"
        var sensorService = new Service.HumiditySensor();
        break;
      case "Lux":
        model = "Light Sensor"
        var sensorService = new Service.LightSensor();
        break;
      default:
        model = "Sensor"
    }

    informationService
      .setCharacteristic(Characteristic.Manufacturer, "Vera Device")
      .setCharacteristic(Characteristic.Model, model)
      .setCharacteristic(Characteristic.SerialNumber, "Vera Device id: " + this.id);

      if (this.domain == 'Motion') {
          sensorService
            .getCharacteristic(Characteristic.MotionDetected)
            .on('get', this.getMotion.bind(this))
          sensorService
            .getCharacteristic(Characteristic.StatusLowBattery)
            .on('get', this.getBattery.bind(this))

      }
      else if (this.domain == 'Temperature') {
        sensorService
          .getCharacteristic(Characteristic.CurrentTemperature)
          .on('get', this.getTemperature.bind(this))

      }
      else if (this.domain == 'Humidity') {
        sensorService
          .getCharacteristic(Characteristic.CurrentRelativeHumidity)
          .on('get', this.getHumidity.bind(this))

      }
    else if (this.domain == 'Lux') {
        sensorService
          .getCharacteristic(Characteristic.CurrentAmbientLightLevel)
          .on('get', this.getLux.bind(this))

      }
      else{
        console.log("Nothing")
      }

      //Lets define a port we want to listen to
      const PORT=9000 + this.id;

      console.log(PORT);

      //We need a function which handles requests and send response
      function handleRequest(request, response){
          response.end('It Works!! Path Hit: ' + request.url);
          console.log('Server request received: ' + PORT);
          sensorService.getCharacteristic(Characteristic.MotionDetected).getValue();
      }

      //Create a server
      var server = http.createServer(handleRequest);

      //Lets start our server
      server.listen(PORT, function(){
          //Callback triggered when server is successfully listening. Hurray!
          console.log("Server listening on: http://localhost:%s", PORT);

          //cVeraLight.getCharacteristic(Characteristic.On).getValue();
      });


    return [informationService, sensorService];
  }

}
