import { iMotionSensor } from './iMotionSensor';
import { iBaseDevice } from './iBaseDevice';
import { CameraSettings } from '../../models/deviceSettings';

/**
 * An interface for any device with {@link DeviceCapability.camera} capability
 */
export interface iCameraDevice extends iMotionSensor {
  /**
   * The settings of the camera device
   */
  settings: CameraSettings;
  /**
   * The last image taken by the camera as a base64 encoded string
   */
  readonly lastImage: string;
  /**
   * The link to access the h264 stream of the camera
   */
  readonly h264IosStreamLink: string;
  /**
   * The link to access the rtsp stream of the camera
   */
  readonly rtspStreamLink: string;
  /**
   * The link to obtain a fresh image from the camera
   */
  readonly currentImageLink: string;
  /**
   * Whether the alarm is currently blocked by a certain device (e.g. an open handle for house-to-garden door)
   */
  readonly alarmBlockedByDevices: boolean;

  /**
   * Whether the camera has currently detected a dog
   */
  readonly dogDetected: boolean;
  /**
   * Whether the camera has currently detected a human
   */
  readonly personDetected: boolean;

  /**
   * Inform this camera of a device, which blocks the alarm (or should unlift its block)
   * @param device - The device to block/unblock the alarm for
   * @param block - Whether to block the alarm for the device or lift the block
   */
  blockForDevice(device: iBaseDevice, block: boolean): void;
}
