import { BaseAction } from './baseAction';
import { CommandType } from '../enums';

export class PresenceGroupFirstEnterAction extends BaseAction {
  /** @inheritDoc */
  public type = CommandType.PresenceGroupFirstEnterAction;

  public constructor(source?: BaseAction, reason?: string) {
    super(source, reason);
  }
}
