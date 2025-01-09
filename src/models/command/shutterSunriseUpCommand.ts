import { BaseCommand } from './baseCommand.js';
import { CommandSource } from './commandSource.js';
import { CommandType } from './commandType.js';

export class ShutterSunriseUpCommand extends BaseCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.ShutterSunriseUpCommand;

  /**
   * Command to perform actions when the shutter should be opened due to sunrise
   * @param source - The source of the command
   * @param reason - You can provide a reason for clarification
   */
  public constructor(source: CommandSource | BaseCommand, reason: string = '') {
    super(source, reason);
  }
}
