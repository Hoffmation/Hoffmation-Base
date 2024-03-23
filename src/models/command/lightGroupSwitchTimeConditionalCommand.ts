import { BaseCommand } from './baseCommand';
import { CommandType } from './commandType';
import { CommandSource } from './commandSource';
import { TimeOfDay } from '../timeCallback';

export class LightGroupSwitchTimeConditionalCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.LightGroupSwitchTimeConditional;

  // TODO: Missing Comment
  public constructor(
    source: CommandSource | BaseCommand,
    public readonly time: TimeOfDay,
    reason: string = '',
  ) {
    super(source, reason);
  }
}
