import { BaseAction } from './baseAction';
import { CommandSource, CommandType } from '../enums';
import { iShutter } from '../interfaces';

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
    super(CommandSource.Automatic, `${shutter.customName} changed position to ${newPosition}`);
    this.shutter = shutter;
  }
}
