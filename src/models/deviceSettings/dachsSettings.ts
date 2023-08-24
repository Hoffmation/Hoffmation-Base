import { DeviceSettings } from './deviceSettings';
import { Utils } from '../../server';

export class DachsDeviceSettings extends DeviceSettings {
  public refreshInterval: number = 30000;

  public fromPartialObject(data: Partial<DachsDeviceSettings>): void {
    this.refreshInterval = data.refreshInterval ?? this.refreshInterval;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<DachsDeviceSettings> {
    return Utils.jsonFilter(this);
  }
}
