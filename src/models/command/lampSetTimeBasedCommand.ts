import { BaseCommand } from './baseCommand';
import { CommandType } from './commandType';
import { CommandSource } from './commandSource';
import { TimeOfDay } from '../timeCallback';

export class LampSetTimeBasedCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.LampSetTimeBasedCommand;

  /**
   * Set's the lamp based on lamp settings for the current time
   * @param {CommandSource | BaseCommand} source
   * @param {TimeOfDay} time The time to use for calculation of desired state
   * @param {number} timeout If > 0 this is the time after which the lamp reverts to its original state
   */
  public constructor(
    source: CommandSource | BaseCommand,
    public time: TimeOfDay,
    public timeout: number = -1,
  ) {
    super(source);
  }

  public get logMessage(): string {
    return `Lamp setTimeBased to ${TimeOfDay[this.time]} from ${this.source}`;
  }
}
