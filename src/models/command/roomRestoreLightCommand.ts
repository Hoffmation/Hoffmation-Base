import { BaseCommand } from './baseCommand';
import { CommandType } from './commandType';
import { CommandSource } from './commandSource';

export class RoomRestoreLightCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.RoomRestoreLightCommand;

  public constructor(source: CommandSource | BaseCommand, reason: string = '') {
    super(source, reason);
  }
}
