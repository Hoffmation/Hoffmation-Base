import { ActuatorToggleCommand } from './actuatorToggleCommand';
import { CommandType } from './commandType';
import { CommandSource } from './commandSource';
import { BaseCommand } from './baseCommand';
import { TimeOfDay } from '../timeCallback';

export class LampToggleLightCommand extends ActuatorToggleCommand {
  public override _commandType: CommandType = CommandType.LampToggleLightCommand;

  /**
   *
   * @param {CommandSource | BaseCommand} source
   * @param {string} reason
   * @param {boolean} force To indicate a higher priority than automatic actions (e.g. a user pressing a button)
   * @param {TimeOfDay} time The time to use for calculation of desired state
   * @param {boolean} calculateTime Alternative to "time", if set the time will be calculated by the lamps room and its settings
   */
  public constructor(
    source: CommandSource | BaseCommand,
    reason: string = '',
    force: boolean = false,
    public time?: TimeOfDay,
    public readonly calculateTime: boolean = false,
  ) {
    super(source, force, reason);
  }

  public override get logMessage(): string {
    return `Lamp toggleLight from ${this.source} for reason: ${this.reasonTrace}`;
  }
}
