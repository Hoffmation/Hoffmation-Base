import { DeviceSettings } from './deviceSettings';

export class HeaterSettings extends DeviceSettings {
  public automaticMode: boolean = true;
  public automaticFallBackTemperatur: number = 20;
  public useOwnTemperatur: boolean = true;
}
