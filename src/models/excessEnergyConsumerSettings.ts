export class ExcessEnergyConsumerSettings {
  /**
   * Priority in comparision to other ExcessEnergyConsumer Devices
   * (-1 = off, 1= lowest, 99 = highest, 100 = Always on)
   * Devices with same prio try to share as good as possible.
   */
  public priority: number = -1;
  public rampUpOnSpareEnergy: boolean = false;
}
