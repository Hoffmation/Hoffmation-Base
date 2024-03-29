import { CommandType } from './commandType';
import { CommandSource } from './commandSource';
import { BaseCommand } from './baseCommand';

export class BlockAutomaticLiftBlockCommand extends BaseCommand {
  /** @inheritDoc */
  public _commandType: CommandType = CommandType.BlockAutomaticLiftBlockCommand;

  /**
   * Command to lift a block --> Restore the automatic actions.
   * @param source - The source of the command.
   * @param reason - You can provide an individual reason here for debugging purpose.
   */
  public constructor(source: CommandSource | BaseCommand, reason: string = '') {
    super(source, reason);
  }
}
