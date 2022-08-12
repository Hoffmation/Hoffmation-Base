import { Devices, DeviceType, IBaseDevice, iLamp } from '../../devices';
import { LogLevel, RoomBase } from '../../../models';
import { RoomService } from '../room-service';
import { LogObject, ServerLogService } from '../log-service';
import { AcDevice, DaikinService } from '../ac';

export class API {
  /**
   * Gets the instance of an Ac Device identified by id
   * @param {string} id
   * @returns {OwnDaikinDevice | undefined}
   */
  public static getAc(id: string): AcDevice | undefined {
    const result: IBaseDevice | undefined = this.getDevice(id);
    if (result?.deviceType !== DeviceType.Daikin) {
      return undefined;
    }
    return result as AcDevice;
  }

  public static getDevices(): { [id: string]: IBaseDevice } {
    // console.log(Util.inspect(Devices.alLDevices, false, 5));
    return Devices.alLDevices;
  }

  public static getDevice(id: string): IBaseDevice {
    const d: IBaseDevice | undefined = Devices.alLDevices[id];
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
      ServerLogService.writeLog(LogLevel.Warn, `Daikin Device for id ${id} not found`);
      return false;
    }
    if (desiredState) {
      d.turnOn();
    } else {
      d.deactivateAutomaticTurnOn(60 * 60 * 1000);
    }
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
   * @returns {Error | null} In case it failed the Error containing the reason
   */
  public static setLight(deviceId: string, state: boolean): Error | null {
    const d = this.getDevice(deviceId);
    if (d === undefined) {
      return new Error(`Device with ID ${deviceId} not found`);
    }
    if (typeof (d as iLamp).setLight !== 'function') {
      return new Error(`Device with ID ${deviceId} is no Lamp`);
    }
    (d as iLamp).setLight(state, 60 * 60 * 1000, true);
    return null;
  }
}
