import { iRoomDevice } from './iRoomDevice';

export interface iVibrationSensor extends iRoomDevice {
  vibrationBlockedByGriff: boolean;
  vibrationBlockedByGriffTimeStamp: number;
  vibrationBlockedByMotion: boolean;
  vibrationBlockedByMotionTimeStamp: number;
  vibration: boolean;

  alarmCheck(): void;
}
