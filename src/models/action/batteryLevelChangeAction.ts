import { BaseAction } from './baseAction';
import { CommandType } from '../command';
import { iBatteryDevice } from '../../server';

export class BatteryLevelChangeAction extends BaseAction {
  /** @inheritDoc */
  public type: CommandType = CommandType.BatteryManagerLevelChangeAction;
  /**
   * The new level (0 empty, 100 full)
   * @type {number}
   */
  public readonly newLevel: number;

  public constructor(device: iBatteryDevice) {
    super(undefined, `New Battery Level (${device.battery}%) received`);
    this.newLevel = device.battery;
  }
}
