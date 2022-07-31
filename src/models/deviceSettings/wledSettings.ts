import { DeviceSettings } from './deviceSettings';

export class WledSettings extends DeviceSettings {
  public dayOn: boolean = false;
  public dayBrightness: number = 100;
  public dawnOn: boolean = true;
  public dawnBrightness: number = 50;
  public duskOn: boolean = true;
  public duskBrightness: number = 50;
  public nightOn: boolean = true;
  public nightBrightness: number = 2;
  public dawnPreset?: number;
  public dayPreset?: number;
  public duskPreset?: number;
  public nightPreset?: number;
}
