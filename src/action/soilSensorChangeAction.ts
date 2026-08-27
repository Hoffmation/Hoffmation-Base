import { BaseAction } from './baseAction';
import { CommandSource, CommandType } from '../enums';
import { iSoilCollector } from '../interfaces';

export class SoilSensorChangeAction extends BaseAction {
  /** @inheritDoc */
  public type: CommandType = CommandType.SoilSensorChangeAction;
  /**
   * The new soil moisture in percent
   */
  public readonly newSoilMoisture: number;
  /**
   * The sensor that triggered the action
   */
  public readonly sensor: iSoilCollector;

  public constructor(sensor: iSoilCollector, newSoilMoisture: number) {
    super(CommandSource.Automatic, `${sensor.customName} detected ${newSoilMoisture}% soil moisture`);
    this.newSoilMoisture = newSoilMoisture;
    this.sensor = sensor;
  }
}
