import { MotionSensorSettings } from '../../models';
import { IBaseDevice } from './iBaseDevice';

export interface iMotionSensor extends IBaseDevice {
  settings: MotionSensorSettings;
  movementDetected: boolean;
  readonly timeSinceLastMotion: number;
  detectionsToday: number;

  /**
   * Adds a callback for when a motion state has changed.
   * @param pCallback Function that accepts the new state as parameter
   */
  addMovementCallback(pCallback: (newState: boolean) => void): void;
}
