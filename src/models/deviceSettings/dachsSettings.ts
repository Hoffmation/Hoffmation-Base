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

  public fromPartialObject(data: Partial<DachsDeviceSettings>): void {
    this.refreshInterval = data.refreshInterval ?? this.refreshInterval;
    this.batteryLevelTurnOnThreshold = data.batteryLevelTurnOnThreshold ?? this.batteryLevelTurnOnThreshold;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<DachsDeviceSettings> {
    return Utils.jsonFilter(this);
  }
}
