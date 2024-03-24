import { iRoomInitializationSettings } from './iRoomInitializationSettings';
import { RoomDeviceAddingSettings } from './roomDeviceAddingSettings';
import { IoBrokerBaseDevice } from '../../../server';

export class RoomInitializationSettings implements iRoomInitializationSettings {
  /** @inheritDoc */
  public deviceAddingSettings?: RoomDeviceAddingSettings;

  public constructor(public shortName: string) {}

  public static registerRoomForDevices(roomInitializationSettings: RoomInitializationSettings): void {
    if (roomInitializationSettings.deviceAddingSettings !== undefined) {
      IoBrokerBaseDevice.addRoom(roomInitializationSettings.shortName, roomInitializationSettings.deviceAddingSettings);
    }
  }
}
