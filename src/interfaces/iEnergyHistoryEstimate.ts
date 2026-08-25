/**
 * A prediction with its uncertainty band.
 */
export interface iEnergyHistoryEstimate {
  /**
   * The point estimate of the change in percentage points
   */
  expectedDelta: number;
  /**
   * expectedDelta - bandSigma * residualSigma
   */
  lowerEdgeDelta: number;
  /**
   * expectedDelta + bandSigma * residualSigma
   */
  upperEdgeDelta: number;
  /**
   * How many observations the underlying model was built from
   */
  sampleDays: number;
}
