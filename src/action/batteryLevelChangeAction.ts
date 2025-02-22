import { BaseAction } from './baseAction';
import { CommandSource, CommandType } from '../enums';
import { iBatteryDevice } from '../interfaces';

export class BatteryLevelChangeAction extends BaseAction {
  /** @inheritDoc */
  public type: CommandType = CommandType.BatteryManagerLevelChangeAction;
  /**
   * The new level (0 empty, 100 full)
   * @type {number}
   */
  public readonly newLevel: number;

  public constructor(device: iBatteryDevice) {
    super(CommandSource.Automatic, `New Battery Level (${device.batteryLevel}%) received`);
    this.newLevel = device.batteryLevel;
  }
}
