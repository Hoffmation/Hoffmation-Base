import { BaseCommand } from './baseCommand';
import { CommandSource } from './commandSource';

export class WindowSetRolloByWeatherStatusCommand extends BaseCommand {
  public constructor(source: CommandSource | BaseCommand, reason: string = '') {
    super('WindowSetRolloByWeatherStatusCommand', source, reason);
  }
}
