import { CommandSource, CommandType } from '../enums';
import { BaseCommand } from './baseCommand';
import { iBaseCommand } from './iBaseCommand';

export class WindowSetDesiredPositionCommand extends BaseCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.WindowSetDesiredPositionCommand;

  /**
   * Command to set the desired position of the shutter of a window
   * @param source - The source of the command
   * @param position - The desired position of the shutter (0 closed, 100 open)
   * @param reason - You can provide a reason for clarification
   * @param applyNewPosition - Whether this new position should be applied immediately
   */
  public constructor(
    source: CommandSource | iBaseCommand,
    public readonly position: number,
    reason: string = '',
    public readonly applyNewPosition: boolean = true,
  ) {
    super(source, reason);
  }
}
