import { Devices, iActuator, iBaseDevice, iLamp, iScene, iShutter, iSpeaker } from '../../devices';
import { DeviceSettings, LogLevel, RoomBase } from '../../../models';
import { RoomService } from '../room-service';
import { LogObject, ServerLogService } from '../log-service';
import { AcDevice, DaikinService } from '../ac';
import { DeviceCapability } from '../../devices/DeviceCapability';
import { iDimmableLamp } from '../../devices/baseDeviceInterfaces/iDimmableLamp';
import { iLedRgbCct } from '../../devices/baseDeviceInterfaces/iLedRgbCct';

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
   */
  public static setAc(id: string, desiredState: boolean): boolean {
    const d = this.getAc(id);
    if (!d) {
      ServerLogService.writeLog(LogLevel.Warn, `AC Device for id ${id} not found`);
      return false;
    }
    if (!d.deviceCapabilities.includes(DeviceCapability.ac)) {
      ServerLogService.writeLog(LogLevel.Warn, `Device for id ${id} is not an ac`);
      return false;
    }
    if (desiredState) {
      d.turnOn();
    }
    d.deactivateAutomaticChange(60 * 60 * 1000);
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
   * @param timeout Desired time after which this should be reverted to normal state
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
    const d = this.getDevice(deviceId) as iScene | undefined;
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

  public static persistAllDeviceSettings(): void {
    for (const device of Object.values(Devices.alLDevices)) {
      device.settings?.persist(device);
    }
  }
}
