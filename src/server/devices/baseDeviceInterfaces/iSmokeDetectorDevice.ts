import { iRoomDevice } from './iRoomDevice';

// TODO: Add missing Comments
export interface iSmokeDetectorDevice extends iRoomDevice {
  readonly smoke: boolean;

  stopAlarm(quiet: boolean): void;
}
