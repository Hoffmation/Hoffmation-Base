import { DeviceSettings } from './deviceSettings';
import { Daytime } from '../daytime';
import { iBaseDevice } from '../../server';

export class TvSettings extends DeviceSettings {
  public automaticTurnOff: Daytime | undefined;

  public fromPartialObject(data: Partial<TvSettings>, device: iBaseDevice): void {
    this.automaticTurnOff = data.automaticTurnOff ?? this.automaticTurnOff;
    super.fromPartialObject(data, device);
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
