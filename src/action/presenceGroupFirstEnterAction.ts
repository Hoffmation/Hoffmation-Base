import { BaseAction } from './baseAction';
import { CommandSource, CommandType } from '../enums';

export class PresenceGroupFirstEnterAction extends BaseAction {
  /** @inheritDoc */
  public type = CommandType.PresenceGroupFirstEnterAction;

  public constructor(source: BaseAction | CommandSource, reason?: string) {
    super(source, reason);
  }
}
