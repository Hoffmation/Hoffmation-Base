import { iRoomDevice } from './iRoomDevice';
import { ProximityCallback, TrilaterationBasePoint } from '../espresense';

export interface iBluetoothDetector extends iRoomDevice {
  position?: TrilaterationBasePoint;

  /**
   * Add callback to react on a specified device entering/leaving a given zone
   * @param cb
   */
  addProximityCallback(cb: ProximityCallback): void;

  /**
   * Gets the distance of a currently present device
   * @param {string} deviceName The mapped Device name
   * @param {number} maxAge The maximum age in seconds to still respect that device
   * @returns {number | undefined} Distance in meters or undefined if currently not present
   */
  distanceOfDevice(deviceName: string, maxAge: number): number | undefined;

  /**
   * Check if a device is currently present and below the given Distance
   * @param {string} deviceName The mapped Device name
   * @param {number} maxDistance The maximum distance in meters
   * @param {number} maxAge The maximum age in seconds to still respect that device
   * @returns {boolean}
   */
  isDevicePresent(deviceName: string, maxDistance: number, maxAge: number): boolean;
}
