import { BaseGroup, Devices, DeviceSettings } from '../devices';
import {
  AcMode,
  ButtonPosition,
  ButtonPressType,
  CollisionSolving,
  CommandSource,
  DeviceCapability,
  LogLevel,
} from '../enums';
import {
  ActuatorSetStateCommand,
  BlockAutomaticCommand,
  BlockAutomaticLiftBlockCommand,
  DimmerSetLightCommand,
  LampSetLightCommand,
  LedSetLightCommand,
  ShutterSetLevelCommand,
  WindowSetDesiredPositionCommand,
} from '../command';
import {
  iAcDevice,
  iActuator,
  iBaseDevice,
  iButtonSwitch,
  iCameraDevice,
  iDimmableLamp,
  iGarageDoorOpener,
  iLamp,
  iRoomBase,
  iScene,
  iShutter,
  iSpeaker,
  iTemporaryDisableAutomatic,
} from '../interfaces';
import { LogObject, ServerLogService } from '../logging';
import { DaikinService, RoomService } from '../services';
import { iLedRgbCct } from '../interfaces/baseDevices/iLedRgbCct';
import { GroupSettings } from '../settingsObjects';

export class API {
  /**
   * Endpoint to end a scene manually (or early if it has automatic turn off)
   * @param deviceId - The id of the scene to end
   * @returns In case it failed the Error containing the reason
   */
  public static endScene(deviceId: string): Error | null {
    const d = this.getDevice(deviceId) as iScene | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.scene)) {
      return new Error(`Device with ID ${deviceId} is no scene`);
    }
    d.log(LogLevel.Info, 'API Call to end this.');
    d.endScene();
    return null;
  }

  /**
   * Gets the instance of an Ac Device identified by id
   * @param id - The device id of the AC
   * @returns The instance of the AC Device or undefined if not found
   */
  public static getAc(id: string): iAcDevice | undefined {
    const result: iBaseDevice | undefined = this.getDevice(id);
    if (!result.deviceCapabilities.includes(DeviceCapability.ac)) {
      return undefined;
    }
    return result as iAcDevice;
  }

  // TODO: Missing Comment
  public static getDevices(): { [id: string]: iBaseDevice } {
    // console.log(Util.inspect(Devices.alLDevices, false, 5));
    return Devices.alLDevices;
  }

  // TODO: Missing Comment
  public static getDevice(id: string, warnIfNotFound: boolean = true): iBaseDevice {
    const d: iBaseDevice | undefined = Devices.alLDevices[id];
    if (d === undefined && warnIfNotFound) {
      ServerLogService.writeLog(LogLevel.Warn, `Api.getDevice() --> "${id}" not found`);
    }
    return d;
  }

  // TODO: Missing Comment
  public static getGroup(id: string): BaseGroup | undefined {
    const g: BaseGroup | undefined = RoomService.Groups.get(id);
    if (g === undefined) {
      ServerLogService.writeLog(LogLevel.Warn, `Api.getGroup() --> "${id}" not found`);
    }
    return g;
  }

  // TODO: Missing Comment
  public static getRooms(): Map<string, iRoomBase> {
    // console.log(inspect(Object.fromEntries(RoomService.Rooms)));
    return RoomService.Rooms;
  }

  // TODO: Missing Comment
  public static getRoom(id: string): iRoomBase | undefined {
    return RoomService.Rooms.get(id);
  }

  // TODO: Missing Comment
  public static getLog(): LogObject[] {
    return ServerLogService.getLog();
  }

  /**
   * Turns on/off one AC identified by it's id
   * @param id - The id of the device, if wrong false will be returned
   * @param desiredState - The desired state for the AC
   * @param desiredMode - The desired mode for the AC
   * @param desiredTemperature - The desired temperature for the AC in Celsius
   * @param forceTime - The time in ms this should not change before automatic change is allowed again
   * @returns True if the AC was found and the state was changed
   */
  public static setAc(
    id: string,
    desiredState: boolean,
    desiredMode?: AcMode,
    desiredTemperature?: number,
    forceTime: number = 60 * 60 * 1000,
  ): boolean {
    const d = this.getAc(id);
    if (!d) {
      ServerLogService.writeLog(LogLevel.Warn, `AC Device for id ${id} not found`);
      return false;
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.ac)) {
      ServerLogService.writeLog(LogLevel.Warn, `Device for id ${id} is not an ac`);
      return false;
    }
    if (desiredMode === undefined) {
      if (!desiredState) {
        desiredMode = AcMode.Off;
      } else {
        desiredMode = d.heatingAllowed ? AcMode.Heating : AcMode.Cooling;
      }
    }
    d.log(LogLevel.Info, `API Call to set AC to ${desiredState} with mode ${desiredMode} for ${forceTime}ms`);
    d.setState(desiredMode, desiredTemperature, forceTime);
    return true;
  }

  /**
   * Turns on/off all AC´s in the home
   * @param desiredState - The desired state for all AC´s
   */
  public static setAllAc(desiredState: boolean): void {
    DaikinService.setAll(desiredState, true);
    ServerLogService.writeLog(LogLevel.Info, `API Call to set all AC´s to ${desiredState}`);
  }

  /**
   * Changes the status of a given Lamp
   * @param deviceId - The device Id of the lamp
   * @param state - The desired new state
   * @param timeout - Desired time after which this should be reverted to normal state
   * @returns In case it failed the Error containing the reason
   * @deprecated Use {@link API.lampSetLight} instead
   * TODO: Remove deprecated API method
   */
  public static setLamp(deviceId: string, state: boolean, timeout: number = 60 * 60 * 1000): Error | null {
    return this.lampSetLight(
      deviceId,
      new LampSetLightCommand(CommandSource.API, state, '', new BlockAutomaticCommand(CommandSource.API, timeout)),
    );
  }

  /**
   * Changes the status of a given Lamp
   * @param deviceId - The device Id of the lamp
   * @param c - The command(stack) to perform on the lamp
   * @returns In case it failed the Error containing the reason.
   */
  public static lampSetLight(deviceId: string, c: LampSetLightCommand): Error | null {
    const d = this.getDevice(deviceId) as iLamp | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.lamp)) {
      return new Error(`Device with ID ${deviceId} is no Lamp`);
    }
    d.log(LogLevel.Info, 'Received LampSetLightCommand API call.');
    d.setLight(c);
    return null;
  }

  /**
   * Changes the status of a given actuator
   * @param deviceId - The device Id of the actuator
   * @param state - The desired new state
   * @param timeout - Desired time after which this should be reverted to automatic state
   * @returns In case it failed the Error containing the reason
   * @deprecated Use {@link API.actuatorSetState} instead
   * TODO: Remove deprecated API method
   */
  public static setActuator(deviceId: string, state: boolean, timeout: number = 60 * 60 * 1000): Error | null {
    return this.actuatorSetState(
      deviceId,
      new ActuatorSetStateCommand(CommandSource.API, state, '', new BlockAutomaticCommand(CommandSource.API, timeout)),
    );
  }

  /**
   * Changes the status of a given actuator
   * @param deviceId - The device Id of the actuator
   * @param c - The command(stack) to perform on the actuator
   * @returns In case it failed the Error containing the reason
   */
  public static actuatorSetState(deviceId: string, c: ActuatorSetStateCommand): Error | null {
    const d = this.getDevice(deviceId) as iActuator | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.actuator)) {
      return new Error(`Device with ID ${deviceId} is no actuator`);
    }
    d.log(LogLevel.Info, 'Received ActuatorSetStateCommand API call.');
    d.setActuator(c);
    return null;
  }

  /**
   * Changes the status of the given dimmer
   * @param deviceId - The device Id of the actuator
   * @param state - The desired new state
   * @param timeout - A chosen Timeout after which the light should be reset
   * @param brightness - The desired brightness
   * @param transitionTime - The transition time during turnOn/turnOff
   * @returns In case it failed the Error containing the reason
   * @deprecated Use {@link API.dimmerSetLight} instead
   * TODO: Remove deprecated API method
   */
  public static setDimmer(
    deviceId: string,
    state: boolean,
    timeout?: number,
    brightness?: number,
    transitionTime?: number,
  ): Error | null {
    return this.dimmerSetLight(
      deviceId,
      new DimmerSetLightCommand(
        CommandSource.API,
        state,
        '',
        new BlockAutomaticCommand(CommandSource.API, timeout),
        brightness,
        transitionTime,
      ),
    );
  }

  /**
   * Changes the status of the given dimmer
   * @param deviceId - The device Id of the dimmable device.
   * @param command - The command(stack) to perform on the dimmer
   * @returns In case it failed the Error containing the reason.
   */
  public static dimmerSetLight(deviceId: string, command: DimmerSetLightCommand): Error | null {
    const d = this.getDevice(deviceId) as iDimmableLamp | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.dimmablelamp)) {
      return new Error(`Device with ID ${deviceId} is no dimmablelamp`);
    }
    d.log(LogLevel.Info, 'Received dimmerSetLight API call.');
    d.setLight(command);
    return null;
  }

  /**
   * Changes the status of a given led-device
   * @param deviceId - The device Id of the actuator
   * @param state - The desired new state
   * @param timeout - A chosen Timeout after which the light should be reset
   * @param brightness - The desired brightness
   * @param transitionTime - The transition time during turnOn/turnOff
   * @param color - The desired color in 6 digit hex Code
   * @param colorTemp - The desired color Temperature (0 = more White)
   * @returns In case it failed the Error containing the reason
   * @deprecated Use {@link API.ledSetLight} instead
   * TODO: Remove deprecated API method
   */
  public static setLedLamp(
    deviceId: string,
    state: boolean,
    timeout?: number,
    brightness?: number,
    transitionTime?: number,
    color?: string,
    colorTemp?: number,
  ): Error | null {
    return this.ledSetLight(
      deviceId,
      new LedSetLightCommand(
        CommandSource.API,
        state,
        '',
        new BlockAutomaticCommand(CommandSource.API, timeout),
        brightness,
        transitionTime,
        color,
        colorTemp,
      ),
    );
  }

  /**
   * Changes the status of a given led-device
   * @param deviceId - The device Id of the LED-Device
   * @param command - The command(stack) to perform on the led-device
   * @returns In case it failed the Error containing the reason
   */
  public static ledSetLight(deviceId: string, command: LedSetLightCommand): Error | null {
    const d = this.getDevice(deviceId) as iLedRgbCct | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.ledLamp)) {
      return new Error(`Device with ID ${deviceId} is no LED`);
    }
    d.log(LogLevel.Info, 'Received ledSetLight API call.');
    d.setLight(command);
    return null;
  }

  /**
   * Changes the position of a given shutter
   * if needed this updates the window position as well
   * @param deviceId - The device Id of the shutter
   * @param level - The desired new level (0 being open, 100 being closed)
   * @returns Error if there is no shutter with the given id
   * @deprecated Use {@link API.shutterSetLevel} instead
   * TODO: Remove deprecated API method
   */
  public static setShutter(deviceId: string, level: number): Error | null {
    return this.shutterSetLevel(deviceId, new ShutterSetLevelCommand(CommandSource.API, level));
  }

  /**
   * Changes the position of a given shutter
   * if needed this updates the window position as well
   * @param deviceId - The device Id of the shutter
   * @param command - The command(stack) to perform on the shutter
   * @returns Error if there is no shutter with the given id
   */
  public static shutterSetLevel(deviceId: string, command: ShutterSetLevelCommand): Error | null {
    const d = this.getDevice(deviceId) as iShutter | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.shutter)) {
      return new Error(`Device with ID ${deviceId} is no Shutter`);
    }
    if (d.window) {
      // otherwise it will be overridden shortly after
      d.window.setDesiredPosition(new WindowSetDesiredPositionCommand(command, command.level));
    } else {
      d.setLevel(command);
    }
    d.log(LogLevel.Info, 'Received shutterSetLevel API call.');
    return null;
  }

  // TODO: Missing Comment
  public static speakOnDevice(deviceId: string, message: string, volume: number = 30): Error | null {
    const d = this.getDevice(deviceId) as iSpeaker | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.speaker)) {
      return new Error(`Device with ID ${deviceId} is no speaker`);
    }
    d.log(LogLevel.Info, `API Call to speak "${message}" on device with volume ${volume}`);
    d.speakOnDevice(message, volume);
    return null;
  }

  /**
   * Starts a specified scene
   * @param deviceId - The targeted scene
   * @param turnOffTimeout - If provided the time in ms after which the scene should end automatically
   * @returns In case it failed the Error containing the reason
   */
  public static startScene(deviceId: string, turnOffTimeout?: number): Error | null {
    const d = this.getDevice(deviceId) as iScene | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.scene)) {
      return new Error(`Device with ID ${deviceId} is no scene`);
    }
    d.log(LogLevel.Info, 'API Call to start this.');
    d.startScene(turnOffTimeout);
    return null;
  }

  public static switchGarageDoor(deviceId: string, open: boolean): Error | null {
    const d = this.getDevice(deviceId) as iGarageDoorOpener | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.garageDoorOpener)) {
      return new Error(`Device with ID ${deviceId} is no Garage Door Opener`);
    }
    if (open) {
      d.log(LogLevel.Info, 'API Call to open Garage Door');
      d.open();
    } else {
      d.log(LogLevel.Info, 'API Call to close Garage Door');
      d.close();
    }
    return null;
  }

  /**
   * Changes the settings of a given device
   * @param deviceId - The id of the device to change the settings
   * @param settings - A partial settings object containing the wanted settings properties
   * @returns In case it failed the Error containing the reason
   */
  public static setDeviceSettings(deviceId: string, settings: Partial<DeviceSettings>): Error | null {
    const d = this.getDevice(deviceId) as iBaseDevice;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (d.settings === undefined) {
      return new Error(`Device with ID ${deviceId} has no settings`);
    }
    d.log(LogLevel.Info, `API Call to change settings to ${JSON.stringify(settings)})}`);
    d.settings.fromPartialObject(settings);
    d.settings.persist(d);
    return null;
  }

  // TODO: Missing Comment
  public static setGroupSettings(groupId: string, settings: Partial<GroupSettings>): Error | null {
    const g = this.getGroup(groupId) as BaseGroup;
    if (g === undefined) {
      return new Error(`Group with ID ${groupId} not found`);
    }
    if (g.settings === undefined) {
      return new Error(`Group with ID ${groupId} has no settings`);
    }
    g.log(LogLevel.Info, `API Call to change settings to ${JSON.stringify(settings)})}`);
    g.settings.fromPartialObject(settings);
    g.settings.persist(g);
    return null;
  }

  /**
   * Changes the settings of a given room
   * @param roomName - The id of the Room to change the settings
   * @param settings - A partial settings object containing the wanted settings properties
   * @returns In case it failed the Error containing the reason
   */
  public static setRoomSettings(roomName: string, settings: Partial<DeviceSettings>): Error | null {
    const r = this.getRoom(roomName);
    if (r === undefined) {
      return new Error(`Room with ID ${roomName} not found`);
    }
    r.log(LogLevel.Info, `API Call to change settings to ${JSON.stringify(settings)})}`);
    r.settings.settingsContainer.fromPartialObject(settings);
    r.settings.settingsContainer.persist(r);
    return null;
  }

  public static cameraInformPersonDetected(deviceId: string): Error | void {
    const d = this.getDevice(deviceId) as iCameraDevice | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.camera)) {
      return new Error(`Device with ID ${deviceId} is no camera`);
    }
    d.setPersonDetected();
  }

  // TODO: Missing Comment
  public static getLastCameraImage(deviceId: string): Error | string {
    const d = this.getDevice(deviceId) as iCameraDevice | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.camera)) {
      return new Error(`Device with ID ${deviceId} is no camera`);
    }
    return d.lastImage;
  }

  // TODO: Missing Comment
  public static persistAllDeviceSettings(): void {
    ServerLogService.writeLog(LogLevel.Info, 'API Call to persist all device settings');
    for (const device of Object.values(Devices.alLDevices)) {
      device.settings?.persist(device);
    }
  }

  // TODO: Missing Comment
  public static loadAllDeviceSettingsFromDb(): void {
    ServerLogService.writeLog(LogLevel.Info, 'API Call to load all device settings');
    for (const device of Object.values(Devices.alLDevices)) {
      device.loadDeviceSettings();
    }
  }

  /**
   * Lifts a previously started Block of automatic
   * @param deviceId - The target device
   * @returns In case it failed the Error containing the reason
   * @deprecated Use {@link API.blockAutomaticLiftAutomaticBlock} instead
   * TODO: V4 Remove deprecated API method
   */
  public static liftAutomaticBlock(deviceId: string): Error | null {
    return this.blockAutomaticLiftAutomaticBlock(deviceId, new BlockAutomaticLiftBlockCommand(CommandSource.API));
  }

  /**
   * Lifts a previously started Block of automatic
   * @param deviceId - The target device
   * @param command - The command to lift the automatic block
   * @returns In case it failed the Error containing the reason
   */
  public static blockAutomaticLiftAutomaticBlock(
    deviceId: string,
    command: BlockAutomaticLiftBlockCommand,
  ): Error | null {
    const d = this.getDevice(deviceId) as iTemporaryDisableAutomatic | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.blockAutomatic)) {
      return new Error(`Device with ID ${deviceId} is not capable of blocking automatic`);
    }
    d.log(LogLevel.Info, 'Received API Call to lift automatic block.');
    d.blockAutomationHandler.liftAutomaticBlock(command);
    return null;
  }

  /**
   * Blocks the automatic of the given device for provided Duration
   * @param deviceId - The target device
   * @param duration - The duration in ms for which the device should remain in current state
   * @param onCollision - The desired Collision Solving strategy, in case the automatic being blocked already
   * @returns In case it failed the Error containing the reason
   * @deprecated Use {@link API.blockAutomaticSetBlock} instead
   * TODO: Remove deprecated API method
   */
  public static blockAutomatic(deviceId: string, duration: number, onCollision?: CollisionSolving): Error | null {
    this.blockAutomaticSetBlock(deviceId, new BlockAutomaticCommand(CommandSource.API, duration, '', onCollision));
    return null;
  }

  /**
   * Blocks the automatic of the given device for provided Duration
   * @param deviceId - The target device
   * @param command - The command to block the automatic
   * @returns In case it failed the Error containing the reason
   */
  public static blockAutomaticSetBlock(deviceId: string, command: BlockAutomaticCommand): Error | null {
    const d = this.getDevice(deviceId) as iTemporaryDisableAutomatic | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.blockAutomatic)) {
      return new Error(`Device with ID ${deviceId} is not capable of blocking automatic`);
    }
    d.log(LogLevel.Info, 'Received API Call to block automatic.');
    d.blockAutomationHandler.disableAutomatic(command);
    return null;
  }

  // TODO: Missing Comment
  public static pressButtonSwitch(
    deviceId: string,
    position: ButtonPosition,
    pressType: ButtonPressType,
  ): Error | null {
    const d = this.getDevice(deviceId) as iButtonSwitch | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.buttonSwitch)) {
      return new Error(`Device with ID ${deviceId} is no switch`);
    }
    d.log(LogLevel.Info, `API Call to press button ${position} with ${pressType}`);
    return d.pressButton(position, pressType);
  }
}
