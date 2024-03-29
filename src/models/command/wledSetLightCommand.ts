import { CommandType } from './commandType';
import { CommandSource } from './commandSource';
import { BaseCommand } from './baseCommand';
import { DimmerSetLightCommand } from './dimmerSetLightCommand';
import { WledSettings } from '../deviceSettings';
import { LampSetTimeBasedCommand } from './lampSetTimeBasedCommand';
import { TimeOfDay } from '../timeCallback';
import { BlockAutomaticCommand } from './blockAutomaticCommand';

export class WledSetLightCommand extends DimmerSetLightCommand {
  /** @inheritDoc */
  public override _commandType: CommandType = CommandType.WledSetLightCommand;

  /**
   * Command to set the light state of a WLED device
   * @param source - The source of the command
   * @param on - The desired state of the light
   * @param reason - You can provide a reason for clarification
   * @param disableAutomatic - If provided, the device will remain in the desired state for the given disable action.
   * If undefined the default value will be used in case it's a non automatic action: {@link SettingsService.settings.blockAutomaticHandlerDefaults}
   * @param brightness - The brightness of the light
   * @param transitionTime - The time in milliseconds the transition should take
   * @param preset - The preset to use
   */
  public constructor(
    source: CommandSource | BaseCommand,
    on: boolean,
    reason: string = '',
    disableAutomatic?: BlockAutomaticCommand | null,
    brightness: number = -1,
    transitionTime: number = -1,
    public preset?: number,
  ) {
    super(source, on, reason, disableAutomatic, brightness, transitionTime);
  }

  public override get logMessage(): string {
    return `Dimmer setLight to ${this.on} with Brightness ${this.brightness}, disabelAutomatic ${this.disableAutomaticCommand?.logMessage} and preset ${this.preset} for reason: ${this.reasonTrace}`;
  }

  public static override byTimeBased(settings: WledSettings, c: LampSetTimeBasedCommand): WledSetLightCommand {
    switch (c.time) {
      case TimeOfDay.Daylight:
        return new WledSetLightCommand(
          c,
          settings.dayOn,
          '',
          c.disableAutomaticCommand,
          settings.dayBrightness,
          undefined,
          settings.dayPreset,
        );
      case TimeOfDay.BeforeSunrise:
        return new WledSetLightCommand(
          c,
          settings.dawnOn,
          '',
          c.disableAutomaticCommand,
          settings.dawnBrightness,
          undefined,
          settings.dawnPreset,
        );
      case TimeOfDay.AfterSunset:
        return new WledSetLightCommand(
          c,
          settings.duskOn,
          '',
          c.disableAutomaticCommand,
          settings.duskBrightness,
          undefined,
          settings.duskPreset,
        );
      case TimeOfDay.Night:
        return new WledSetLightCommand(
          c,
          settings.nightOn,
          '',
          c.disableAutomaticCommand,
          settings.nightBrightness,
          undefined,
          settings.nightPreset,
        );
      default:
        throw new Error(`TimeOfDay ${c.time} not supported`);
    }
  }
}
