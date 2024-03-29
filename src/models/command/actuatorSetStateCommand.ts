import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';
import { CommandType } from './commandType';
import { ActuatorToggleCommand } from './actuatorToggleCommand';
import { iActuator } from '../../server';
import { BlockAutomaticCommand } from './blockAutomaticCommand';

export class ActuatorSetStateCommand extends BaseCommand {
  /** @inheritDoc */
  public override _commandType: CommandType = CommandType.ActuatorSetStateCommand;
  /**
   * The command to disable automatic actions for a specific duration.
   * Null = no automatic actions will be disabled.
   * Undefined = use device or global default
   */
  public disableAutomaticCommand: BlockAutomaticCommand | null | undefined;

  /**
   * Command to set the state of an actuator
   * @param source - The source of the command
   * @param on - The new state of the actuator
   * @param reason - You can provide a reason for clarification
   * @param disableAutomatic - If provided, the device will remain in the desired state for the given disable action.
   * If unset the default value in accordance to settings will be used
   */
  public constructor(
    source: CommandSource | BaseCommand,
    public readonly on: boolean,
    reason: string = '',
    disableAutomatic?: BlockAutomaticCommand | null,
  ) {
    super(source, reason);
    this.disableAutomaticCommand = disableAutomatic;
  }

  public get logMessage(): string {
    return `Actuator setState to ${this.on} with disableCommand ${this.disableAutomaticCommand?.logMessage} for reason: ${this.reasonTrace}`;
  }

  public static byActuatorAndToggleCommand(device: iActuator, c: ActuatorToggleCommand): ActuatorSetStateCommand {
    const newVal: boolean = device.queuedValue !== null ? !device.queuedValue : !device.actuatorOn;
    return new ActuatorSetStateCommand(c, newVal, 'Due to ActuatorToggle', c.isForceAction ? undefined : null);
  }
}
