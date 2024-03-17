import { BaseCommand } from './baseCommand';
import { CommandType } from './commandType';
import { CommandSource } from './commandSource';

export class ActuatorWriteStateToDeviceCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.ActuatorWriteStateToDeviceCommand;

  public constructor(
    source: CommandSource | BaseCommand,
    public readonly stateValue: boolean,
    reason: string = '',
  ) {
    super(source, reason);
  }

  public get logMessage(): string {
    return `Actuator writeStateToDevice(${this.stateValue}) for reason: ${this.reasonTrace}`;
  }
}
