import { DimmerSettings } from './dimmerSettings';

export class LedSettings extends DimmerSettings {
  public defaultColor: string = '#fbbc32';
  public dayOn: boolean = false;
  public dayBrightness: number = 100;
  public dayColor: string = this.defaultColor;
  public dayColorTemp: number = -1;
  public dawnOn: boolean = true;
  public dawnBrightness: number = 50;
  public dawnColor: string = this.defaultColor;
  public dawnColorTemp: number = -1;
  public duskOn: boolean = true;
  public duskBrightness: number = 50;
  public duskColor: string = this.defaultColor;
  public duskColorTemp: number = -1;
  public nightOn: boolean = true;
  public nightBrightness: number = 2;
  public nightColor: string = '#ff5500';
  public nightColorTemp: number = -1;

  public fromJsonObject(data: Partial<LedSettings>): void {
    super.fromJsonObject(data);
    this.defaultColor = data.defaultColor ?? '#fbbc32';
    this.dayOn = data.dayOn ?? false;
    this.dayBrightness = data.dayBrightness ?? 100;
    this.dayColor = data.dayColor ?? this.defaultColor;
    this.dayColorTemp = data.dayColorTemp ?? -1;
    this.dawnOn = data.dawnOn ?? true;
    this.dawnBrightness = data.dawnBrightness ?? 50;
    this.dawnColor = data.dawnColor ?? this.defaultColor;
    this.dawnColorTemp = data.dawnColorTemp ?? -1;
    this.duskOn = data.duskOn ?? true;
    this.duskBrightness = data.duskBrightness ?? 50;
    this.duskColor = data.duskColor ?? this.defaultColor;
    this.duskColorTemp = data.duskColorTemp ?? -1;
    this.nightOn = data.nightOn ?? true;
    this.nightBrightness = data.nightBrightness ?? 2;
    this.nightColor = data.nightColor ?? '#ff5500';
    this.nightColorTemp = data.nightColorTemp ?? -1;
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
