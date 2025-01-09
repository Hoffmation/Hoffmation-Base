import { CommandType } from './commandType';
import { CommandSource } from './commandSource';
import { BaseCommand } from './baseCommand';
import { DimmerSetLightCommand } from './dimmerSetLightCommand';
import { LampSetTimeBasedCommand } from './lampSetTimeBasedCommand';
import { TimeOfDay } from '../timeCallback';
import { LedSettings } from '../deviceSettings';
import { BlockAutomaticCommand } from './blockAutomaticCommand';

export class LedSetLightCommand extends DimmerSetLightCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.LedSetLightCommand;

  /**
   * Command to set the light-state of a Led-Device
   * @param source - The source of the command
   * @param on - The desired state-value
   * @param reason - You can provide a reason for clarity
   * @param disableAutomatic - If provided, the device will remain in the desired state for the given disable action.
   * If undefined the default value will be used in case it's a non automatic action: {@link SettingsService.settings.blockAutomaticHandlerDefaults}
   * @param brightness - The desired brightness
   * @param transitionTime - The transition time during turnOn/turnOff
   * @param color - The desired color in 6 digit hex Code
   * @param colorTemp - The desired color Temperature (0 = more White)
   */
  public constructor(
    source: CommandSource | BaseCommand,
    on: boolean,
    reason: string = '',
    disableAutomatic?: BlockAutomaticCommand | null,
    brightness?: number,
    transitionTime?: number,
    public color: string = '',
    public colorTemp: number = -1,
  ) {
    super(source, on, reason, disableAutomatic, brightness, transitionTime);
  }

  /** @inheritDoc */
  public override get logMessage(): string {
    return `Led setLight to state: ${this.on}, blockAutomatic: ${this.disableAutomaticCommand?.logMessage}, brightness: ${this.brightness}, color: ${this.color}, colorTemp: ${this.colorTemp} for reason: ${this.reasonTrace}`;
  }

  /**
   * Create a LedSetLightCommand based on a LampSetTimeBasedCommand and LedSettings by respecting the time of day
   * @param settings - The settings for the Led
   * @param c - The command to base the LedSetLightCommand on
   * @returns The created LedSetLightCommand
   */
  public static byTimeBased(settings: LedSettings, c: LampSetTimeBasedCommand): LedSetLightCommand {
    switch (c.time) {
      case TimeOfDay.Daylight:
        return new LedSetLightCommand(
          c,
          settings.dayOn,
          `byTimeBased(${TimeOfDay[c.time]})`,
          c.disableAutomaticCommand,
          settings.dayBrightness,
          undefined,
          settings.dayColor,
          settings.dayColorTemp,
        );
      case TimeOfDay.BeforeSunrise:
        return new LedSetLightCommand(
          c,
          settings.dawnOn,
          `byTimeBased(${TimeOfDay[c.time]})`,
          c.disableAutomaticCommand,
          settings.dawnBrightness,
          undefined,
          settings.dawnColor,
          settings.dawnColorTemp,
        );
      case TimeOfDay.AfterSunset:
        return new LedSetLightCommand(
          c,
          settings.duskOn,
          `byTimeBased(${TimeOfDay[c.time]})`,
          c.disableAutomaticCommand,
          settings.duskBrightness,
          undefined,
          settings.duskColor,
          settings.duskColorTemp,
        );
      case TimeOfDay.Night:
        return new LedSetLightCommand(
          c,
          settings.nightOn,
          `byTimeBased(${TimeOfDay[c.time]})`,
          c.disableAutomaticCommand,
          settings.nightBrightness,
          undefined,
          settings.nightColor,
          settings.nightColorTemp,
        );
    }
  }
}
