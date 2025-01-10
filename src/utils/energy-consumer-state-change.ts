import { iExcessEnergyConsumer } from '../devices';

export class EnergyConsumerStateChange {
  public constructor(
    public readonly newState: boolean,
    public readonly device: iExcessEnergyConsumer,
  ) {}
}
