/**
 * The fitted model. Weights are never written by hand - they come out of the fit.
 */
export interface iEnergyHistoryModel {
  /**
   * One weight per feature, in the declaration order of iEnergyHistoryFeatures
   */
  weights: [number, number, number, number];
  /**
   * The constant term of the fit in percentage points
   */
  intercept: number;
  /**
   * Standard deviation of the residuals - this is what the band is made of
   */
  residualSigma: number;
  /**
   * How many observations the fit was built from
   */
  sampleDays: number;
}
