import { CommandType } from './commandType';
import { CommandSource } from './commandSource';
import { CollisionSolving } from '../collisionSolving';
import { BaseCommand } from './baseCommand';

export class AutomaticBlockDisableCommand extends BaseCommand {
  public _commandType: CommandType = CommandType.AutomaticBlockDisableCommand;

  /**
   * Command to disable automatic actions for a specific duration.
   * @param {CommandSource} source The source of the command.
   * @param {number} durationMS The duration in milliseconds for the automatic actions to be disabled.
   * @param reason You can provide an individual reason here for debugging purpose.
   * @param {CollisionSolving} onCollideAction The action to take if a block is already active. --> Default: overrideIfGreater
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
