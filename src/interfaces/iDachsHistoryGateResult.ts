/**
 * What the history based start gate decided in its last evaluation.
 *
 * The gate acts only on the plant's verdicts that need no fitted model - see
 * {@link iMorningReserveVerdict.measured}. A modelled verdict lands here with both flags false and is
 * reported for the operator alone.
 */
export interface iDachsHistoryGateResult {
  /** True while the estimate suppresses an electricity driven start */
  suppress: boolean;
  /** True while the estimate asks for a start */
  request: boolean;
  /** The deciding stage and the numbers it decided on, for the log and for the operator */
  reason: string;
  /** State of charge in percent at the moment of the decision */
  currentSoc: number;
  /**
   * Projected morning state of charge in percent at the lower band edge.
   * Without a model there is no band; both edges then collapse onto {@link currentSoc} and
   * {@link sampleDays} is zero.
   */
  lowerEdgeSoc: number;
  /** Projected morning state of charge in percent at the upper band edge */
  upperEdgeSoc: number;
  /** The minimum morning state of charge in percent the decision was measured against */
  reserve: number;
  /** How many historical days the model was fitted on; zero while there is no model */
  sampleDays: number;
}
