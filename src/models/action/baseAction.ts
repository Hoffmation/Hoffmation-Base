import { BaseCommand } from '../command';
import { CommandSource } from '../../enums';

export abstract class BaseAction extends BaseCommand {
  protected constructor(source?: BaseAction, reason?: string) {
    super(source ?? CommandSource.Automatic, reason);
  }
}
