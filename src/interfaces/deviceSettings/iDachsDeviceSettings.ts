import { iActuatorSettings } from './iActuatorSettings';

/**
 *
 */
export interface iDachsDeviceSettings extends iActuatorSettings {
  /**
   * The refresh interval in ms to pull the data from the device.
   */
  refreshIntervalTime: number;

  /**
   * Whether the secondary water heating source should be disabled regardless of battery level.
   */
  disableHeatingRod: boolean;

  /**
   * Defines the battery level at which the dachs should be turned on,
   * to prevent a battery based island-system to be out of power.
   * @default -1 --> No turn on for battery loading
   *
   * Uses {@link iBatteryDevice.addBatteryLevelCallback}
   */
  batteryLevelTurnOnThreshold: number;
  /**
   * Defines the battery level at which the dachs should be turned on,
   * in evening hours to prevent a battery based island-system to run out of
   * power overnight.
   * @default -1 --> No turn on for battery loading
   *
   * Uses {@link iBatteryDevice.addBatteryLevelCallback}
   */
  batteryLevelBeforeNightTurnOnThreshold: number;
  /**
   * Defines the battery level below which the dachs should be allowed to start
   */
  batteryLevelAllowStartThreshold: number;
  /**
   * Defines the battery level above which the dachs should be prevented from starting/running at daytime.
   */
  batteryLevelPreventStartThreshold: number;
  /**
   * Defines the battery level above which the dachs should be prevented from starting/running at nighttime.
   * @type {number}
   */
  batteryLevelPreventStartAtNightThreshold: number;
  /**
   * Defines the battery level above which the external heating rod should be turned on
   */
  batteryLevelHeatingRodThreshold: number;
  /**
   * Defines the desired minimum temperature for warm water.
   */
  warmWaterDesiredMinTemp: number;
  /**
   * Defines the desired minimum temperature for heat storage during winter.
   */
  winterMinimumHeatStorageTemp: number;

  /**
   * Defines the desired minimum temperature for heat storage during winter.
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
