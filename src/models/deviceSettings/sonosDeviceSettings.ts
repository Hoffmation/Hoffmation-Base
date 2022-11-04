import { DeviceSettings } from './deviceSettings';

export class SonosDeviceSettings extends DeviceSettings {
  public maxPlayOnAllVolume: number = 80;

  public fromPartialObject(data: Partial<SonosDeviceSettings>): void {
    this.maxPlayOnAllVolume = data.maxPlayOnAllVolume ?? this.maxPlayOnAllVolume;
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
