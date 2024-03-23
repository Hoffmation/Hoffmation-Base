import { ExcessEnergyConsumerSettings, LogLevel } from '../../../models';
import { iBaseDevice } from './iBaseDevice';

// TODO: Add missing Comments
export interface iExcessEnergyConsumer extends iBaseDevice {
  readonly energySettings: ExcessEnergyConsumerSettings;

  // Consumption in Watts, needed to manage the Excess consumer
  currentConsumption: number;
  // Whether this consumer is currently on or off
  on: boolean;

  // This can be used to block energy consumer from turning device on (e.g. manual turn off for ac)
  isAvailableForExcessEnergy(): boolean;

  log(level: LogLevel, message: string): void;

  turnOnForExcessEnergy(): void;

  turnOffDueToMissingEnergy(): void;

  wasActivatedByExcessEnergy(): boolean;
}
