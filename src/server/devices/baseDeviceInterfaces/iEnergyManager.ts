import { iExcessEnergyConsumer } from './iExcessEnergyConsumer';
import { iBaseDevice } from './iBaseDevice';

export interface iEnergyManager extends iBaseDevice {
  excessEnergy: number;

  readonly injectingWattage: number;
  readonly drawingWattage: number;
  readonly selfConsumingWattage: number;

  addExcessConsumer(device: iExcessEnergyConsumer): void;

  recalculatePowerSharing(): void;

  cleanup(): void;

  getReport(): string;
}
