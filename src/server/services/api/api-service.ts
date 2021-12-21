import { Devices } from '../../devices/devices';
import { RoomBase } from '../../../models/rooms/RoomBase';
import { IoBrokerBaseDevice } from '../../devices/IoBrokerBaseDevice';

export class API {
  public static getDevices(): { [id: string]: IoBrokerBaseDevice } {
    return Devices.alLDevices;
  }

  public static getDevice(id: string): IoBrokerBaseDevice {
    return Devices.alLDevices[id];
  }

  public static getRooms(): { [name: string]: RoomBase } {
    return RoomBase.Rooms;
  }

  public static getRoom(id: string): RoomBase {
    return RoomBase.Rooms[id];
  }
}
