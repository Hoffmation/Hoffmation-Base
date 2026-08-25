/**
 * House consumption over a stretch of time in kWh.
 *
 * The same shape serves both ends of the consumption calculation: a single persisted reading of one
 * measuring interval, and the sum of those readings over a whole evaluation window. What separates
 * the two is not the type but the step that produced it - see
 * EnergyHistoryUtils.windowConsumptionSums, which turns the former into the latter.
 *
 * The distinction matters in exactly one place: the upper quantile is read from the distribution of
 * window sums across the days, never from the individual readings. Summing per reading quantiles
 * would apply the safety margin once per interval instead of once per window.
 */
export interface iConsumptionWindowSample {
  /**
   * House consumption over the interval or window in kWh
   */
  consumedKwh: number;
  /**
   * Which end of the stretch this is depends on which of the two kinds the sample is, and the two
   * differ: a raw persisted reading is dated at the END of the measuring interval it closes, the way
   * iPersist hands it over, while a window sum produced by EnergyHistoryUtils.windowConsumptionSums is
   * dated at the START of its window. Producers of the raw kind must not switch to the start, and
   * consumers must not assume one meaning for both.
   */
  date: Date;
}
