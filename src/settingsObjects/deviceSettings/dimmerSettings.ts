import { ActuatorSettings } from './actuatorSettings';
import { iDimmerSettings } from '../../interfaces';
import { Utils } from '../../utils';
import { DimmerSetLightCommand, LampSetTimeBasedCommand } from '../../command';
import { TimeOfDay } from '../../enums';

export class DimmerSettings extends ActuatorSettings implements iDimmerSettings {
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

  public toJSON(): Partial<DimmerSettings> {
    return Utils.jsonFilter(this);
  }

  public buildDimmerSetLightCommand(c: LampSetTimeBasedCommand): DimmerSetLightCommand {
    const manual: boolean = c.isForceAction;
    switch (c.time) {
      case TimeOfDay.Daylight:
        return new DimmerSetLightCommand(
          c,
          manual || this.dayOn,
          'Daylight',
          c.disableAutomaticCommand,
          this.dayBrightness,
        );
      case TimeOfDay.BeforeSunrise:
        return new DimmerSetLightCommand(
          c,
          manual || this.dawnOn,
          'Dawn',
          c.disableAutomaticCommand,
          this.dawnBrightness,
          undefined,
        );
      case TimeOfDay.AfterSunset:
        return new DimmerSetLightCommand(
          c,
          manual || this.duskOn,
          'Dusk',
          c.disableAutomaticCommand,
          this.duskBrightness,
          undefined,
        );
      case TimeOfDay.Night:
        return new DimmerSetLightCommand(
          c,
          manual || this.nightOn,
          'Night',
          c.disableAutomaticCommand,
          this.nightBrightness,
          undefined,
        );
      default:
        throw new Error(`TimeOfDay ${c.time} not supported`);
    }
  }
}
