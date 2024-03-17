import { LampSetLightCommand } from './lampSetLightCommand';
import { CommandType } from './commandType';
import { CommandSource } from './commandSource';
import { BaseCommand } from './baseCommand';
import { LampSetTimeBasedCommand } from './lampSetTimeBasedCommand';
import { DimmerSettings } from '../deviceSettings';
import { TimeOfDay } from '../timeCallback';

export class DimmerSetLightCommand extends LampSetLightCommand {
  public override _commandType: CommandType = CommandType.DimmerSetLightCommand;

  /**
   * @param {CommandSource | BaseCommand} source
   * @param {boolean} on The desired value
   * @param {string} reason
   * @param {number} timeout  A chosen Timeout after which the light should be reset
   * @param {number} brightness The desired brightness
   * @param {number} transitionTime The transition time during turnOn/turnOff
   */
  public constructor(
    source: CommandSource | BaseCommand,
    on: boolean,
    reason: string = '',
    timeout: number = -1,
    public brightness: number = -1,
    public transitionTime: number = -1,
  ) {
    super(source, on, reason, timeout);
  }

  public override get logMessage(): string {
    return `Dimmer setLight to ${this.on} from ${this.source} for reason: ${this.reasonTrace}`;
  }

  public static byTimeBased(s: DimmerSettings, c: LampSetTimeBasedCommand): DimmerSetLightCommand {
    switch (c.time) {
      case TimeOfDay.Daylight:
        return new DimmerSetLightCommand(c, true, 'By TimeBased Daylight', c.timeout, s.dayBrightness);
      case TimeOfDay.BeforeSunrise:
        return new DimmerSetLightCommand(c, s.dawnOn, '', c.timeout, s.dawnBrightness, undefined);
      case TimeOfDay.AfterSunset:
        return new DimmerSetLightCommand(c, s.duskOn, '', c.timeout, s.duskBrightness, undefined);
      case TimeOfDay.Night:
        return new DimmerSetLightCommand(c, s.nightOn, '', c.timeout, s.nightBrightness, undefined);
      default:
        throw new Error(`TimeOfDay ${c.time} not supported`);
    }
  }
}
