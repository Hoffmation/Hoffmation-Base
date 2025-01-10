import { BaseAction } from './baseAction';
import { CommandType } from '../enums';
import { iTemperatureCollector } from '../interfaces';

export class TemperatureSensorChangeAction extends BaseAction {
  /** @inheritDoc */
  public type: CommandType = CommandType.TemperatureSensorChangeAction;
  /**
   * The new temperature in Degree Celsius
   */
  public readonly newTemperature: number;
  /**
   * The sensor that triggered the action
   */
  public readonly sensor: iTemperatureCollector;

  public constructor(sensor: iTemperatureCollector, newTemperature: number) {
    super(undefined, `${sensor.customName} detected ${newTemperature} °C`);
    this.newTemperature = newTemperature;
    this.sensor = sensor;
  }
}
