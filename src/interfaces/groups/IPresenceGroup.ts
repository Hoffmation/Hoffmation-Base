import {
  MotionSensorAction,
  PresenceGroupAnyMovementAction,
  PresenceGroupFirstEnterAction,
  PresenceGroupLastLeftAction,
} from '../../action';
import { iMotionSensor } from '../index';

/**
 *
 */
export interface iPresenceGroup {
  /**
   *
   */
  readonly lastLeftDelayActive: boolean;

  /**
   *
   */
  getMotionDetector(): Array<iMotionSensor>;

  /**
   *
   */
  initCallbacks(): void;

  /**
   *
   */
  anyPresent(includeMovementResetDelayCheck: boolean): boolean;

  /**
   *
   */
  addLastLeftCallback(cb: (action: PresenceGroupLastLeftAction) => void): void;

  /**
   *
   */
  addAnyMovementCallback(cb: (action: PresenceGroupAnyMovementAction) => void): void;

  /**
   *
   */
  presentAmount(): number;

  /**
   *
   */
  fireFistEnterCBs(action: MotionSensorAction): void;

  /**
   *
   */
  addFirstEnterCallback(cb: (action: PresenceGroupFirstEnterAction) => void): void;

  /**
   *
   */
  motionSensorOnAnyMovement(action: MotionSensorAction): void;

  /**
   *
   */
  motionSensorOnLastLeft(action: MotionSensorAction): void;

  /**
   * Calculates whether we are after (negative if before) the time the movement
   * reset timer should have reset the movement.
   * @returns The time in milliseconds after the reset time.
   */
  getTimeAfterReset(): number;

  /**
   * In case of an existing delayed last left callback timeout, this removes it.
   */
  resetLastLeftTimeout(): void;

  /**
   *
   */
  executeAnyMovementCbs(action: PresenceGroupAnyMovementAction): void;

  /**
   *
   */
  executeLastLeftCbs(action: PresenceGroupLastLeftAction): void;
}
