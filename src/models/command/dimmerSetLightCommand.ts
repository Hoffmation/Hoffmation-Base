import { LampSetLightCommand } from './lampSetLightCommand';
import { CommandSource, CommandType, TimeOfDay } from '../../enums';
import { BaseCommand } from './baseCommand';
import { BlockAutomaticCommand } from './blockAutomaticCommand';
import { DimmerSettings } from '../../devices';
import { LampSetTimeBasedCommand } from './lampSetTimeBasedCommand';

export class DimmerSetLightCommand extends LampSetLightCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.DimmerSetLightCommand;

  /**
   * Command to change the light of a dimmer
   * @param source - The source of the command
   * @param on - The desired value
   * @param reason - You can provide a reason for clarity
   * @param disableAutomatic - If provided, the device will remain in the desired state for the given disable action.
   * If undefined the default value will be used in case it's a non automatic action: {@link SettingsService.settings.blockAutomaticHandlerDefaults}
   * @param brightness - The desired brightness
   * @param transitionTime - The transition time during turnOn/turnOff
   */
  public constructor(
    source: CommandSource | BaseCommand,
    on: boolean,
    reason: string = '',
    disableAutomatic?: BlockAutomaticCommand | null,
    public brightness: number = -1,
    public transitionTime: number = -1,
  ) {
    super(source, on, reason, disableAutomatic);
  }

  /** @inheritDoc */
  public override get logMessage(): string {
    return `Dimmer setLight to ${this.on} with Brightness ${this.brightness} with disable ${this.disableAutomaticCommand?.logMessage} for reason: ${this.reasonTrace}`;
  }

  public static byTimeBased(s: DimmerSettings, c: LampSetTimeBasedCommand): DimmerSetLightCommand {
    const manual: boolean = c.isForceAction;
    switch (c.time) {
      case TimeOfDay.Daylight:
        return new DimmerSetLightCommand(c, manual || s.dayOn, 'Daylight', c.disableAutomaticCommand, s.dayBrightness);
      case TimeOfDay.BeforeSunrise:
        return new DimmerSetLightCommand(
          c,
          manual || s.dawnOn,
          'Dawn',
          c.disableAutomaticCommand,
          s.dawnBrightness,
          undefined,
        );
      case TimeOfDay.AfterSunset:
        return new DimmerSetLightCommand(
          c,
          manual || s.duskOn,
          'Dusk',
          c.disableAutomaticCommand,
          s.duskBrightness,
          undefined,
        );
      case TimeOfDay.Night:
        return new DimmerSetLightCommand(
          c,
          manual || s.nightOn,
          'Night',
          c.disableAutomaticCommand,
          s.nightBrightness,
          undefined,
        );
      default:
        throw new Error(`TimeOfDay ${c.time} not supported`);
    }
  }
}
