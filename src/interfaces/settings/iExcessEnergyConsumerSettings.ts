/**
 *
 */
export interface iExcessEnergyConsumerSettings {
  /**
   *
   */
  priority: number;
  /**
   *
   */
  rampUpOnSpareEnergy: boolean;
  /**
   *
   */
  powerReactionTime: number;
  /**
   * Option to run the device even if it is not in the excess energy consumer group
   */
  runAnyways: boolean;

  /**
   *
   */
  fromPartialObject(obj: Partial<iExcessEnergyConsumerSettings>): void;
}
