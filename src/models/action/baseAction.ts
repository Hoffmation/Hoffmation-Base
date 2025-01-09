import { BaseCommand, CommandSource } from '../command';

export abstract class BaseAction extends BaseCommand {
  protected constructor(source?: BaseAction, reason?: string) {
    super(source ?? CommandSource.Automatic, reason);
  }
}
