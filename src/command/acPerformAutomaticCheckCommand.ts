import { BaseCommand } from './baseCommand';
import { CommandSource, CommandType } from '../enums';
import { iBaseCommand } from './iBaseCommand';

export class AcPerformAutomaticCheckCommand extends BaseCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.AcPerformAutomaticCheckCommand;

  /**
   * Command asking an air-conditioning device to re-evaluate what its state should be.
   *
   * The check itself has several possible triggers - the recurring interval, a lifted
   * automatic block, or an outside caller. Each supplies its own source and reason here, so
   * the resulting device command can be traced back to what asked for the re-evaluation.
   * @param source - The event this check results from
   * @param reason - What triggered the check
   */
  public constructor(source: CommandSource | iBaseCommand, reason: string = '') {
    super(source, reason);
  }

  public get logMessage(): string {
    return `Ac perform automatic check for reason: ${this.reasonTrace}`;
  }
}
