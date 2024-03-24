import { HeaterSettings } from '../../../models';
import { iRoomDevice } from './iRoomDevice';
import { iDisposable } from '../../services';

// TODO: Migrate to new Command Structure
/**
 * This interface represents a heater device.
 *
 * For devices with {@link DeviceCapability.heater} capability.
 */
export interface iHeater extends iRoomDevice, iDisposable {
  /**
   * The settings of the heater
   */
  settings: HeaterSettings;
  /**
   * The desired temperature in degree Celsius for this room.
   */
  desiredTemperature: number;
  /**
   * The current valve position of the heater (between 0 and 1.0)
   */
  readonly iLevel: number;
  /**
   * The current temperature in degree Celsius of the heater
   */
  readonly iTemperature: number;
  /**
   * The current room temperature in degree Celsius
   */
  roomTemperature: number;
  /**
   * The interval to persist the heater information
   * This mainly enforces the interval to be implemented.
   */
  readonly persistHeaterInterval: NodeJS.Timeout;

  /**
   * Whether the heater is currently in a season turnoff state (no heating in summer)
   */
  seasonTurnOff: boolean;

  /**
   * Perform a check to calculate the new desired heater state
   */
  checkAutomaticChange(): void;

  /**
   * Informs the heater that the temperature of the room has changed
   * @param newTemperatur - The new temperature in degree Celsius.
   */
  onTemperaturChange(newTemperatur: number): void;

  /**
   * Persists the current heater information to the database
   */
  persistHeater(): void;
}
