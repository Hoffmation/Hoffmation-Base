import { ActuatorSettings } from '../../models/actuatorSettings';
import { RoomBase } from '../../models/rooms/RoomBase';
import { TimeOfDay } from '../services/time-callback-service';
import { IoBrokerBaseDevice } from './IoBrokerBaseDevice';

export interface iLamp extends IoBrokerBaseDevice {
  settings: ActuatorSettings;
  lightOn: boolean;
  room: RoomBase | undefined;

  setTimeBased(time: TimeOfDay): void;
  setLight(pValue: boolean, timeout: number, force: boolean): void;
}
