import { iEnergyHistoryFeatures } from './iEnergyHistoryFeatures';

/**
 * One historical observation: the features at a point in time and what happened afterwards.
 */
export interface iEnergyHistorySample {
  /**
   * The four quantities as they were at the moment of evaluation
   */
  features: iEnergyHistoryFeatures;
  /**
   * Change of state of charge in percentage points from the moment of evaluation to the next
   * morning's low, already corrected for what the fossil generators contributed.
   */
  observedDelta: number;
  /**
   * The moment of evaluation this observation belongs to
   */
  date: Date;
}
