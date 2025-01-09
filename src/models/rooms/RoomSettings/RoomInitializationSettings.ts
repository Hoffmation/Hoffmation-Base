import { iRoomInitializationSettings } from './iRoomInitializationSettings.js';
import { RoomDeviceAddingSettings } from './roomDeviceAddingSettings.js';
import { IoBrokerBaseDevice } from '../../../server/index.js';

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
