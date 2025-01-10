import { iBaseDevice } from './iBaseDevice';
import { AcMode, AcSettings } from '../../models/deviceSettings';

/**
 * Interface for normal air-conditioning devices
 *
 * For devices with {@link DeviceCapability.ac} capability.
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
   * The temperature of the room where this device is located
   */
  readonly roomTemperature: number;
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
   * @param newTemperatur - The new temperature of the room in degrees Celsius
   */
  onTemperaturChange(newTemperatur: number): void;

  /**
   * Updates the desired mode of the air-conditioning device and writes it to the device if desired
   * @param mode - The new desired mode
   * @param writeToDevice - Whether to write the new mode to the device
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

  /**
   * Calculates the desired mode based on the current settings and the room temperature
   * @returns The desired mode
   */
  calculateDesiredMode(): AcMode;
}
