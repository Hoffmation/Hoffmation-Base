import { iBaseDevice } from './iBaseDevice';
import { ProximityCallback } from '../espresense';

export interface iBluetoothDetector extends iBaseDevice {
  /**
   * Add callback to react on a specified device entering/leaving a given zone
   * @param cb
   */
  addProximityCallback(cb: ProximityCallback): void;

  distanceOfDevice(deviceName: string): number | undefined;

  isDevicePresent(deviceName: string, maxDistance: number): boolean;
}
