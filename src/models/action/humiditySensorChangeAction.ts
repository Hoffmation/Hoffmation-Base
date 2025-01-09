import { BaseAction } from './baseAction.js';
import { CommandType } from '../command/index.js';
import { iHumiditySensor } from '../../server/index.js';

export class HumiditySensorChangeAction extends BaseAction {
  /** @inheritDoc */
  public type: CommandType = CommandType.HumiditySensorChangeAction;
  /**
   * The new humidity in percent
   */
  public readonly newHumidity: number;
  /**
   * The sensor that triggered the action
   */
  public readonly sensor: iHumiditySensor;

  public constructor(sensor: iHumiditySensor, newHumidity: number) {
    super(undefined, `${sensor.customName} detected ${newHumidity} humidity`);
    this.newHumidity = newHumidity;
    this.sensor = sensor;
  }
}
