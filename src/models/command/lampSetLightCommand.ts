import { CommandType } from './commandType.js';
import { CommandSource } from './commandSource.js';
import { BaseCommand } from './baseCommand.js';
import { ActuatorSetStateCommand } from './actuatorSetStateCommand.js';
import { BlockAutomaticCommand } from './blockAutomaticCommand.js';

export class LampSetLightCommand extends ActuatorSetStateCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.LampSetLightCommand;

  /**
   * Command to set the light of a lamp
   * @param source - The source of the command
   * @param on - The new state of the light
   * @param reason - You can provide a reason for clarification
   * @param disableAutomatic - If provided, the device will remain in the desired state for the given disable action.
   * If undefined the default value will be used in case it's a non automatic action: {@link SettingsService.settings.blockAutomaticHandlerDefaults}
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
