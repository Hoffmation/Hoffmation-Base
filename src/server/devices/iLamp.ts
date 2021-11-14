import { RoomBase } from 'index';
import { ActuatorSettings } from 'index';

export interface iLamp {
  settings: ActuatorSettings;
  lightOn: boolean;
  room: RoomBase | undefined;

  setLight(pValue: boolean, timeout: number, force: boolean): void;
}
