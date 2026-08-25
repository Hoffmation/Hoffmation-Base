/**
 * Which of the inputs of an outlook are present.
 *
 * This is the reason side of the answer: a caller that got no statement has to be able to say *why*,
 * and the three ways an answer can be absent look alike from the outside. An operator who reads "no
 * consumption history" while the history is there looks in the wrong place.
 */
export interface iEnergyHistoryBasis {
  /** Whether the energy manager reports a usable battery capacity */
  batteryCapacityKnown: boolean;
  /** How many usable consumption window sums the history window yielded */
  consumptionWindows: number;
  /**
   * How many of them the plant demands before an upper quantile of them means anything - reported alongside
   * the count so a caller can say "three of the four required" without reading the plant's dials itself.
   */
  requiredConsumptionWindows: number;
  /** Whether the last history read answered with any consumption readings at all */
  consumptionReadingsSeen: boolean;
  /** Whether a daily weather aggregate is stored for the running day */
  weatherTodayKnown: boolean;
  /** Whether a consumption reading of the running day is present */
  consumptionTodayKnown: boolean;
  /** Whether a model was fitted at all, with or without a feature row of the running day to apply it to */
  modelFitted: boolean;
}
