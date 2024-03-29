import { CommandType } from './commandType';
import { CommandSource } from './commandSource';
import { BaseCommand } from './baseCommand';
import { ActuatorSetStateCommand } from './actuatorSetStateCommand';
import { BlockAutomaticCommand } from './blockAutomaticCommand';

export class LampSetLightCommand extends ActuatorSetStateCommand {
  /** @inheritDoc */
  public override _commandType: CommandType = CommandType.LampSetLightCommand;

  /**
   * Command to set the light of a lamp
   * @param source - The source of the command
   * @param on - The new state of the light
   * @param reason - You can provide a reason for clarification
   * @param disableAutomatic - If provided, the device will remain in the desired state for the given disable action.
   * If unset the default value will be used: {@link SettingsService.settings.blockAutomaticHandlerDefaults}
   */
  public constructor(
    source: CommandSource | BaseCommand,
    on: boolean,
    reason: string = '',
    disableAutomatic?: BlockAutomaticCommand | null,
  ) {
    super(source, on, reason, disableAutomatic);
  }

  /** @inheritDoc */
  public override get logMessage(): string {
    return `Lamp setLight to ${this.on} with block ${this.disableAutomaticCommand?.logMessage} for reason: ${this.reasonTrace}`;
  }
}
