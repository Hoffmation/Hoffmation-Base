import { ActuatorSettings } from './actuatorSettings';

export class DimmerSettings extends ActuatorSettings {
  public nightBrightness: number = 50;
  public dawnBrightness: number = 75;
  public duskBrightness: number = 75;
  public dayBrightness: number = 100;
}
