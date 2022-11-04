import { DeviceSettings } from './deviceSettings';
import { iBaseDevice } from '../../server';

export class MotionSensorSettings extends DeviceSettings {
  /**
   * If set to false, a detected movement on this sensor will block certain alarms on windows in this room
   * @type {boolean}
   */
  public seesWindow: boolean = true;

  public excludeFromNightAlarm: boolean = false;

  public fromPartialObject(data: Partial<MotionSensorSettings>, device: iBaseDevice): void {
    this.seesWindow = data.seesWindow ?? this.seesWindow;
    this.excludeFromNightAlarm = data.excludeFromNightAlarm ?? this.excludeFromNightAlarm;
    super.fromPartialObject(data, device);
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
