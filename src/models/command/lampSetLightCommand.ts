import { CommandType } from './commandType';
import { CommandSource } from './commandSource';
import { BaseCommand } from './baseCommand';
import { ActuatorSetStateCommand } from './actuatorSetStateCommand';

export class LampSetLightCommand extends ActuatorSetStateCommand {
  public override _commandType: CommandType = CommandType.LampSetLightCommand;

  /**
   * Command to set the light of a lamp
   * @param source The source of the command
   * @param on The new state of the light
   * @param reason You can provide a reason for clarification
   * @param timeout If provided, the device automatic will be turned off for the given time in ms --> Reverts to automatic after the timeout.
   */
  public constructor(source: CommandSource | BaseCommand, on: boolean, reason: string = '', timeout: number = -1) {
    super(source, on, reason, timeout);
  }

  public override get logMessage(): string {
    return `Lamp setLight to ${this.on} with timeout ${this.timeout} for reason: ${this.reasonTrace}`;
  }
}
