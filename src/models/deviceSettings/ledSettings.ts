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
}
