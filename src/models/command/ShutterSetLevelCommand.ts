import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';
import { CommandType } from './commandType';

export class ShutterSetLevelCommand extends BaseCommand {
  /** @inheritDoc */
  public override _commandType: CommandType = CommandType.ShutterSetLevelCommand;

  /**
   * Command to set the level of a shutter
   * @param source - The source of the command
   * @param level - The level to set the shutter to (0: close, 100: completely open)
   * @param reason - You can provide a reason for clarification
   * @param skipOpenWarning - Whether to skip the warning of window being open
   */
  public constructor(
    source: CommandSource | BaseCommand,
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
