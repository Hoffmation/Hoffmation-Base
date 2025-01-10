import { iLamp } from './iLamp';
import { iDimmerSettings } from '../deviceSettings';
import { DimmerSetLightCommand, LampToggleLightCommand } from '../../models';

/**
 * This interface represents a dimmable lamp device.
 *
 * For devices with {@link DeviceCapability.dimmablelamp} capability.
 */
export interface iDimmableLamp extends iLamp {
  /**
   * The settings of the dimmer providing e.g. brightness settings for different times of the day.
   */
  settings: iDimmerSettings;

  /**
   * The current brightness of the light in percent.
   */
  readonly brightness: number;

  /**
   * This function toggles the light on or off.
   * @param command - The command to execute on the light device.
   */
  toggleLight(command: LampToggleLightCommand): void;

  /**
   * This function sets the light to a specific value.
   * @param command - The command to execute on the light device.
   */
  setLight(command: DimmerSetLightCommand): void;
}
