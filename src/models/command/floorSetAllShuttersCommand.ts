import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';
import { CommandType } from './commandType';

export class FloorSetAllShuttersCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.FloorSetAllShuttersCommand;

  /**
   * Creates an instance of FloorSetAllShuttersCommand.
   * @param {CommandSource | BaseCommand} source
   * @param {number} position (0 closed, 100 open)
   * @param {number | undefined} specificFloor  undefined = all floors
   * @param {string} reason
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
