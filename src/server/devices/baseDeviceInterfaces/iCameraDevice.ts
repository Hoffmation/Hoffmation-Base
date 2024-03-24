import { iMotionSensor } from './iMotionSensor';
import { CameraSettings } from '../../../models';

// TODO: Add missing Comments
export interface iCameraDevice extends iMotionSensor {
  settings: CameraSettings;
  readonly lastImage: string;
  readonly mpegStreamLink: string;
  readonly h264IosStreamLink: string;
  readonly rtspStreamLink: string;
  readonly currentImageLink: string;
  readonly alarmBlockedByGriff: boolean;
  readonly alarmBlockedByGriffTimeStamp: number;

  /**
   * Inform this camera of certain handles being opened/closed to allow it to react accordingly (e.g. don't send alarm, for owner going into the garden)
   * @param {boolean} open - Whether the handle is open or closed
   */
  onGriffUpdate(open: boolean): void;

  /**
   * Inform this camera of state updates within iOBroker
   * TODO: Make camera independent of iOBroker
   * @param idSplit - The id split of the state
   * @param state - The state that has been updated
   */
  update(idSplit: string[], state: ioBroker.State): void;
}
