import { BaseCommand } from './baseCommand';
import { CommandSource, CommandType } from '../enums';
import { iBaseCommand } from '../interfaces';

export class RoomSetLightTimeBasedCommand extends BaseCommand {
  /** @inheritDoc */
  public override type: CommandType = CommandType.RoomSetLightTimeBasedCommand;

  /**
   * Sets the light based on the current time, rollo Position and room Settings
   * @param source - The source of the command
   * @param movementDependant - Only turn light on if there was a movement in the same room
   * @param reason - You can provide a reason for clarity
   */
  public constructor(
    source: CommandSource | iBaseCommand,
    public readonly movementDependant: boolean = false,
    reason: string = '',
  ) {
    super(source, reason);
  }
}
