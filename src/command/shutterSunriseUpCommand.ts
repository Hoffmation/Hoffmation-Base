import { BaseCommand } from './baseCommand';
import { CommandSource, CommandType } from '../enums';
import { iBaseCommand } from '../interfaces';

export class ShutterSunriseUpCommand extends BaseCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.ShutterSunriseUpCommand;

  /**
   * Command to perform actions when the shutter should be opened due to sunrise
   * @param source - The source of the command
   * @param reason - You can provide a reason for clarification
   */
  public constructor(source: CommandSource | iBaseCommand, reason: string = '') {
    super(source, reason);
  }
}
