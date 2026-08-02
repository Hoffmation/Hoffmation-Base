import { BaseCommand } from './baseCommand';
import { CommandSource, CommandType } from '../enums';
import { AcSetStateCommand } from './acSetStateCommand';
import { BlockAutomaticCommand } from './blockAutomaticCommand';
import { iBaseCommand } from './iBaseCommand';

export class AcWriteStateToDeviceCommand extends BaseCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.AcWriteStateToDeviceCommand;

  /**
   * The command to disable automatic actions for a specific duration.
   * A block is not a device setting, so a pure power write can carry one too.
   * Undefined = no automatic actions will be disabled.
   */
  public disableAutomaticCommand: BlockAutomaticCommand | null | undefined;

  /**
   * Command to write the power state of an air-conditioning device to the device itself
   * @param source - The source of the command
   * @param on - The new power state
   * @param reason - You can provide a reason for clarification
   * @param disableAutomatic - If provided, the device will remain in the desired state for the
   * given disable action
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
    if (this.source instanceof AcSetStateCommand) {
      return `Ac Write StateToDevice original Log-message: ${this.source.logMessage}`;
    }
    return `Ac writeStateToDevice(${this.on}) for reason: ${this.reasonTrace}`;
  }
}
