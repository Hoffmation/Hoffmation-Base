import { LampSetLightCommand } from './lampSetLightCommand';
import { CommandSource, CommandType } from '../enums';
import { BlockAutomaticCommand } from './blockAutomaticCommand';
import { iBaseCommand } from './iBaseCommand';

export class DimmerSetLightCommand extends LampSetLightCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.DimmerSetLightCommand;

  /**
   * Command to change the light of a dimmer
   * @param source - The source of the command
   * @param on - The desired value
   * @param reason - You can provide a reason for clarity
   * @param disableAutomatic - If provided, the device will remain in the desired state for the given disable action.
   * If undefined the default value will be used in case it's a non automatic action: {@link SettingsService.settings.blockAutomaticHandlerDefaults}
   * @param brightness - The desired brightness
   * @param transitionTime - The transition time during turnOn/turnOff
   */
  public constructor(
    source: CommandSource | iBaseCommand,
    on: boolean,
    reason: string = '',
    disableAutomatic?: BlockAutomaticCommand | null,
    public brightness: number = -1,
    public transitionTime: number = -1,
  ) {
    super(source, on, reason, disableAutomatic);
  }

  /** @inheritDoc */
  public override get logMessage(): string {
    return `Dimmer setLight to ${this.on} with Brightness ${this.brightness} with disable ${this.disableAutomaticCommand?.logMessage} for reason: ${this.reasonTrace}`;
  }
}
