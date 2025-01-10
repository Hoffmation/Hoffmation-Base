import { BaseAction } from './baseAction';
import { CommandType } from '../command';
import { iShutter } from '../../devices';

export class ShutterPositionChangedAction extends BaseAction {
  /** @inheritDoc */
  public type = CommandType.ShutterPositionChangedAction;
  /**
   * The shutter that triggered the action
   */
  public readonly shutter: iShutter;

  public constructor(
    shutter: iShutter,
    public readonly newPosition: number,
  ) {
    super(undefined, `${shutter.customName} changed position to ${newPosition}`);
    this.shutter = shutter;
  }
}
