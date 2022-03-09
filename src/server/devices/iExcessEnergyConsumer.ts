import { IoBrokerBaseDevice } from './IoBrokerBaseDevice';
import { ExcessEnergyConsumerSettings } from '../../models/excessEnergyConsumerSettings';

export interface iExcessEnergyConsumer extends IoBrokerBaseDevice {
  // Settings like Priority in comparision to other devices
  energyConsumerSettings: ExcessEnergyConsumerSettings;

  // Consumption in Watts, needed to manage the Excess consumer
  currentConsumption: number;
}
