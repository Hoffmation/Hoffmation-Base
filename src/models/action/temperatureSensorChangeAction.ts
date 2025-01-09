import { BaseAction } from './baseAction.js';
import { CommandType } from '../command/index.js';
import { iTemperatureSensor } from '../../server/index.js';

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
  public readonly sensor: iTemperatureSensor;

  public constructor(sensor: iTemperatureSensor, newTemperature: number) {
    super(undefined, `${sensor.customName} detected ${newTemperature} °C`);
    this.newTemperature = newTemperature;
    this.sensor = sensor;
  }
}
