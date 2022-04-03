import { ActuatorSettings } from '../../models';
import { RoomBase } from '../../models';
import { TimeOfDay } from '../services';
import { IoBrokerBaseDevice } from './IoBrokerBaseDevice';

export interface iLamp extends IoBrokerBaseDevice {
  settings: ActuatorSettings;
  lightOn: boolean;
  room: RoomBase | undefined;

  setTimeBased(time: TimeOfDay, timeout: number, force: boolean): void;
  toggleLight(time: TimeOfDay, force: boolean, calculateTime: boolean): void;
  /**
   * This function sets the light to a specific value
   * @param pValue The desired value
   * @param timeout A chosen Timeout after which the light should be reset
   * @param force Wether it is a action based on a user action, to override certain rules
   */
  setLight(pValue: boolean, timeout: number, force: boolean): void;
}
