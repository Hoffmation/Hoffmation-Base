import { ExcessEnergyConsumerSettings, LogLevel } from '../../../models';

export interface iExcessEnergyConsumer {
  // Settings like Priority in comparision to other devices
  energyConsumerSettings: ExcessEnergyConsumerSettings;
  // Consumption in Watts, needed to manage the Excess consumer
  currentConsumption: number;
  // Whether this consumer is currently on or off
  on: boolean;

  // This can be used to block energy consumer from turning device on (e.g. manual turn off for AC)
  isAvailableForExcessEnergy(): boolean;

  log(level: LogLevel, message: string): void;

  turnOnForExcessEnergy(): void;

  turnOffDueToMissingEnergy(): void;

  wasActivatedByExcessEnergy(): boolean;
}
