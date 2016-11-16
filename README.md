# homebridge-Vera
Vera plugin for homebridge

This plugin is created to connect Vera to your homekit using homebridge by nfarina. (https://github.com/nfarina/homebridge)

#Supported Features
The following features are supported (Using Vera UI7):

Vera Device categories:
* 2 - Dimmers
* 3 - Switches
* 4 - Motion Sensor
* 16 - Humidity Sensor
* 17 - Temperature Sensor
* 18 - Light Sensor
* 22 - Security Panel (Using my plugin found here)
* RGBW removed as I couldn't test it

Other Features
* When devices are triggered by the vera and not homekit, the status of the device will change. See Vera setup below.
* Ignore devices that you do not want to add to HomeKit. See Configuration below
* Display Vera ID's of the devices in HomeKit

#Installation
##Work in progress (Using OsX as an example)

Step 1: Install HomeBridge  
$ sudo npm install -g homebridge  

Step 2: Run HomeBridge  
$ homebridge  
You should see the following message (if no plugins are installed)  
No plugins found. See the README for information on installing plugins.  
Couldn't find a config.json file at '/Users/<User>/.homebridge/config.json'. Look at config-sample.json for examples of how to format your config.js and add your home accessories.  

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

#Known Issues
The Aeon sensor seems to be only partially supported. This could be due to functionality issues on the front-end apps.
