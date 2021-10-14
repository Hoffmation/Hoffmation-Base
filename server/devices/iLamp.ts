import { RoomBase } from '../../models/rooms/RoomBase';
import { LampSettings } from '../../models/lampSettings';

export interface iLamp {
  settings: LampSettings;
  lightOn: boolean;
  room: RoomBase | undefined;

  setLight(pValue: boolean, timeout: number, force: boolean): void;
}
