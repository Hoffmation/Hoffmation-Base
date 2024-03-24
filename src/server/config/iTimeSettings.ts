import { iTimePair } from './iTimePair';

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
