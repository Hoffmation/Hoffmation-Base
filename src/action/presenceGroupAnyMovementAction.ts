import { BaseAction } from './baseAction';
import { CommandType } from '../enums';

export class PresenceGroupAnyMovementAction extends BaseAction {
  /** @inheritDoc */
  public type = CommandType.PresenceGroupAnyMovementAction;

  public constructor(source?: BaseAction, reason?: string) {
    super(source, reason);
  }
}
