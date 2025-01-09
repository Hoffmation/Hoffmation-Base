import { BaseAction } from './baseAction.js';
import { CommandType } from '../command/index.js';

export class PresenceGroupLastLeftAction extends BaseAction {
  /** @inheritDoc */
  public type = CommandType.PresenceGroupLastLeftAction;

  public constructor(source?: BaseAction, reason?: string) {
    super(source, reason);
  }
}
