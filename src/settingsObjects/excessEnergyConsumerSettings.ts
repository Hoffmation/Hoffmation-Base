import { iExcessEnergyConsumerSettings } from '../interfaces';

export class ExcessEnergyConsumerSettings implements iExcessEnergyConsumerSettings {
  /** @inheritDoc */
  public runAnyways: boolean = false;
  public constructor(
    /**
     * Priority in comparision to other ExcessEnergyConsumer Devices
     * (-1 = Ignore, 1= lowest, 99 = highest, 100 = Always on)
     * Devices with same prio try to share as good as possible.
     */
    public priority: number = -1,
    public rampUpOnSpareEnergy: boolean = false,
    // The time before the devices load could be calculated (e.g. Heating needing time to turn on)
    public powerReactionTime: number = 60000,
  ) {}

  public fromPartialObject(obj: Partial<ExcessEnergyConsumerSettings>): void {
    this.priority = obj.priority ?? this.priority;
    this.rampUpOnSpareEnergy = obj.rampUpOnSpareEnergy ?? this.rampUpOnSpareEnergy;
    this.powerReactionTime = obj.powerReactionTime ?? this.powerReactionTime;
    this.runAnyways = obj.runAnyways ?? this.runAnyways;
  }
}
