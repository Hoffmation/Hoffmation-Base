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
  /**
   * Total precipitation of the day in millimetres, or `undefined` when the day carries no reading for it.
   *
   * Optional on purpose, in two directions. Towards implementers: this aggregate is produced by whoever calls
   * `persistWeatherDaySummary`, and a required field would stop existing code from compiling for a quantity
   * the previous three consumers never asked for. Towards the record itself: the three fields above decide
   * whether a day counts at all - a day whose cloud cover is missing is discarded, because a substitute would
   * be fitted as if measured. Precipitation must not join that rule. A day without it is still a perfectly
   * good day for the decisions that read cloud cover and temperature, and discarding it would tear holes into
   * a history those decisions already depend on.
   */
  precipitation?: number;
}
