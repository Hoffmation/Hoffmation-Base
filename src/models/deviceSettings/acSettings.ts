import { DeviceSettings } from './deviceSettings';

export class AcSettings extends DeviceSettings {
  public minimumHours: number = 0;
  public minimumMinutes: number = 0;
  public maximumHours: number = 24;
  public maximumMinutes: number = 0;
}
