import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';
import { CommandType } from './commandType';

export class ShutterSunriseUpCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.ShutterSunriseUpCommand;

  /**
   * Command to perform actions when the shutter should be opened due to sunrise
   * @param {CommandSource | BaseCommand} source The source of the command
   * @param {string} reason You can provide a reason for clarification
   */
  public constructor(source: CommandSource | BaseCommand, reason: string = '') {
    super(source, reason);
  }
}
