import { Utils } from '../../utils';
import { DeviceSettings } from './deviceSettings';

export class SonosDeviceSettings extends DeviceSettings {
  /**
   * The maximum volume to use when there is a command to play something on all devices.
   * @default 80
   */
  public maxPlayOnAllVolume: number = 80;
  /**
   * The default volume to inform of non critical stuff during daytime
   * @type {number}
   * @default 80
   */
  public defaultDayAnounceVolume: number = 80;
  /**
   * The default volume to inform of non critical stuff during nighttime
   * @type {number}
   * @default 80
   */
  public defaultNightAnounceVolume: number = 40;

  public fromPartialObject(data: Partial<SonosDeviceSettings>): void {
    this.maxPlayOnAllVolume = data.maxPlayOnAllVolume ?? this.maxPlayOnAllVolume;
    this.defaultDayAnounceVolume = data.defaultDayAnounceVolume ?? this.defaultDayAnounceVolume;
    this.defaultNightAnounceVolume = data.defaultNightAnounceVolume ?? this.defaultNightAnounceVolume;
    super.fromPartialObject(data);
  }

  public toJSON(): Partial<SonosDeviceSettings> {
    return Utils.jsonFilter(this);
  }
}
