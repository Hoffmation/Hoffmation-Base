import { BaseCommand } from './baseCommand';
import { AcMode, CommandSource, CommandType } from '../enums';
import { BlockAutomaticCommand } from './blockAutomaticCommand';
import { iBaseCommand } from './iBaseCommand';

export class AcSetStateCommand extends BaseCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.AcSetStateCommand;
  /**
   * The command to disable automatic actions for a specific duration.
   * Null = no automatic actions will be disabled.
   * Undefined = no automatic actions will be disabled.
   */
  public disableAutomaticCommand: BlockAutomaticCommand | null | undefined;

  /**
   * Command to set the state of an air-conditioning device
   * @param source - The source of the command
   * @param mode - The desired mode; {@link AcMode.Off} turns the device off. Leave undefined
   * to just switch it on and let the device pick the mode, which depends on season and settings
   * it alone knows.
   * @param desiredTemperature - The desired temperature; if unset the device calculates it
   * @param reason - You can provide a reason for clarification
   * @param disableAutomatic - If provided, the device will remain in the desired state for the
   * given disable action. Automatic decisions pass nothing here, so they do not block themselves.
   */
  public constructor(
    source: CommandSource | iBaseCommand,
    public readonly mode: AcMode | undefined,
    public readonly desiredTemperature: number | undefined = undefined,
    reason: string = '',
    disableAutomatic?: BlockAutomaticCommand | null,
  ) {
    super(source, reason);
    this.disableAutomaticCommand = disableAutomatic;
  }

  /**
   * Whether this command results in the device running
   * @returns True unless the desired mode is {@link AcMode.Off}
   */
  public get on(): boolean {
    return this.mode !== AcMode.Off;
  }

  public get logMessage(): string {
    const temp: string =
      this.desiredTemperature !== undefined ? ` at ${this.desiredTemperature}°C` : ' at calculated temperature';
    const mode: string = this.mode !== undefined ? AcMode[this.mode] : 'device default';
    return `Ac setState to mode ${mode}${temp} with disableCommand ${this.disableAutomaticCommand?.logMessage} for reason: ${this.reasonTrace}`;
  }
}
