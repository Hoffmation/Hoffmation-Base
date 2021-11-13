import { HmIpRoomSettings, ZigbeeRoomSettings } from '../index';

export interface iRoomInitializationSettings {
  hmIpSettings?: HmIpRoomSettings;
  zigbeeSettings?: ZigbeeRoomSettings;
  etage: number;
  shortName: string;
}

