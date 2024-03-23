import { CommandType } from './commandType';
import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';

export class ActuatorToggleCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.ActuatorToggleCommand;

  // TODO: Missing Comment
  public constructor(source: CommandSource | BaseCommand, reason: string = '') {
    super(source, reason);
  }

  public get logMessage(): string {
    return `Actuator toggle for reason: ${this.reasonTrace}`;
  }
}
