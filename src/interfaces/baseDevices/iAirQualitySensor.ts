import { iJsonOmitKeys } from '../iJsonOmitKeys';
import { AirQualitySensorChangeAction } from '../../action';
import { iAirQualityReadings } from './iAirQualityReadings';

/**
 * Common handling for a device measuring air quality.
 */
export interface iAirQualitySensor extends iJsonOmitKeys {
  /**
   * The most recent readings of this sensor
   */
  readonly readings: iAirQualityReadings;
  /**
   * The timestamp in ms of the last received reading
   */
  lastSeen: number;

  /**
   * Applies new readings, firing the change callbacks if at least one value actually changed.
   * @param readings - The metrics reported by the device, omitting the ones it does not measure
   */
  update(readings: Partial<iAirQualityReadings>): void;

  /**
   * Whether the device actually measures the given metric.
   * @param metric - The metric to check
   * @returns True if the device has reported a value for it
   */
  reports(metric: keyof iAirQualityReadings): boolean;

  /**
   * Persists the current air quality information to the database
   */
  persist(): void;

  /**
   * Adds a callback to be called when any of the readings change
   * @param pCallback - The callback to be called
   */
  addAirQualityCallback(pCallback: (action: AirQualitySensorChangeAction) => void): void;

  /**
   * Frees up the resources of this sensor
   */
  dispose(): void;

  /**
   * @returns The serializable representation of this sensor
   */
  toJSON(): Partial<iAirQualitySensor>;
}
