import { DeviceSettings } from './deviceSettings';

export class MotionSensorSettings extends DeviceSettings {
  /**
   * If set to false, a detected movement on this sensor will block certain alarms on windows in this room
   * @type {boolean}
   */
  public seesWindow: boolean = true;

  public excludeFromNightAlarm: boolean = false;

  public fromPartialObject(data: Partial<MotionSensorSettings>): void {
    this.seesWindow = data.seesWindow ?? this.seesWindow;
    this.excludeFromNightAlarm = data.excludeFromNightAlarm ?? this.excludeFromNightAlarm;
    super.fromPartialObject(data);
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
