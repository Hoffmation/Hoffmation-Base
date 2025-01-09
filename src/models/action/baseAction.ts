import { BaseCommand, CommandSource } from '../command/index.js';

export abstract class BaseAction extends BaseCommand {
  protected constructor(source?: BaseAction, reason?: string) {
    super(source ?? CommandSource.Automatic, reason);
  }
}
