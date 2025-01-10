import { TimeCallbackType } from '../enums';
import { iSunTimeOffsets } from './iSunTimeOffsets';

/**
 *
 */
export interface ITimeCallback {
  /**
   *
   */
  readonly calculationSunrise: Date;
  /**
   *
   */
  lastDone: Date;

  /**
   * The calculated date when this callback should be fired next
   * @warning This might have not yet been recalculated
   */
  nextToDo?: Date;
  /**
   *
   */
  readonly calculationSunset: Date;
  /**
   *
   */
  name: string;
  /**
   *
   */
  type: TimeCallbackType;
  /**
   *
   */
  minuteOffset: number;
  /**
   *
   */
  hours?: number;
  /**
   *
   */
  minutes?: number;
  /**
   *
   */
  sunTimeOffset?: iSunTimeOffsets;
  /**
   *
   */
  cloudOffset?: number;

  /**
   *
   */
  recalcNextToDo(now: Date): void;

  /**
   *
   */
  perform(now: Date): void;
}
