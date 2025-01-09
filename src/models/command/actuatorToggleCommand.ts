import { CommandType } from './commandType';
import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';

export class ActuatorToggleCommand extends BaseCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.ActuatorToggleCommand;

  /**
   * Command to toggle the state of an actuator
   * @param source - The source of the command
   * @param reason - You can provide a reason for clarification
   */
  public constructor(source: CommandSource | BaseCommand, reason: string = '') {
    super(source, reason);
  }
}
