import { DeviceSettings } from './deviceSettings';

export class MotionSensorSettings extends DeviceSettings {
  /**
   * If set to false, a detected movement on this sensor will block certain alarms on windows in this room
   * @type {boolean}
   */
  public seesWindow: boolean = true;

  public excludeFromNightAlarm: boolean = false;

  public fromJsonObject(data: Partial<MotionSensorSettings>): void {
    this.seesWindow = data.seesWindow ?? true;
    this.excludeFromNightAlarm = data.excludeFromNightAlarm ?? false;
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
