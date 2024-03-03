import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';
import { CommandType } from './commandType';

export class ActuatorSetStateCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.ShutterSetLevelCommand;

  public constructor(
    source: CommandSource | BaseCommand,
    public readonly on: boolean,
    reason: string = '',
    public timeout?: number,
    public force?: boolean,
  ) {
    super(source, reason);
  }

  public get logMessage(): string {
    return `Actuator setState to ${this.on} from ${this.source} for reason: ${this.reasonTrace}`;
  }
}
