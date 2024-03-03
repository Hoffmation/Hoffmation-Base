import { CommandType } from './commandType';
import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';

export class ActuatorToggleCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.ActuatorToggleCommand;

  public constructor(
    source: CommandSource | BaseCommand,
    public readonly force: boolean,
    reason: string = '',
  ) {
    super(source, reason);
  }

  public get logMessage(): string {
    return `Actuator toggle due to ${this.source} for reason: ${this.reasonTrace}`;
  }
}
