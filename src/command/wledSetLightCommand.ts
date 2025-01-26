import { DimmerSetLightCommand } from './dimmerSetLightCommand';
import { CommandSource, CommandType } from '../enums';
import { BlockAutomaticCommand } from './blockAutomaticCommand';
import { iBaseCommand } from './iBaseCommand';

export class WledSetLightCommand extends DimmerSetLightCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.WledSetLightCommand;

  /**
   * Command to set the light state of a WLED device
   * @param source - The source of the command
   * @param on - The desired state of the light
   * @param reason - You can provide a reason for clarification
   * @param disableAutomatic - If provided, the device will remain in the desired state for the given disable action.
   * If undefined the default value will be used in case it's a non automatic action: {@link SettingsService.settings.blockAutomaticHandlerDefaults}
   * @param brightness - The brightness of the light
   * @param transitionTime - The time in milliseconds the transition should take
   * @param preset - The preset to use
   */
  public constructor(
    source: CommandSource | iBaseCommand,
    on: boolean,
    reason: string = '',
    disableAutomatic?: BlockAutomaticCommand | null,
    brightness: number = -1,
    transitionTime: number = -1,
    public preset?: number,
  ) {
    super(source, on, reason, disableAutomatic, brightness, transitionTime);
  }

  public override get logMessage(): string {
    return `Dimmer setLight to ${this.on} with Brightness ${this.brightness}, disableAutomatic ${this.disableAutomaticCommand?.logMessage} and preset ${this.preset} for reason: ${this.reasonTrace}`;
  }
}
