import { CommandSource, CommandType } from '../enums';
import { BaseCommand } from './baseCommand';

export class WindowRestoreDesiredPositionCommand extends BaseCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.WindowRestoreDesiredPositionCommand;

  /**
   * Command to restore the desired position of the shutter of a window
   * @param source - The source of the command
   * @param reason - You can provide a reason for clarification
   */
  public constructor(source: CommandSource | BaseCommand, reason: string = '') {
    super(source, reason);
  }
}
