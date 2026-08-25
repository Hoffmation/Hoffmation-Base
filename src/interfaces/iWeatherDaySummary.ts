/**
 * The daily weather aggregate a historical day is characterised by.
 */
export interface iWeatherDaySummary {
  /**
   * The day this aggregate describes, at local midnight
   */
  date: Date;
  /**
   * Cloud cover in percent (0-100)
   */
  cloudCover: number;
  /**
   * The day's minimum temperature in degrees celsius
   */
  tempMin: number;
  /**
   * The day's maximum temperature in degrees celsius
   */
  tempMax: number;
}
