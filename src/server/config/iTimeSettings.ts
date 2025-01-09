import { iTimePair } from './iTimePair.js';

/**
 * The settings for the time-service.
 */
export interface iTimeSettings {
  /**
   * The time which should be considered as the start of the night
   */
  nightStart: iTimePair;
  /**
   * The time which should be considered as the end of the night
   */
  nightEnd: iTimePair;
}
