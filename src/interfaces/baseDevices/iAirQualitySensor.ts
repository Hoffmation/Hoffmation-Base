import { iJsonOmitKeys } from '../iJsonOmitKeys';
import { AirQualitySensorChangeAction } from '../../action';

/**
 * The value reported for a metric the sensor does not measure or has not reported yet.
 */
export const UNDEFINED_AIR_QUALITY_VALUE = -1;

/**
 * The set of air quality metrics a sensor can report.
 *
 * Devices differ widely in what they measure, so every member is always present but defaults to
 * {@link UNDEFINED_AIR_QUALITY_VALUE} until the device reports it. This mirrors the sentinel approach of
 * {@link UNDEFINED_TEMP_VALUE} and spares consumers a null check on every metric; use
 * {@link iAirQualitySensor.reports} to tell "not measured" apart from a measured zero.
 */
export interface iAirQualityReadings {
  /**
   * The air quality index as calculated by the device (lower is better)
   */
  aqi: number;
  /**
   * The carbon dioxide concentration in ppm
   */
  co2: number;
  /**
   * The nitrogen oxide index (1 equals background level)
   */
  nox: number;
  /**
   * Particulate matter up to 1.0 µm in µg/m³
   */
  pm1p0: number;
  /**
   * Particulate matter up to 2.5 µm in µg/m³
   */
  pm2p5: number;
  /**
   * Particulate matter up to 4.0 µm in µg/m³
   */
  pm4p0: number;
  /**
   * Particulate matter up to 10.0 µm in µg/m³
   */
  pm10p0: number;
  /**
   * The total volatile organic compounds in ppb
   */
  tvoc: number;
  /**
   * The vape detection reading of the device
   */
  vape: number;
  /**
   * The volatile organic compounds index (100 equals background level)
   */
  voc: number;
}

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
