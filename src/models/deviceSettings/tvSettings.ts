import { DeviceSettings } from './deviceSettings';
import { Daytime } from '../daytime';

export class TvSettings extends DeviceSettings {
  public automaticTurnOff: Daytime | undefined;
}
