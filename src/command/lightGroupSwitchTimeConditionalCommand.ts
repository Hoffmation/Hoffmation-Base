import { BaseCommand } from './baseCommand';
import { CommandSource, CommandType, TimeOfDay } from '../enums';
import { iBaseCommand } from './iBaseCommand';

export class LightGroupSwitchTimeConditionalCommand extends BaseCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.LightGroupSwitchTimeConditional;

  /**
   * Command to switch a light group in accordance to a specific time of the day
   * @param source - The source of the command
   * @param time - The time of the day to switch the light group
   * @param reason - You can provide a reason for clarification
   */
  public constructor(
    source: CommandSource | iBaseCommand,
    public readonly time: TimeOfDay,
    reason: string = '',
  ) {
    super(source, reason);
  }
}
