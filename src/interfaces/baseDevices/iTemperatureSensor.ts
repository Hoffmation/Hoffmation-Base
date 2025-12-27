import { iJsonOmitKeys } from '../iJsonOmitKeys';
import { TemperatureSensorChangeAction } from '../../action';
import { iTemperatureMeasurement } from '../iTemperatureMeasurement';

/**
 *
 */
export interface iTemperatureSensor extends iJsonOmitKeys {
  /**
   *
   */
  roomTemperature: number;
  /**
   *
   */
  outdoorTemperatureCorrectionCoefficient: number;
  /**
   *
   */
  lastSeen: number;
  /**
   *
   */
  temperature: number;

  /**
   * Persists the current temperature sensor information to the database
   */
  persist(): void;

  /**
   * Adds a callback to be called when the temperature changes
   * @param pCallback - The callback to be called
   */
  addTempChangeCallback(pCallback: (action: TemperatureSensorChangeAction) => void): void;

  /**
   *
   */
  dispose(): void;

  /**
   *
   */
  toJSON(): Partial<iTemperatureSensor>;

  /**
   * Gets temperature history from the database
   * @param startDate - Optional start date for the query (defaults to start of today)
   * @param endDate - Optional end date for the query (defaults to end of today)
   * @returns The temperature measurements
   */
  getTemperatureHistory(startDate?: Date, endDate?: Date): Promise<iTemperatureMeasurement[]>;
}
