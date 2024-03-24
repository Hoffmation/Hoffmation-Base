export interface WeatherTemp {
  /**
   * Average daily temperature in Celsius.
   */
  day: number;
  /**
   * Minimum daily temperature in Celsius.
   */
  min: number;
  /**
   * Maximum daily temperature in Celsius.
   */
  max: number;
  /**
   * Night temperature in Celsius.
   */
  night: number;
  /**
   * Evening temperature in Celsius.
   */
  eve: number;
  /**
   * Morning temperature in Celsius.
   */
  morn: number;
}
