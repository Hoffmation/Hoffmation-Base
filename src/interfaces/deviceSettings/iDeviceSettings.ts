import { iBlockAutomaticSettings, iExcessEnergyConsumerSettings, iObjectSettings } from '../settings';

/**
 *
 */
export interface iDeviceSettings extends iObjectSettings {
  /**
   *
   */
  energySettings: iExcessEnergyConsumerSettings | undefined;
  /**
   *
   */
  blockAutomaticSettings: iBlockAutomaticSettings | undefined;
  /**
   *
   */
  skipInHomebridge: boolean;

  /**
   *
   */
  fromPartialObject(_obj: Partial<iDeviceSettings>): void;

  /**
   *
   */
  toJSON(): Partial<iDeviceSettings>;
}
