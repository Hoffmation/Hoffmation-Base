import { iBaseDevice } from './iBaseDevice';
import { Battery } from '../sharedFunctions';

/**
 * Interface for Battery Devices.
 * A battery device can be any device that is powered by a battery e.g. a remote, a sensor, etc.
 *
 * For devices with {@link DeviceCapability.battery} capability.
 */
export interface iBatteryDevice extends iBaseDevice {
  /**
   * Common battery handling like persisting
   */
  readonly battery: Battery;

  /**
   * The battery status of the device in percentage (0 empty - 100 full)
   */
  readonly batteryLevel: number;
}
