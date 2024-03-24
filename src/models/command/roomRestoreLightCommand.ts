import { BaseCommand } from './baseCommand';
import { CommandType } from './commandType';
import { CommandSource } from './commandSource';

export class RoomRestoreLightCommand extends BaseCommand {
  /** @inheritDoc */
  public override _commandType: CommandType = CommandType.RoomRestoreLightCommand;

  /**
   * Command to restore the normal automatic light-state of a room
   * @param source - The source of the command
   * @param reason - You can provide a reason for clarification
   */
  public constructor(source: CommandSource | BaseCommand, reason: string = '') {
    super(source, reason);
  }
}
