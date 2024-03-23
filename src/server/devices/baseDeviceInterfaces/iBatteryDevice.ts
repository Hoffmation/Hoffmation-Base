import { iRoomDevice } from './iRoomDevice';

// TODO: Add missing Comments
export interface iBatteryDevice extends iRoomDevice {
  readonly lastBatteryPersist: number;

  /**
   * The battery status of the device in percentage
   * @type {number}
   */
  readonly battery: number;

  persistBatteryDevice(): void;
}
