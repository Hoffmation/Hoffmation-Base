import { LedSetLightCommand, LedSettings } from '../../../models';
import { iDimmableLamp } from './iDimmableLamp';

// TODO: Add missing Comments
export interface iLedRgbCct extends iDimmableLamp {
  settings: LedSettings;
  readonly color: string;
  readonly colortemp: number;

  /**
   * This function sets the light to a specific value
   * Accessible in API
   * @param {LedSetLightCommand} c - The command to execute
   */
  setLight(c: LedSetLightCommand): void;
}
