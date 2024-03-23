import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';
import { CommandType } from './commandType';

export class ShutterSunriseUpCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.ShutterSunriseUpCommand;

  // TODO: Missing Comment
  public constructor(source: CommandSource | BaseCommand, reason: string = '') {
    super(source, reason);
  }
}
