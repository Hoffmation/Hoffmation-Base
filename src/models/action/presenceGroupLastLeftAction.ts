import { CommandType } from '../../enums';
import { BaseAction } from './baseAction';

export class PresenceGroupLastLeftAction extends BaseAction {
  /** @inheritDoc */
  public type = CommandType.PresenceGroupLastLeftAction;

  public constructor(source?: BaseAction, reason?: string) {
    super(source, reason);
  }
}
