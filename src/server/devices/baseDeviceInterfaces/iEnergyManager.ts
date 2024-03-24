import { iExcessEnergyConsumer } from './iExcessEnergyConsumer';
import { iBaseDevice } from './iBaseDevice';
import { iDisposable } from '../../services';

// TODO: Add missing Comments
export interface iEnergyManager extends iBaseDevice, iDisposable {
  excessEnergy: number;

  readonly injectingWattage: number;
  readonly drawingWattage: number;
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
