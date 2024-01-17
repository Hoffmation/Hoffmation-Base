import { CommandSource } from './commandSource';
import { BaseCommand } from './baseCommand';

export class RoomRestoreShutterPositionCommand extends BaseCommand {
  public constructor(
    source: CommandSource | BaseCommand,
    public readonly recalc: boolean = false,
    reason: string = '',
  ) {
    super('RoomRestoreShutterPositionCommand', source, reason);
  }
}
