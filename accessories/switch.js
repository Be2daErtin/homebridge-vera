var Service, Characteristic, communicationError;

module.exports = function (oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return VeraSwitch;
};
module.exports.VeraSwitch = VeraSwitch;

function VeraSwitch(log, data, client) {
  // device info
  this.domain = "switch"
  this.data = data
  this.id = data.id
  this.name = data.name
  this.category = data.category
  this.client = client
  this.log = log;
}

VeraSwitch.prototype = {
  identify: function(callback){
    this.log("-------------------------------------------------------------");
		this.log("Identified: " + this.id + " as " + this.name);
		this.log("-------------------------------------------------------------");
    callbac(null)
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
    var switchService = new Service.Switch();
    var informationService = new Service.AccessoryInformation();

    informationService
      .setCharacteristic(Characteristic.Manufacturer, "Vera Device")
      .setCharacteristic(Characteristic.Model, "Switch")
      .setCharacteristic(Characteristic.SerialNumber, "xxx");

    switchService
      .getCharacteristic(Characteristic.On)
      .on('get', this.getPowerState.bind(this))
      .on('set', this.setPowerState.bind(this));

    return [informationService, switchService];
  }

}
