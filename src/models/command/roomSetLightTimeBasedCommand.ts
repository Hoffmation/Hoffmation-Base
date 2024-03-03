import { BaseCommand } from './baseCommand';
import { CommandType } from './commandType';
import { CommandSource } from './commandSource';

export class RoomSetLightTimeBasedCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.RoomSetLightTimeBasedCommand;

  /**
   * Sets the light based on the current time, rollo Position and room Settings
   * @param source
   * @param movementDependant Only turn light on if there was a movement in the same room
   * @param reason
   */
  public constructor(
    source: CommandSource | BaseCommand,
    public readonly movementDependant: boolean = false,
    reason: string = '',
  ) {
    super(source, reason);
  }
}
