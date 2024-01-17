import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';

export class ShutterSunsetDownCommand extends BaseCommand {
  public constructor(source: CommandSource | BaseCommand, reason: string = '') {
    super('SunsetDownCommand', source, reason);
  }
}
