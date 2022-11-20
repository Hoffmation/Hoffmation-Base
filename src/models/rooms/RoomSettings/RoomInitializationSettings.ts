import { iRoomInitializationSettings } from './iRoomInitializationSettings';
import { RoomDeviceAddingSettings } from './roomDeviceAddingSettings';
import { IoBrokerBaseDevice } from '../../../server';

export class RoomInitializationSettings implements iRoomInitializationSettings {
  public deviceAddidngSettings?: RoomDeviceAddingSettings;

  public constructor(public shortName: string) {}

  public static registerRoomForDevices(roomInitializationSettings: RoomInitializationSettings): void {
    if (roomInitializationSettings.deviceAddidngSettings !== undefined) {
      IoBrokerBaseDevice.addRoom(
        roomInitializationSettings.shortName,
        roomInitializationSettings.deviceAddidngSettings,
      );
    }
  }
}
