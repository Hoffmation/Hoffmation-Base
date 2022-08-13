import { iBaseDevice } from './iBaseDevice';

export interface iVibrationSensor extends iBaseDevice {
  vibrationBlockedByGriff: boolean;
  vibrationBlockedByGriffTimeStamp: number;
  vibrationBlockedByMotion: boolean;
  vibrationBlockedByMotionTimeStamp: number;
  vibration: boolean;

  alarmCheck(): void;
}
