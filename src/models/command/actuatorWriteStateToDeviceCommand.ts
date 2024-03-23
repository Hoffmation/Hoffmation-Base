import { BaseCommand } from './baseCommand';
import { CommandType } from './commandType';
import { CommandSource } from './commandSource';
import { ActuatorSetStateCommand } from './actuatorSetStateCommand';

export class ActuatorWriteStateToDeviceCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.ActuatorWriteStateToDeviceCommand;

  // TODO: Missing Comment
  public constructor(
    source: CommandSource | BaseCommand,
    public readonly stateValue: boolean,
    reason: string = '',
  ) {
    super(source, reason);
  }

  public get logMessage(): string {
    if (this.source instanceof ActuatorSetStateCommand) {
      return `Actuator Write StateToDevice original Log-message: ${this.source.logMessage}`;
    }
    return `Actuator writeStateToDevice(${this.stateValue}) for reason: ${this.reasonTrace}`;
  }
}
