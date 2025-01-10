import { iActuatorSettings } from './iActuatorSettings';

/**
 *
 */
export interface iDachsDeviceSettings extends iActuatorSettings {
  /**
   *
   */
  refreshIntervalTime: number;
  /**
   *
   */
  batteryLevelTurnOnThreshold: number;
  /**
   *
   */
  batteryLevelBeforeNightTurnOnThreshold: number;
  /**
   *
   */
  batteryLevelAllowStartThreshold: number;
  /**
   *
   */
  batteryLevelPreventStartThreshold: number;
  /**
   *
   */
  batteryLevelHeatingRodThreshold: number;
  /**
   *
   */
  warmWaterDesiredMinTemp: number;
  /**
   *
   */
  winterMinimumHeatStorageTemp: number;
  /**
   *
   */
  winterMinimumPreNightHeatStorageTemp: number;

  /**
   *
   */
  fromPartialObject(data: Partial<iDachsDeviceSettings>): void;

  /**
   *
   */
  toJSON(): Partial<iDachsDeviceSettings>;
}
