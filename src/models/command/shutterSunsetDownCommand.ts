import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';
import { CommandType } from './commandType';

export class ShutterSunsetDownCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.SunsetDownCommand;

  public constructor(source: CommandSource | BaseCommand, reason: string = '') {
    super(source, reason);
  }
}
