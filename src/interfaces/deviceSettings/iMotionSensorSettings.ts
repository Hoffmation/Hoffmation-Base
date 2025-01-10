import { iDeviceSettings } from './iDeviceSettings';

export interface iMotionSensorSettings extends iDeviceSettings {
  seesWindow: boolean;
  excludeFromNightAlarm: boolean;

  fromPartialObject(data: Partial<iMotionSensorSettings>): void;

  toJSON(): Partial<iMotionSensorSettings>;
}
