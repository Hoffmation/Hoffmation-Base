import { MotionSensorSettings } from '../../../models';
import { iRoomDevice } from './iRoomDevice';

// TODO: Add missing Comments
export interface iMotionSensor extends iRoomDevice {
  settings: MotionSensorSettings;
  readonly movementDetected: boolean;
  /**
   * Time since the last motion was detected in seconds
   */
  readonly timeSinceLastMotion: number;
  detectionsToday: number;

  /**
   * Adds a callback for when a motion state has changed.
   * @param pCallback - Function that accepts the new state as parameter
   */
  addMovementCallback(pCallback: (newState: boolean) => void): void;

  /**
   * Persists the current motion information to the database
   */
  persistMotionSensor(): void;
}
