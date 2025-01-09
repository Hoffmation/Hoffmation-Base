import { DeviceSettings } from './deviceSettings.js';
import { Daytime } from '../daytime.js';
import { Utils } from '../../server/index.js';

export class TvSettings extends DeviceSettings {
  /**
   * The time at which the TV should automatically turn off.
   * @default undefined (Not set)
   */
  public automaticTurnOff: Daytime | undefined;

  public fromPartialObject(data: Partial<TvSettings>): void {
    this.automaticTurnOff = data.automaticTurnOff ?? this.automaticTurnOff;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<TvSettings> {
    return Utils.jsonFilter(this);
  }
}
