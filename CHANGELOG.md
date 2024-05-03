# Changelog

<!--
  Placeholder for the next version (at the beginning of the line):
  ## **WORK IN PROGRESS**
  * (theimo1221) Update packages
-->

## **WORK IN PROGRESS**

* (theimo1221) Allow sonos initialization by one known host

## 3.0.0-alpha.51 (2024-05-03)

* (theimo1221) Extend Victron JSON-Data-Output

## 3.0.0-alpha.48 (2024-05-03)

* (theimo1221) Basic AC-Block implementation

## 3.0.0-alpha.47 (2024-05-03)

* (theimo1221) Add Option to disable Dachs-Unreach Telegram spam

## 3.0.0

* (theimo1221) Rework of commands especially with focus on command source and the stacked reason
* (theimo1221) Correct unblock on manual actuator off
* (theimo1221) Update packages
* (theimo1221) Reduce Zigbee bad Connection Logging
* (theimo1221) Change led change action order to improve change speed for e.g. innr led strips
* (theimo1221) TargetAutomaticState might have been wrong, if the automatic action fired before the manual action
  overwrote it.
* (theimo1221) Prevent AC-Device Param-NG in case of not yet calculated desired temperature
* (theimo1221) Fix edge case, where a manual time based toggle would not turn on the device at it would be off by it's
  time settings
* (theimo1221) Fix logic issue in ac-device
* (theimo1221) Add Wled Device Capabilities
* (theimo1221) Actuator "DayOn"-Setting
* (theimo1221) Improve behaviour of Strom-Stoss-Relais to prevent loops.
* (theimo1221) Pull up debounceStateDelay to IoBrokerDevice
* (theimo1221) Fix Order within wled to not turn on with preset selection after turning off
* (theimo1221) Improve IoBrokerDevice set State Error Logging
* (theimo1221) Allow AC "useOwnTemperature" without using Mode.Auto by splitting the settings.
* (theimo1221) Update API-Service to migrate to new Command Structure
* (theimo1221) Highly improve documentation of publicly available properties and functions
* (theimo1221) Prepare a V3 Migration Guide
* (theimo1221) Make the disabling of automatic mode on force actions more configurable
* (theimo1221) Change iCameraDevice to use devices instead of just open handles
* (theimo1221) Fix edge case, where a weather update leading to earlier sunset action (in the past) would not trigger
  the correct callbacks
* (theimo1221) Fix some inconsistent date formatting
* (theimo1221) Reduce duplicate code within zigbee-actuators by introducing proper hierachy of
  classes (`ZigbeeActuator` -> `ZigbeeLamp` -> `ZigbeeDimmer` -> `ZigbeeLedRgbcct`)
* (theimo1221) Add HeatingMode for transitional season
* (theimo1221) Reduce not necessary dimmer change commands
* (theimo1221) Add "actions" so commands starting from a sensor action can be correctly identified/traced (e.g. Motion,
  Temperature, Humidity)
* (theimo1221) Fix Edge Case resulting in shutter not moving down on sunset
* (theimo1221) Don't turn on lamps on shutter down in rooms without motion sensor
* (theimo1221) Improve handling with lifting automatic-block
* (theimo1221) Remove direct GoveeApiDependecy by using new https://github.com/theimo1221/govee-express-api
* (theimo1221) #1091 Add Callback Action to Battery Devices and use it in dachs to turn on bhp on certain level of e.g.
  victron-energy-manager
* (theimo1221) Fix light-turn-on-on-movement during the day

## 2.23.0 (2024-02-25)

* (theimo1221) Update packages
* (theimo1221) Add support for Mac-Address with Daikin devices.

## 2.22.18 (2024-02-21)

* (theimo1221) Harden Daikin reconect

## 2.22.17 (2024-02-12)

* (theimo1221) Unifi: Add option to authorize guest devices by mac address

## 2.22.16 (2024-02-12)

* (theimo1221) Extend unifi Logging

## 2.22.15 (2024-02-12)

* (theimo1221) Reduce json payload from daikin ac devices
* (theimo1221) Add unifi-router

## 2.22.14 (2024-01-26)

* (theimo1221) Further reduce json Payload

## 2.22.13 (2024-01-26)

* (theimo1221) Update packages
* (theimo1221) Reduce json Payload

## 2.22.12 (2024-01-13)

* (theimo1221) Update packages
* (theimo1221) Correct time comparison on motion Sensor guard.

## 2.22.11 (2024-01-06)

* (theimo1221) Prevent negative numbers on brightness state

## 2.22.10 (2024-01-05)

* (theimo1221) Exchange Govee-Lan-Controller

## 2.22.9 (2024-01-05)

* (theimo1221) Extend Logging for all API calls
* (theimo1221) Update packages

## 2.22.8 (2023-12-30)

* (theimo1221) Allow lightgroups to turn on ceiling lights on movement, even if there are LEDs or outlets (new option)

## 2.22.7 (2023-12-30)

* (theimo1221) Minor fix for Tuya
* (theimo1221) Update packages

## 2.22.6 (2023-12-30)

* (theimo1221) Optimizing innr142c handling on color change only
* (theimo1221) Tuya Garage Door was not including invertSensor in TargetState

## 2.22.5 (2023-12-18)

* (theimo1221) Further optimizing timing with zigbee-innr142c

## 2.22.4 (2023-12-18)

* (theimo1221) Reduce direct ioConn set State calls

## 2.22.3 (2023-12-18)

* (theimo1221) Add option to debounce Zigbee Writes on same device

## 2.22.2 (2023-12-18)

* (theimo1221) Zigbee2Mqtt only needs brightness for turn on (prevents FW bug on OFL 142c)

## 2.22.1 (2023-12-18)

* (theimo1221) Optimize Turn-On Handling for ZigbeeInnr142C

## 2.22.0 (2023-12-16)

* (theimo1221) !!Breaking!! Outlets within lightgroups are now on the same level as LEDs, so Hoffmation would turn on
  both on movement
* (theimo1221) Update packages

## 2.21.1 (2023-11-30)

* (theimo1221) Prevent crash in dachs Communication
* (theimo1221) Prevent govee log flooding

## 2.21.0 (2023-11-25)

* (theimo1221) Reduce code duplications on lamp/actuator devices

## 2.20.5 (2023-11-24)

* (theimo1221) Multiple Last Left CB's resulted in some cb's being skipped.

## 2.20.4 (2023-11-23)

* (theimo1221) Govee not restoring persisted settings properly
* (theimo1221) Stabilize movement handling within camera devices

## 2.20.3 (2023-11-22)

* (theimo1221) Don't log base 64 image data

## 2.20.2 (2023-11-22)

* (theimo1221) Extend camera device logging
* (theimo1221) Update packages

## 2.20.1 (2023-11-19)

* (theimo1221) Optimize Battery Usage during nights

* (theimo1221) Add proper capabilities to govee
* (theimo1221) Correct victron limitis in regards to moments after sunset

## 2.20.0-beta.4 (2023-11-19)

* (theimo1221) Correct govee on/off

## 2.20.0-beta.3 (2023-11-19)

* (theimo1221) Exclude external govee device from JSON

## 2.20.0-beta.2 (2023-11-19)

* (theimo1221) Properly export govee

## 2.20.0-beta.1 (2023-11-19)

* (theimo1221) Add govee lights to correct device cluster

## 2.20.0-beta.0 (2023-11-19)

* (theimo1221) Add first support for govee lights

## 2.19.7 (2023-11-15)

* (theimo1221) Update packages
* (theimo1221) Intercept Axios Errors

## 2.19.6 (2023-11-06)

* (theimo1221) Update packages

## 2.19.5 (2023-10-22)

* (theimo1221) Non ambient light didn't got turn-off in last-left callback

## 2.19.4 (2023-10-22)

* (theimo1221) Retrigger publish

## 2.19.3 (2023-10-22)

* (theimo1221) Add option to handle detected dogs for camera devices e.g. to turn on lights.

## 2.19.2 (2023-10-22)

* (theimo1221) Extend dachs to include a heat-storage sensor as well.

## 2.19.1 (2023-10-21)

* (theimo1221) Add 'manualDisabled' to heater settings (parallel to AC-Devices)
* (theimo1221) Update packages

## 2.19.0 (2023-10-21)

* (theimo1221) Enhance stability of ioBroker Devices to correctly have a room.

## 2.18.13 (2023-10-21)

* (theimo1221) Correct shelly TRV target temp handling.

## 2.18.12 (2023-10-21)

* (theimo1221) Correct shelly TRV device update handling

## 2.18.11 (2023-10-20)

* (theimo1221) Correct shelly target temperature state id.

## 2.18.10 (2023-10-20)

* (theimo1221) Use raw value instead of enum

## 2.18.9 (2023-10-20)

* (theimo1221) Ignore substitute initial values from ioBroker

## 2.18.8 (2023-10-20)

* (theimo1221) Heat Group Settings weren't initialized from db on startup.

## 2.18.7 (2023-10-20)

* (theimo1221) Add Fallback Timer to reset movement/person detection for camera devices.

## 2.18.6 (2023-10-20)

* (theimo1221) Add Shelly TRV Minimum Valve handling

## 2.18.5 (2023-10-20)

* (theimo1221) Fix Aqara Opple Mapping

## 2.18.4 (2023-10-20)

* (theimo1221) Fix Zigbee2Mqtt Device state updates

## 2.18.3 (2023-10-20)

* (theimo1221) Update zigbee devices properly

## 2.18.2 (2023-10-20)

* (theimo1221) Fix zigbee2mqtt device id to match legacy device id

## 2.18.1 (2023-10-20)

* (theimo1221) Minor tweaks to heating temperature handling

## 2.18.0 (2023-10-18)

* (theimo1221) Move AutomaticFallbackTemperature to heatGroupSettings

## 2.17.4 (2023-10-18)

* (theimo1221) Add includeInAmbientLight in fromPartialObject back-channel

## 2.17.3 (2023-10-18)

* (theimo1221) Add option to include actuators in ambient light mode

## 2.17.2 (2023-10-14)

* (theimo1221) Exclude otaInfo from any Jsons

## 2.17.1 (2023-10-14)

* (theimo1221) Add Log Message and check to prevent toJson Failure on not maps named map

## 2.17.0 (2023-10-14)

* (theimo1221) Add Tuya device handling
* (theimo1221) Add first Tuya device (Tuya Garage Door Opener)
* (theimo1221) Update packages
* (theimo1221) Add Api function to open/close garage door

## 2.16.2 (2023-10-08)

* (theimo1221) Minor corrections to Shelly Trv State Id's

## 2.16.1 (2023-10-08)

* (theimo1221) Shelly-Trv should respect HeatGroupSetting.automaticMode = false
* (theimo1221) Update packages
* (theimo1221) Add proper handling for ioBroker Devices with some invalid chars within 3rd Id Block

## 2.16.0 (2023-10-08)

* (theimo1221) Add Shelly device handling
* (theimo1221) Add first Shelly Device (Shelly TRV)

## 2.15.10 (2023-10-08)

* (theimo1221) Add option to not send commands to unavailable Zigbee Devices

## 2.15.9 (2023-10-03)

* (theimo1221) Update packages
* (theimo1221) Add missing force Check to last change

## 2.15.8 (2023-10-02)

* (theimo1221) Add flag to detect if a trackedDevice is currently present
* (theimo1221) Add option to fall back to automatic mode after manual turn-on followed by a manual turn-off

## 2.15.7 (2023-10-01)

* (theimo1221) Further extension of Trilateration logging
* (theimo1221) Add vital .5 rounding within trilateration calculation

## 2.15.6 (2023-10-01)

* (theimo1221) Add much more Trilateration Logging

## 2.15.5 (2023-10-01)

* (theimo1221) Fix minor mistake in Trilateration best match calculation

## 2.15.4 (2023-10-01)

* (theimo1221) Add some more logging to TrilaterationPoint.fillMap

## 2.15.3 (2023-10-01)

* (theimo1221) Correct Trilateration Initialization position

## 2.15.2 (2023-10-01)

* (theimo1221) Some more tests and additional logging for trilateration Room Adding

## 2.15.1 (2023-10-01)

* (theimo1221) Correct timing for Trilateration initialize call.

## 2.15.0 (2023-10-01)

* (theimo1221) Add Functions for trilateration and distance calculation
* (theimo1221) Add Trilateration to espresense and detectedBluetoothDevice
* (theimo1221) Register Rooms in Trilateration
* (theimo1221) Initialize Trilateration on startup

## 2.14.1 (2023-09-28)

* (theimo1221) Enforce Group-id in group JSON

## 2.14.0 (2023-09-28)

* (theimo1221) Update packages
* (theimo1221) Rebase Automatic Points into HeatGroup Settings
* (theimo1221) Add target Temperature to HeatGroup Settings and use it for AC-Device as well
* (theimo1221) Allow setting a specific temp for ac device via api

## 2.13.2 (2023-09-24)

* (theimo1221) Correct victron energy manager data persistence

## 2.13.1 (2023-09-24)

* (theimo1221) Add Battery Data to energyCalculation

## 2.13.0 (2023-09-22)

* (theimo1221) Update packages
* (theimo1221) Allow disabling of JsObjectEnergyManager
* (theimo1221) Allow manual disabling of Ac Devices for some time

## 2.12.4 (2023-09-07)

* (theimo1221) Ac Device, sometimes doesn't turn off, when someone enters the room
* (theimo1221) Extend Victron DB persistence

## 2.12.3 (2023-09-06)

* (theimo1221) Minor fixes for Ac Device

## 2.12.2 (2023-09-06)

* (theimo1221) Improve handling of inactive motion sensors

## 2.12.1 (2023-09-05)

* (theimo1221) Extend json Filter for AC Device

## 2.12.0 (2023-09-05)

* (theimo1221) Update packages
* (theimo1221) Extend AC setting, to disable cooling on person being present.

## 2.11.4 (2023-09-03)

* (theimo1221) HmIpLampe as iTemporaryDisableAutomatic
* (theimo1221) Update packages

## 2.11.3 (2023-08-31)

* (theimo1221) Correctly Catch Axios Error

## 2.11.2 (2023-08-26)

* (theimo1221) Fix dachs starting capability
* (theimo1221) Update packages
* (theimo1221) Globally add warm Water Sensor from Dachs

## 2.11.1 (2023-08-25)

* (theimo1221) Dachs as iActuator
* (theimo1221) Warm Water temperature from Dachs

## 2.11.0 (2023-08-24)

* (theimo1221) Basic Dachs implementation (connecting to device and storing to influxdb)

## 2.10.5 (2023-08-21)

* (theimo1221) Prevent ambient Light being turned off after movement callback

## 2.10.4 (2023-08-20)

* (theimo1221) Extend Camera Settings
* (theimo1221) Correct issue, where a movement could turn-off LEDs even if they were blocked
* (theimo1221) Correct issue, where due to some handle open beeing missed, the handle open count was negative.

## 2.10.3 (2023-08-11)

* (theimo1221) Add Rtsp Stream Link

## 2.10.2 (2023-08-08)

* (theimo1221) Add BlockAutomaticHandler to zigbeeDimmer and it's children
* (theimo1221) Update packages

## 2.10.1 (2023-07-17)

* (theimo1221) Fix Innr142C Export

## 2.10.0 (2023-07-17)

* (theimo1221) Update packages
* (theimo1221) Add support for Innr142C LED strip

## 2.9.18 (2023-06-18)

* (theimo1221) Allow Settings Load CB
* (theimo1221) Update packages

## 2.9.17 (2023-06-17)

* (theimo1221) Ubisys Actuator as a load-meter

## 2.9.16 (2023-06-16)

* (theimo1221) Add missing Device capability
* (theimo1221) Ubisys Aufnahme finalisieren

## 2.9.15 (2023-06-15)

* (theimo1221) Aufnahme von Ubisys Geräten
* (theimo1221) Update packages

## 2.9.14 (2023-06-10)

* (theimo1221) Fix settings change for shutter (as it currently ignores changes to heatReductionPosition)
* (theimo1221) Update packages

## 2.9.13 (2023-06-06)

* (theimo1221) Add default value for window direction

## 2.9.12 (2023-06-06)

* (theimo1221) Move direction setting from Window to the Shutter, to prevent group-settings need
* (theimo1221) Make heat reduction position controllable

## 2.9.11 (2023-06-05)

* (theimo1221) Deep Omit should compare case insensetive in regards to keys to omit

## 2.9.10 (2023-06-05)

* (theimo1221) Include complete path in warning

## 2.9.9 (2023-06-05)

* (theimo1221) Minor improvement to api-calls for setShutter
* (theimo1221) Update packages
* (theimo1221) Remove noShutterOnSunrise from window group (not needed anymore due to room settings)
* (theimo1221) Add possibility to simulate a button press via api
* (theimo1221) Add logging for recursive JSON error

## 2.9.8 (2023-05-23)

* (theimo1221) Setting shutter position via api got overriden by window positioning

## 2.9.7 (2023-05-13)

* (theimo1221) Fix workflow error

## 2.9.6 (2023-05-13)

* (theimo1221) Republish for Workflow trigger

## 2.9.5 (2023-05-13)

* (theimo1221) RepublishÏ

## 2.9.4 (2023-05-13)

* Include missing Device Capability for Ac Device

## 2.9.3 (2023-05-13)

* (theimo1221) Use normal blockAutomation Handling on AC-Devices

## 2.9.2 (2023-05-13)

* (theimo1221) Ac Cooling had no turn on anymore

## 2.9.1 (2023-05-13)

* (theimo1221) Allow Ac's to follow their own temperature if set

## 2.9.0 (2023-05-13)

* (theimo1221) Add device Cluster to windowGroup
* (theimo1221) Add settings to HmIp Griff, to allow controlling of telegram information
* (theimo1221) Update packages
* (theimo1221) Allow for better excess Energy Usage with Victron-Energy-Manager

## 2.8.9 (2023-05-09)

* (theimo1221) Update packages

## 2.8.8 (2023-05-05)

* (theimo1221) Fix prettier error

## 2.8.7 (2023-05-05)

* (theimo1221) Reduce Time Event logging, when there is no modification
* (theimo1221) Update packages

## 2.8.6 (2023-04-25)

* (theimo1221) Update packages

## 2.8.5 (2023-04-21)

* (theimo1221) Update victron package

## 2.8.4 (2023-04-16)

* (theimo1221) Extract iCameraDevice interface
* (theimo1221) Add possibility, to block camera detection, by open door handles

## 2.8.3 (2023-04-15)

* (theimo1221) Usage of "movementDetected" only for active Zigbee Devices
* (theimo1221) Update packages

## 2.8.2 (2023-04-09)

* (theimo1221) Update victron package

## 2.8.1 (2023-04-07)

* (theimo1221) Update victron package

## 2.8.0 (2023-04-07)

* (theimo1221) Update packages
* (theimo1221) Add Grid Setpoint Changing to Victron Device
* (theimo1221) Add setting to allow VictronMqtt to store data in influxdb

## 2.7.1 (2023-03-25)

* (theimo1221) Victron as energy Manager
* (theimo1221) Update packages

## 2.7.0 (2023-03-20)

* (theimo1221) Update packages
* (theimo1221) Basic Victron Support

## 2.6.2 (2023-03-11)

* (theimo1221) Fix bug in TemperatureSettings, due to function being missing after deserialization

## 2.6.1 (2023-03-11)

* (theimo1221) Update packages

## 2.6.0 (2023-02-17)

* (theimo1221) Basic Tibber support
* (theimo1221) Update packages

## 2.5.0 (2023-01-28)

* (theimo1221) Extract automatic points to heater settings

## 2.4.6 (2023-01-28)

* (theimo1221) Update packages

## 2.4.5 (2023-01-20)

* (theimo1221) Next try to fix Persist position for handle

## 2.4.4 (2023-01-20)

* (theimo1221) Fix Persist position for handle

## 2.4.3 (2023-01-20)

* (theimo1221) Fix Persist position for handle

## 2.4.2 (2023-01-20)

* (theimo1221) Don't limit handle persist too much (Fast window open/close)

## 2.4.1 (2023-01-20)

* (theimo1221) Increase Handle Persist

## 2.4.0 (2023-01-17)

* (theimo1221) Update packages
* (theimo1221) Add Handle Persist

## 2.3.4 (2022-12-18)

* (theimo1221) Update packages

## 2.3.3 (2022-12-17)

* (theimo1221) Exclude irrelevant properties from json

## 2.3.2 (2022-12-10)

* (theimo1221) Trigger ac heating earlier

## 2.3.1 (2022-12-08)

* (theimo1221) Don't exclude _deviceCluster from JSON in Light Group

## 2.3.0 (2022-12-08)

* (theimo1221) Rename Lampengroup to LightGroup
* (theimo1221) Update packages

## 2.2.6 (2022-12-04)

* (theimo1221) Fix error in image url

## 2.2.5 (2022-12-04)

* (theimo1221) Change image link

## 2.2.4 (2022-12-04)

* (theimo1221) Add H264 Ios Stream Link to Camera Device

## 2.2.3 (2022-12-04)

* (theimo1221) Add BlueIris settings and move settings interface to own files
* (theimo1221) Add Camera Url Endpoints

## 2.2.2 (2022-12-04)

* (theimo1221) Delay Telegram Sending command to respect person detection

## 2.2.1 (2022-12-04)

* (theimo1221) Change camera detection state type to number

## 2.2.0 (2022-12-04)

* (theimo1221) Finish Camera Device Implementation

## 2.1.5-alpha.6 (2022-12-04)

* (theimo1221) Set Person Detected properly regardless of
  motion setting

## 2.1.5-alpha.5 (2022-12-04)

* (theimo1221) Extend Camera Logging

## 2.1.5-alpha.4 (2022-12-04)

* (theimo1221) Make movementDetectionOnPersonOnly changable

## 2.1.5-alpha.3 (2022-12-04)

* (theimo1221) Revert last change

## 2.1.5-alpha.2 (2022-12-04)

* (theimo1221) Extend alldeviceskey length

## 2.1.5-alpha.1 (2022-12-04)

* (theimo1221) Fix imports and exports

## 2.1.5-alpha.0 (2022-12-04)

* (theimo1221) Allow Image Sending in Telegram Service
* (theimo1221) Add new MQTT Device Type BlueIrisCamera

## 2.1.4 (2022-12-02)

* (nockiro) Fix turning off/on lights on movement if settings change while running
* (nockiro) Adjusted settings persistence to not store the callback object
* (theimo1221) Update packages

## 2.1.3 (2022-11-27)

* (theimo1221) Fix typo in evening restart shutter up prevention

## 2.1.2 (2022-11-27)

* (theimo1221) Prevent firing of sunrise callbacks on evening system restarts

## 2.1.1 (2022-11-27)

* (theimo1221) Prevent exception on fire immediate

## 2.1.0 (2022-11-27)

* (theimo1221) Fixing some edge cases around sunrise/sunset callbacks in combination with critical recalc times (after
  Sunrise but before execution)

## 2.0.6 (2022-11-26)

* (theimo1221) Some Logging improvements to narrow down some issues

## 2.0.5 (2022-11-24)

* (theimo1221) Change Log Level on TimeCallback Recalc

## 2.0.4 (2022-11-24)

* (theimo1221) Add OnChange Log Message to RoomSettingsController

## 2.0.3 (2022-11-24)

* (theimo1221) Increase Time Callback Log Level

## 2.0.2 (2022-11-24)

* (theimo1221) Add/Remove Time Callbacks on setting change (if needed)
* (theimo1221) Update packages

## 2.0.1 (2022-11-21)

* (theimo1221) Call setting change cb after setting change or initialization

## 2.0.0 (2022-11-20)

* (theimo1221) New Major for #621 and #616

## 1.3.14-alpha.3 (2022-11-20)

* (theimo1221) #621 Make Room Settings Public

## 1.3.14-alpha.2 (2022-11-20)

* (theimo1221) Exclude RoomDeviceAddingSettings from Room Constructor

## 1.3.14-alpha.1 (2022-11-20)

* (theimo1221) Generalize device Settings

## 1.3.14-alpha.0 (2022-11-16)

* (theimo1221) Log Forced Device Queries
* (theimo1221) Update packages
* (theimo1221) #616 Allow better interaction with forcings in first steop for ZigbeeActuatorOnly

## 1.3.13 (2022-11-15)

* (theimo1221) Update packages
* (theimo1221) Even more Euro Heater Logging
* (theimo1221) Enhance Euro Heater Logic for logging correct level

## 1.3.12 (2022-11-14)

* (theimo1221) Enhance Euro Heater Logging
* (theimo1221) Enhance Euro Heater Logic for settings correct spz_trv_mode

## 1.3.11 (2022-11-12)

* (theimo1221) Correct pidForcedMinimum Setting persisting

## 1.3.10 (2022-11-10)

* (theimo1221) Fix PID Minimum Value

## 1.3.9 (2022-11-10)

* (theimo1221) Improve time ac logic to respect empty max time
* (theimo1221) Allow setting of PID Minimum Value
* (theimo1221) Update packages

## 1.3.8 (2022-11-05)

* (theimo1221) Fix ac logic at night when previously off

## 1.3.7 (2022-11-05)

* (theimo1221) Delay loadDeviceSettings Call for iobroker devices, due to super constructor call

## 1.3.6 (2022-11-05)

* (theimo1221) Minor fix to prevent uneccessary save of device settings
* (theimo1221) Add Device Setting partial set unit test
* (theimo1221) Add missing call for loadSettings in ioBrokerBaseDevice
* (theimo1221) Add missing calls in tvDevice initialization

## 1.3.5 (2022-11-05)

* (theimo1221) Add Date to Settings, to keep a history
* (theimo1221) Add api-function to force reload of device settings

## 1.3.4 (2022-11-05)

* (theimo1221) Add Customname to settings Table and make load/save settings more generic

## 1.3.3 (2022-11-05)

* (theimo1221) Fixes for energy settings

## 1.3.2 (2022-11-05)

* (theimo1221) Fix for sceneSettings Persistence
* (theimo1221) Respect maximum and minimum Time settings even for AC-Heating
* (theimo1221) Better force controlling of AC-Devices
* (theimo1221) Include EnergyConsumerSettings in device settings

## 1.3.1 (2022-11-04)

* (theimo1221) Implement iSmokeDetectorDevice

## 1.3.0 (2022-11-04)

* (theimo1221) Add persistence of device settings
* (theimo1221) Update packages
* (theimo1221) Improve ac control api capabilities

## 1.2.7 (2022-11-03)

* (theimo1221) Allow acDevice to turn off even if not activated by excess energy

## 1.2.6 (2022-10-31)

* (theimo1221) Fix persistence delay check.

## 1.2.5 (2022-10-31)

* (theimo1221) Add option to add a description to Room Scene
* (theimo1221) Fix issues with TimeCallbacks on daylight savings change date
* (theimo1221) Prevent fast multiple battery persists

## 1.2.4 (2022-10-30)

* (theimo1221) Add SceneSettings to interface

## 1.2.3 (2022-10-30)

* (theimo1221) Minor Tweaks in Room Scene

## 1.2.2 (2022-10-30)

* (theimo1221) Fix access to some internal properties
* (theimo1221) Add Scene Functionality

## 1.2.2-alpha.0 (2022-10-28)

* (theimo1221) Fix zigbee persist for devices without last update

## 1.2.1 (2022-10-28)

* (theimo1221) Round battery value before db entry
* (theimo1221) Allow zigbee device device query
* (theimo1221) Trigger device query within EuroHeater from time to time automatically
* (theimo1221) Update packages

## 1.2.0 (2022-10-22)

* (theimo1221) Fix unit Test
* (theimo1221) Update packages
* (theimo1221) Add Humidity Sensor Persisting
* (theimo1221) Clear Persisting from old mixed persisting commands
* (theimo1221) Make battery readonly to outside
* (theimo1221) Persist Battery Device Data
* (theimo1221) Add iDisposable for Objects with intervals
* (theimo1221) Persist Zigbee Device Data

## 1.1.48 (2022-10-15)

* (nockiro) Restructured illumination data table to be device-oriented (and crash-free)
* (nockiro) Added percentage to the creation of ActuatorDeviceTable parallel to its insertions

## 1.1.47 (2022-10-15)

* (nockiro) Another fix for the Osram dimmer

## 1.1.46 (2022-10-15)

* (nockiro) Another fix for creating the schema if not existing

## 1.1.45 (2022-10-15)

* (nockiro) Fixes/Adjustments for PostgreSQL to create schema/tables correctly

## 1.1.44 (2022-10-15)

* (nockiro) Fixes for Osram dimmer

## 1.1.43 (2022-10-15)

* (nockiro) Add Osram dimmer device

## 1.1.42 (2022-10-15)

* (theimo1221) Update packages
* (theimo1221) #565 Add Linkind Led Device

## 1.1.41 (2022-10-15)

* (theimo1221) Respect Long/Lat from Weathersettings for Sunrise/Sunset as well
* (theimo1221) #565 Dimmer and LedRgbCct are too much bound to Illuminize

## 1.1.40 (2022-10-14)

* (theimo1221) Fix in Euro Heater to correctly set desired mode

## 1.1.39 (2022-10-14)

* (theimo1221) Minor fixes in Postgres DDL Code
* (theimo1221) Minor fix preventing uninitialized ac persisting
* (theimo1221) Fix in zigbee Heater, which result in persisted level beeing 100 instead of 1.0

## 1.1.38 (2022-10-12)

* (theimo1221) Update packages

## 1.1.37 (2022-09-29)

* (theimo1221) Fix error with heater in rooms without room Temperatur

## 1.1.36 (2022-09-26)

* (theimo1221) Fix error in acs on forced off

## 1.1.35 (2022-09-26)

* (theimo1221) Fix error in ac logging

## 1.1.34 (2022-09-25)

* (theimo1221) Further improve ac logging, to find mistake in ac settings

## 1.1.33 (2022-09-25)

* (theimo1221) Improve ioBroker Socket Connection, its error handling and logging

## 1.1.32 (2022-09-25)

* (theimo1221) Ac force to overrule ac heating as well

## 1.1.31 (2022-09-25)

* (theimo1221) Allow manual testing ioBroker Connection
* (theimo1221) Samsung TV Device preparations
* (theimo1221) Gather daikin Device info more frequently

## 1.1.30 (2022-09-25)

* (theimo1221) Fix within Daikin Devices to properly set target Temperature

## 1.1.29 (2022-09-24)

* (theimo1221) Even More Logging in IoBroker Connection

## 1.1.28 (2022-09-24)

* (theimo1221) More Logging in IoBroker Connection

## 1.1.27 (2022-09-24)

* (theimo1221) More Logging in IoBroker Connection

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
