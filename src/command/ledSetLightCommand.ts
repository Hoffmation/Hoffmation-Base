import { DimmerSetLightCommand } from './dimmerSetLightCommand';
import { CommandSource, CommandType } from '../enums';
import { BlockAutomaticCommand } from './blockAutomaticCommand';
import { iBaseCommand } from '../interfaces';

export class LedSetLightCommand extends DimmerSetLightCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.LedSetLightCommand;

  /**
   * Command to set the light-state of a Led-Device
   * @param source - The source of the command
   * @param on - The desired state-value
   * @param reason - You can provide a reason for clarity
   * @param disableAutomatic - If provided, the device will remain in the desired state for the given disable action.
   * If undefined the default value will be used in case it's a non automatic action: {@link SettingsService.settings.blockAutomaticHandlerDefaults}
   * @param brightness - The desired brightness
   * @param transitionTime - The transition time during turnOn/turnOff
   * @param color - The desired color in 6 digit hex Code
   * @param colorTemp - The desired color Temperature (0 = more White)
   */
  public constructor(
    source: CommandSource | iBaseCommand,
    on: boolean,
    reason: string = '',
    disableAutomatic?: BlockAutomaticCommand | null,
    brightness?: number,
    transitionTime?: number,
    public color: string = '',
    public colorTemp: number = -1,
  ) {
    super(source, on, reason, disableAutomatic, brightness, transitionTime);
  }

  /** @inheritDoc */
  public override get logMessage(): string {
    return `Led setLight to state: ${this.on}, blockAutomatic: ${this.disableAutomaticCommand?.logMessage}, brightness: ${this.brightness}, color: ${this.color}, colorTemp: ${this.colorTemp} for reason: ${this.reasonTrace}`;
  }
}
