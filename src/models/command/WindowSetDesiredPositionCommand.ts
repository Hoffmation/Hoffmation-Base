import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';
import { CommandType } from './commandType';

export class WindowSetDesiredPositionCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.WindowSetDesiredPositionCommand;

  // TODO: Missing Comment
  public constructor(
    source: CommandSource | BaseCommand,
    public readonly position: number,
    reason: string = '',
  ) {
    super(source, reason);
  }
}
