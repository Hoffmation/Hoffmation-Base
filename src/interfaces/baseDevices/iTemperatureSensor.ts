import { iJsonOmitKeys } from '../iJsonOmitKeys';
import { TemperatureSensorChangeAction } from '../../action';

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
}
