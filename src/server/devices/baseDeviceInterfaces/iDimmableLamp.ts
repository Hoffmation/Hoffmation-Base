import { iLamp } from './iLamp';
import { DimmerSetLightCommand, DimmerSettings, LampToggleLightCommand } from '../../../models';

/**
 * This interface represents a dimmable lamp device.
 */
export interface iDimmableLamp extends iLamp {
  settings: DimmerSettings;

  readonly brightness: number;

  /**
   * This function toggles the light on or off.
   * @param {LampToggleLightCommand} command - The command to execute on the light device.
   */
  toggleLight(command: LampToggleLightCommand): void;

  /**
   * This function sets the light to a specific value.
   * @param {DimmerSetLightCommand} command - The command to execute on the light device.
   */
  setLight(command: DimmerSetLightCommand): void;
}
