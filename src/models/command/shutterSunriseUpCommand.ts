import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';

export class ShutterSunriseUpCommand extends BaseCommand {
  public constructor(source: CommandSource | BaseCommand, reason: string = '') {
    super('ShutterSunriseUpCommand', source, reason);
  }
}
