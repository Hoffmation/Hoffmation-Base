import { CommandType } from './commandType';
import { CommandSource } from './commandSource';
import { BaseCommand } from './baseCommand';

export class AutomaticBlockLiftBlockCommand extends BaseCommand {
  public _commandType: CommandType = CommandType.AutomaticBlockLiftBlockCommand;

  /**
   * Command to lift a block --> Restore the automatic actions.
   * @param {CommandSource | BaseCommand} source The source of the command.
   * @param {string} reason You can provide an individual reason here for debugging purpose.
   */
  public constructor(source: CommandSource | BaseCommand, reason: string = '') {
    super(source, reason);
  }
}
