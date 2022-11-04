import { DimmerSettings } from './dimmerSettings';
import { iBaseDevice } from '../../server';

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

  public fromPartialObject(data: Partial<LedSettings>, device: iBaseDevice): void {
    this.defaultColor = data.defaultColor ?? this.defaultColor;
    this.dayOn = data.dayOn ?? this.dayOn;
    this.dayBrightness = data.dayBrightness ?? this.dayBrightness;
    this.dayColor = data.dayColor ?? this.dayColor;
    this.dayColorTemp = data.dayColorTemp ?? this.dayColorTemp;
    this.dawnOn = data.dawnOn ?? this.dawnOn;
    this.dawnBrightness = data.dawnBrightness ?? this.dawnBrightness;
    this.dawnColor = data.dawnColor ?? this.dawnColor;
    this.dawnColorTemp = data.dawnColorTemp ?? this.dawnColorTemp;
    this.duskOn = data.duskOn ?? this.duskOn;
    this.duskBrightness = data.duskBrightness ?? this.duskBrightness;
    this.duskColor = data.duskColor ?? this.duskColor;
    this.duskColorTemp = data.duskColorTemp ?? this.duskColorTemp;
    this.nightOn = data.nightOn ?? this.nightOn;
    this.nightBrightness = data.nightBrightness ?? this.nightBrightness;
    this.nightColor = data.nightColor ?? this.nightColor;
    this.nightColorTemp = data.nightColorTemp ?? this.nightColorTemp;
    super.fromPartialObject(data, device, true);
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
