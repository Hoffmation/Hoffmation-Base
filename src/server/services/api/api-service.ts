import { Devices, IBaseDevice } from '../../devices';
import { LogLevel, RoomBase } from '../../../models';
import { RoomService } from '../room-service';
import { LogObject, ServerLogService } from '../log-service';
import { DaikinService, OwnDaikinDevice, OwnDaikinDevices } from '../ac';

export class API {
  /**
   * Gets the instance of an Daikin Device identified by name
   * @param {string} name
   * @returns {OwnDaikinDevice | undefined}
   */
  public static getAc(name: string): OwnDaikinDevice | undefined {
    return OwnDaikinDevices.ownDevices[name];
  }

  public static getDevices(): { [id: string]: IBaseDevice } {
    // console.log(inspect(Devices.alLDevices, false, 3));
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
   * Turns on/off one AC identified by it's name
   * @param name The name of the device, if wrong false will be returned
   * @param {boolean} desiredState
   */
  public static setAc(name: string, desiredState: boolean): boolean {
    const d = this.getAc(name);
    if (!d) {
      ServerLogService.writeLog(LogLevel.Warn, `Daikin Device for name ${name} not found`);
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
}
