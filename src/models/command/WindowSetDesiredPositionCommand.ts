import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';
import { CommandType } from './commandType';

export class WindowSetDesiredPositionCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.WindowSetDesiredPositionCommand;

  /**
   * Command to set the desired position of the shutter of a window
   * @param source - The source of the command
   * @param position - The desired position of the shutter (0 closed, 100 open)
   * @param reason - You can provide a reason for clarification
   */
  public constructor(
    source: CommandSource | BaseCommand,
    public readonly position: number,
    reason: string = '',
  ) {
    super(source, reason);
  }
}
