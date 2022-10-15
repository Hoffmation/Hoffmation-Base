import { TimeOfDay } from '../../../models';
import { iActuator } from './iActuator';

export interface iLamp extends iActuator {
  /**
   * The state value of the device
   */
  readonly lightOn: boolean;

  /**
   * Set's the lamp based on lamp settings for the current time
   * @param {TimeOfDay} time The time to use for calculation of desired state
   * @param {number} timeout If > 0 this is the time after which the lamp reverts to its original state
   * @param {boolean} force To indicate a higher priority than automatic actions (e.g. a user pressing a button)
   */
  setTimeBased(time: TimeOfDay, timeout?: number, force?: boolean): void;

  /**
   * Toggles the state of the lamp
   * @param {TimeOfDay} time The time to use for calculation of desired state
   * @param {boolean} force To indicate a higher priority than automatic actions (e.g. a user pressing a button)
   * @param {boolean} calculateTime Alternative to "time", if set the time will be calculated by the lamps room and its settings
   */
  toggleLight(time?: TimeOfDay, force?: boolean, calculateTime?: boolean): void;

  /**
   * This function sets the light to a specific value
   * @param pValue The desired value
   * @param timeout A chosen Timeout after which the light should be reset
   * @param force Wether it is a action based on a user action, to override certain rules
   * Accessible in API
   */
  setLight(pValue: boolean, timeout: number, force: boolean): void;
}
