import { ExcessEnergyConsumerSettings } from '../../../models';
import { iBaseDevice } from './iBaseDevice';

// TODO: Add missing Comments
export interface iExcessEnergyConsumer extends iBaseDevice {
  readonly energySettings: ExcessEnergyConsumerSettings;

  // Consumption in Watts, needed to manage the Excess consumer
  currentConsumption: number;
  // Whether this consumer is currently on or off
  on: boolean;

  /**
   * Check if this device is available to consume excess energy
   * --> Device might be unavailable due to a force action from the user or other circumstances
   * @returns {boolean} Whether this device is available to be turned on to consume excess energy
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
   * @returns {boolean} Whether this device was activated by excess energy
   */
  wasActivatedByExcessEnergy(): boolean;
}
