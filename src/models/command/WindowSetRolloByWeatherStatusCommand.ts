import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';
import { CommandType } from './commandType';

export class WindowSetRolloByWeatherStatusCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.WindowSetRolloByWeatherStatusCommand;

  // TODO: Missing Comment
  public constructor(source: CommandSource | BaseCommand, reason: string = '') {
    super(source, reason);
  }
}
