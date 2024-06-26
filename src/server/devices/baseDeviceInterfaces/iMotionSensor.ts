import { MotionSensorAction, MotionSensorSettings } from '../../../models';
import { iRoomDevice } from './iRoomDevice';

/**
 * This interface represents a motion sensor device.
 *
 * For devices with {@link DeviceCapability.motionSensor} capability.
 */
export interface iMotionSensor extends iRoomDevice {
  /**
   * The settings of the MotionSensor
   */
  settings: MotionSensorSettings;
  /**
   * Whether motion is currently detected
   */
  readonly movementDetected: boolean;
  /**
   * Time since the last motion was detected in seconds
   */
  readonly timeSinceLastMotion: number;
  /**
   * The number of detections today so far
   */
  detectionsToday: number;

  /**
   * Adds a callback for when a motion state has changed.
   * @param pCallback - Function that accepts the new state as parameter
   */
  addMovementCallback(pCallback: (action: MotionSensorAction) => void): void;

  /**
   * Persists the current motion information to the database
   */
  persistMotionSensor(): void;
}
