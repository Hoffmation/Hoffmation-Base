import { BaseAction } from './baseAction';
import { CommandSource, CommandType } from '../enums';
import { iHumidityCollector } from '../interfaces';

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
  public readonly sensor: iHumidityCollector;

  public constructor(sensor: iHumidityCollector, newHumidity: number) {
    super(CommandSource.Automatic, `${sensor.customName} detected ${newHumidity} humidity`);
    this.newHumidity = newHumidity;
    this.sensor = sensor;
  }
}
