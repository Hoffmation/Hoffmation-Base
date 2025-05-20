import { BaseAction } from './baseAction';
import { CommandSource, CommandType } from '../enums';
import { iDoorDevice } from '../interfaces';

export class DingSensorAction extends BaseAction {
  /** @inheritDoc */
  public type: CommandType = CommandType.DingSensorAction;
  /**
   * Whether ding was detected or cleared. (True = detected, False = cleared)
   */
  public readonly dingOccured: boolean;
  /**
   * The door that triggered the action
   */
  public readonly sensor: iDoorDevice;

  public constructor(sensor: iDoorDevice) {
    super(CommandSource.Automatic, `${sensor.customName} ${sensor.dingActive ? 'detected' : 'cleared'} ding`);
    this.dingOccured = sensor.dingActive;
    this.sensor = sensor;
  }
}
