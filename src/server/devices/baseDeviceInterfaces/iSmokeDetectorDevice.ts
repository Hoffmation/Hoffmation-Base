import { iRoomDevice } from './iRoomDevice';

export interface iSmokeDetectorDevice extends iRoomDevice {
  readonly smoke: boolean;

  stopAlarm(quiet: boolean): void;
}
