import { DeviceSettings } from './deviceSettings';
import { Utils } from '../../server';

export class SonosDeviceSettings extends DeviceSettings {
  public maxPlayOnAllVolume: number = 80;

  public fromPartialObject(data: Partial<SonosDeviceSettings>): void {
    this.maxPlayOnAllVolume = data.maxPlayOnAllVolume ?? this.maxPlayOnAllVolume;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<SonosDeviceSettings> {
    return Utils.jsonFilter(this);
  }
}
