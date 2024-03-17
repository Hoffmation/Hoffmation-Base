import { BaseCommand } from './baseCommand';
import { CommandType } from './commandType';
import { CommandSource } from './commandSource';

export class ActuatorWriteStateToDeviceCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.ActuatorWriteStateToDeviceCommand;

  public constructor(
    public readonly stateValue: boolean,
    source: CommandSource | BaseCommand,
    reason: string = '',
  ) {
    super(source, reason);
  }

  public get logMessage(): string {
    return `Actuator writeStateToDevice(${this.stateValue}) for reason: ${this.reasonTrace}`;
  }
}
