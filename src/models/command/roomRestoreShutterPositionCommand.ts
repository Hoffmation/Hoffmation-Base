import { BaseCommand } from './baseCommand';
import { CommandSource, CommandType } from '../../enums';

export class RoomRestoreShutterPositionCommand extends BaseCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.RoomRestoreShutterPositionCommand;

  /**
   * Command to restore the normal automatic shutter position of a room
   * @param source - The source of the command
   * @param recalc - Whether to recalculate the shutter position
   * @param reason - You can provide a reason for clarification
   */
  public constructor(
    source: CommandSource | BaseCommand,
    public readonly recalc: boolean = false,
    reason: string = '',
  ) {
    super(source, reason);
  }
}
