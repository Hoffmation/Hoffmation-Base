import { BaseCommand } from './baseCommand';
import { CommandSource, CommandType } from '../enums';
import { iBaseCommand } from './iBaseCommand';

export class ExcessEnergyConsumerSetStateCommand extends BaseCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.ExcessEnergyConsumerSetStateCommand;

  /**
   * Command from the energy manager asking a consumer to start or stop.
   *
   * Carries the measurement the decision was based on, so the resulting device command can be
   * traced back to why the manager acted rather than just that it did.
   * @param source - The event this decision results from
   * @param on - Whether the consumer should run
   * @param reason - The energy situation that triggered the decision
   */
  public constructor(
    source: CommandSource | iBaseCommand,
    public readonly on: boolean,
    reason: string = '',
  ) {
    super(source, reason);
  }

  public get logMessage(): string {
    return `Excess energy consumer setState to ${this.on} for reason: ${this.reasonTrace}`;
  }
}
