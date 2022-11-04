import { DimmerSettings } from './dimmerSettings';

export class WledSettings extends DimmerSettings {
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

  public fromJsonObject(data: Partial<WledSettings>): void {
    super.fromJsonObject(data);
    this.dayOn = data.dayOn ?? false;
    this.dayBrightness = data.dayBrightness ?? 100;
    this.dawnOn = data.dawnOn ?? true;
    this.dawnBrightness = data.dawnBrightness ?? 50;
    this.duskOn = data.duskOn ?? true;
    this.duskBrightness = data.duskBrightness ?? 50;
    this.nightOn = data.nightOn ?? true;
    this.nightBrightness = data.nightBrightness ?? 2;
    this.dawnPreset = data.dawnPreset;
    this.dayPreset = data.dayPreset;
    this.duskPreset = data.duskPreset;
    this.nightPreset = data.nightPreset;
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
