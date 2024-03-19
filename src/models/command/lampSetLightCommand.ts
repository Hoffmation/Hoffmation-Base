import { CommandType } from './commandType';
import { CommandSource } from './commandSource';
import { BaseCommand } from './baseCommand';
import { ActuatorSetStateCommand } from './actuatorSetStateCommand';

export class LampSetLightCommand extends ActuatorSetStateCommand {
  public override _commandType: CommandType = CommandType.LampSetLightCommand;

  public constructor(source: CommandSource | BaseCommand, on: boolean, reason: string = '', timeout: number = -1) {
    super(source, on, reason, timeout);
  }

  public override get logMessage(): string {
    return `Lamp setLight to ${this.on} with timeout ${this.timeout} for reason: ${this.reasonTrace}`;
  }
}
