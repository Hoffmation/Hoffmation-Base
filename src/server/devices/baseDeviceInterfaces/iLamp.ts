import { TimeOfDay } from '../../../models';
import { iActuator } from './iActuator';

export interface iLamp extends iActuator {
  lightOn: boolean;

  setTimeBased(time: TimeOfDay, timeout: number, force: boolean): void;

  toggleLight(time: TimeOfDay, force: boolean, calculateTime: boolean): void;

  /**
   * This function sets the light to a specific value
   * @param pValue The desired value
   * @param timeout A chosen Timeout after which the light should be reset
   * @param force Wether it is a action based on a user action, to override certain rules
   * Accessible in API
   */
  setLight(pValue: boolean, timeout: number, force: boolean): void;
}
