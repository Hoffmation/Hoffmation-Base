import { BaseCommand } from './baseCommand';
import { CommandType } from './commandType';
import { CommandSource } from './commandSource';
import { TimeOfDay } from '../timeCallback';

export class LightGroupSwitchTimeConditionalCommand extends BaseCommand {
  /** @inheritDoc */
  public override _commandType: CommandType = CommandType.LightGroupSwitchTimeConditional;

  /**
   * Command to switch a light group in accordance to a specific time of the day
   * @param source - The source of the command
   * @param time - The time of the day to switch the light group
   * @param reason - You can provide a reason for clarification
   */
  public constructor(
    source: CommandSource | BaseCommand,
    public readonly time: TimeOfDay,
    reason: string = '',
  ) {
    super(source, reason);
  }
}
