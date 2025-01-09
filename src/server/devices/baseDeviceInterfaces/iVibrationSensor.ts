import { iRoomDevice } from './iRoomDevice.js';

/**
 * This interface represents a vibration sensor device.
 *
 * For devices with {@link DeviceCapability.vibrationSensor} capability.
 */
export interface iVibrationSensor extends iRoomDevice {
  /**
   * Whether the vibration sensor is currently blocked by a handle.
   */
  vibrationBlockedByHandle: boolean;
  /**
   * The timestamp when the vibration sensor was blocked by a handle.
   */
  readonly vibrationBlockedByHandleTimeStamp: number;
  /**
   * Whether the vibration sensor is currently blocked by a motion event.
   */
  vibrationBlockedByMotion: boolean;
  /**
   * The timestamp when the vibration sensor was last blocked by a motion event.
   */
  readonly vibrationBlockedByMotionTimeStamp: number;
  /**
   * Whether the vibration sensor is currently detecting a vibration.
   */
  readonly vibration: boolean;
}
