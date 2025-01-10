import { iExcessEnergyConsumer } from '../interfaces';

export class EnergyConsumerStateChange {
  public constructor(
    public readonly newState: boolean,
    public readonly device: iExcessEnergyConsumer,
  ) {}
}
