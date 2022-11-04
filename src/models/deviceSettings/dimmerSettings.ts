import { ActuatorSettings } from './actuatorSettings';

export class DimmerSettings extends ActuatorSettings {
  public nightBrightness: number = 50;
  public dawnBrightness: number = 75;
  public duskBrightness: number = 75;
  public dayBrightness: number = 100;
  public turnOnThreshhold: number = -1;

  public fromJsonObject(data: Partial<DimmerSettings>): void {
    super.fromJsonObject(data);
    this.nightBrightness = data.nightBrightness ?? 50;
    this.dawnBrightness = data.dawnBrightness ?? 75;
    this.duskBrightness = data.duskBrightness ?? 75;
    this.dayBrightness = data.dayBrightness ?? 100;
    this.turnOnThreshhold = data.turnOnThreshhold ?? -1;
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
