## JSON Setting changes

## Device Settings changes
1. `AcDevice` now has separate properties for `useOwnTemperatureanAutomatic`
2. `ActuatorSettings` now support `dayOn` option for time-based actions.

## Interface changes
1. `iVibrationSensor`: Some properties used "Griff" this is moved to respective english terms and some other properties are now `readonly`.
2. `iCameraDevice`: Blocking by griff/handle only is removed towards any device now being capable of setting a block (or lifting it).
3. `iEnergyManager` now implements `iDisposable` instead of providing it's own cleanup method.
4. `iHeater` now implements `iDisposable` instead of providing a method to stop the interval.

## Command Changes
A short document explaining the reasons/benefits of Command-Based structure is upcoming.
For migration you should just call `new xyzCommand` and give almost the same properties as before at the direct method call.
Changes to the device interfaces are respectivly performed for all devices implementing these interfaces.
1. `iRoomBase.setLightTimebased` now uses `RoomSetLightTimeBasedCommand` for setting time-based light actions.
2. `iActuator.setActuator` now uses `ActuatorSetStateCommand` for setting actuator values.
3. `iActuator.toggleActuator` now uses `ActuatorToggleCommand` for toggling actuator values.
4. `iDimmableLamp` now uses `DimmerSetLightCommand` for changing the dimmer state.
5. `iLamp.setTimeBased` now uses `LampSetTimeBasedCommand` for changing the light based on the given `TimeOfDay`.
6. `iLamp.toggleLight` now uses `LampToggleLightCommand` for changing the light.
7. `iLamp.setLight` now uses `LampSetLightCommand` for changing the desired light-state.
8. `iLedRbgCct.setLight` now uses `LedSetLightCommand` for changing the desired light-state.
9. `iShutter.setLevel` now uses `ShutterSetLevelCommand` for changing the shutter level.
10. `iTemporaryDisableAutomatic.restoreTargetAutomaticValue` now expects a `restoreTargetAutomaticValue` for restoring the automatic value.
11. `Window.setDesiredPosition` now uses `WindowSetDesiredPositionCommand` for setting the desired position.
12. `Window.restoreDesiredPosition` now expects a `WindowRestoreDesiredPositionCommand` for restoring the desired position.
13. `iRoomBase.LightGroup.switchAll` now uses `ActuatorSetStateCommand` for switching all lights in this group.
14. `iRoomBase.LightGroup.switchTimeConditional` now uses `LightGroupSwitchTimeConditionalCommand` for setting time-based light actions.
15. `iRoomBase.LightGroup.setAllLampen` now uses `LampSetLightCommand` for setting all lights in this group.
16. `iRoomBase.LightGroup.setAllLampenTimeBased` now uses `LampSetTimeBasedCommand` for setting all lights in this group time-based.
17. `iRoomBase.LightGroup.setAllStecker` now uses `ActuatorSetStateCommand` for setting all outlets in this group and got renamed to `setAllOutlets`.
18. `iRoomBase.LightGroup.setAllLED` now uses `LedSetLightCommand` for setting all LEDs in this group.
19. `iRoomBase.LightGroup.setAllWled` now uses `WledSetLightCommand` for setting all WLED Devices in this group.
20. `iRoomBase.WindowGroup.allRolloDown/allRolloUp/allRolloToLevel` got replaced by `setDesiredPosition` using `WindowSetDesiredPositionCommand`.
21. `iRoomBase.WindowGroup.setRolloByWeatherStatus` now uses `WindowSetRolloByWeatherStatusCommand`. 
22. `iRoomBase.WindowGroup.sunriseUp` now uses `ShutterSunriseUpCommand`.
23. `iRoomBase.WindowGroup.sunsetDown` now uses `ShutterSunsetDownCommand`.
24. `iRoomBase.WindowGroup.restoreRolloPosition` now uses `RoomRestoreShutterPositionCommand` and got renamed to `restoreShutterPosition` for setting all windows in this group.

### Timeout got removed in favor of BlockAutomaticCommand
Timeout itself was not configurable enough to provide enough options for the user. Example scenarios:  
a) User wants to turn a light on for an hour regardless of movement and normal settings. --> After an hour the light should fall back to automatic state.  
b) User wants to turn a light on until he himself turns it off. --> The light should stay on until the user turns it off.  
c) User just issues the turn on command without specifying a timeout. --> How long should the light stay on? And/or shall it fall back to automatic state?

To resolve both scenario a) and b) the `BlockAutomaticCommand` can be used with explicit instructions.
Additionally to resolve scenario c) when no `BlockAutomaticCommand` is specified it will be created (or not) based on the device `blockAutomaticSettings` settings or (if not present) the global `blockAutomaticHandlerDefaults` settings in `master.json`.

## Minor property changes
1. Some zigbee actuators had a `isActuatorOn` property which got removed due to `iActuator.actuatorOn` being available.

## API changes

Several API methods got deprecated and will be removed in the next major release. Please update your code accordingly as recommended in the respective method documentation.
