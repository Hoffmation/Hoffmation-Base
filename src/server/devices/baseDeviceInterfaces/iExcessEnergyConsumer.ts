import { ExcessEnergyConsumerSettings } from '../../../models';
import { IBaseDevice } from './iBaseDevice';

export interface iExcessEnergyConsumer extends IBaseDevice {
  // Settings like Priority in comparision to other devices
  energyConsumerSettings: ExcessEnergyConsumerSettings;

  // Consumption in Watts, needed to manage the Excess consumer
  currentConsumption: number;
}
