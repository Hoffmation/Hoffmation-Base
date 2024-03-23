import { iRoomDevice } from './iRoomDevice';

/**
 * Interface for Battery Devices.
 * A battery device can be any device that is powered by a battery e.g. a remote, a sensor, etc.
 */
export interface iBatteryDevice extends iRoomDevice {
  /**
   * The last time the battery was persisted (in milliseconds since 1970)
   * @type {number}
   */
  readonly lastBatteryPersist: number;

  /**
   * The battery status of the device in percentage
   * @type {number}
   */
  readonly battery: number;

  /**
   * Method to persist the battery status of the device to the persistence layer
   * @type {number}
   */
  persistBatteryDevice(): void;
}
