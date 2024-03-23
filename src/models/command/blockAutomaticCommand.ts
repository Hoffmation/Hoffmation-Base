import { CommandType } from './commandType';
import { CommandSource } from './commandSource';
import { CollisionSolving } from '../collisionSolving';
import { BaseCommand } from './baseCommand';

export class BlockAutomaticCommand extends BaseCommand {
  public _commandType: CommandType = CommandType.BlockAutomaticCommand;

  /**
   * Command to disable automatic actions for a specific duration.
   * @param source The source of the command.
   * @param durationMS The duration in milliseconds for the automatic actions to be disabled.
   * @param reason You can provide an individual reason here for debugging purpose.
   * @param onCollideAction The action to take if a block is already active. --> Default: overrideIfGreater
   */
  public constructor(
    source: CommandSource | BaseCommand,
    public durationMS: number,
    reason: string = '',
    public onCollideAction: CollisionSolving = CollisionSolving.overrideIfGreater,
  ) {
    super(source, reason);
  }
}
