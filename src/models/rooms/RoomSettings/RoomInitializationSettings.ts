import { iRoomInitializationSettings } from '../../../interfaces';
import { RoomDeviceAddingSettings } from './roomDeviceAddingSettings';
import { IoBrokerBaseDevice } from '../../../devices';

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
