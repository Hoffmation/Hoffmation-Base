import { iBaseDevice } from './iBaseDevice';
import { iExcessEnergyConsumerSettings } from '../settings';
import { ExcessEnergyConsumerSetStateCommand } from '../../command';

/**
 * This interface represents a device that can consume excess energy.
 *
 * For devices with {@link DeviceCapability.excessEnergyConsumer} capability.
 */
export interface iExcessEnergyConsumer extends iBaseDevice {
  /**
   * The energy consuming settings for this device
   */
  readonly energySettings: iExcessEnergyConsumerSettings;

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
   * Start or stop this device following an energy-manager decision.
   *
   * One entry point rather than separate turn-on/turn-off methods, so the desired state can
   * only come from the command and cannot contradict the method that was called.
   * @param c - The decision this results from, carrying the measurement it was based on
   */
  setExcessEnergyState(c: ExcessEnergyConsumerSetStateCommand): void;

  /**
   * Check if this device was activated by excess energy
   * @returns Whether this device was activated by excess energy
   */
  wasActivatedByExcessEnergy(): boolean;
}
