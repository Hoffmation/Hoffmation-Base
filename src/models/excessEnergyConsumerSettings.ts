export class ExcessEnergyConsumerSettings {
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
}
