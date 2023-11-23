import { DimmerSettings } from './dimmerSettings';
import { Utils } from '../../server';

export class LedSettings extends DimmerSettings {
  public static fallbackColor: string = '#fbbc32';
  public defaultColor: string = LedSettings.fallbackColor;
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

  public override fromPartialObject(data: Partial<LedSettings>): void {
    this.dayOn = data.dayOn ?? this.dayOn;
    this.dayBrightness = data.dayBrightness ?? this.dayBrightness;
    this.dayColorTemp = data.dayColorTemp ?? this.dayColorTemp;
    this.dawnOn = data.dawnOn ?? this.dawnOn;
    this.dawnBrightness = data.dawnBrightness ?? this.dawnBrightness;
    this.dawnColorTemp = data.dawnColorTemp ?? this.dawnColorTemp;
    this.duskOn = data.duskOn ?? this.duskOn;
    this.duskBrightness = data.duskBrightness ?? this.duskBrightness;
    this.duskColorTemp = data.duskColorTemp ?? this.duskColorTemp;
    this.nightOn = data.nightOn ?? this.nightOn;
    this.nightBrightness = data.nightBrightness ?? this.nightBrightness;
    this.nightColorTemp = data.nightColorTemp ?? this.nightColorTemp;
    this.defaultColor = Utils.formatHex(data.defaultColor ?? this.defaultColor) ?? LedSettings.fallbackColor;
    this.dayColor = Utils.formatHex(data.dayColor ?? this.dayColor) ?? LedSettings.fallbackColor;
    this.dawnColor = Utils.formatHex(data.dawnColor ?? this.dawnColor) ?? LedSettings.fallbackColor;
    this.duskColor = Utils.formatHex(data.duskColor ?? this.duskColor) ?? LedSettings.fallbackColor;
    this.nightColor = Utils.formatHex(data.nightColor ?? this.nightColor) ?? LedSettings.fallbackColor;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<LedSettings> {
    return Utils.jsonFilter(this);
  }
}
