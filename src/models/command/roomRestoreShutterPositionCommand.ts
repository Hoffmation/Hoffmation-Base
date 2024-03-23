import { CommandSource } from './commandSource';
import { BaseCommand } from './baseCommand';
import { CommandType } from './commandType';

export class RoomRestoreShutterPositionCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.RoomRestoreShutterPositionCommand;

  // TODO: Missing Comment
  public constructor(
    source: CommandSource | BaseCommand,
    public readonly recalc: boolean = false,
    reason: string = '',
  ) {
    super(source, reason);
  }
}
