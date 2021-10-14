import { RoomBase } from '../../models/rooms/RoomBase';
import { ActuatorSettings } from '../../models/actuatorSettings';

export interface iLamp {
  settings: ActuatorSettings;
  lightOn: boolean;
  room: RoomBase | undefined;

  setLight(pValue: boolean, timeout: number, force: boolean): void;
}
