import { iRoomDevice } from './iRoomDevice';
import { ProximityCallback, TrilaterationBasePoint } from '../espresense';

/**
 * Interface for Bluetooth detector devices, providing proximity information for tracked devices
 *
 * For devices with {@link DeviceCapability.bluetoothDetector} capability.
 */
export interface iBluetoothDetector extends iRoomDevice {
  /**
   * The position of the device to allow for trilateration-calculations
   */
  position: TrilaterationBasePoint;

  /**
   * Add callback to react on a specified device entering/leaving a given zone
   * @param cb
   */
  addProximityCallback(cb: ProximityCallback): void;

  /**
   * Gets the distance of a currently present device
   * @param deviceName - The mapped Device name
   * @param maxAge - The maximum age in seconds to still respect that device
   * @returns Distance in meters or undefined if currently not present
   */
  distanceOfDevice(deviceName: string, maxAge: number): number | undefined;

  /**
   * Check if a device is currently present and below the given Distance
   * @param deviceName - The mapped Device name
   * @param maxDistance - The maximum distance in meters
   * @param maxAge - The maximum age in seconds to still respect that device
   * @returns
   */
  isDevicePresent(deviceName: string, maxDistance: number, maxAge: number): boolean;
}
