import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';
import { CommandType } from './commandType';
import { ActuatorToggleCommand } from './actuatorToggleCommand';
import { iActuator } from '../../server';

export class ActuatorSetStateCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.ShutterSetLevelCommand;

  public constructor(
    source: CommandSource | BaseCommand,
    public readonly on: boolean,
    reason: string = '',
    public timeout: number = -1,
  ) {
    super(source, reason);
  }

  public get logMessage(): string {
    return `Actuator setState to ${this.on} from ${this.source} for reason: ${this.reasonTrace}`;
  }

  public static byActuatorAndToggleCommand(device: iActuator, c: ActuatorToggleCommand): ActuatorSetStateCommand {
    const newVal = device.queuedValue !== null ? !device.queuedValue : !device.actuatorOn;
    const timeout: number = newVal && c.isForceAction ? 30 * 60 * 1000 : -1;
    return new ActuatorSetStateCommand(c, newVal, 'Due to ActuatorToggle', timeout);
  }
}
