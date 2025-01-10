import { iBaseDevice } from './iBaseDevice';
import { ExcessEnergyConsumerSettings } from '../../models/excessEnergyConsumerSettings';

/**
 * This interface represents a device that can consume excess energy.
 *
 * For devices with {@link DeviceCapability.excessEnergyConsumer} capability.
 */
export interface iExcessEnergyConsumer extends iBaseDevice {
  /**
   * The energy consuming settings for this device
   */
  readonly energySettings: ExcessEnergyConsumerSettings;

  /**
   * Consumption in Watts, needed to manage the Excess consumer
   */
  currentConsumption: number;
  /**
   * Whether this consumer is currently on or off
   */
  on: boolean;

  /**
   * Check if this device is available to consume excess energy
   * --> Device might be unavailable due to a force action from the user or other circumstances
   * @returns Whether this device is available to be turned on to consume excess energy
   */
  isAvailableForExcessEnergy(): boolean;

  /**
   * Turn on this device to consume excess energy
   */
  turnOnForExcessEnergy(): void;

  /**
   * Turn off this device as we don't have enough excess energy to power it
   */
  turnOffDueToMissingEnergy(): void;

  /**
   * Check if this device was activated by excess energy
   * @returns Whether this device was activated by excess energy
   */
  wasActivatedByExcessEnergy(): boolean;
}
