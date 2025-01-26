import { BaseCommand } from './baseCommand';
import { CommandSource, CommandType } from '../enums';
import { iBaseCommand } from '../interfaces';

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
    source: CommandSource | iBaseCommand,
    public readonly position: number,
    public readonly specificFloor: number | undefined = undefined,
    reason: string = '',
  ) {
    super(source, reason);
  }
}
