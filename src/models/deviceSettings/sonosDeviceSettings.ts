import { DeviceSettings } from './deviceSettings';
import { Utils } from '../../utils/utils';

export class SonosDeviceSettings extends DeviceSettings {
  /**
   * The maximum volume to use when there is a command to play something on all devices.
   * @default 80
   */
  public maxPlayOnAllVolume: number = 80;

  public fromPartialObject(data: Partial<SonosDeviceSettings>): void {
    this.maxPlayOnAllVolume = data.maxPlayOnAllVolume ?? this.maxPlayOnAllVolume;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<SonosDeviceSettings> {
    return Utils.jsonFilter(this);
  }
}
