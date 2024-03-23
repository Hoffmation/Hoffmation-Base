import { iRoomDevice } from './iRoomDevice';

// TODO: Add missing Comments
export interface iVibrationSensor extends iRoomDevice {
  vibrationBlockedByGriff: boolean;
  vibrationBlockedByGriffTimeStamp: number;
  vibrationBlockedByMotion: boolean;
  vibrationBlockedByMotionTimeStamp: number;
  vibration: boolean;

  alarmCheck(): void;
}
