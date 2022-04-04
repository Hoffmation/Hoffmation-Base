import { IoBrokerBaseDevice } from './IoBrokerBaseDevice';
import { iExcessEnergyConsumer } from './iExcessEnergyConsumer';

export interface iEnergyManager extends IoBrokerBaseDevice {
  // Consumption from non controlled Devices in Watts
  baseConsumption: number;
  // Total available Energy in Watts
  currentProduction: number;
  // Remaining Energy in Watts
  excessEnergy: number;
  // Consumption from ExcessEnergyConsumer in Watts
  excessEnergyConsumerConsumption: number;
  // Total Consumption in Watts
  totalConsumption: number;
  // What is drawn from the Grid
  drawingWattage: number;
  // The consumed amount from own production
  selfConsumingWattage: number;
  // The power amount injected into the grid
  injectingWattage: number;

  addExcessConsumer(device: iExcessEnergyConsumer): void;
  recalculatePowerSharing(): void;

  cleanup(): void;
}
