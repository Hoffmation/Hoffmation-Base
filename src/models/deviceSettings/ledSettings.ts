import { DimmerSettings } from './dimmerSettings';
import { Utils } from '../../server';

export class LedSettings extends DimmerSettings {
  public static fallbackColor: string = '#fbbc32';
  public defaultColor: string = LedSettings.fallbackColor;
  public override dayOn: boolean = false;
  public override dayBrightness: number = 100;
  public dayColor: string = this.defaultColor;
  public dayColorTemp: number = -1;
  public override dawnOn: boolean = true;
  public override dawnBrightness: number = 50;
  public dawnColor: string = this.defaultColor;
  public dawnColorTemp: number = -1;
  public override duskOn: boolean = true;
  public override duskBrightness: number = 50;
  public duskColor: string = this.defaultColor;
  public duskColorTemp: number = -1;
  public override nightOn: boolean = true;
  public override nightBrightness: number = 2;
  public nightColor: string = '#ff5500';
  public nightColorTemp: number = -1;

  public override fromPartialObject(data: Partial<LedSettings>): void {
    this.dayColorTemp = data.dayColorTemp ?? this.dayColorTemp;
    this.dawnColorTemp = data.dawnColorTemp ?? this.dawnColorTemp;
    this.duskColorTemp = data.duskColorTemp ?? this.duskColorTemp;
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
