import { CommandType } from './commandType';
import { CommandSource } from './commandSource';
import { BaseCommand } from './baseCommand';
import { DimmerSetLightCommand } from './dimmerSetLightCommand';
import { LampSetTimeBasedCommand } from './lampSetTimeBasedCommand';
import { TimeOfDay } from '../timeCallback';
import { LedSettings } from '../deviceSettings';

export class LedSetLightCommand extends DimmerSetLightCommand {
  public override _commandType: CommandType = CommandType.LedSetLightCommand;

  /**
   *
   * @param {CommandSource | BaseCommand} source
   * @param {boolean} on
   * @param {string} reason
   * @param {number} timeout  A chosen Timeout after which the light should be reset
   * @param {number} brightness The desired brightness
   * @param {number} transitionTime The transition time during turnOn/turnOff
   * @param {string} color The desired color in 6 digit hex Code
   * @param {number} colorTemp The desired color Temperature (0 = more White)
   */
  public constructor(
    source: CommandSource | BaseCommand,
    on: boolean,
    reason: string = '',
    timeout: number = -1,
    brightness?: number,
    transitionTime?: number,
    public color: string = '',
    public colorTemp: number = -1,
  ) {
    super(source, on, reason, timeout, brightness, transitionTime);
  }

  public override get logMessage(): string {
    return `Led setLight to state: ${this.on}, timeout: ${this.timeout}, brightness: ${this.brightness}, color: ${this.color}, colorTemp: ${this.colorTemp} for reason: ${this.reasonTrace}`;
  }

  /**
   * Create a LedSetLightCommand based on a LampSetTimeBasedCommand and LedSettings by respecting the time of day
   * @param {LedSettings} settings The settings for the Led
   * @param {LampSetTimeBasedCommand} c The command to base the LedSetLightCommand on
   * @returns {LedSetLightCommand} The created LedSetLightCommand
   */
  public static byTimeBased(settings: LedSettings, c: LampSetTimeBasedCommand): LedSetLightCommand {
    switch (c.time) {
      case TimeOfDay.Daylight:
        return new LedSetLightCommand(
          c,
          settings.dayOn,
          '',
          c.timeout,
          settings.dayBrightness,
          undefined,
          settings.dayColor,
          settings.dayColorTemp,
        );
      case TimeOfDay.BeforeSunrise:
        return new LedSetLightCommand(
          c,
          settings.dawnOn,
          '',
          c.timeout,
          settings.dawnBrightness,
          undefined,
          settings.dawnColor,
          settings.dawnColorTemp,
        );
      case TimeOfDay.AfterSunset:
        return new LedSetLightCommand(
          c,
          settings.duskOn,
          '',
          c.timeout,
          settings.duskBrightness,
          undefined,
          settings.duskColor,
          settings.duskColorTemp,
        );
      case TimeOfDay.Night:
        return new LedSetLightCommand(
          c,
          settings.nightOn,
          '',
          c.timeout,
          settings.nightBrightness,
          undefined,
          settings.nightColor,
          settings.nightColorTemp,
        );
    }
  }
}
