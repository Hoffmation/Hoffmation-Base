import { BaseCommand } from './baseCommand';
import { CommandSource, CommandType } from '../enums';
import { iBaseCommand } from './iBaseCommand';

export class RoomRestoreLightCommand extends BaseCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.RoomRestoreLightCommand;

  /**
   * Command to restore the normal automatic light-state of a room
   * @param source - The source of the command
   * @param reason - You can provide a reason for clarification
   */
  public constructor(source: CommandSource | iBaseCommand, reason: string = '') {
    super(source, reason);
  }
}
