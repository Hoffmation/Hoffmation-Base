import { RoomDeviceAddingSettings } from 'index';
import { iRoomInitializationSettings } from 'index';

export class RoomInitializationSettings implements iRoomInitializationSettings {
  public constructor(public shortName: string, public etage: number = -1) {}
  public deviceAddidngSettings?: RoomDeviceAddingSettings;
}
