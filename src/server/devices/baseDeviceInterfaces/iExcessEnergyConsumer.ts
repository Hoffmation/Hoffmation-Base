import { ExcessEnergyConsumerSettings, LogLevel } from '../../../models';

export interface iExcessEnergyConsumer {
  // Settings like Priority in comparision to other devices
  energyConsumerSettings: ExcessEnergyConsumerSettings;

  // Consumption in Watts, needed to manage the Excess consumer
  currentConsumption: number;

  // Whether this consumer is currently on or off
  on: boolean;

  log(level: LogLevel, message: string): void;

  turnOn(): void;

  turnOff(): void;
}
