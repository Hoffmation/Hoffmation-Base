import { iBaseDevice } from './iBaseDevice';

export interface iBatteryDevice extends iBaseDevice {
  /**
   * The battery status of the device in percentage
   * @type {number}
   */
  battery: number;
}
