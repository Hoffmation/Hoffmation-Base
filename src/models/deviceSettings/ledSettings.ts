import { DimmerSettings } from './dimmerSettings';
import { Utils } from '../../utils/utils';

export class LedSettings extends DimmerSettings {
  /**
   * The default color for the LED if none was given.
   * @default '#fbbc32' (Warm yellow)
   */
  public static fallbackColor: string = '#fbbc32';
  /**
   * The default color for the LED if none was given.
   */
  public defaultColor: string = LedSettings.fallbackColor;
  /**
   * @inheritDoc
   * @default false
   */
  public override dayOn: boolean = false;
  /**
   * @inheritDoc
   * @default 100
   */
  public override dayBrightness: number = 100;
  /**
   * The desired color of the light during the day.
   */
  public dayColor: string = this.defaultColor;
  /**
   * The desired color temperature of the light during the day.
   * @default -1 (Not set)
   */
  public dayColorTemp: number = -1;
  /**
   * @inheritDoc
   * @default true
   */
  public override dawnOn: boolean = true;
  /**
   * @inheritDoc
   * @default 50
   */
  public override dawnBrightness: number = 50;
  /**
   * The desired color of the light during the dawn.
   */
  public dawnColor: string = this.defaultColor;
  /**
   * The desired color temperature of the light during the dawn.
   * @default -1 (Not set)
   */
  public dawnColorTemp: number = -1;
  /**
   * @inheritDoc
   * @default true
   */
  public override duskOn: boolean = true;
  /**
   * @inheritDoc
   * @default 50
   */
  public override duskBrightness: number = 50;
  /**
   * The desired color of the light during the dusk.
   */
  public duskColor: string = this.defaultColor;
  /**
   * The desired color temperature of the light during the dusk.
   * @default -1 (Not set)
   */
  public duskColorTemp: number = -1;
  /**
   * @inheritDoc
   * @default true
   */
  public override nightOn: boolean = true;
  /**
   * @inheritDoc
   * @default 2
   */
  public override nightBrightness: number = 2;
  /**
   * The desired color of the light during the night.
   */
  public nightColor: string = '#ff5500';
  /**
   * The desired color temperature of the light during the night.
   */
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
