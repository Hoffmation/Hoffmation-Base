import { DeviceSettings } from './deviceSettings';
import { Utils } from '../../server';

export class MotionSensorSettings extends DeviceSettings {
  /**
   * If set to false, a detected movement on this sensor will block certain alarms on windows in this room
   */
  public seesWindow: boolean = true;

  public excludeFromNightAlarm: boolean = false;

  public fromPartialObject(data: Partial<MotionSensorSettings>): void {
    this.seesWindow = data.seesWindow ?? this.seesWindow;
    this.excludeFromNightAlarm = data.excludeFromNightAlarm ?? this.excludeFromNightAlarm;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<MotionSensorSettings> {
    return Utils.jsonFilter(this);
  }
}
