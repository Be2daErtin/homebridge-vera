//Version: 2016_0515.0
var Service, Characteristic, communicationError;

module.exports = function (oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return VeraSecurity;
};
module.exports.VeraSecurity = VeraSecurity;

function VeraSecurity(log, data, client) {
  // device info
  this.domain = "light"
  this.data = data
  this.id = data.id
  this.name = data.name
  this.category = data.category
  this.client = client
  this.log = log;
}

VeraSecurity.prototype = {
  identify: function(callback){
    this.log("-------------------------------------------------------------");
		this.log("Identified " + this.name + " as VeraID: " + this.id);
		this.log("-------------------------------------------------------------");
    callback(null)
  },
  getSecurityState: function(callback){
		this.log("Get Security State: " + this.name + "(" + this.id + ") Category: " + this.category);
    this.client.queryDevice(this.id, 'securitystate', function(data){
      //TODO: data not reported correctly
      // The value property of SecuritySystemTargetState must be one of the following:
			//Characteristic.SecuritySystemTargetState.STAY_ARM = 0;
			//Characteristic.SecuritySystemTargetState.AWAY_ARM = 1;
			//Characteristic.SecuritySystemTargetState.NIGHT_ARM = 2;
			//Characteristic.SecuritySystemTargetState.DISARM = 3;
      if (data == 0){
        data = 3 //disarm
      }
      else if (data == 25){
        //night arm
        data = 2 //night arm
      }
      else if (data == 50){
        data = 1//away arm
      }
      else if (data == 75){
        data = 0//stay arm
      }


      if (data < 4) {
        callback(null, data)
      }
      else{
        callback(communicationError)
      }
    }.bind(this))
  },
  setSecurityState: function(value, callback) {
    var that = this;
    var armType = null;
    this.log("Set SecurityState: " + this.name + " (" + this.id + "): " + value);

    if (value == 0){
      armType = 'StayArm'
    }
    else if (value == 1){
      armType = 'AwayArm'

    }
    else if (value == 2){
      armType = 'NightArm'
    }
    else if (value == 3){
      armType = 'Disarm'
    }
    else {
      this.log.error("Don't know how to convert: " + value)
      callback(communicationError)
      return
    }

    this.client.setDevice(this.id, 'securityset', armType ,function(data){
      if (data) {
        this.log("Security set")
        callback()
      }else{
        callback(communicationError)
      }
    }.bind(this))


  },
  getServices: function() {
    var securityService = new Service.SecuritySystem();
    var informationService = new Service.AccessoryInformation();

    //TODO: Set serial number
    informationService
      .setCharacteristic(Characteristic.Manufacturer, "Vera Device")
      .setCharacteristic(Characteristic.Model, "Security System")
      .setCharacteristic(Characteristic.SerialNumber, "Vera Device id:");

    securityService
      .getCharacteristic(Characteristic.SecuritySystemCurrentState)
      .on('get', this.getSecurityState.bind(this));

    securityService
      .getCharacteristic(Characteristic.SecuritySystemTargetState)
      .on('get', this.getSecurityState.bind(this))
      .on('set', this.setSecurityState.bind(this));


    setInterval(function() {
      securityService.getCharacteristic(Characteristic.SecuritySystemCurrentState).getValue()
      securityService.getCharacteristic(Characteristic.SecuritySystemTargetState).getValue()

    }, 5000);

    return [informationService, securityService];
  }

}
