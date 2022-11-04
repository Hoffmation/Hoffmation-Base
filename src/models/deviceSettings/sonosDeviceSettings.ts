import { DeviceSettings } from './deviceSettings';
import { iBaseDevice } from '../../server';

export class SonosDeviceSettings extends DeviceSettings {
  public maxPlayOnAllVolume: number = 80;

  public fromPartialObject(data: Partial<SonosDeviceSettings>, device: iBaseDevice): void {
    this.maxPlayOnAllVolume = data.maxPlayOnAllVolume ?? this.maxPlayOnAllVolume;
    this.persist(device);
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
