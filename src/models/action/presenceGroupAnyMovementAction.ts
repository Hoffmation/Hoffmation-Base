import { BaseAction } from './baseAction';
import { CommandType } from '../command';

export class PresenceGroupAnyMovementAction extends BaseAction {
  /** @inheritDoc */
  public type = CommandType.PresenceGroupAnyMovementAction;

  public constructor(source?: BaseAction, reason?: string) {
    super(source, reason);
  }
}
