import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';
import { CommandType } from './commandType';

export class ShutterSunsetDownCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.SunsetDownCommand;

  /**
   * Command to perform actions when the shutter is closing due to sunset
   * @param {CommandSource | BaseCommand} source The source of the command
   * @param {string} reason You can provide a reason for clarification
   */
  public constructor(source: CommandSource | BaseCommand, reason: string = '') {
    super(source, reason);
  }
}
