import { DeviceSettings } from './deviceSettings';
import { Daytime } from '../daytime';

export class TvSettings extends DeviceSettings {
  public automaticTurnOff: Daytime | undefined;

  public fromJsonObject(data: Partial<TvSettings>): void {
    this.automaticTurnOff = data.automaticTurnOff;
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
