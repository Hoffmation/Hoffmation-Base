import { BaseCommand } from './baseCommand';
import { CommandSource, CommandType } from '../enums';
import { iBaseCommand } from '../interfaces';

export class ActuatorToggleCommand extends BaseCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.ActuatorToggleCommand;

  /**
   * Command to toggle the state of an actuator
   * @param source - The source of the command
   * @param reason - You can provide a reason for clarification
   */
  public constructor(source: CommandSource | iBaseCommand, reason: string = '') {
    super(source, reason);
  }
}
