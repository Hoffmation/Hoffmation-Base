import { BaseCommand } from './baseCommand.js';
import { CommandSource } from './commandSource.js';
import { CommandType } from './commandType.js';

export class FloorSetAllShuttersCommand extends BaseCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.FloorSetAllShuttersCommand;

  /**
   * Creates an instance of FloorSetAllShuttersCommand.
   * @param source - The source of the command
   * @param position - (0 closed, 100 open)
   * @param specificFloor - undefined = all floors
   * @param reason - You can provide a reason for clarity
   */
  public constructor(
    source: CommandSource | BaseCommand,
    public readonly position: number,
    public readonly specificFloor: number | undefined = undefined,
    reason: string = '',
  ) {
    super(source, reason);
  }
}
