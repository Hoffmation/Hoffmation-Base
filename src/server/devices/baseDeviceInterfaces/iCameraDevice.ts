import { iMotionSensor } from './iMotionSensor';
import { CameraSettings } from '../../../models';
import { iBaseDevice } from './iBaseDevice';

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
   * The link to access the mpeg stream of the camera
   */
  readonly mpegStreamLink: string;
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
   * Inform this camera of a device, which blocks the alarm (or should unlift its block)
   * @param device - The device to block/unblock the alarm for
   * @param block - Whether to block the alarm for the device or lift the block
   */
  blockForDevice(device: iBaseDevice, block: boolean): void;

  /**
   * Inform this camera of state updates within iOBroker
   * TODO: Make camera independent of iOBroker
   * @param idSplit - The id split of the state
   * @param state - The state that has been updated
   */
  update(idSplit: string[], state: ioBroker.State): void;
}
