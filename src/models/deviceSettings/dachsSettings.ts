import { Utils } from '../../server';
import { ActuatorSettings } from './actuatorSettings';

export class DachsDeviceSettings extends ActuatorSettings {
  /**
   * The refresh interval in ms to pull the data from the device.
   */
  public refreshInterval: number = 30000;

  /**
   * Defines the battery level at which the dachs should be turned on,
   * to prevent a battery based island-system to be out of power.
   * @default -1 --> No turn on for battery loading
   *
   * Uses {@link iBatteryDevice.addBatteryLevelCallback}
   */
  public batteryLevelTurnOnThreshold: number = -1;

  /**
   * Defines the battery level below which the dachs should be allowed to start
   */
  public batteryLevelAllowStartThreshold: number = 50;
  /**
   * Defines the battery level above which the dachs should be prevented from starting/running.
   */
  public batteryLevelPreventStartThreshold: number = 70;
  /**
   * Defines the desired minimum temperature for warm water.
   */
  public warmWaterDesiredMinTemp: number = 45;

  public fromPartialObject(data: Partial<DachsDeviceSettings>): void {
    this.refreshInterval = data.refreshInterval ?? this.refreshInterval;
    this.batteryLevelTurnOnThreshold = data.batteryLevelTurnOnThreshold ?? this.batteryLevelTurnOnThreshold;
    this.batteryLevelPreventStartThreshold =
      data.batteryLevelPreventStartThreshold ?? this.batteryLevelPreventStartThreshold;
    this.batteryLevelAllowStartThreshold = data.batteryLevelAllowStartThreshold ?? this.batteryLevelAllowStartThreshold;
    this.warmWaterDesiredMinTemp = data.warmWaterDesiredMinTemp ?? this.warmWaterDesiredMinTemp;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<DachsDeviceSettings> {
    return Utils.jsonFilter(this);
  }
}
