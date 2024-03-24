import { DeviceSettings } from './deviceSettings';
import { Daytime } from '../daytime';
import { Utils } from '../../server';

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
