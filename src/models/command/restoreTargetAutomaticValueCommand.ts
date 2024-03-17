import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';
import { CommandType } from './commandType';

export class RestoreTargetAutomaticValueCommand extends BaseCommand {
  public override _commandType: CommandType = CommandType.ActuatorRestoreTargetAutomaticValueCommand;

  public constructor(source: CommandSource | BaseCommand, reason: string = '') {
    super(source, reason);
  }

  public get logMessage(): string {
    return `Actuator restore target automatic value from ${this.source} for reason: ${this.reasonTrace}`;
  }
}
