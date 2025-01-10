import { BaseAction } from './baseAction';
import { CommandType } from '../command';
import { iHandleSensor, WindowPosition } from '../../devices';

export class HandleChangeAction extends BaseAction {
  /** @inheritDoc */
  public type: CommandType = CommandType.HandleChangedAction;
  /**
   * The window-handle that triggered the action
   */
  public readonly handle: iHandleSensor;

  public constructor(handle: iHandleSensor) {
    super(undefined, `${handle.customName} ${handle.position === WindowPosition.closed ? 'opened' : 'closed'}`);
    this.handle = handle;
  }
}
