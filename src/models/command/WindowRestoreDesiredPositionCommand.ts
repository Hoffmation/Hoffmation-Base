import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';
import { CommandType } from './commandType';

export class WindowRestoreDesiredPositionCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.WindowRestoreDesiredPositionCommand;

  public constructor(source: CommandSource | BaseCommand, reason: string = '') {
    super(source, reason);
  }
}
