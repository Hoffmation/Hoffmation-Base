# Changelog

<!--
  Placeholder for the next version (at the beginning of the line):
  ## **WORK IN PROGRESS**
-->

## **WORK IN PROGRESS**

* (theimo1221) Fix ac-device manual block handling

## 1.0.0 (2022-07-14)

It is time for a new Major release, as the amount of added functionality grew quite high. Following Changenotes are an
extract of all the patches since V0.1.20...

* (theimo1221) AC Device Handling (currently only Daikin)
* (theimo1221) Basic Router Handling (currently only Asus)
* (theimo1221) Improve Device List for "special" devices
* (theimo1221) Settings for Default Button Callbacks
* (theimo1221) Support for "Ambient Lightning"
* (theimo1221) Options for "Seasonal Heating"
* (theimo1221) Shutter Timeoffset based on cloudiness
* (theimo1221) Block vibration alarm by motion
* (theimo1221) New zigbee devices
* (theimo1221) Energymanager to properly use excess energy and monitor
* (theimo1221) Postgresql as alternative to mongoDB
* (theimo1221) Improve motion sensor handling
* (theimo1221) Device Cluster in Rooms
* (theimo1221) Implement basic API capabillities
* (theimo1221) Flatten hierachy and nesting
* (theimo1221) Extract Express to Hoffmation-Express
* (theimo1221) Remove Meteor
* much more

## 0.1.42-alpha.9 (2022-07-14)

* (theimo1221) Add Ac Modes
* (theimo1221) Update packages

## 0.1.42-alpha.8 (2022-07-14)

* (theimo1221) Implement Router
* (theimo1221) Add Network reconnect to daikin device

## 0.1.42-alpha.7 (2022-07-12)

* (theimo1221) Fix issue with conflicting daikin and Sonos device names

## 0.1.42-alpha.6 (2022-07-12)

* (theimo1221) Prevent infinity loop on daikin reconnect
* (theimo1221) Add log messages to find an awkward bug with AC Group dev.turnOn not being a function

## 0.1.42-alpha.5 (2022-07-12)

* (theimo1221) Minor Fix in Tastergroup

## 0.1.42-alpha.4 (2022-07-12)

* (theimo1221) Ac Device as superclass from OwnDaikinDevice
* (theimo1221) Add Roomsetting for default button callbacks

## 0.1.42-alpha.3 (2022-07-12)

* (theimo1221) Try reconnect unreachable Daikin Devices
* (theimo1221) Allow manual deactivating of DainkinAC

## 0.1.42-alpha.2 (2022-07-09)

* (theimo1221) Fix release Script

## 0.1.42-alpha.1 (2022-07-09)

* (theimo1221) Update Packages
* (theimo1221) Improve npm release scripts

## 0.1.42-alpha.0 (2022-07-09)

* (theimo1221): Add ExcessEnergyConsumer Handling for Daikin AC
