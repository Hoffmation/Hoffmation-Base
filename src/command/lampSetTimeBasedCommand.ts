import { BaseCommand } from './baseCommand';
import { CommandSource, CommandType, TimeOfDay } from '../enums';
import { BlockAutomaticCommand } from './blockAutomaticCommand';

export class LampSetTimeBasedCommand extends BaseCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.LampSetTimeBasedCommand;
  /**
   * The command to disable automatic actions for a specific duration.
   * Null = no automatic actions will be disabled.
   * Undefined = use device or global default
   */
  public readonly disableAutomaticCommand: BlockAutomaticCommand | null | undefined;

  /**
   * Set's the lamp based on lamp settings for the current time
   * @param source - The source of the command
   * @param time - The time to use for calculation of desired state
   * @param reason - You can provide a reason for clarity
   * @param disableAutomatic - If provided, the device will remain in the desired state for the given disable action.
   * If undefined the default value will be used in case it's a non automatic action: {@link SettingsService.settings.blockAutomaticHandlerDefaults}
   */
  public constructor(
    source: CommandSource | BaseCommand,
    public time: TimeOfDay,
    reason: string = '',
    disableAutomatic?: BlockAutomaticCommand | null,
  ) {
    super(source, reason);
    this.disableAutomaticCommand = disableAutomatic;
  }
}
