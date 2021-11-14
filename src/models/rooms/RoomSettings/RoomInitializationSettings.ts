import { iRoomInitializationSettings } from './iRoomInitializationSettings';
import { RoomDeviceAddingSettings } from './roomDeviceAddingSettings';
import { IoBrokerBaseDevice } from '../../../server/devices/IoBrokerBaseDevice';

export class RoomInitializationSettings implements iRoomInitializationSettings {
  public constructor(public shortName: string, public etage: number = -1) {}
  public deviceAddidngSettings?: RoomDeviceAddingSettings;
  public static registerRoomForDevices(roomInitializationSettings: RoomInitializationSettings): void {
    if (roomInitializationSettings.deviceAddidngSettings !== undefined) {
      IoBrokerBaseDevice.addRoom(
        roomInitializationSettings.shortName,
        roomInitializationSettings.deviceAddidngSettings,
      );
    }
  }
}
