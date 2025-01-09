import { BaseCommand } from './baseCommand.js';
import { CommandType } from './commandType.js';
import { CommandSource } from './commandSource.js';

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
    source: CommandSource | BaseCommand,
    public readonly movementDependant: boolean = false,
    reason: string = '',
  ) {
    super(source, reason);
  }
}
