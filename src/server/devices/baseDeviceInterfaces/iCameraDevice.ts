import { iMotionSensor } from './iMotionSensor';
import { CameraSettings } from '../../../models';

export interface iCameraDevice extends iMotionSensor {
  settings: CameraSettings;
  readonly lastImage: string;
  readonly mpegStreamLink: string;
  readonly h264IosStreamLink: string;
  readonly currentImageLink: string;
  readonly alarmBlockedByGriff: boolean;
  readonly alarmBlockedByGriffTimeStamp: number;

  onGriffUpdate(open: boolean): void;

  update(stateName: string, state: ioBroker.State): void;
}