import { LedSetLightCommand, LedSettings } from '../../../models';
import { iDimmableLamp } from './iDimmableLamp';

// TODO: Add missing Comments
export interface iLedRgbCct extends iDimmableLamp {
  /**
   * The settings of the LED-Device (e.g. brightness, color, colortemp) for different times of the day
   */
  settings: LedSettings;
  /**
   * The currently active color in HEX representation
   */
  readonly color: string;
  /**
   * The currently active color temperature
   */
  readonly colortemp: number;

  /**
   * This function sets the light to a specific value
   * Accessible in API
   * @param {LedSetLightCommand} c - The command to execute
   */
  setLight(c: LedSetLightCommand): void;
}
