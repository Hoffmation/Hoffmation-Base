import { iEnergyHistoryBasis } from './iEnergyHistoryBasis';
import { iProjectedSocBand } from './iProjectedSocBand';

/**
 * The raw quantities the plant can state about the coming morning low at one moment, with no arithmetic on
 * them. The judgement made from them is {@link iMorningReserveVerdict}, which is what a consumer normally
 * reads.
 */
export interface iEnergyHistoryOutlook {
  /**
   * The state of charge in percent every projection below starts from.
   *
   * Carried along rather than left to the reader, because a consumer that quoted its own charge level next to
   * these projections could quote a different one than they were built on.
   */
  currentSoc: number;
  /** Hours of sun left on the day of the moment asked about, never negative */
  remainingSunHours: number;
  /**
   * Where the state of charge would bottom out if no further photovoltaic yield arrived at all, in
   * percent - `undefined` while capacity or consumption history are missing, see {@link basis}.
   */
  worstCaseLowSoc: number | undefined;
  /**
   * The projected state of charge at the coming morning low at both edges of the residual band, in
   * percent - `undefined` while there is no fitted model or no complete feature row for the running day.
   */
  band: iProjectedSocBand | undefined;
  /**
   * The standard deviation of the fitted model's residuals in percentage points - `undefined` while there is
   * no fitted model.
   *
   * Reported alongside {@link band} rather than hidden inside it, so that a consumer which one day may act on
   * the model can form edges of its own width from the two without a second reading of the same history. That
   * is the whole reason it is here; nothing reads it yet and no mechanism is built for it.
   */
  residualSigma: number | undefined;
  /** How many historical days the model was fitted on; zero while there is none */
  sampleDays: number;
  /** Which inputs the answer could be built from */
  basis: iEnergyHistoryBasis;
}
