import { ActuatorSettings } from './actuatorSettings';
import { Utils } from '../../utils/utils';

export class DimmerSettings extends ActuatorSettings {
  /**
   * The desired brightness of the light during the night.
   * @default 50
   */
  public nightBrightness: number = 50;
  /**
   * The desired brightness of the light during the dawn.
   * @default 75
   */
  public dawnBrightness: number = 75;
  /**
   * The desired brightness of the light during the dusk.
   * @default 75
   */
  public duskBrightness: number = 75;
  /**
   * The desired brightness of the light during the day.
   * @default 100
   */
  public dayBrightness: number = 100;
  /**
   * Some LED dimmers have a turn on threshold, which is the minimum brightness to turn on.
   * Hoffmation afterwards dims down the light to the desired brightness.
   */
  public turnOnThreshhold: number = -1;

  public override fromPartialObject(data: Partial<DimmerSettings>): void {
    this.nightBrightness = data.nightBrightness ?? this.nightBrightness;
    this.dawnBrightness = data.dawnBrightness ?? this.dawnBrightness;
    this.duskBrightness = data.duskBrightness ?? this.duskBrightness;
    this.dayBrightness = data.dayBrightness ?? this.dayBrightness;
    this.turnOnThreshhold = data.turnOnThreshhold ?? this.turnOnThreshhold;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<DimmerSettings> {
    return Utils.jsonFilter(this);
  }
}
