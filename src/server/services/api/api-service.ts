import { Devices, IBaseDevice } from '../../devices';
import { LogLevel, RoomBase } from '../../../models';
import { RoomService } from '../room-service';
import { LogObject, ServerLogService } from '../log-service';

export class API {
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
}
