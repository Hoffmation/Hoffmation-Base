import { BaseAction } from './baseAction';
import { CommandType } from '../command';

export class PresenceGroupLastLeftAction extends BaseAction {
  /** @inheritDoc */
  public type = CommandType.PresenceGroupLastLeftAction;

  public constructor(source?: BaseAction, reason?: string) {
    super(source, reason);
  }
}
