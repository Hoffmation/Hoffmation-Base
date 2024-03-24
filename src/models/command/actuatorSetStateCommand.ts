import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';
import { CommandType } from './commandType';
import { ActuatorToggleCommand } from './actuatorToggleCommand';
import { iActuator } from '../../server';

export class ActuatorSetStateCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.ActuatorSetStateCommand;

  /**
   * Command to set the state of an actuator
   * @param source - The source of the command
   * @param on - The new state of the actuator
   * @param reason - You can provide a reason for clarification
   * @param timeout - If provided, the device automatic will be turned off for the given time in ms
   */
  public constructor(
    source: CommandSource | BaseCommand,
    public readonly on: boolean,
    reason: string = '',
    public timeout: number = -1,
  ) {
    super(source, reason);
  }

  public get logMessage(): string {
    return `Actuator setState to ${this.on} with timeout ${this.timeout} for reason: ${this.reasonTrace}`;
  }

  public static byActuatorAndToggleCommand(device: iActuator, c: ActuatorToggleCommand): ActuatorSetStateCommand {
    const newVal = device.queuedValue !== null ? !device.queuedValue : !device.actuatorOn;
    const timeout: number = newVal && c.isForceAction ? 30 * 60 * 1000 : -1;
    return new ActuatorSetStateCommand(c, newVal, 'Due to ActuatorToggle', timeout);
  }
}
