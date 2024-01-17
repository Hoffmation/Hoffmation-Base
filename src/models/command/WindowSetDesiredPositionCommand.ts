import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';

export class WindowSetDesiredPositionCommand extends BaseCommand {
  public constructor(
    source: CommandSource | BaseCommand,
    public readonly position: number,
    reason: string = '',
  ) {
    super('WindowSetDesiredPositionCommand', source, reason);
  }
}
