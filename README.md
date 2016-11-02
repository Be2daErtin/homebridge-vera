# homebridge-Vera
Vera plugin for homebridge

This plugin is created to connect Vera to your homekit using homebridge by nfarina. (https://github.com/nfarina/homebridge)


#Installation
##Working progress (Using OsX as an example)

Step 1: Install HomeBridge  
$ sudo npm install -g homebridge  

Step 2: Run HomeBridge  
$ homebridge  
You should see the following message (if no plugins are installed)  
No plugins found. See the README for information on installing plugins.  
Couldn't find a config.json file at '/Users/bertinjacobs/.homebridge/config.json'. Look at config-sample.json for examples of how to format your config.js and add your home accessories.  

#Configuration
Edit the config.json file by adding the IP of your Vera.
The plugin has the ability to ignore certain device ID's. Just add these ID's as shown in the sample-config.json file.

#Vera setup
This plugin will update the devices in the homekit app by creating an http server for each discovered device.

Step 1: Create a Scene on Vera
Create a scene to be triggered when a device turns on AND off.
You'll need to create a scene for every discovered device (Working on a fix for this)

Step 2: Paste this code in LUUP Code to be executed:

function HTTPGet(URL)
     local status, result = luup.inet.wget(URL, 3)
end

HTTPGet('http://192.168.1.20:9039')

NOTE: Change the above port for your device.
The port is calculated by 9000 + vera device id.

#Supported Devices
The following devices have been tested:

* VeraLite UI7 (Although it shoud work on Vera3 and VeraEdge)
* Fibaro Dimmer (Removed for now)
* Fibaro Dimmer 2 (Removed for now)
* Fibaro RGBW (Yes! It has a colour wheel) (Removed for now)
* Aeon Gen5 6-in-1 Sensor
* Security Alarm integration (Requires Vera Plugin)

#Known Issues
The Aeon sensor seems to be only partially supported. This could be due to functionality issues on the front-end apps.
