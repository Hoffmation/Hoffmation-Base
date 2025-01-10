import { DeviceSettings } from './deviceSettings';
import { Daytime } from '../../models';
import { Utils } from '../../utils';

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

  public toJSON(): Partial<TvSettings> {
    return Utils.jsonFilter(this);
  }
}
