import { CommandType } from './commandType';
import { CommandSource } from './commandSource';
import { CollisionSolving } from '../collisionSolving';
import { BaseCommand } from './baseCommand';

export class BlockAutomaticUntilCommand extends BaseCommand {
  public _commandType: CommandType = CommandType.BlockAutomaticUntilCommand;

  /**
   * Command to disable automatic actions until a specific date.
   * @param source - The source of the command.
   * @param targetDate - The date until the automatic actions will be disabled.
   * @param reason - You can provide an individual reason here for debugging purpose.
   * @param onCollideAction - The action to take if a block is already active. --> Default: overrideIfGreater
   */
  public constructor(
    source: CommandSource | BaseCommand,
    public targetDate: Date,
    reason: string = '',
    public onCollideAction: CollisionSolving = CollisionSolving.overrideIfGreater,
  ) {
    super(source, reason);
  }
}
