import { BaseCommand } from './baseCommand';
import { CollisionSolving, CommandSource, CommandType } from '../enums';
import { BlockAutomaticCommand } from './blockAutomaticCommand';
import { iBaseCommand } from '../interfaces';

export class BlockAutomaticUntilCommand extends BaseCommand {
  /** @inheritDoc */
  public type: CommandType = CommandType.BlockAutomaticUntilCommand;

  /**
   * The action to take if a block is already active.
   */
  public readonly onCollideAction: CollisionSolving;
  /**
   * Whether the device should revert to automatic afterward.
   */
  public readonly revertToAutomaticAtBlockLift: boolean;

  /**
   * Command to disable automatic actions until a specific date.
   * @param source - The source of the command.
   * @param targetDate - The date until the automatic actions will be disabled.
   * @param reason - You can provide an individual reason here for debugging purpose.
   * @param onCollideAction - The action to take if a block is already active. --> Default: {@link SettingsService.settings.blockAutomaticHandlerDefaults.defaultCollisionSolving}
   * @param revertToAutomaticAtBlockLift - Whether the device should revert to automatic afterward. --> Default: {@link SettingsService.settings.blockAutomaticHandlerDefaults.revertToAutomaticAtBlockLift}
   */
  public constructor(
    source: CommandSource | iBaseCommand,
    public targetDate: Date,
    reason: string = '',
    onCollideAction?: CollisionSolving,
    revertToAutomaticAtBlockLift?: boolean,
  ) {
    super(source, reason);
    this.onCollideAction =
      onCollideAction ?? BlockAutomaticCommand.defaultDefaultCollisionSolving ?? CollisionSolving.overrideIfGreater;
    this.revertToAutomaticAtBlockLift =
      revertToAutomaticAtBlockLift ?? BlockAutomaticCommand.defaultRevertToAutomaticAtBlockLift ?? true;
  }

  public get logMessage(): string {
    return `Block automatic until ${this.targetDate.toLocaleString('de-DE')}, reason: ${this.reasonTrace}`;
  }
}
