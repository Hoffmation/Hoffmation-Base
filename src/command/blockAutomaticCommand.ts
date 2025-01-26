import { BaseCommand } from './baseCommand';
import { CollisionSolving, CommandSource, CommandType } from '../enums';
import { iBaseCommand } from '../interfaces';

export class BlockAutomaticCommand extends BaseCommand {
  /**
   * Whether at Block-Lift the desired automatic state should be restored.
   */
  public static defaultRevertToAutomaticAtBlockLift?: boolean;

  /**
   * The default duration in milliseconds for a block to be on any force action.
   */
  public static defaultBlockAutomaticDurationMS?: number;

  /**
   * The default collision solving strategy to use.
   */
  public static defaultDefaultCollisionSolving?: CollisionSolving;
  /** @inheritDoc */
  public type: CommandType = CommandType.BlockAutomaticCommand;
  /**
   * Whether the device should revert to automatic afterward.
   */
  public readonly revertToAutomaticAtBlockLift: boolean;

  /**
   * The duration in milliseconds for the automatic actions to be disabled.
   */
  public readonly durationMS: number;

  /**
   * The action to take if a block is already active.
   */
  public readonly onCollideAction: CollisionSolving;

  /**
   * Command to disable automatic actions for a specific duration.
   * @param source - The source of the command.
   * @param durationMS - The duration in milliseconds for the automatic actions to be disabled --> If unset the default value will be used {@link SettingsService.settings.blockAutomaticHandlerDefaults.blockAutomaticDurationMS}
   * @param reason - You can provide an individual reason here for debugging purpose.
   * @param onCollideAction - The action to take if a block is already active. --> Default: {@link SettingsService.settings.blockAutomaticHandlerDefaults.defaultCollisionSolving}
   * @param revertToAutomaticAtBlockLift - Whether the device should revert to automatic afterward. --> Default: {@link SettingsService.settings.blockAutomaticHandlerDefaults.revertToAutomaticAtBlockLift}
   */
  public constructor(
    source: CommandSource | iBaseCommand,
    durationMS?: number,
    reason: string = '',
    onCollideAction?: CollisionSolving,
    revertToAutomaticAtBlockLift?: boolean,
  ) {
    super(source, reason);
    this.durationMS = durationMS ?? BlockAutomaticCommand.defaultBlockAutomaticDurationMS ?? 30 * 60 * 1000;
    this.revertToAutomaticAtBlockLift =
      revertToAutomaticAtBlockLift ?? BlockAutomaticCommand.defaultRevertToAutomaticAtBlockLift ?? true;
    this.onCollideAction =
      onCollideAction ?? BlockAutomaticCommand.defaultDefaultCollisionSolving ?? CollisionSolving.overrideIfGreater;
  }

  public get logMessage(): string {
    return `BlockAutomatic for ${this.durationMS}ms with onCollideAction ${this.onCollideAction} for reason: ${this.reasonTrace}`;
  }
}
