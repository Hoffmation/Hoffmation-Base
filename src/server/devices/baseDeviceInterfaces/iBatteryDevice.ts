import { BatteryLevelChangeAction } from '../../../models';
import { iBaseDevice } from './iBaseDevice';

/**
 * Interface for Battery Devices.
 * A battery device can be any device that is powered by a battery e.g. a remote, a sensor, etc.
 *
 * For devices with {@link DeviceCapability.battery} capability.
 */
export interface iBatteryDevice extends iBaseDevice {
  /**
   * The last time the battery was persisted (in milliseconds since 1970)
   */
  readonly lastBatteryPersist: number;

  /**
   * The battery status of the device in percentage (0 empty - 100 full)
   */
  readonly battery: number;

  /**
   * Method to persist the battery status of the device to the persistence layer
   */
  persistBatteryDevice(): void;

  /**
   * Adds a callback for when the battery-level has Changed.
   * @param pCallback - Function that accepts the new state as parameter
   */
  addBatteryLevelCallback(pCallback: (action: BatteryLevelChangeAction) => void): void;
}
