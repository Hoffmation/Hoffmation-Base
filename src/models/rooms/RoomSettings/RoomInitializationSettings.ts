import { RoomDeviceAddingSettings } from './roomDeviceAddingSettings';
import { iRoomInitializationSettings } from './iRoomInitializationSettings';

export class RoomInitializationSettings implements iRoomInitializationSettings {
  public constructor(public shortName: string, public etage: number = -1) {}
  public deviceAddidngSettings?: RoomDeviceAddingSettings;
}
