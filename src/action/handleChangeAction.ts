import { BaseAction } from './baseAction';
import { CommandSource, CommandType, WindowPosition } from '../enums';
import { iHandle } from '../interfaces';

export class HandleChangeAction extends BaseAction {
  /** @inheritDoc */
  public type: CommandType = CommandType.HandleChangedAction;
  /**
   * The window-handle that triggered the action
   */
  public readonly handle: iHandle;

  public constructor(handle: iHandle) {
    super(
      CommandSource.Automatic,
      `${handle.customName} ${handle.position === WindowPosition.closed ? 'opened' : 'closed'}`,
    );
    this.handle = handle;
  }
}
