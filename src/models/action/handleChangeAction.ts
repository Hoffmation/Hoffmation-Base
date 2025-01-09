import { BaseAction } from './baseAction.js';
import { CommandType } from '../command/index.js';
import { iHandleSensor, WindowPosition } from '../../server/index.js';

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
