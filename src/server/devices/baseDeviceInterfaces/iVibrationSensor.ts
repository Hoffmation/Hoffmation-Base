import { IBaseDevice } from './iBaseDevice';

export interface iVibrationSensor extends IBaseDevice {
  vibrationBlockedByGriff: boolean;
  vibrationBlockedByGriffTimeStamp: number;
  vibrationBlockedByMotion: boolean;
  vibrationBlockedByMotionTimeStamp: number;
  vibration: boolean;

  alarmCheck(): void;
}
