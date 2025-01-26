import { CommandSource, CommandType } from '../enums';
import { BaseCommand } from './baseCommand';
import { iBaseCommand } from '../interfaces';

export class RestoreTargetAutomaticValueCommand extends BaseCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.ActuatorRestoreTargetAutomaticValueCommand;

  /**
   * Command to restore the target automatic value of an actuator
   * @param source - The source of the command
   * @param reason - You can provide a reason for clarification
   */
  public constructor(source: CommandSource | iBaseCommand, reason: string = '') {
    super(source, reason);
  }
}
