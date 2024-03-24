import { iExcessEnergyConsumer } from './iExcessEnergyConsumer';
import { iBaseDevice } from './iBaseDevice';
import { iDisposable } from '../../services';

/**
 * Interface for devices that can manage energy consumption and production.
 *
 * For devices with {@link DeviceCapability.energyManager} capability.
 */
export interface iEnergyManager extends iBaseDevice, iDisposable {
  /**
   * The total energy being excessive at the moment of last calculation.
   *
   * For devices with {@link DeviceCapability.energyManager} capability.
   */
  excessEnergy: number;

  /**
   * The total wattaage being injected into the grid at the moment of last calculation.
   */
  readonly injectingWattage: number;
  /**
   * The total wattage being drawn from the grid at the moment of last calculation.
   */
  readonly drawingWattage: number;
  /**
   * The total wattage being consumed within the house at the moment of last calculation.
   */
  readonly selfConsumingWattage: number;

  /**
   * Add a device that can consume excess energy
   * @param device - The device that can consume excess energy
   */
  addExcessConsumer(device: iExcessEnergyConsumer): void;

  /**
   * Recalculates power-sharing between devices.
   */
  recalculatePowerSharing(): void;

  /**
   * Generates a report stating used energy and devices that consumed it
   * @returns The report
   */
  getReport(): string;
}
