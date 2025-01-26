import { BaseCommand } from '../command';
import { CommandSource } from '../enums';

export abstract class BaseAction extends BaseCommand {
  protected constructor(source: BaseAction | CommandSource, reason?: string) {
    super(source, reason);
  }

  public get logMessage(): string {
    return this.reasonTrace;
  }
}
