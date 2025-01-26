import { BaseAction } from './baseAction';
import { CommandSource, CommandType } from '../enums';

export class PresenceGroupAnyMovementAction extends BaseAction {
  /** @inheritDoc */
  public type = CommandType.PresenceGroupAnyMovementAction;

  public constructor(source: BaseAction | CommandSource, reason?: string) {
    super(source, reason);
  }
}
