import { iRoomDevice } from './iRoomDevice';

export interface iSmokeDetectorDevice extends iRoomDevice {
  /**
   * Indicates if the smoke detector is currently detecting smoke
   */
  readonly smoke: boolean;

  /**
   * Stops the alarm of the smoke detector
   * @param {boolean} quiet - If true, the alarm will be stopped without announcing alarm end.
   */
  stopAlarm(quiet: boolean): void;
}
