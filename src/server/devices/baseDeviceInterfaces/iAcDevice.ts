import { AcSettings } from '../../../models';
import { AcMode } from '../../services';
import { iBaseDevice } from './iBaseDevice';

/**
 * Interface for normal air-conditioning devices
 * TODO: Migrate to new Command-Based System
 * TODO: Extend from iActuator
 */
export interface iAcDevice extends iBaseDevice {
  /**
   * The settings of the air-conditioning device
   */
  settings: AcSettings;
  /**
   * Whether the air-conditioning device is currently on
   */
  readonly on: boolean;
  /**
   * The current temperature of the air-conditioning device in degrees Celsius
   */
  readonly temperature: number;
  /**
   * The current state of the air-conditioning device
   */
  readonly mode: AcMode;

  /**
   * This function should be called to inform the air-conditioning device about a change of the room temperature
   * @param {number} newTemperatur - The new temperature of the room in degrees Celsius
   */
  onTemperaturChange(newTemperatur: number): void;

  /**
   * Updates the desired mode of the air-conditioning device and writes it to the device if desired
   * @param {AcMode} mode - The new desired mode
   * @param {boolean} writeToDevice - Whether to write the new mode to the device
   */
  setDesiredMode(mode: AcMode, writeToDevice: boolean): void;

  /**
   * Turns the air-conditioning device on without changing the settings
   */
  turnOn(): void;

  /**
   * Turns the air-conditioning device off
   */
  turnOff(): void;
}
