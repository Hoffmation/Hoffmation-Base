import { CommandType } from './commandType';
import { CommandSource } from './commandSource';
import { BaseCommand } from './baseCommand';
import { DimmerSetLightCommand } from './dimmerSetLightCommand';
import { WledSettings } from '../deviceSettings';
import { LampSetTimeBasedCommand } from './lampSetTimeBasedCommand';
import { TimeOfDay } from '../timeCallback';

export class WledSetLightCommand extends DimmerSetLightCommand {
  public override _commandType: CommandType = CommandType.WledSetLightCommand;

  public constructor(
    source: CommandSource | BaseCommand,
    on: boolean,
    reason: string = '',
    timeout: number = -1,
    brightness: number = -1,
    transitionTime: number = -1,
    public preset?: number,
  ) {
    super(source, on, reason, timeout, brightness, transitionTime);
  }

  public override get logMessage(): string {
    return `Dimmer setLight to ${this.on} with Brightness ${this.brightness}, timeout ${this.timeout} and preset ${this.preset} for reason: ${this.reasonTrace}`;
  }

  public static override byTimeBased(settings: WledSettings, c: LampSetTimeBasedCommand): WledSetLightCommand {
    switch (c.time) {
      case TimeOfDay.Daylight:
        return new WledSetLightCommand(
          c,
          settings.dayOn,
          '',
          c.timeout,
          settings.dayBrightness,
          undefined,
          settings.dayPreset,
        );
      case TimeOfDay.BeforeSunrise:
        return new WledSetLightCommand(
          c,
          settings.dawnOn,
          '',
          c.timeout,
          settings.dawnBrightness,
          undefined,
          settings.dawnPreset,
        );
      case TimeOfDay.AfterSunset:
        return new WledSetLightCommand(
          c,
          settings.duskOn,
          '',
          c.timeout,
          settings.duskBrightness,
          undefined,
          settings.duskPreset,
        );
      case TimeOfDay.Night:
        return new WledSetLightCommand(
          c,
          settings.nightOn,
          '',
          c.timeout,
          settings.nightBrightness,
          undefined,
          settings.nightPreset,
        );
      default:
        throw new Error(`TimeOfDay ${c.time} not supported`);
    }
  }
}
