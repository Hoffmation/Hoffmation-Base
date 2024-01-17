import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';

export class WindowRestoreDesiredPositionCommand extends BaseCommand {
  public constructor(source: CommandSource | BaseCommand, reason: string = '') {
    super('WindowRestoreDesiredPositionCommand', source, reason);
  }
}
