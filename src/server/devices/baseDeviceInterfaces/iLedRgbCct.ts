import { LedSetLightCommand, LedSettings } from '../../../models';
import { iDimmableLamp } from './iDimmableLamp';

/**
 * Interface for RGB-CCT LED-Devices.
 * A RGB-CCT LED-Device is a LED-Device that is capable of emitting light in different colors and color temperatures.
 *
 * For devices with {@link DeviceCapability.ledLamp} capability.
 */
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
   * @param c - The command to execute
   */
  setLight(c: LedSetLightCommand): void;
}
