import { Devices } from '../../devices/devices';
import { RoomBase } from '../../../models/rooms/RoomBase';
import { IoBrokerBaseDevice } from '../../devices/IoBrokerBaseDevice';
import { RoomService } from '../room-service/room-service';

export class API {
  public static getDevices(): { [id: string]: IoBrokerBaseDevice } {
    return Devices.alLDevices;
  }

  public static getDevice(id: string): IoBrokerBaseDevice {
    return Devices.alLDevices[id];
  }

  public static getRooms(): Map<string, RoomBase> {
    return RoomService.Rooms;
  }

  public static getRoom(id: string): RoomBase | undefined {
    return RoomService.Rooms.get(id);
  }
}
