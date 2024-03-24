import { HeaterSettings } from '../../../models';
import { iRoomDevice } from './iRoomDevice';
import { iDisposable } from '../../services';

// TODO: Migrate to new Command Structure
export interface iHeater extends iRoomDevice, iDisposable {
  settings: HeaterSettings;
  desiredTemperature: number;
  readonly humidity: number;
  // The level between 0 and 1.0
  readonly iLevel: number;
  readonly iTemperature: number;
  roomTemperature: number;
  readonly persistHeaterInterval: NodeJS.Timeout;

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
