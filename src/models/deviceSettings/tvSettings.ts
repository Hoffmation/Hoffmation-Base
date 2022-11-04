import { DeviceSettings } from './deviceSettings';
import { Daytime } from '../daytime';
import { Utils } from '../../server';

export class TvSettings extends DeviceSettings {
  public automaticTurnOff: Daytime | undefined;

  public fromPartialObject(data: Partial<TvSettings>): void {
    this.automaticTurnOff = data.automaticTurnOff ?? this.automaticTurnOff;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<TvSettings> {
    return Utils.jsonFilter(this);
  }
}
