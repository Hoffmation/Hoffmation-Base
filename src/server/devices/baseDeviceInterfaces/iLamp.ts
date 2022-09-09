import { ActuatorSettings, TimeOfDay } from '../../../models';
import { iRoomDevice } from './iRoomDevice';

export interface iLamp extends iRoomDevice {
  settings: ActuatorSettings;
  lightOn: boolean;

  persist(): void;

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
