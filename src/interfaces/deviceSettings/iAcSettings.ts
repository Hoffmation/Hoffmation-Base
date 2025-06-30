import { iExcessEnergyConsumerSettings } from '../settings';
import { iDeviceSettings } from './iDeviceSettings';

/**
 *
 */
export interface iAcSettings extends iDeviceSettings {
  /**
   *
   */
  energySettings: iExcessEnergyConsumerSettings;
  /**
   *
   */
  minimumHours: number;
  /**
   *
   */
  minimumMinutes: number;
  /**
   *
   */
  maximumHours: number;
  /**
   *
   */
  maximumMinutes: number;
  /**
   *
   */
  heatingAllowed: boolean;
  /**
   *
   */
  useOwnTemperature: boolean;
  /**
   *
   */
  useAutomatic: boolean;
  /**
   *
   */
  noCoolingOnMovement: boolean;
  /**
   *
   */
  manualDisabled: boolean;
  /**
   *
   */
  minOutdoorTempForCooling: number;

  /**
   * Set's a specific override temperature as cooling target (e.g. to maximize cooling)
   * -1 = Off
   */
  overrideCoolingTargetTemp?: number;

  /**
   *
   */
  fromPartialObject(data: Partial<iAcSettings>): void;

  /**
   *
   */
  toJSON(): Partial<iAcSettings>;
}
