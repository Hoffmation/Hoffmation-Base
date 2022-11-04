import { DeviceSettings } from './deviceSettings';

export class SonosDeviceSettings extends DeviceSettings {
  public maxPlayOnAllVolume: number = 80;

  public fromJsonObject(data: Partial<SonosDeviceSettings>): void {
    this.maxPlayOnAllVolume = data.maxPlayOnAllVolume ?? 80;
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
