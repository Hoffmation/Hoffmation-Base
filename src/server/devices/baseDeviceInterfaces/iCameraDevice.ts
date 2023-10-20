import { iMotionSensor } from './iMotionSensor';
import { CameraSettings } from '../../../models';

export interface iCameraDevice extends iMotionSensor {
  settings: CameraSettings;
  readonly lastImage: string;
  readonly mpegStreamLink: string;
  readonly h264IosStreamLink: string;
  readonly rtspStreamLink: string;
  readonly currentImageLink: string;
  readonly alarmBlockedByGriff: boolean;
  readonly alarmBlockedByGriffTimeStamp: number;

  onGriffUpdate(open: boolean): void;

  update(idSplit: string[], state: ioBroker.State): void;
}
