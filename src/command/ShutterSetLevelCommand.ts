import { BaseCommand } from './baseCommand';
import { CommandSource, CommandType } from '../enums';
import { iBaseCommand } from './iBaseCommand';
import { BlockAutomaticCommand } from './blockAutomaticCommand';

export class ShutterSetLevelCommand extends BaseCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.ShutterSetLevelCommand;
  /**
   * The command to disable automatic actions for a specific duration.
   * Null = no automatic actions will be disabled.
   * Undefined = use device or global default
   */
  public disableAutomaticCommand: BlockAutomaticCommand | null | undefined;

  /**
   * Command to set the level of a shutter
   * @param source - The source of the command
   * @param level - The level to set the shutter to (0: close, 100: completely open)
   * @param reason - You can provide a reason for clarification
   * @param skipOpenWarning - Whether to skip the warning of window being open
   */
  public constructor(
    source: CommandSource | iBaseCommand,
    public readonly level: number,
    reason: string = '',
    public readonly skipOpenWarning: boolean = false,
  ) {
    super(source, reason);
  }

  public get logMessage(): string {
    return `Shutter setLevel to ${this.level} for reason: ${this.reasonTrace}`;
  }
}
