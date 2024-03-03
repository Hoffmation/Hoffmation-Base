import { LampSetLightCommand } from './lampSetLightCommand';
import { CommandType } from './commandType';
import { CommandSource } from './commandSource';
import { BaseCommand } from './baseCommand';

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
    public transitionTime?: number,
  ) {
    super(source, on, reason, timeout);
  }

  public override get logMessage(): string {
    return `Dimmer setLight to ${this.on} from ${this.source} for reason: ${this.reasonTrace}`;
  }
}
