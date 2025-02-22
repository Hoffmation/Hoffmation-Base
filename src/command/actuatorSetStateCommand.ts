import { BaseCommand } from './baseCommand';
import { CommandSource, CommandType } from '../enums';
import { BlockAutomaticCommand } from './blockAutomaticCommand';
import { iBaseCommand } from './iBaseCommand';

export class ActuatorSetStateCommand extends BaseCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.ActuatorSetStateCommand;
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
    source: CommandSource | iBaseCommand,
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
}
