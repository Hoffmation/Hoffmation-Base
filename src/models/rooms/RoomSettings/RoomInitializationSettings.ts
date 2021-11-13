import { HmIpRoomSettings } from './hmIPRoomSettings';
import { ZigbeeRoomSettings } from './zigbeeRoomSettings';
import { iRoomInitializationSettings } from './iRoomInitializationSettings';

export class RoomInitializationSettings implements iRoomInitializationSettings {
  public constructor(public shortName: string, public etage: number = -1) {}

  public hmIpSettings?: HmIpRoomSettings;
  public zigbeeSettings?: ZigbeeRoomSettings;
}
