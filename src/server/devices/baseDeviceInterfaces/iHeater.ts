import { HandleChangeAction, HeaterSettings } from '../../../models/index.js';
import { iRoomDevice } from './iRoomDevice.js';
import { iDisposable } from '../../services/index.js';
import { iTemperatureSensor } from './iTemperatureSensor.js';

// TODO: Migrate to new Command Structure
/**
 * This interface represents a heater device.
 *
 * For devices with {@link DeviceCapability.heater} capability.
 */
export interface iHeater extends iTemperatureSensor, iRoomDevice, iDisposable {
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
   * The interval to persist the heater information
   * This mainly enforces the interval to be implemented.
   */
  readonly persistHeaterInterval: NodeJS.Timeout;

  /**
   * Whether the heater is currently in a season turnoff state (no heating in summer)
   */
  seasonTurnOff: boolean;

  /**
   * Whether any window in the room is open.
   */
  readonly windowOpen: boolean;

  /**
   * Perform a check to calculate the new desired heater state
   */
  checkAutomaticChange(): void;

  /**
   * Persists the current heater information to the database
   */
  persistHeater(): void;

  /**
   * Called when a window handle in the room changes its state
   * @param action
   */
  onHandleChange(action: HandleChangeAction): void;
}
