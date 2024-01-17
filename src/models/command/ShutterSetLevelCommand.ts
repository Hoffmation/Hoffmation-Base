import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';

export class ShutterSetLevelCommand extends BaseCommand {
  public constructor(
    source: CommandSource | BaseCommand,
    public readonly level: number,
    reason: string = '',
    public readonly skipOpenWarning: boolean = false,
  ) {
    super('ShutterSetLevelCommand', source, reason);
  }

  public get logMessage(): string {
    return `Shutter setLevel to ${this.level} from ${this.source} for reason: ${this.reasonTrace}`;
  }
}
