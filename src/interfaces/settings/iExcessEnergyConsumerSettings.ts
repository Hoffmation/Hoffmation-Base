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
   *
   */
  fromPartialObject(obj: Partial<iExcessEnergyConsumerSettings>): void;
}
