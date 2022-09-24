# Changelog

<!--
  Placeholder for the next version (at the beginning of the line):
  ## **WORK IN PROGRESS**
  * (theimo1221) Update packages
-->
## 1.1.26 (2022-09-24)

* (theimo1221) Update packages
* (theimo1221) Improve spare energy usage, by allow 1 degree overshoot of ac.

## 1.1.25 (2022-09-22)

* (theimo1221) Improve ac heating by removing -/+1 when the turn on threshold was reached before

## 1.1.24 (2022-09-19)

* (theimo1221) Fix AC Heating by allowing turn off after target is reached

## 1.1.23 (2022-09-18)

* (theimo1221) Reduce Excess Energy turnoff warning if ac heating is permitted
* (theimo1221) Improve daikin heating/cooling capability by using bigger temp range

## 1.1.22 (2022-09-18)

* (theimo1221) Fix weird time light bug between sunrise and daylight in combination with shutter still down

## 1.1.21 (2022-09-18)

* (theimo1221) Use Room Temp variable within ac devices

## 1.1.20 (2022-09-17)

* (theimo1221) Zigbee IlluLedRGBCCT as Dimmable Lamp

## 1.1.19 (2022-09-17)

* (theimo1221) Fix Room Temperature naming

## 1.1.18 (2022-09-17)

* (theimo1221) Allow AC Heating

## 1.1.17 (2022-09-14)

* (theimo1221) Include season Turnoff in heater persistence

## 1.1.16 (2022-09-14)

* (theimo1221) Update packages

## 1.1.15 (2022-09-14)

* (theimo1221) Update packages

## 1.1.14 (2022-09-14)

* (theimo1221) Fix Temperature Persistence

## 1.1.13 (2022-09-14)

* (theimo1221) Fix Temperature Persistence

## 1.1.12 (2022-09-14)

* (theimo1221) Fix Heater Persistence

## 1.1.11 (2022-09-14)

* (theimo1221) Fix Persistence

## 1.1.10 (2022-09-14)

* (theimo1221) Add persistence for Temperature Sensors
* (theimo1221) Add persistence for Heater

## 1.1.9 (2022-09-12)

* (theimo1221) Prevent fast switching on ac by separating start and endpoint for cooling by atleast 1°C

## 1.1.8 (2022-09-11)

* (theimo1221) Fix type from motionSensorTOdayCount Load

## 1.1.7 (2022-09-11)

* (theimo1221) Fix mistake in Position restore

## 1.1.6 (2022-09-11)

* (theimo1221) Rename "Fenster" to window
* (theimo1221) Persist desired Shutter position
* (theimo1221) Load desired Shutter position on startup
* (theimo1221) Don't persist -1 values for shutter

## 1.1.5 (2022-09-10)

* (theimo1221) Log More Actuators

## 1.1.4 (2022-09-10)

* (theimo1221) Prevent Duplicate logging for Buttons

## 1.1.3 (2022-09-10)

* (theimo1221) Wled as iDimmable Lamp
* (theimo1221) Persist Button Presses
* (theimo1221) Persist Shutter Data

## 1.1.2 (2022-09-10)

* (theimo1221) Persist all actuator

## 1.1.1 (2022-09-09)

* (theimo1221) Fix Device Info persistence

## 1.1.0 (2022-09-09)

* (theimo1221) Log Device Info to db

## 1.0.67 (2022-09-09)

* (theimo1221) Prevent double persisting on brightness and lamp change

## 1.0.66 (2022-09-09)

* (theimo1221) Attempt to fixed undefined for lamp value

## 1.0.65 (2022-09-09)

* (theimo1221) Remove Daily Movement Count
* (theimo1221) Add Lamp Persistence

## 1.0.64 (2022-09-09)

* (theimo1221) Remove Mongo
* (theimo1221) Refactor Today Count logic
* (theimo1221) HmIpPräsenz ebenfalls als MotionSensor

## 1.0.63 (2022-09-09)

* (theimo1221) Ac Persist Room Temperature

## 1.0.62 (2022-09-08)

* (theimo1221) More precise window info
* (theimo1221) Fix AC Persisting

## 1.0.61 (2022-09-08)

* (theimo1221) Update packages
* (theimo1221) Persist any AC Changes
* (theimo1221) Log manual energyConsumer without spare energy

## 1.0.61-alpha.8 (2022-08-28)

* (theimo1221) Fix error in outdated detection

## 1.0.61-alpha.7 (2022-08-28)

* (theimo1221) Fix device overwrite

## 1.0.61-alpha.6 (2022-08-28)

* (theimo1221) Fix missing update of distance map

## 1.0.61-alpha.5 (2022-08-28)

* (theimo1221) Add possibility to monitor specific devices
* (theimo1221) Refactor iBaseDevice to allow roomless devices

## 1.0.61-alpha.4 (2022-08-28)

* (theimo1221) Respect configured Device Names

## 1.0.61-alpha.3 (2022-08-28)

* (theimo1221) Add possibility to limit age of last proximity update

## 1.0.61-alpha.2 (2022-08-28)

* (theimo1221) Make Espresense Device announce itself to coordinator instead

## 1.0.61-alpha.1 (2022-08-28)

* (theimo1221) Espresense implementation

## 1.0.60 (2022-08-21)

* (theimo1221) Fix issue with temperature 0 being used with Zigbee Heater
* (theimo1221) Remove unnecessary packages
* (theimo1221) Reset LocalDiff on bootup with euroheater
* (theimo1221) Correct Euro Heater local temperature measurement

## 1.0.59 (2022-08-21)

* (theimo1221)  Fix import resolve

## 1.0.58 (2022-08-21)

* (theimo1221) Fix Liquid PID Import

## 1.0.57 (2022-08-21)

* (theimo1221) Limit EuroHeater checkTempDiff Interval
* (theimo1221) Add first implementation of PID controlled Heater
* (theimo1221) Update packages

## 1.0.56 (2022-08-21)

* (theimo1221) blitzshp as actuator

## 1.0.55 (2022-08-21)

* (theimo1221) Bugfix: Temporary prevent infinity loop

## 1.0.54 (2022-08-21)

* (theimo1221) Bugfix: HmIp Device Battery percentage calculation

## 1.0.53 (2022-08-20)

* (theimo1221) Fix some weird issue with undefined target temp in dbo

## 1.0.52 (2022-08-20)

* (theimo1221) Fix stateMap for HmIp Devices
* (theimo1221) Add some more docu

## 1.0.51 (2022-08-20)

* (theimo1221) Allow access to all ioBroker States (even unhandled)
* (theimo1221) Allow cb assignment to any iobrokerdevice state
* (theimo1221) Bugfix: Motionsensors without dbo
* (theimo1221) Add Postgres query debugging

## 1.0.50 (2022-08-20)

* (theimo1221) Update packages

## 1.0.49 (2022-08-20)

* (theimo1221) Add Device Capability batteryDriven

## 1.0.48 (2022-08-15)

* (theimo1221) Expose button states and callbacks to JSON Api

## 1.0.47 (2022-08-14)

* (theimo1221) Correctly add HandleSensorCapability
* (theimo1221) Expose iSpeaker.speakOnDevice in api

## 1.0.46 (2022-08-13)

* (theimo1221) Expose shutter position control in API

## 1.0.45 (2022-08-13)

* (theimo1221) Update packages
* (theimo1221) Rename deviceCapability

## 1.0.44 (2022-08-13)

* (theimo1221) #450 Implement iActuator
* (theimo1221) #450 Implement iDimmer
* (theimo1221) #450 Implement iHandle

## 1.0.43 (2022-08-13)

* (theimo1221) #450 Add Device Capabilities

## 1.0.42 (2022-08-13)

* (theimo1221) Fix error in setAc api Call
* (theimo1221) Fix Sonos identification

## 1.0.41 (2022-08-12)

* (theimo1221) Make Ac Api Calls rely on id

## 1.0.40 (2022-08-12)

* (theimo1221) Include AC on state in JSON response

## 1.0.39 (2022-08-12)

* (theimo1221) Better Naming for Ac Devices
* (theimo1221) Include Sonos Devices in devices.allDevices

## 1.0.38 (2022-08-12)

* (theimo1221) Fix ac-device to include _info in api response

## 1.0.37 (2022-08-12)

* (theimo1221) Refactor Device Info to allow AC Devices be included in normal Devices.allDevices

## 1.0.36 (2022-08-12)

* (theimo1221) Fix Api problems for hoffmation ios

## 1.0.35 (2022-08-11)

* (theimo1221) Update packages
* (theimo1221) Ignore Rollo Heatreduction close to sunset

## 1.0.34 (2022-08-08)

* (theimo1221) Fix Date Issue in new JSON logic

## 1.0.33 (2022-08-08)

* (theimo1221) Improve JSON Filter Handling for maps

## 1.0.32 (2022-08-08)

* (theimo1221) Harden Devices against Circular JSON

## 1.0.31 (2022-08-07)

* (theimo1221) Harden Rooms against Circular JSON

## 1.0.30 (2022-08-02)

* (theimo1221) Improve WeatherRolloPosition calculation

## 1.0.29 (2022-08-02)

* (theimo1221) #435 Add EuroHeating
* (theimo1221) Update packages

## 1.0.28 (2022-08-02)

* (theimo1221) Fix open Handle in Tests

## 1.0.27 (2022-07-31)

* (theimo1221) Debugging Messages for Wled

## 1.0.26 (2022-07-31)

* (theimo1221) Prevent duplicate room adding for wled
* (theimo1221) Dont set brightness and preset the same time

## 1.0.25 (2022-07-31)

* (theimo1221) Wled Device Handling

## 1.0.24 (2022-07-31)

* (theimo1221) Update packages
* (theimo1221) Fix Circular Issue in Button for getDevices

## 1.0.23 (2022-07-29)

* (theimo1221) Fix Daikin useGetToPost on reconnect

## 1.0.22 (2022-07-26)

* (theimo1221) Update packages
* (theimo1221) Use new daikin functionality

## 1.0.21 (2022-07-26)

* (theimo1221) Fix mistake in direction logic

## 1.0.20 (2022-07-26)

* (theimo1221) Add unit tests and fix issue in degree check

## 1.0.19 (2022-07-26)

* (theimo1221) Add SunDirection to rollo position check

## 1.0.18 (2022-07-26)

* (theimo1221) Fix this context in basegroup logging
* (theimo1221) Fix logging in weather service
* (theimo1221) Reduce Daikin Logging in success case
* (theimo1221) Fix daikin debug output

## 1.0.17 (2022-07-24)

* (theimo1221) Fix Sonoff Temp and general temperature typo

## 1.0.16 (2022-07-24)

* (theimo1221) Use Heatgroups for check_temp
* (theimo1221) Generalize owndaikidevices

## 1.0.15 (2022-07-24)

* (theimo1221) Move AcDevice into heatGroup

## 1.0.14 (2022-07-23)

* (theimo1221) Add temperature threshhold for AC activation

## 1.0.13 (2022-07-23)

* (theimo1221) Increase AC Logging to spot Param NG issue

## 1.0.12 (2022-07-23)

* (theimo1221) Reduce Logging in Fenster regarding shutter change
* (theimo1221) Increase Error Level on Daikin Problems
* (theimo1221) Reduce Logging on handle Sunrise Off
* (theimo1221) Log to find client requesting falty files

## 1.0.11 (2022-07-23)

* (theimo1221) Add Debug Message for news download

## 1.0.10 (2022-07-21)

* (theimo1221) Update packages
* (theimo1221) Add proper Logout in Asus Router calls
* (theimo1221) Add option to forbid automatic AC before/after certain time

## 1.0.9 (2022-07-19)

* (theimo1221) Update dependencies
* (theimo1221) Prevent issue, where 1 disconnected AC could halt the whole system

## 1.0.8 (2022-07-17)

* (theimo1221) Fix Error resulting in no device messages being logged

## 1.0.7 (2022-07-16)

* (theimo1221) Reduce Logging, by making verbosity of certain debug messages configurable

## 1.0.6 (2022-07-16)

* (theimo1221) Add Ac Options To Api
* (theimo1221) Extend JSON Filter
* (theimo1221) Allow Lamp changing options to Api

## 1.0.5 (2022-07-16)

* (theimo1221) Telegram Bot should respond in the chat he recieved the message, not directly to that person

## 1.0.4 (2022-07-16)

* (theimo1221) First try resolving "Param NG" from Daikin Device
* (theimo1221) Add option to change Ac Mode without writing to device

## 1.0.3 (2022-07-15)

* (theimo1221) Update Asus API to prevent crashes on getClientList failure

## 1.0.2 (2022-07-15)

* (theimo1221) AC Shutdown via Telegram should also block automatic turn on, for some time

## 1.0.1 (2022-07-15)

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
