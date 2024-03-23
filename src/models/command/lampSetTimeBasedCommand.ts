import { BaseCommand } from './baseCommand';
import { CommandType } from './commandType';
import { CommandSource } from './commandSource';
import { TimeOfDay } from '../timeCallback';

export class LampSetTimeBasedCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.LampSetTimeBasedCommand;

  /**
   * Set's the lamp based on lamp settings for the current time
   * @param source The source of the command
   * @param time The time to use for calculation of desired state
   * @param reason You can provide a reason for clarity
   * @param timeout If > 0 this is the time after which the lamp reverts to its original state
   */
  public constructor(
    source: CommandSource | BaseCommand,
    public time: TimeOfDay,
    reason: string = '',
    public timeout: number = -1,
  ) {
    super(source, reason);
  }

  public get logMessage(): string {
    return `Lamp setTimeBased to ${TimeOfDay[this.time]} for reason: ${this.reasonTrace}`;
  }
}
