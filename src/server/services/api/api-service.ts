import { Devices } from '../../devices/devices';
import { RoomBase } from '../../../models/rooms/RoomBase';
import { IoBrokerBaseDevice } from '../../devices/IoBrokerBaseDevice';
import { RoomService } from '../room-service/room-service';
import { ServerLogService } from '../log-service';
import { LogLevel } from '../../../models/logLevel';

export class API {
  public static getDevices(): { [id: string]: IoBrokerBaseDevice } {
    return Devices.alLDevices;
  }

  public static getDevice(id: string): IoBrokerBaseDevice {
    const d: IoBrokerBaseDevice | undefined = Devices.alLDevices[id];
    if (d === undefined) {
      ServerLogService.writeLog(LogLevel.Warn, `Api.getDevice() --> "${id}" not found`);
    }
    return Devices.alLDevices[id];
  }

  public static getRooms(): Map<string, RoomBase> {
    return RoomService.Rooms;
  }

  public static getRoom(id: string): RoomBase | undefined {
    return RoomService.Rooms.get(id);
  }
}
