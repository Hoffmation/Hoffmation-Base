import { iMotionSensorSettings } from './iMotionSensorSettings';

/**
 *
 */
export interface iCameraSettings extends iMotionSensorSettings {
  /**
   *
   */
  alertPersonOnTelegram: boolean;
  /**
   *
   */
  movementDetectionOnPersonOnly: boolean;
  /**
   *
   */
  movementDetectionOnDogsToo: boolean;
  /**
   *
   */
  hasAudio: boolean;
  /**
   *
   */
  hasSpeaker: boolean;

  /**
   *
   */
  fromPartialObject(data: Partial<iCameraSettings>): void;

  /**
   *
   */
  toJSON(): Partial<iCameraSettings>;
}
