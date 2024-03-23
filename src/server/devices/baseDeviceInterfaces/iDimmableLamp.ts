import { iLamp } from './iLamp';
import { DimmerSetLightCommand, DimmerSettings, LampToggleLightCommand } from '../../../models';

// TODO: Add missing Comments
export interface iDimmableLamp extends iLamp {
  settings: DimmerSettings;

  readonly brightness: number;

  toggleLight(command: LampToggleLightCommand): void;

  /**
   * This function sets the light to a specific value
   * Accessible in API
   */
  setLight(command: DimmerSetLightCommand): void;
}
