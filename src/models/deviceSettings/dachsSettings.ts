import { Utils } from '../../server';
import { ActuatorSettings } from './actuatorSettings';

export class DachsDeviceSettings extends ActuatorSettings {
  public refreshInterval: number = 30000;

  public fromPartialObject(data: Partial<DachsDeviceSettings>): void {
    this.refreshInterval = data.refreshInterval ?? this.refreshInterval;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<DachsDeviceSettings> {
    return Utils.jsonFilter(this);
  }
}
