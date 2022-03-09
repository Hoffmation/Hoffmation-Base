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

  addExcessConsumer(device: iExcessEnergyConsumer): void;
  recalculatePowerSharing(): void;
}
