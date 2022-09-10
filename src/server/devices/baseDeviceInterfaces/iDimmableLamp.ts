import { iLamp } from './iLamp';
import { DimmerSettings, TimeOfDay } from '../../../models';

export interface iDimmableLamp extends iLamp {
  settings: DimmerSettings;

  readonly brightness: number;

  toggleLight(time: TimeOfDay, force: boolean, calculateTime: boolean): void;

  /**
   * This function sets the light to a specific value
   * @param pValue The desired value
   * @param timeout A chosen Timeout after which the light should be reset
   * @param force Wether it is a action based on a user action, to override certain rules
   * @param brightness The desired brightness
   * @param transitionTime The transition time during turnOn/turnOff
   * Accessible in API
   */
  setLight(pValue: boolean, timeout?: number, force?: boolean, brightness?: number, transitionTime?: number): void;
}
