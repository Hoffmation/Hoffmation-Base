import { ActuatorSettings } from '../../models/actuatorSettings';
import { RoomBase } from '../../models/rooms/RoomBase';

export interface iLamp {
  settings: ActuatorSettings;
  lightOn: boolean;
  room: RoomBase | undefined;

  setLight(pValue: boolean, timeout: number, force: boolean): void;
}
