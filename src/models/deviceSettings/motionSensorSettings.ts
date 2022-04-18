import { DeviceSettings } from './deviceSettings';

export class MotionSensorSettings extends DeviceSettings {
  /**
   * If set to false, a detected movement on this sensor will block certain alarms on windows in this room
   * @type {boolean}
   */
  public seesWindow: boolean = true;

  public excludeFromNightAlarm: boolean = false;
}
