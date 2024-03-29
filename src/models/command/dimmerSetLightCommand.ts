import { LampSetLightCommand } from './lampSetLightCommand';
import { CommandType } from './commandType';
import { CommandSource } from './commandSource';
import { BaseCommand } from './baseCommand';
import { LampSetTimeBasedCommand } from './lampSetTimeBasedCommand';
import { DimmerSettings } from '../deviceSettings';
import { TimeOfDay } from '../timeCallback';

export class DimmerSetLightCommand extends LampSetLightCommand {
  /** @inheritDoc */
  public override _commandType: CommandType = CommandType.DimmerSetLightCommand;

  /**
   * Command to change the light of a dimmer
   * @param source - The source of the command
   * @param on - The desired value
   * @param reason - You can provide a reason for clarity
   * @param timeout - A chosen Timeout after which the light should be reset
   * @param brightness - The desired brightness
   * @param transitionTime - The transition time during turnOn/turnOff
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

  /** @inheritDoc */
  public override get logMessage(): string {
    return `Dimmer setLight to ${this.on} with Brightness ${this.brightness} with timeout ${this.timeout} for reason: ${this.reasonTrace}`;
  }

  public static byTimeBased(s: DimmerSettings, c: LampSetTimeBasedCommand): DimmerSetLightCommand {
    const manual: boolean = c.isForceAction;
    switch (c.time) {
      case TimeOfDay.Daylight:
        return new DimmerSetLightCommand(c, manual || s.dayOn, 'Daylight', c.timeout, s.dayBrightness);
      case TimeOfDay.BeforeSunrise:
        return new DimmerSetLightCommand(c, manual || s.dawnOn, 'Dawn', c.timeout, s.dawnBrightness, undefined);
      case TimeOfDay.AfterSunset:
        return new DimmerSetLightCommand(c, manual || s.duskOn, 'Dusk', c.timeout, s.duskBrightness, undefined);
      case TimeOfDay.Night:
        return new DimmerSetLightCommand(c, manual || s.nightOn, 'Night', c.timeout, s.nightBrightness, undefined);
      default:
        throw new Error(`TimeOfDay ${c.time} not supported`);
    }
  }
}
