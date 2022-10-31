import { iRoomDevice } from './iRoomDevice';

export interface iBatteryDevice extends iRoomDevice {
  readonly lastBatteryPersist: number;

  /**
   * The battery status of the device in percentage
   * @type {number}
   */
  readonly battery: number;

  persistBatteryDevice(): void;
}
