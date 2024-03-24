/**
 * Temperature data how its recognized by a human for the different times of the day.
 */
export interface WeatherFeelsLike {
  /**
   * Day temperature in Celsius
   */
  day: number;
  /**
   * Night temperature in Celsius
   */
  night: number;
  /**
   * Evening temperature in Celsius
   */
  eve: number;
  /**
   * Morning temperature in Celsius
   */
  morn: number;
}
