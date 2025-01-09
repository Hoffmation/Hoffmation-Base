import { iExcessEnergyConsumer } from '../../devices/index.js';

export class EnergyConsumerStateChange {
  public constructor(
    public readonly newState: boolean,
    public readonly device: iExcessEnergyConsumer,
  ) {}
}
