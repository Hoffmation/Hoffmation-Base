/**
 * Interface for a device that can measure the load power in Watts
 *
 * For devices with {@link DeviceCapability.loadMetering} capability.
 */
export interface iLoadMeter {
  /**
   * The current load power in Watts
   */
  readonly loadPower: number;
}
