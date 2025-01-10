import { DeviceSettings } from './deviceSettings';
import { Utils } from '../../utils/utils';

export class MotionSensorSettings extends DeviceSettings {
  /**
   * If set to false, a detected movement on this sensor will block certain alarms on windows in this room
   * @default true
   */
  public seesWindow: boolean = true;

  /**
   * If set to true, this sensor will not trigger the night alarm in case of detected movement
   * @default false
   */
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
