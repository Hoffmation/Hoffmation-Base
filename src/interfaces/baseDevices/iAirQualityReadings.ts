/**
 * The set of air quality metrics a sensor can report.
 *
 * Devices differ widely in what they measure, so every member is always present but defaults to
 * `UNDEFINED_AIR_QUALITY_VALUE` until the device reports it. This mirrors the sentinel approach of
 * `UNDEFINED_TEMP_VALUE` and spares consumers a null check on every metric; use
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
