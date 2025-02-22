import { CommandSource, CommandType, TimeOfDay } from '../enums';
import { ActuatorToggleCommand } from './actuatorToggleCommand';
import { iBaseCommand } from './iBaseCommand';

export class LampToggleLightCommand extends ActuatorToggleCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.LampToggleLightCommand;

  /**
   * Command to toggle the light-state of a lamp
   * @param source - The source of the command
   * @param reason - You can provide a reason for clarity
   * @param time - The time to use for calculation of desired state
   * @param calculateTime - Alternative to "time", if set the time will be calculated by the lamps room and its settings
   */
  public constructor(
    source: CommandSource | iBaseCommand,
    reason: string = '',
    public time?: TimeOfDay,
    public readonly calculateTime: boolean = false,
  ) {
    super(source, reason);
  }

  public get logMessage(): string {
    return `Lamp toggleLight for reason: ${this.reasonTrace}`;
  }
}
