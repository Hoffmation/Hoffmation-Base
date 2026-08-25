/**
 * The four measured or forecast quantities a prediction is based on. Exactly four - no more.
 */
export interface iEnergyHistoryFeatures {
  /**
   * Hours of sunlight left until sunset at the moment of evaluation
   */
  remainingSunHours: number;
  /**
   * Cloud cover in percent for the remainder of the day
   */
  cloudCover: number;
  /**
   * House consumption since midnight in kWh at the moment of evaluation
   */
  consumedSoFarKwh: number;
  /**
   * The day's maximum temperature in degrees celsius
   */
  maxTemperature: number;
}
