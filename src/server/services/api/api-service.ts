import {
  Devices,
  iActuator,
  iBaseDevice,
  iCameraDevice,
  iLamp,
  iScene,
  iShutter,
  iSpeaker,
  iTemporaryDisableAutomatic,
} from '../../devices';
import { CollisionSolving, DeviceSettings, LogLevel, RoomBase } from '../../../models';
import { RoomService } from '../room-service';
import { LogObject, ServerLogService } from '../log-service';
import { AcDevice, AcMode, DaikinService } from '../ac';
import { DeviceCapability } from '../../devices/DeviceCapability';
import { iDimmableLamp } from '../../devices/baseDeviceInterfaces/iDimmableLamp';
import { iLedRgbCct } from '../../devices/baseDeviceInterfaces/iLedRgbCct';
import { SettingsService } from '../settings-service';
import { HeatingMode } from '../../config';

export class API {
  /**
   * Endpoint to end a scene manually (or early if it has automatic turn off)
   * @param {string} deviceId
   * @returns {Error | null}
   */
  public static endScene(deviceId: string): Error | null {
    const d = this.getDevice(deviceId) as iScene | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.scene)) {
      return new Error(`Device with ID ${deviceId} is no scene`);
    }
    d.endScene();
    return null;
  }

  /**
   * Gets the instance of an Ac Device identified by id
   * @param {string} id
   * @returns {OwnDaikinDevice | undefined}
   */
  public static getAc(id: string): AcDevice | undefined {
    const result: iBaseDevice | undefined = this.getDevice(id);
    if (!result.deviceCapabilities.includes(DeviceCapability.ac)) {
      return undefined;
    }
    return result as AcDevice;
  }

  public static getDevices(): { [id: string]: iBaseDevice } {
    // console.log(Util.inspect(Devices.alLDevices, false, 5));
    return Devices.alLDevices;
  }

  public static getDevice(id: string): iBaseDevice {
    const d: iBaseDevice | undefined = Devices.alLDevices[id];
    if (d === undefined) {
      ServerLogService.writeLog(LogLevel.Warn, `Api.getDevice() --> "${id}" not found`);
    }
    return Devices.alLDevices[id];
  }

  public static getRooms(): Map<string, RoomBase> {
    // console.log(inspect(Object.fromEntries(RoomService.Rooms)));
    return RoomService.Rooms;
  }

  public static getRoom(id: string): RoomBase | undefined {
    return RoomService.Rooms.get(id);
  }

  public static getLog(): LogObject[] {
    return ServerLogService.getLog();
  }

  /**
   * Turns on/off one AC identified by it's id
   * @param id The id of the device, if wrong false will be returned
   * @param {boolean} desiredState
   * @param {AcMode} desiredMode
   * @param forceTime The time in ms this should not change before automatic change is allowed again
   */
  public static setAc(
    id: string,
    desiredState: boolean,
    desiredMode?: AcMode,
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
        desiredMode = SettingsService.heatMode == HeatingMode.Winter ? AcMode.Heating : AcMode.Cooling;
      }
    }
    d.setState(desiredMode, forceTime);
    return true;
  }

  /**
   * Turns on/off all AC´s in the home
   * @param {boolean} desiredState
   */
  public static setAllAc(desiredState: boolean): void {
    DaikinService.setAll(desiredState, true);
  }

  /**
   * Changes the status of a given Lamp
   * @param {string} deviceId The device Id of the lamp
   * @param {boolean} state The desired new state
   * @param timeout Desired time after which this should be reverted to normal state
   * @returns {Error | null} In case it failed the Error containing the reason
   */
  public static setLamp(deviceId: string, state: boolean, timeout: number = 60 * 60 * 1000): Error | null {
    const d = this.getDevice(deviceId) as iLamp | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.lamp)) {
      return new Error(`Device with ID ${deviceId} is no Lamp`);
    }
    d.setLight(state, timeout, true);
    return null;
  }

  /**
   * Changes the status of a given actuator
   * @param {string} deviceId The device Id of the actuator
   * @param {boolean} state The desired new state
   * @param timeout Desired time after which this should be reverted to automatic state
   * @returns {Error | null} In case it failed the Error containing the reason
   */
  public static setActuator(deviceId: string, state: boolean, timeout: number = 60 * 60 * 1000): Error | null {
    const d = this.getDevice(deviceId) as iActuator | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.actuator)) {
      return new Error(`Device with ID ${deviceId} is no actuator`);
    }
    d.setActuator(state, timeout, true);
    return null;
  }

  /**
   * Changes the status of a given actuator
   * @param {string} deviceId The device Id of the actuator
   * @param {boolean} state The desired new state
   * @param timeout A chosen Timeout after which the light should be reset
   * @param brightness The desired brightness
   * @param transitionTime The transition time during turnOn/turnOff
   * @returns {Error | null} In case it failed the Error containing the reason
   */
  public static setDimmer(
    deviceId: string,
    state: boolean,
    timeout?: number,
    brightness?: number,
    transitionTime?: number,
  ): Error | null {
    const d = this.getDevice(deviceId) as iDimmableLamp | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.dimmablelamp)) {
      return new Error(`Device with ID ${deviceId} is no dimmablelamp`);
    }
    d.setLight(state, timeout, true, brightness, transitionTime);
    return null;
  }

  /**
   * Changes the status of a given actuator
   * @param {string} deviceId The device Id of the actuator
   * @param {boolean} state The desired new state
   * @param timeout A chosen Timeout after which the light should be reset
   * @param brightness The desired brightness
   * @param transitionTime The transition time during turnOn/turnOff
   * @param {string} color The desired color in 6 digit hex Code
   * @param {number} colorTemp The desired color Temperature (0 = more White)
   * @returns {Error | null} In case it failed the Error containing the reason
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
    const d = this.getDevice(deviceId) as iLedRgbCct | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.ledLamp)) {
      return new Error(`Device with ID ${deviceId} is no dimmablelamp`);
    }
    d.setLight(state, timeout, true, brightness, transitionTime, color, colorTemp);
    return null;
  }

  public static setShutter(deviceId: string, level: number): Error | null {
    const d = this.getDevice(deviceId) as iShutter | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.shutter)) {
      return new Error(`Device with ID ${deviceId} is no Shutter`);
    }
    d.setLevel(level, false);
    if (d.window) {
      // otherwise it will be overridden shortly after
      d.window.desiredPosition = level;
    }
    return null;
  }

  public static speakOnDevice(deviceId: string, message: string, volume: number = 30): Error | null {
    const d = this.getDevice(deviceId) as iSpeaker | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.speaker)) {
      return new Error(`Device with ID ${deviceId} is no speaker`);
    }
    d.speakOnDevice(message, volume);
    return null;
  }

  /**
   * Starts a specified scene
   * @param {string} deviceId The targeted scene
   * @param {number} turnOffTimeout If provided the time in ms after which the scene should end automatically
   * @returns {Error | null} In case it failed the Error containing the reason
   */
  public static startScene(deviceId: string, turnOffTimeout?: number): Error | null {
    const d = this.getDevice(deviceId) as iScene | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.scene)) {
      return new Error(`Device with ID ${deviceId} is no scene`);
    }
    d.startScene(turnOffTimeout);
    return null;
  }

  /**
   * Changes the settings of a given device
   * @param {string} deviceId The id of the device to change the settings
   * @param settings A partial settings object containing the wanted settings properties
   * @returns {Error | null} In case it failed the Error containing the reason
   */
  public static setDeviceSettings(deviceId: string, settings: Partial<DeviceSettings>): Error | null {
    const d = this.getDevice(deviceId) as iBaseDevice;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (d.settings === undefined) {
      return new Error(`Device with ID ${deviceId} has no settings`);
    }
    d.settings.fromPartialObject(settings);
    d.settings.persist(d);
    return null;
  }

  /**
   * Changes the settings of a given room
   * @param {string} roomName The id of the Room to change the settings
   * @param settings A partial settings object containing the wanted settings properties
   * @returns {Error | null} In case it failed the Error containing the reason
   */
  public static setRoomSettings(roomName: string, settings: Partial<DeviceSettings>): Error | null {
    const r = this.getRoom(roomName);
    if (r === undefined) {
      return new Error(`Room with ID ${roomName} not found`);
    }
    r.settings.settingsContainer.fromPartialObject(settings);
    r.settings.settingsContainer.persist(r);
    return null;
  }

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

  public static persistAllDeviceSettings(): void {
    for (const device of Object.values(Devices.alLDevices)) {
      device.settings?.persist(device);
    }
  }

  public static loadAllDeviceSettingsFromDb(): void {
    for (const device of Object.values(Devices.alLDevices)) {
      device.loadDeviceSettings();
    }
  }

  /**
   * Lifts a previously started Block of automatic
   * @param {string} deviceId The target device
   * @returns {Error | null} In case it failed the Error containing the reason
   */
  public static liftAutomaticBlock(deviceId: string): Error | null {
    const d = this.getDevice(deviceId) as iTemporaryDisableAutomatic | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.blockAutomatic)) {
      return new Error(`Device with ID ${deviceId} is not capable of blocking automatic`);
    }
    d.blockAutomationHandler.liftAutomaticBlock();
    return null;
  }

  /**
   * Blocks the automatic of the given device for provided Duration
   * @param {string} deviceId The target device
   * @param {number} duration The duration in ms for which the device should remain in current state
   * @param {CollisionSolving} onCollision The desired Collision Solving strategy, in case the automatic being blocked already
   * @returns {Error | null} In case it failed the Error containing the reason
   */
  public static blockAutomatic(deviceId: string, duration: number, onCollision?: CollisionSolving): Error | null {
    const d = this.getDevice(deviceId) as iTemporaryDisableAutomatic | undefined;
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.blockAutomatic)) {
      return new Error(`Device with ID ${deviceId} is not capable of blocking automatic`);
    }
    d.blockAutomationHandler.disableAutomatic(duration, onCollision);
    return null;
  }
}
